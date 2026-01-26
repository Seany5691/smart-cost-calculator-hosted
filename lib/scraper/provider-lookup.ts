/**
 * ProviderLookupService - Looks up phone service providers using porting.co.za
 * 
 * Performs batched lookups to identify telecommunications providers for phone numbers.
 * Handles captcha avoidance by creating new browser instances every 5 lookups.
 * 
 * This is a direct port of the original ProviderLookupService from smart-cost-calculator
 */

import type { Browser, Page } from 'puppeteer';
import { ProviderInfo } from './types';

const MAX_LOOKUPS_PER_BROWSER = 5; // Captcha appears after 5 lookups

export class ProviderLookupService {
  private maxConcurrentBrowsers: number;
  private activeBrowsers: number = 0;

  constructor(config: { maxConcurrentBatches: number }) {
    // maxConcurrentBatches means how many browser instances can run in parallel
    this.maxConcurrentBrowsers = config.maxConcurrentBatches;
  }

  /**
   * Looks up providers for multiple phone numbers
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
    console.log(`[ProviderLookup] Max concurrent browsers: ${this.maxConcurrentBrowsers}`);

    // Split into batches of 5 (max per browser before captcha)
    const batches = this.createBatchesOfFive(validPhones);
    console.log(`[ProviderLookup] Created ${batches.length} batches of up to 5 numbers each`);

    // Process batches with concurrency control (multiple browsers in parallel)
    for (let i = 0; i < batches.length; i += this.maxConcurrentBrowsers) {
      const batchGroup = batches.slice(i, i + this.maxConcurrentBrowsers);
      
      console.log(`[ProviderLookup] Processing batch group ${Math.floor(i / this.maxConcurrentBrowsers) + 1} with ${batchGroup.length} browser(s)`);
      
      const batchPromises = batchGroup.map((batch, index) => 
        this.processBatchWithNewBrowser(batch, results, i + index + 1)
      );

      await Promise.all(batchPromises);
    }

    console.log(`[ProviderLookup] Completed all lookups. Results: ${results.size}`);
    return results;
  }

  /**
   * Creates batches of exactly 5 phone numbers (or less for the last batch)
   * Each batch will use a separate browser instance to avoid captcha
   * @param phoneNumbers - Array of phone numbers
   * @returns Array of batches, each with max 5 numbers
   */
  private createBatchesOfFive(phoneNumbers: string[]): string[][] {
    const batches: string[][] = [];
    
    for (let i = 0; i < phoneNumbers.length; i += MAX_LOOKUPS_PER_BROWSER) {
      batches.push(phoneNumbers.slice(i, i + MAX_LOOKUPS_PER_BROWSER));
    }

    return batches;
  }

  /**
   * Processes a batch of up to 5 phone numbers with a dedicated browser instance
   * Browser is closed after processing to avoid captcha on next batch
   * @param batch - Array of phone numbers (max 5)
   * @param results - Map to store results
   * @param batchNumber - Batch number for logging
   */
  private async processBatchWithNewBrowser(
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
        
        // Small delay between lookups
        await this.sleep(500);
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
   * @param browser - Browser instance to use
   * @param phoneNumber - Phone number to lookup
   * @returns Provider name or "Unknown"
   */
  private async lookupSingleProvider(browser: Browser, phoneNumber: string): Promise<string> {
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
      return 'Unknown';
    } finally {
      await page.close();
    }
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
   * @param text - Text from span.p1 element
   * @returns Provider name
   */
  private parseProvider(text: string): string {
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
   * @param phoneNumber - Raw phone number (e.g., "+27 18 771 2345" or "018 771 2345")
   * @returns Cleaned phone number in SA format (e.g., "0187712345")
   */
  private cleanPhoneNumber(phoneNumber: string): string {
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

/**
 * Helper function to convert ProviderLookupService results to ProviderInfo format
 */
export function convertToProviderInfo(provider: string): ProviderInfo {
  // Map Unknown to Other for type compatibility
  const mappedProvider = provider === 'Unknown' ? 'Other' : provider;
  return {
    provider: mappedProvider as 'Telkom' | 'Vodacom' | 'MTN' | 'Cell C' | 'Other',
    confidence: provider !== 'Unknown' ? 1 : 0,
  };
}

/**
 * Batch lookup for multiple phone numbers (convenience wrapper)
 */
export async function batchLookupProviders(
  phoneNumbers: string[],
  maxConcurrentBatches: number = 2
): Promise<Map<string, ProviderInfo>> {
  const service = new ProviderLookupService({ maxConcurrentBatches });
  const results = await service.lookupProviders(phoneNumbers);
  await service.cleanup();

  // Convert to ProviderInfo format
  const providerInfoMap = new Map<string, ProviderInfo>();
  for (const [phone, provider] of results.entries()) {
    providerInfoMap.set(phone, convertToProviderInfo(provider));
  }

  return providerInfoMap;
}

/**
 * Get provider priority for sorting (Telkom:1, Vodacom:2, MTN:3, Cell C:4, Other:5)
 */
export function getProviderPriority(provider: string): number {
  const priorities: Record<string, number> = {
    Telkom: 1,
    Vodacom: 2,
    MTN: 3,
    'Cell C': 4,
    Other: 5,
    Unknown: 5,
  };

  return priorities[provider] || 5;
}

/**
 * DEPRECATED: Prefix-based identification is NOT reliable due to number porting
 * This function is kept only for testing purposes
 * DO NOT USE in production - always use porting.co.za lookup
 */
export function identifyProviderByPrefix(_phoneNumber: string): ProviderInfo {
  console.warn('[ProviderLookup] WARNING: Prefix-based identification is deprecated and unreliable due to number porting');
  return { provider: 'Other', confidence: 0 };
}
