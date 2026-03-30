/**
 * ProviderLookupService - Looks up phone service providers using porting.co.za
 * 
 * MAJOR UPDATE (2025-01-30):
 * - porting.co.za changed their website - direct URL access no longer works
 * - Now uses form interaction with these steps:
 *   1. Navigate to /PublicWebsiteApp/#/number-inquiry
 *   2. Fill input field: <input id="numberTextInput" />
 *   3. Click Query button: <button id="retrieveBtn">
 *   4. Wait for result element: <label id="dataMsg">
 *   5. Extract last word from dataMsg text (e.g., "MTN/MTN" → "MTN")
 * - Result format: "The number 0686128512 has not been ported and is still serviced by MTN/MTN."
 * - Captcha is now RANDOMIZED (not every 5th lookup)
 * - When captcha detected: closes browser, creates new one, continues
 * - Captcha detection happens BEFORE entering number
 * 
 * BROWSER MANAGEMENT:
 * - Creates ONE browser per batch of lookups
 * - Reuses browser for all lookups in batch
 * - If captcha detected during lookup: restarts browser and retries
 * - Closes browser after batch completes
 * - Max 3 browser restarts per batch to prevent infinite loops
 * 
 * CACHING:
 * - Checks cache before performing lookups
 * - Caches results for 30 days
 * - Significantly reduces redundant API calls
 * 
 * Rate Limiting:
 * - Waits 500ms between provider lookups within a batch
 * - Waits 2-5 seconds between batches
 * 
 * BATCH MANAGEMENT:
 * - Uses BatchManager for intelligent batch processing
 * - Adaptive batch sizing based on success rate (3-5 lookups per batch)
 * - Captcha detection disabled by default (handled by browser restart logic)
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 24.2
 */

import type { Browser, BrowserContext, Page } from 'playwright';
import { ProviderCache } from './provider-cache';
import { BatchManager, ProviderLookup, BatchResult } from './BatchManager';
import { RetryStrategy } from './RetryStrategy';

const MAX_LOOKUPS_PER_BROWSER = 5; // Captcha appears after 5 lookups

export class ProviderLookupService {
  private maxConcurrentBrowsers: number;
  private browser: Browser | null = null;
  private activeContexts: number = 0;
  private eventEmitter?: any;
  private batchManager: BatchManager;
  private retryStrategy: RetryStrategy;
  private activePages: Set<Page> = new Set(); // Track all active pages to prevent leaks

  constructor(config: { 
    maxConcurrentBatches: number; 
    eventEmitter?: any;
    enableCaptchaDetection?: boolean; // Optional: enable captcha detection (default: false)
  }) {
    // maxConcurrentBatches means how many browser instances can run in parallel
    this.maxConcurrentBrowsers = config.maxConcurrentBatches;
    this.eventEmitter = config.eventEmitter;
    
    // Initialize RetryStrategy (copied from OLD working scraper)
    // 3 attempts with 2 second base delay (exponential backoff: 2s, 4s, 8s)
    this.retryStrategy = new RetryStrategy(3, 2000);
    
    // Initialize BatchManager with default configuration
    // This provides adaptive batch sizing and intelligent retry logic
    // 
    // IMPORTANT: Captcha detection is DISABLED by default because correct browser
    // management (1 browser per batch of 5) avoids captcha naturally.
    // Enable it only if you want additional protection or monitoring.
    this.batchManager = new BatchManager({
      minBatchSize: 3,
      maxBatchSize: 5, // CRITICAL: Never exceed 5
      interBatchDelay: [0, 0], // No delay needed - captcha detection handles it
      successRateThreshold: 0.5, // Reduce batch size if success rate < 50%
      enableCaptchaDetection: config.enableCaptchaDetection ?? false, // Disabled by default
    });
  }

  /**
   * Looks up providers for multiple phone numbers
   * Requirement 3.1: Use porting.co.za lookup service
   * Requirement 3.2: Create batches of exactly 5 numbers per browser instance
   * Requirement 3.4: Process up to maxConcurrentBrowsers batches in parallel
   * 
   * ENHANCED: Now uses BatchManager for intelligent batch processing with:
   * - Adaptive batch sizing based on success rate
   * - Automatic inter-batch delays
   * - Success rate tracking
   * 
   * @param phoneNumbers - Array of phone numbers to lookup
   * @returns Map of phone number to provider name
   */
  async lookupProviders(phoneNumbers: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    // Filter out empty phone numbers
    const validPhones = phoneNumbers.filter(phone => phone && phone.trim() !== '');
    
    if (validPhones.length === 0) {
      return results;
    }

    console.log(`[ProviderLookup] Starting lookup for ${validPhones.length} phone numbers`);

    // PHASE 3: Check cache first
    const cachedResults = await ProviderCache.getMany(validPhones);
    console.log(`[ProviderLookup] Found ${cachedResults.size} results in cache`);

    // Add cached results to final results
    for (const [phone, provider] of cachedResults.entries()) {
      results.set(phone, provider);
    }

    // Filter out phones that were found in cache
    const phonesToLookup = validPhones.filter(phone => !cachedResults.has(phone));

    if (phonesToLookup.length === 0) {
      console.log(`[ProviderLookup] All results found in cache, no lookups needed!`);
      return results;
    }

    console.log(`[ProviderLookup] Need to lookup ${phonesToLookup.length} numbers (not in cache)`);
    console.log(`[ProviderLookup] Max concurrent browsers: ${this.maxConcurrentBrowsers}`);

    // NEW: Use BatchManager for intelligent batch processing
    const newResults = await this.processLookupsWithBatchManager(phonesToLookup, cachedResults.size, validPhones.length);

    // PHASE 3: Cache new results
    if (newResults.size > 0) {
      await ProviderCache.setMany(newResults);
      console.log(`[ProviderLookup] Cached ${newResults.size} new provider lookups`);
    }

    // Merge new results with cached results
    for (const [phone, provider] of newResults.entries()) {
      results.set(phone, provider);
    }

    console.log(`[ProviderLookup] Completed all lookups. Total results: ${results.size} (${cachedResults.size} from cache, ${newResults.size} new)`);
    
    // Log BatchManager statistics
    const stats = this.batchManager.getStatistics();
    console.log(`[ProviderLookup] BatchManager stats:`, {
      totalBatchesProcessed: stats.totalBatchesProcessed,
      totalLookupsProcessed: stats.totalLookupsProcessed,
      currentBatchSize: stats.currentBatchSize,
      rollingSuccessRate: stats.rollingSuccessRate,
    });
    
    return results;
  }

  /**
   * Process lookups using BatchManager for intelligent batch processing
   * 
   * UPDATED FOR PLAYWRIGHT MIGRATION:
   * - Initializes single browser instance once at start
   * - Creates lightweight BrowserContext per batch instead of full Browser
   * - Reuses same browser for all batches (95% memory reduction)
   * - Closes context after each batch (not browser)
   * - Browser is closed in cleanup() method
   * 
   * This method:
   * 1. Initializes single browser instance (once)
   * 2. Converts phone numbers to ProviderLookup objects
   * 3. Adds them to BatchManager batches
   * 4. Creates ONE context per batch
   * 5. Reuses that context for ALL lookups in the batch
   * 6. If captcha detected, closes context and creates new one
   * 7. Closes context after batch completes
   * 8. Waits 100ms between lookups within batch
   * 9. Handles progress reporting
   * 
   * @param phonesToLookup - Phone numbers that need lookup (not in cache)
   * @param cachedCount - Number of results already found in cache
   * @param totalCount - Total number of phone numbers
   * @returns Map of phone number to provider name
   */
  private async processLookupsWithBatchManager(
    phonesToLookup: string[],
    cachedCount: number,
    totalCount: number
  ): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    let completedLookups = cachedCount;

    console.log(`[ProviderLookup] Using BatchManager for ${phonesToLookup.length} lookups`);
    console.log(`[ProviderLookup] Processing with max ${this.maxConcurrentBrowsers} concurrent batches`);

    // Initialize single browser instance once for all batches
    await this.initBrowser();

    // Create batches of 5 phone numbers each
    const batches: string[][] = [];
    for (let i = 0; i < phonesToLookup.length; i += 5) {
      batches.push(phonesToLookup.slice(i, i + 5));
    }

    console.log(`[ProviderLookup] Created ${batches.length} batches of up to 5 numbers each`);

    // Process batches with concurrency control
    const concurrency = this.maxConcurrentBrowsers;
    let globalBatchNumber = 0;

    for (let i = 0; i < batches.length; i += concurrency) {
      const batchGroup = batches.slice(i, i + concurrency);
      console.log(`[ProviderLookup] Processing batch group ${Math.floor(i / concurrency) + 1}: ${batchGroup.length} batches in parallel`);

      // Process this group of batches in parallel with staggered startup
      const batchPromises = batchGroup.map(async (phoneBatch, groupIndex) => {
        const batchNumber = globalBatchNumber + groupIndex + 1;
        const batchSize = phoneBatch.length;

        // CRITICAL FIX: Stagger batch startup to prevent overwhelming the system
        // Each batch waits a bit before starting to avoid all contexts navigating simultaneously
        // Minimal staggered startup to avoid thundering herd (reduced from 500ms to 100ms)
        const startupDelay = groupIndex * 100; // 100ms between each batch startup
        if (startupDelay > 0) {
          console.log(`[ProviderLookup] [Batch ${batchNumber}] Waiting ${startupDelay}ms before starting (staggered startup)`);
          await this.sleep(startupDelay);
        }

        console.log(`[ProviderLookup] Processing batch ${batchNumber} with ${batchSize} lookups`);

        // Create context for this batch
        let context: BrowserContext | null = null;
        let lookupIndex = 0;
        let contextRestartCount = 0;
        const MAX_CONTEXT_RESTARTS = 3;
        const batchResults = new Map<string, string>();

        try {
          // Create initial context from single browser with COMPLETE ISOLATION
          // Each context should appear as a completely separate user to the website
          this.activeContexts++;
          context = await this.browser!.newContext({
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            ignoreHTTPSErrors: true,
            // CRITICAL: Each context gets its own isolated storage (cookies, localStorage, etc.)
            // This makes each context appear as a completely different user
            storageState: undefined, // No shared storage state
            // Additional isolation options
            bypassCSP: false,
            javaScriptEnabled: true,
          });
          console.log(`[ProviderLookup] [Batch ${batchNumber}] Created isolated context for ${batchSize} lookups (Active contexts: ${this.activeContexts})`);

          // Process each phone number in the batch sequentially
          let successCount = 0;
          let failCount = 0;

          for (let lookupIndex = 0; lookupIndex < phoneBatch.length; lookupIndex++) {
            const phoneNumber = phoneBatch[lookupIndex];
            console.log(`[ProviderLookup] [Batch ${batchNumber}] Lookup ${lookupIndex + 1}/${batchSize}: ${phoneNumber}`);

            try {
              const provider = await this.lookupSingleProviderWithContext(context!, phoneNumber, lookupIndex === 0);
              
              if (provider && provider !== 'Unknown') {
                batchResults.set(phoneNumber, provider);
                successCount++;
                
                // Small delay between lookups to avoid overwhelming the server
                if (lookupIndex < phoneBatch.length - 1) {
                  await this.sleep(100);
                }
              } else {
                failCount++;
                // Small delay after failed lookup
                if (lookupIndex < phoneBatch.length - 1) {
                  await this.sleep(100);
                }
              }

            } catch (error) {
              const errorMessage = (error as Error).message;

              // If captcha detected, restart context and retry
              if (errorMessage === 'CAPTCHA_DETECTED' && contextRestartCount < MAX_CONTEXT_RESTARTS) {
                contextRestartCount++;
                console.warn(`[ProviderLookup] [Batch ${batchNumber}] Captcha detected, restarting context (attempt ${contextRestartCount}/${MAX_CONTEXT_RESTARTS})`);

                if (context) {
                  await context.close();
                  this.activeContexts--;
                }

                // Create new isolated context after captcha
                this.activeContexts++;
                context = await this.browser!.newContext({
                  viewport: { width: 1920, height: 1080 },
                  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                  ignoreHTTPSErrors: true,
                  // CRITICAL: Fresh isolated storage for new context
                  storageState: undefined,
                  bypassCSP: false,
                  javaScriptEnabled: true,
                });
                console.log(`[ProviderLookup] [Batch ${batchNumber}] New isolated context created after captcha`);

                await this.sleep(2000);

                try {
                  const provider = await this.lookupSingleProviderWithContext(context!, phoneNumber, true);
                  if (provider && provider !== 'Unknown') {
                    batchResults.set(phoneNumber, provider);
                    successCount++;
                  } else {
                    failCount++;
                  }
                } catch (retryError) {
                  console.error(`[ProviderLookup] [Batch ${batchNumber}] Retry failed for ${phoneNumber}:`, retryError);
                  failCount++;
                  if (lookupIndex < batchSize - 1) {
                    await this.sleep(100);
                  }
                }
              } else {
                console.error(`[ProviderLookup] Lookup failed for ${phoneNumber}:`, error);
                failCount++;
                if (lookupIndex < batchSize - 1) {
                  await this.sleep(100);
                }
              }
            }
          }

          const successRate = batchSize > 0 ? successCount / batchSize : 0;
          console.log(`[ProviderLookup] [Batch ${batchNumber}] Complete: ${successCount} successful, ${failCount} failed (${Math.round(successRate * 100)}% success rate, ${contextRestartCount} context restarts)`);

          return { batchNumber, batchResults, batchSize, successRate, contextRestarts: contextRestartCount };

        } catch (error) {
          console.error(`[ProviderLookup] [Batch ${batchNumber}] Error processing batch:`, error);
          return { batchNumber, batchResults, batchSize: 0, successRate: 0, contextRestarts: contextRestartCount };
        } finally {
          if (context) {
            console.log(`[ProviderLookup] [Batch ${batchNumber}] Closing context after ${batchSize} lookups (Active contexts: ${this.activeContexts})`);
            await context.close();
            this.activeContexts--;
            console.log(`[ProviderLookup] [Batch ${batchNumber}] Context closed successfully (Active contexts: ${this.activeContexts})`);
          }
        }
      });

      // Wait for all batches in this group to complete
      const groupResults = await Promise.all(batchPromises);

      // Merge results and emit progress
      for (const { batchNumber, batchResults, batchSize, successRate, contextRestarts } of groupResults) {
        for (const [phone, provider] of batchResults.entries()) {
          results.set(phone, provider);
        }

        completedLookups += batchSize;

        if (this.eventEmitter) {
          this.eventEmitter.emit('lookup-progress', {
            completed: completedLookups,
            total: totalCount,
            percentage: Math.round((completedLookups / totalCount) * 100),
            currentBatch: batchNumber,
            fromCache: cachedCount,
            batchSuccessRate: successRate,
            batchSize: batchSize,
            contextRestarts: contextRestarts,
          });
        }
      }

      globalBatchNumber += batchGroup.length;
    }

    return results;
  }

  /**
   * @deprecated This method is no longer used. The processLookupsWithBatchManager method
   * now creates ONE browser per batch and reuses it for all lookups in that batch.
   * This was the critical bug causing captcha on 6th lookup.
   * 
   * Looks up a single provider by creating a temporary browser instance
   * This is used by BatchManager's processor function
   * 
   * @param phoneNumber - Phone number to lookup
   * @returns Provider name or null on failure
   */
  private async lookupSingleProviderWithBrowser(phoneNumber: string): Promise<string | null> {
    let browser: Browser | null = null;

    try {
      // Create a fresh browser instance for this lookup
      browser = await this.createBrowser();
      
      const provider = await this.lookupSingleProvider(browser, phoneNumber);
      
      // Return null if lookup failed (provider is "Unknown")
      return provider === 'Unknown' ? null : provider;
      
    } catch (error) {
      console.error(`[ProviderLookup] Error looking up ${phoneNumber}:`, error);
      return null;
    } finally {
      // Always close the browser
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Creates batches of exactly 5 phone numbers (or less for the last batch)
   * Each batch will use a separate browser instance to avoid captcha
   * Requirement 3.2: Create batches of exactly 5 numbers per browser instance
   * 
   * @deprecated This method is kept for backward compatibility but is no longer used internally.
   * The BatchManager now handles batch creation automatically.
   * 
   * @param phoneNumbers - Array of phone numbers
   * @returns Array of batches, each with max 5 numbers
   */
  createBatchesOfFive(phoneNumbers: string[]): string[][] {
    const batches: string[][] = [];
    
    for (let i = 0; i < phoneNumbers.length; i += MAX_LOOKUPS_PER_BROWSER) {
      batches.push(phoneNumbers.slice(i, i + MAX_LOOKUPS_PER_BROWSER));
    }

    return batches;
  }

  /**
   * Processes a batch of up to 5 phone numbers with a dedicated browser instance
   * Browser is closed after processing to avoid captcha on next batch
   * Requirement 3.3: Close browser after batch is complete to avoid captcha
   * 
   * @deprecated This method is kept for backward compatibility but is no longer used internally.
   * The BatchManager now handles batch processing with better error handling and adaptive sizing.
   * 
   * @param batch - Array of phone numbers (max 5)
   * @param results - Map to store results
   * @param batchNumber - Batch number for logging
   */
  async processBatchWithNewBrowser(
    batch: string[],
    results: Map<string, string>,
    batchNumber: number
  ): Promise<void> {
    this.activeContexts++;
    let browser: Browser | null = null;

    try {
      console.log(`[ProviderLookup] [Batch ${batchNumber}] Creating new browser for ${batch.length} lookups`);
      
      // Create a fresh browser instance for this batch
      browser = await this.createBrowser();
      
      // Process each phone number in this batch (max 5)
      for (let i = 0; i < batch.length; i++) {
        const phone = batch[i];
        console.log(`[ProviderLookup] [Batch ${batchNumber}] Lookup ${i + 1}/${batch.length}: ${phone}`);
        
        const provider = await this.lookupSingleProvider(browser, phone);
        results.set(phone, provider);
        
        // Requirement 24.2: Minimal wait between provider lookups in batch (optimized from 500ms to 100ms)
        if (i < batch.length - 1) {
          await this.sleep(100);
        }
      }
      
      console.log(`[ProviderLookup] [Batch ${batchNumber}] Completed all ${batch.length} lookups`);
      
    } catch (error) {
      console.error(`[ProviderLookup] [Batch ${batchNumber}] Error processing batch:`, error);
    } finally {
      // Always close the browser after this batch to avoid captcha
      if (browser) {
        console.log(`[ProviderLookup] [Batch ${batchNumber}] Closing browser`);
        await browser.close();
      }
      this.activeContexts--;
    }
  }

  /**
   * Get BatchManager statistics
   * 
   * Provides insights into batch processing performance:
   * - Total batches and lookups processed
   * - Current batch size (adaptive, 3-5)
   * - Rolling success rate
   * 
   * @returns BatchManager statistics object
   */
  getBatchManagerStatistics() {
    return this.batchManager.getStatistics();
  }

  /**
   * Reset BatchManager state
   * 
   * Useful for starting a new scraping session or testing.
   * Resets all counters and batch size back to maximum (5).
   */
  resetBatchManager(): void {
    this.batchManager.reset();
    console.log('[ProviderLookup] BatchManager reset');
  }

  /**
   * Initializes the single browser instance if not already initialized
   * This browser will be reused for all batches
   */
  private async initBrowser(): Promise<void> {
    if (this.browser) return;
    
    console.log('[ProviderLookup] Initializing single browser instance...');
    const playwright = await import('playwright');
    
    // Import browser configuration to use system Chromium
    const { getBrowserLaunchOptions, getChromiumPath } = await import('./browserConfig');
    const launchOptions = getBrowserLaunchOptions(true);
    
    // CRITICAL: Use system Chromium if available (Docker/Alpine Linux)
    const executablePath = getChromiumPath();
    if (executablePath) {
      console.log(`[ProviderLookup] Using system Chromium at: ${executablePath}`);
      launchOptions.executablePath = executablePath;
    }
    
    console.log('[ProviderLookup] Launch options:', JSON.stringify(launchOptions, null, 2));
    
    this.browser = await playwright.chromium.launch(launchOptions);
    
    console.log('[ProviderLookup] Browser initialized successfully');
  }

  /**
   * Creates a new browser instance
   */
  private async createBrowser(): Promise<Browser> {
    // Initialize browser if not already done
    await this.initBrowser();
    return this.browser!;
  }

  /**
   * Looks up provider for a single phone number using the provided context
   * 
   * FORM INTERACTION WITH CAPTCHA ERROR DETECTION:
   * 1. Navigate to /PublicWebsiteApp/#/number-inquiry (done once per context)
   * 2. Fill input field: <input id="numberTextInput" />
   * 3. Click Query button: <button id="retrieveBtn">
   * 4. Check for captcha error: <div id="erromsg">Verification Code - Field(s) value must be entered.</div>
   * 5. If error appears → throw CAPTCHA_DETECTED → restart context with fresh user data → retry same number
   * 6. Otherwise, wait for result element: <label id="dataMsg">
   * 7. Extract provider from dataMsg text
   * 8. Hard refresh the page (clears any potential captcha state)
   * 9. Repeat for next number
   * 
   * @param context - BrowserContext instance to use
   * @param phoneNumber - Phone number to lookup
   * @param isFirstLookup - Whether this is the first lookup in the batch (to navigate to form)
   * @returns Provider name or "Unknown"
   * @throws Error with 'CAPTCHA_DETECTED' if captcha error message appears
   */
  async lookupSingleProviderWithContext(context: BrowserContext, phoneNumber: string, isFirstLookup: boolean = false): Promise<string> {
    return this.retryStrategy.execute(async () => {
      const page = await context.newPage();
      this.activePages.add(page); // Track page to prevent leaks

      try {
        // OPTIMIZATION: Don't set default timeouts - use specific timeouts per operation
        // This prevents Playwright from doing extra timeout checks
        
        // Clean phone number (remove spaces, dashes, etc.)
        const cleanPhone = this.cleanPhoneNumber(phoneNumber);
        
        console.log(`[ProviderLookup] Looking up phone: ${phoneNumber} -> cleaned: ${cleanPhone}`);

        // Navigate to the form page (or refresh if not first lookup)
        const formUrl = 'https://www.porting.co.za/PublicWebsiteApp/#/number-inquiry';
        console.log(`[ProviderLookup] ${isFirstLookup ? 'Navigating to' : 'Refreshing'} form: ${formUrl}`);
        
        // OPTIMIZATION: Use 'commit' instead of 'domcontentloaded' for faster navigation
        await page.goto(formUrl, { waitUntil: 'commit', timeout: 10000 });

        // OPTIMIZATION: Reduced Angular wait from 500ms to 100ms
        await this.sleep(100);

        // OPTIMIZATION: Use locator with 'attached' state for faster selector waiting
        await page.locator('#numberTextInput').waitFor({ timeout: 8000, state: 'attached' });
        
        // OPTIMIZATION: Use locator.fill() instead of evaluate + type (faster)
        await page.locator('#numberTextInput').fill(cleanPhone);
        
        console.log(`[ProviderLookup] Entered phone number: ${cleanPhone}`);

        // Click the Query button - this will navigate to results page with ?sid=xxx
        console.log(`[ProviderLookup] Clicking Query button...`);
        await page.locator('#retrieveBtn').click();
        
        // Wait for navigation to results page (URL will change to include ?sid=xxx)
        console.log(`[ProviderLookup] Waiting for navigation to results page...`);
        await page.waitForURL(/.*\?sid=.*/, { timeout: 10000 });
        console.log(`[ProviderLookup] Navigated to results page: ${page.url()}`);

        // Wait a moment for Angular to render the result
        await this.sleep(100);

        // Check for captcha error message on results page
        const hasCaptchaError = await page.evaluate(() => {
          const errorDiv = document.querySelector('#erromsg');
          if (!errorDiv) return false;
          
          const errorText = errorDiv.textContent || '';
          return errorText.includes('Verification Code') && errorText.includes('Field(s) value must be entered');
        });

        if (hasCaptchaError) {
          console.warn(`[ProviderLookup] CAPTCHA ERROR detected for ${phoneNumber} - "Verification Code - Field(s) value must be entered."`);
          throw new Error('CAPTCHA_DETECTED');
        }

        // Wait for result element on the results page
        console.log(`[ProviderLookup] Waiting for #dataMsg element on results page...`);
        await page.locator('#dataMsg').waitFor({ timeout: 10000, state: 'attached' });
        
        // OPTIMIZATION: Reduced wait from 100ms to 50ms
        await this.sleep(50);

        // Extract provider name from the result
        const provider = await this.extractProviderFromFormResult(page);
        
        console.log(`[ProviderLookup] Result for ${phoneNumber}: ${provider}`);

        return provider;

      } catch (error) {
        const errorMessage = (error as Error).message;
        
        // If captcha detected, throw special error to trigger context restart
        if (errorMessage === 'CAPTCHA_DETECTED') {
          console.warn(`[ProviderLookup] Captcha detected for ${phoneNumber}, context needs restart`);
          throw error;
        }
        
        console.warn(`[ProviderLookup] Lookup failed for ${phoneNumber}:`, error);
        throw error; // Throw to trigger retry
      } finally {
        this.activePages.delete(page); // Untrack page
        try {
          await page.close();
        } catch (err) {
          console.error('[ProviderLookup] Error closing page:', err);
        }
      }
    });
  }

  /**
   * Looks up provider for a single phone number using the provided browser
   * 
   * @deprecated This method is kept for backward compatibility but should use lookupSingleProviderWithContext instead.
   * 
   * FORM INTERACTION WITH CAPTCHA ERROR DETECTION:
   * 1. Navigate to /PublicWebsiteApp/#/number-inquiry (done once per browser)
   * 2. Fill input field: <input id="numberTextInput" />
   * 3. Click Query button: <button id="retrieveBtn">
   * 4. Check for captcha error: <div id="erromsg">Verification Code - Field(s) value must be entered.</div>
   * 5. If error appears → throw CAPTCHA_DETECTED → restart browser with fresh user data → retry same number
   * 6. Otherwise, wait for result element: <label id="dataMsg">
   * 7. Extract provider from dataMsg text
   * 8. Hard refresh the page (clears any potential captcha state)
   * 9. Repeat for next number
   * 
   * @param browser - Browser instance to use
   * @param phoneNumber - Phone number to lookup
   * @param isFirstLookup - Whether this is the first lookup in the batch (to navigate to form)
   * @returns Provider name or "Unknown"
   * @throws Error with 'CAPTCHA_DETECTED' if captcha error message appears
   */
  async lookupSingleProvider(browser: Browser, phoneNumber: string, isFirstLookup: boolean = false): Promise<string> {
    return this.retryStrategy.execute(async () => {
      const page = await browser.newPage();
      this.activePages.add(page); // Track page to prevent leaks

      try {
        // Set reasonable timeouts - site loads fast
        page.setDefaultTimeout(10000); // 10 second timeout per operation
        page.setDefaultNavigationTimeout(10000); // 10 second timeout per navigation
        
        // Clean phone number (remove spaces, dashes, etc.)
        const cleanPhone = this.cleanPhoneNumber(phoneNumber);
        
        console.log(`[ProviderLookup] Looking up phone: ${phoneNumber} -> cleaned: ${cleanPhone}`);

        // Navigate to the form page (or refresh if not first lookup)
        const formUrl = 'https://www.porting.co.za/PublicWebsiteApp/#/number-inquiry';
        console.log(`[ProviderLookup] ${isFirstLookup ? 'Navigating to' : 'Refreshing'} form: ${formUrl}`);
        await page.goto(formUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

        // Wait briefly for Angular to load
        await this.sleep(200);

        // Wait for the input field to be available (reduced timeout - site loads fast)
        await page.waitForSelector('#numberTextInput', { timeout: 5000 });
        
        // Clear and fill the input field
        await page.evaluate(() => {
          const input = document.querySelector('#numberTextInput') as HTMLInputElement;
          if (input) {
            input.value = '';
          }
        });
        await page.type('#numberTextInput', cleanPhone);
        
        console.log(`[ProviderLookup] Entered phone number: ${cleanPhone}`);

        // Click the Query button
        await page.click('#retrieveBtn');
        console.log(`[ProviderLookup] Clicked Query button`);

        // Wait a moment for either the result or error message to appear
        await this.sleep(200);

        // Check for captcha error message FIRST
        const hasCaptchaError = await page.evaluate(() => {
          const errorDiv = document.querySelector('#erromsg');
          if (!errorDiv) return false;
          
          const errorText = errorDiv.textContent || '';
          return errorText.includes('Verification Code') && errorText.includes('Field(s) value must be entered');
        });

        if (hasCaptchaError) {
          console.warn(`[ProviderLookup] CAPTCHA ERROR detected for ${phoneNumber} - "Verification Code - Field(s) value must be entered."`);
          throw new Error('CAPTCHA_DETECTED');
        }

        // Wait for the result to appear (reduced timeout - site responds fast)
        await page.waitForSelector('#dataMsg', { timeout: 5000 });
        
        // Wait briefly for the result to fully populate
        await this.sleep(100);

        // Extract provider name from the result
        const provider = await this.extractProviderFromFormResult(page);
        
        console.log(`[ProviderLookup] Result for ${phoneNumber}: ${provider}`);

        return provider;

      } catch (error) {
        const errorMessage = (error as Error).message;
        
        // If captcha detected, throw special error to trigger browser restart
        if (errorMessage === 'CAPTCHA_DETECTED') {
          console.warn(`[ProviderLookup] Captcha detected for ${phoneNumber}, browser needs restart`);
          throw error;
        }
        
        console.warn(`[ProviderLookup] Lookup failed for ${phoneNumber}:`, error);
        throw error; // Throw to trigger retry
      } finally {
        this.activePages.delete(page); // Untrack page
        try {
          await page.close();
        } catch (err) {
          console.error('[ProviderLookup] Error closing page:', err);
        }
      }
    });
  }

  /**
   * Detects captcha on the current page
   * 
   * Checks for the specific captcha challenge text:
   * "Enter the numeric verification code shown above:(This helps prevent automated query attempts.)"
   * 
   * This is the actual captcha message from porting.co.za
   * 
   * @param page - Puppeteer page to check
   * @returns true if captcha detected, false otherwise
   */
  private async detectCaptchaOnPage(page: Page): Promise<boolean> {
    try {
      // Check for the specific captcha text from porting.co.za
      const hasCaptchaText = await page.evaluate(() => {
        const bodyText = document.body.textContent || '';
        
        // Look for the exact captcha message
        return bodyText.includes('Enter the numeric verification code shown above') ||
               bodyText.includes('This helps prevent automated query attempts');
      });

      if (hasCaptchaText) {
        console.log('[ProviderLookup] Detected captcha challenge text');
        return true;
      }

      // Also check for VISIBLE reCAPTCHA iframe (backup check)
      const hasVisibleRecaptcha = await page.evaluate(() => {
        const recaptchaIframe = document.querySelector('iframe[src*="recaptcha"]') as HTMLIFrameElement;
        if (!recaptchaIframe) return false;
        
        // Check if iframe is visible
        const rect = recaptchaIframe.getBoundingClientRect();
        const style = window.getComputedStyle(recaptchaIframe);
        
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0'
        );
      });

      if (hasVisibleRecaptcha) {
        console.log('[ProviderLookup] Detected VISIBLE reCAPTCHA iframe');
        return true;
      }

      return false;
    } catch (error) {
      console.warn('[ProviderLookup] Error detecting captcha:', error);
      return false; // Fail open - assume no captcha on error
    }
  }

  /**
   * Extracts provider name from the direct URL result
   * 
   * DIRECT URL FORMAT:
   * - Element: <span class="p1">The number 0113935483 has not been ported and is still serviced by TELKOM.<img src="transparent.gif" width="1" height="5"><br>[ <a href=".">Query another number</a> ]<br></span>
   * - Extracts provider name after "serviced by " marker
   * 
   * @param page - Puppeteer page with results
   * @returns Provider name or "Unknown"
   */
  private async extractProviderFromDirectUrl(page: Page): Promise<string> {
    try {
      // Get text from the span.p1 element
      const spanText = await page.evaluate(() => {
        const element = document.querySelector('span.p1');
        return element ? element.textContent || '' : '';
      });
      
      if (!spanText) {
        console.log('[ProviderLookup] No span.p1 element found or empty');
        return 'Unknown';
      }

      console.log(`[ProviderLookup] span.p1 text: "${spanText}"`);

      // Parse provider from text using existing parseProvider method
      return this.parseProvider(spanText);

    } catch (error) {
      console.warn('[ProviderLookup] Failed to extract provider from direct URL result:', error);
      return 'Unknown';
    }
  }

  /**
   * Extracts provider name from the form result
   * 
   * FORM RESULT FORMAT:
   * - Element: <label id="dataMsg">The number 0686128512 has not been ported and is still serviced by MTN/MTN.</label>
   * - OR: <label id="dataMsg">0686128512 has been ported and is serviced by VODACOM.</label>
   * - Extracts provider name after "serviced by " marker
   * 
   * @param page - Puppeteer page with results
   * @returns Provider name or "Unknown"
   */
  private async extractProviderFromFormResult(page: Page): Promise<string> {
    try {
      // Get text from the #dataMsg element
      const dataMsgText = await page.evaluate(() => {
        const element = document.querySelector('#dataMsg');
        return element ? element.textContent || '' : '';
      });
      
      if (!dataMsgText) {
        console.log('[ProviderLookup] No #dataMsg element found or empty');
        return 'Unknown';
      }

      console.log(`[ProviderLookup] dataMsg text: "${dataMsgText}"`);

      // Use the existing parseProvider method to extract provider name
      return this.parseProvider(dataMsgText);

    } catch (error) {
      console.warn('[ProviderLookup] Failed to extract provider from form result:', error);
      return 'Unknown';
    }
  }

  /**
   * Parses provider name from the lookup result text
   * Requirement 3.6: Extract provider name after "serviced by " marker
   * 
   * @param text - Text from span.p1 element
   * @returns Provider name
   */
  parseProvider(text: string): string {
    const cleaned = text.trim();
    if (!cleaned) {
      console.log('[ProviderLookup] Empty text after trim');
      return 'Unknown';
    }

    console.log(`[ProviderLookup] Parsing provider from: "${cleaned}"`);

    // Look for "serviced by " marker (case insensitive)
    const lowerText = cleaned.toLowerCase();
    const marker = 'serviced by ';
    
    if (lowerText.includes(marker)) {
      const markerIndex = lowerText.indexOf(marker);
      const afterMarker = cleaned.substring(markerIndex + marker.length).trim();
      
      // Get the provider name (first word after marker) and remove trailing punctuation
      const provider = afterMarker.split(/\s+/)[0].replace(/[.,;:!?]+$/, '');
      console.log(`[ProviderLookup] Extracted provider: "${provider}"`);
      return provider || 'Unknown';
    }

    console.log(`[ProviderLookup] No "serviced by" marker found in text`);
    return 'Unknown';
  }

  /**
   * Cleans phone number by removing non-digit characters and converting to SA format
   * Requirement 3.5: Remove non-digits and convert +27 prefix to 0
   * 
   * @param phoneNumber - Raw phone number (e.g., "+27 18 771 2345" or "018 771 2345")
   * @returns Cleaned phone number in SA format (e.g., "0187712345")
   */
  cleanPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Convert international format (+27...) to local format (0...)
    // South African country code is 27
    if (cleaned.startsWith('27')) {
      cleaned = '0' + cleaned.substring(2);
    }
    
    return cleaned;
  }

  /**
   * Sleep utility for delays
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleans up browser resources
   * Closes all active pages and the browser instance
   */
  async cleanup(): Promise<void> {
    // Close all active pages first
    console.log(`[ProviderLookup] Cleanup: Closing ${this.activePages.size} active pages...`);
    
    for (const page of this.activePages) {
      try {
        await page.close();
      } catch (err) {
        console.error('[ProviderLookup] Error closing page during cleanup:', err);
      }
    }
    this.activePages.clear();
    
    // Close the browser instance
    if (this.browser) {
      console.log('[ProviderLookup] Cleanup: Closing browser instance...');
      try {
        await this.browser.close();
        this.browser = null;
        console.log('[ProviderLookup] Browser closed successfully');
      } catch (err) {
        console.error('[ProviderLookup] Error closing browser during cleanup:', err);
      }
    }
    
    console.log('[ProviderLookup] Cleanup complete - all pages and browser closed');
  }

  /**
   * Gets the number of active contexts
   */
  getActiveLookups(): number {
    return this.activeContexts;
  }
}
