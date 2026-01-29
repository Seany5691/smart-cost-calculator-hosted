/**
 * ProviderLookupService - Looks up phone service providers using porting.co.za
 * 
 * Performs batched lookups to identify telecommunications providers for phone numbers.
 * Handles captcha avoidance by creating new browser instances every 5 lookups.
 * 
 * CRITICAL FIX APPLIED (2025-01-29):
 * - Fixed browser creation to match old working scraper behavior
 * - Creates ONE browser per batch of 5 lookups (not one per lookup)
 * - Reuses browser for all lookups in batch
 * - Closes browser after batch completes
 * - This avoids captcha which appears every 6th browser instance
 * 
 * CACHING (Phase 3):
 * - Checks cache before performing lookups
 * - Caches results for 30 days
 * - Significantly reduces redundant API calls
 * 
 * Rate Limiting (Requirement 24.2):
 * - Waits 500ms between provider lookups within a batch (Req 24.2)
 * 
 * BATCH MANAGEMENT (Phase 1 - Robustness Enhancement):
 * - Uses BatchManager for intelligent batch processing
 * - Adaptive batch sizing based on success rate (3-5 lookups per batch)
 * - Maintains backward compatibility with existing API
 * - Captcha detection DISABLED by default (correct browser management avoids captcha)
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 24.2
 */

import type { Browser, Page } from 'puppeteer';
import { ProviderCache } from './provider-cache';
import { BatchManager, ProviderLookup, BatchResult } from './BatchManager';
import { RetryStrategy } from './RetryStrategy';

const MAX_LOOKUPS_PER_BROWSER = 5; // Captcha appears after 5 lookups

export class ProviderLookupService {
  private maxConcurrentBrowsers: number;
  private activeBrowsers: number = 0;
  private eventEmitter?: any;
  private batchManager: BatchManager;
  private retryStrategy: RetryStrategy;

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
      interBatchDelay: [2000, 5000], // 2-5 seconds between batches
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
   * CRITICAL FIX APPLIED: This method now creates ONE browser per batch of 5 lookups,
   * matching the old working scraper's behavior exactly.
   * 
   * This method:
   * 1. Converts phone numbers to ProviderLookup objects
   * 2. Adds them to BatchManager batches
   * 3. Creates ONE browser when batch is full
   * 4. Reuses that browser for ALL lookups in the batch
   * 5. Closes browser after batch completes
   * 6. Waits 500ms between lookups within batch
   * 7. Handles progress reporting
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
    let batchNumber = 0;

    console.log(`[ProviderLookup] Using BatchManager for ${phonesToLookup.length} lookups`);

    // Process all phone numbers through BatchManager
    for (let i = 0; i < phonesToLookup.length; i++) {
      const phoneNumber = phonesToLookup[i];
      
      // Add to current batch
      const lookup: ProviderLookup = {
        phoneNumber,
        metadata: { index: i },
      };
      
      this.batchManager.addToBatch(lookup);

      // Process batch when full or at end of list
      if (this.batchManager.isBatchFull() || i === phonesToLookup.length - 1) {
        batchNumber++;
        
        const batchSize = this.batchManager.getCurrentBatchCount();
        console.log(`[ProviderLookup] Processing batch ${batchNumber} with ${batchSize} lookups`);
        
        // CRITICAL FIX: Create ONE browser for this entire batch (not one per lookup!)
        let browser: Browser | null = null;
        let lookupIndex = 0; // Track position within batch
        
        try {
          // Create browser BEFORE processing batch
          browser = await this.createBrowser();
          console.log(`[ProviderLookup] [Batch ${batchNumber}] Created browser for ${batchSize} lookups`);
          
          // Process the batch using BatchManager with the SAME browser for all lookups
          const batchResult = await this.batchManager.processBatch(async (lookup) => {
            lookupIndex++;
            console.log(`[ProviderLookup] [Batch ${batchNumber}] Lookup ${lookupIndex}/${batchSize}: ${lookup.phoneNumber}`);
            
            try {
              // CRITICAL: Use the SAME browser instance for all lookups in this batch
              const provider = await this.lookupSingleProvider(browser!, lookup.phoneNumber);
              
              // Add 500ms delay between lookups (except after last one)
              if (lookupIndex < batchSize) {
                await this.sleep(500);
              }
              
              return provider === 'Unknown' ? null : provider;
            } catch (error) {
              // All retries exhausted, return null (failed lookup)
              console.error(`[ProviderLookup] All retries exhausted for ${lookup.phoneNumber}:`, error);
              
              // Add 500ms delay between lookups (except after last one)
              if (lookupIndex < batchSize) {
                await this.sleep(500);
              }
              
              return null;
            }
          });

          // Add batch results to final results
          for (const [phone, provider] of batchResult.results.entries()) {
            results.set(phone, provider);
          }

          completedLookups += batchResult.batchSize;

          // Emit progress event
          if (this.eventEmitter) {
            this.eventEmitter.emit('lookup-progress', {
              completed: completedLookups,
              total: totalCount,
              percentage: Math.round((completedLookups / totalCount) * 100),
              currentBatch: batchNumber,
              fromCache: cachedCount,
              batchSuccessRate: batchResult.successRate,
              batchSize: batchResult.batchSize,
            });
          }

          console.log(`[ProviderLookup] [Batch ${batchNumber}] Complete: ${batchResult.successful} successful, ${batchResult.failed} failed (${Math.round(batchResult.successRate * 100)}% success rate)`);
          
        } catch (error) {
          console.error(`[ProviderLookup] [Batch ${batchNumber}] Error processing batch:`, error);
        } finally {
          // CRITICAL: Close browser AFTER batch completes (after up to 5 lookups)
          // This ensures we create a new browser for the next batch, avoiding captcha
          if (browser) {
            console.log(`[ProviderLookup] [Batch ${batchNumber}] Closing browser after ${batchSize} lookups`);
            await browser.close();
          }
        }
      }
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
    this.activeBrowsers++;
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
        
        // Requirement 24.2: Wait 500ms between provider lookups in batch
        if (i < batch.length - 1) {
          await this.sleep(500);
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
      this.activeBrowsers--;
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
   * Creates a new browser instance
   */
  private async createBrowser(): Promise<Browser> {
    try {
      console.log('[ProviderLookup] Creating browser instance...');
      const puppeteer = await import('puppeteer');
      
      const launchOptions = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      };
      
      const browser = await puppeteer.default.launch(launchOptions);
      console.log('[ProviderLookup] Browser launched successfully');
      return browser;
    } catch (error) {
      console.error('[ProviderLookup] Failed to create browser:', error);
      throw error;
    }
  }

  /**
   * Looks up provider for a single phone number using the provided browser
   * Requirement 3.1: Use porting.co.za lookup service
   * Requirement 3.7: Return "Unknown" when provider lookup fails
   * 
   * CRITICAL FIX: Wrapped in RetryStrategy.execute() for automatic retry with exponential backoff
   * This matches the OLD working scraper behavior exactly.
   * 
   * @param browser - Browser instance to use
   * @param phoneNumber - Phone number to lookup
   * @returns Provider name or "Unknown"
   */
  async lookupSingleProvider(browser: Browser, phoneNumber: string): Promise<string> {
    return this.retryStrategy.execute(async () => {
      const page = await browser.newPage();

      try {
        // Clean phone number (remove spaces, dashes, etc.)
        const cleanPhone = this.cleanPhoneNumber(phoneNumber);
        
        console.log(`[ProviderLookup] Looking up phone: ${phoneNumber} -> cleaned: ${cleanPhone}`);

        // Navigate directly to the lookup API URL
        const url = `https://www.porting.co.za/PublicWebsite/crdb?msisdn=${cleanPhone}`;
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });

        // Wait for the result span to appear
        await page.waitForSelector('span.p1', { timeout: 5000 });

        // Extract provider name from the span
        const provider = await this.extractProviderFromPage(page);
        
        console.log(`[ProviderLookup] Result for ${phoneNumber}: ${provider}`);

        return provider;

      } catch (error) {
        console.warn(`[ProviderLookup] Lookup failed for ${phoneNumber}:`, error);
        throw error; // Throw to trigger retry
      } finally {
        await page.close();
      }
    });
  }

  /**
   * Extracts provider name from the lookup result page
   * @param page - Puppeteer page with results
   * @returns Provider name or "Unknown"
   */
  private async extractProviderFromPage(page: Page): Promise<string> {
    try {
      // Look for the span.p1 element
      const spanElement = await page.$('span.p1');
      if (!spanElement) {
        console.log('[ProviderLookup] No span.p1 element found');
        return 'Unknown';
      }

      const text = await spanElement.evaluate(el => el.textContent);
      console.log(`[ProviderLookup] Extracted text from page: "${text}"`);
      
      if (!text || text.trim() === '') {
        return 'Unknown';
      }

      // Parse provider from text
      return this.parseProvider(text.trim());

    } catch (error) {
      console.warn('[ProviderLookup] Failed to extract provider from page:', error);
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
   * Cleans up browser resources (no-op now since browsers are closed per batch)
   */
  async cleanup(): Promise<void> {
    // Browsers are now closed after each batch, so nothing to clean up here
    console.log('[ProviderLookup] Cleanup called (browsers already closed per batch)');
  }

  /**
   * Gets the number of active browsers
   */
  getActiveLookups(): number {
    return this.activeBrowsers;
  }
}
