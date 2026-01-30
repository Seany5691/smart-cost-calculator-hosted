/**
 * BrowserWorker - Manages a single browser instance for scraping towns
 * 
 * Each worker processes all industries for assigned towns with concurrency control.
 * Handles browser lifecycle, error recovery, and resource cleanup.
 * 
 * Rate Limiting (Requirements 24.1, 24.3):
 * - Waits 1 second between industry scrape batches (Req 24.1)
 * - Waits 2 seconds after browser creation before first request (Req 24.3)
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 24.1, 24.3
 */

import type { Browser, Page } from 'puppeteer';
import { EventEmitter } from 'events';
import { ScrapedBusiness, ScrapeConfig } from './types';
import { IndustryScraper } from './industry-scraper';
import { ErrorLogger } from './error-logger';

export class BrowserWorker {
  private workerId: number;
  private config: ScrapeConfig;
  private eventEmitter: EventEmitter;
  private browser: Browser | null = null;
  private errorLogger: ErrorLogger;
  private activeScrapes: number = 0;
  private isStopped: boolean = false;
  private activePages: Set<Page> = new Set();

  constructor(
    workerId: number,
    config: ScrapeConfig,
    eventEmitter: EventEmitter
  ) {
    this.workerId = workerId;
    this.config = config;
    this.eventEmitter = eventEmitter;
    this.errorLogger = ErrorLogger.getInstance();
  }

  /**
   * Processes all industries for a town
   * 
   * UPDATED: If no industries provided, treats town as a business search query
   * - With industries: Searches "industry in town" (e.g., "Restaurants in Cape Town")
   * - Without industries: Searches exact business name (e.g., "REGAL VANDERBIJLPARK")
   * 
   * Requirement 5.1: Initialize browser instance if not already initialized
   * Requirement 5.2: Process up to simultaneousIndustries in parallel
   * Requirement 5.3: Log errors and continue with remaining industries
   * Requirement 5.4: Close browser after town is complete to free resources
   * 
   * @param town - Town name to scrape OR business name if no industries
   * @param industries - Array of industries to scrape (empty for business-only search)
   * @returns Array of all scraped businesses
   */
  async processTown(town: string, industries: string[]): Promise<ScrapedBusiness[]> {
    const allBusinesses: ScrapedBusiness[] = [];

    try {
      // Check if stopped before starting
      if (this.isStopped) {
        console.log(`[Worker ${this.workerId}] Stopped before processing town: ${town}`);
        return allBusinesses;
      }

      // Initialize browser if not already initialized
      if (!this.browser) {
        await this.initBrowser();
      }

      // UPDATED: Handle business-only search (no industries selected)
      if (!industries || industries.length === 0) {
        console.log(`[Worker ${this.workerId}] Processing business search: ${town}`);
        
        // Search for the business name directly
        const businesses = await this.scrapeBusinessDirect(town);
        allBusinesses.push(...businesses);
        
        console.log(`[Worker ${this.workerId}] Completed business search: ${town} - Found ${businesses.length} businesses`);
        return allBusinesses;
      }

      console.log(`[Worker ${this.workerId}] Processing town: ${town} with ${industries.length} industries`);

      // Process industries with concurrency control
      const concurrency = this.config.simultaneousIndustries;
      
      for (let i = 0; i < industries.length; i += concurrency) {
        // Check if stopped during processing
        if (this.isStopped) {
          console.log(`[Worker ${this.workerId}] Stopped during town processing: ${town}`);
          break;
        }

        const industryBatch = industries.slice(i, i + concurrency);
        
        console.log(`[Worker ${this.workerId}] Processing industry batch ${Math.floor(i / concurrency) + 1}: ${industryBatch.join(', ')}`);

        // Process batch in parallel
        const batchPromises = industryBatch.map(industry =>
          this.scrapeIndustry(town, industry)
        );

        const batchResults = await Promise.allSettled(batchPromises);

        // Collect successful results and log failures
        for (let j = 0; j < batchResults.length; j++) {
          const result = batchResults[j];
          const industry = industryBatch[j];

          if (result.status === 'fulfilled') {
            allBusinesses.push(...result.value);
            console.log(`[Worker ${this.workerId}] ${town} - ${industry}: Found ${result.value.length} businesses`);
          } else {
            // Requirement 5.3: Log error and continue with remaining industries
            this.errorLogger.logScrapingError(town, industry, result.reason, {
              workerId: this.workerId,
            });
            console.error(`[Worker ${this.workerId}] ${town} - ${industry}: Failed - ${result.reason.message}`);
          }
        }

        // Requirement 24.1: Wait 1 second between industry scrapes to avoid rate limiting
        if (i + concurrency < industries.length && !this.isStopped) {
          await this.sleep(1000);
        }
      }

      console.log(`[Worker ${this.workerId}] Completed town: ${town} - Total businesses: ${allBusinesses.length}`);

    } catch (error) {
      this.errorLogger.logError(
        `Worker ${this.workerId} failed to process town: ${town}`,
        error,
        { workerId: this.workerId, town }
      );
      throw error;
    } finally {
      // Requirement 5.4: Close browser after town is complete to free resources
      await this.cleanup();
    }

    return allBusinesses;
  }

  /**
   * Scrapes a business directly by name (no industry filter)
   * Used when no industries are selected - searches for exact business name
   * 
   * @param businessQuery - Business name to search (e.g., "REGAL VANDERBIJLPARK")
   * @returns Array of scraped businesses
   */
  private async scrapeBusinessDirect(businessQuery: string): Promise<ScrapedBusiness[]> {
    if (!this.browser) {
      throw new Error(`Worker ${this.workerId}: Browser not initialized`);
    }

    // Check if stopped
    if (this.isStopped) {
      console.log(`[Worker ${this.workerId}] Stopped, skipping business search: ${businessQuery}`);
      return [];
    }

    this.activeScrapes++;
    let page: Page | null = null;

    try {
      // Create new page for this business search
      page = await this.browser.newPage();
      this.activePages.add(page);

      // Set viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Use BusinessLookupScraper for direct business search
      const { BusinessLookupScraper } = await import('./business-lookup-scraper');
      const scraper = new BusinessLookupScraper(page, businessQuery);
      const businesses = await scraper.scrape();

      return businesses;

    } catch (error) {
      // Don't log errors if we're stopped (expected behavior)
      if (!this.isStopped) {
        this.errorLogger.logError(
          `Worker ${this.workerId} failed to scrape business: ${businessQuery}`,
          error,
          { workerId: this.workerId, businessQuery }
        );
      }
      throw error;
    } finally {
      // Always close the page
      if (page) {
        this.activePages.delete(page);
        try {
          await page.close();
        } catch (err) {
          // Ignore errors when closing page (might already be closed)
        }
      }
      this.activeScrapes--;
    }
  }

  /**
   * Scrapes a single industry for a town
   * Creates a new page and uses IndustryScraper to extract businesses
   * 
   * @param town - Town name
   * @param industry - Industry name
   * @returns Array of scraped businesses
   */
  private async scrapeIndustry(town: string, industry: string): Promise<ScrapedBusiness[]> {
    if (!this.browser) {
      throw new Error(`Worker ${this.workerId}: Browser not initialized`);
    }

    // Check if stopped
    if (this.isStopped) {
      console.log(`[Worker ${this.workerId}] Stopped, skipping ${town} - ${industry}`);
      return [];
    }

    this.activeScrapes++;
    let page: Page | null = null;

    try {
      // Create new page for this industry
      page = await this.browser.newPage();
      this.activePages.add(page);

      // Set viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Create scraper and scrape
      const scraper = new IndustryScraper(page, town, industry, this.eventEmitter);
      const businesses = await scraper.scrape();

      return businesses;

    } catch (error) {
      // Don't log errors if we're stopped (expected behavior)
      if (!this.isStopped) {
        this.errorLogger.logScrapingError(town, industry, error, {
          workerId: this.workerId,
        });
      }
      throw error;
    } finally {
      // Always close the page
      if (page) {
        this.activePages.delete(page);
        try {
          await page.close();
        } catch (err) {
          // Ignore errors when closing page (might already be closed)
        }
      }
      this.activeScrapes--;
    }
  }

  /**
   * Initializes the browser instance with optimal configuration
   * Requirement 5.5: Throw error with full context if browser initialization fails
   * 
   * @throws Error if browser fails to launch
   */
  private async initBrowser(): Promise<void> {
    try {
      console.log(`[Worker ${this.workerId}] Initializing browser...`);

      const puppeteer = await import('puppeteer');

      // Optimal browser configuration for serverless environments
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
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
        ],
      };

      this.browser = await puppeteer.default.launch(launchOptions);

      console.log(`[Worker ${this.workerId}] Browser initialized successfully`);

      // Requirement 24.3: Wait 2 seconds after browser creation before first request
      await this.sleep(2000);

    } catch (error) {
      // Requirement 5.5: Throw error with full context
      this.errorLogger.logBrowserError(error, {
        workerId: this.workerId,
        operation: 'initBrowser',
      });

      throw new Error(
        `Worker ${this.workerId}: Failed to initialize browser - ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Cleans up browser resources
   * Closes browser and releases all resources
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      try {
        console.log(`[Worker ${this.workerId}] Closing browser...`);
        
        // Close all active pages first
        for (const page of this.activePages) {
          try {
            await page.close();
          } catch (err) {
            // Ignore errors when closing individual pages
          }
        }
        this.activePages.clear();
        
        await this.browser.close();
        this.browser = null;
        console.log(`[Worker ${this.workerId}] Browser closed successfully`);
      } catch (error) {
        this.errorLogger.logBrowserError(error, {
          workerId: this.workerId,
          operation: 'cleanup',
        });
        console.error(`[Worker ${this.workerId}] Error closing browser:`, error);
      }
    }
  }

  /**
   * Forcefully stops the worker and closes all resources
   * Used when user clicks stop button
   */
  async forceStop(): Promise<void> {
    console.log(`[Worker ${this.workerId}] Force stopping...`);
    this.isStopped = true;
    
    // Close all active pages immediately to abort ongoing requests
    for (const page of this.activePages) {
      try {
        await page.close();
      } catch (err) {
        // Ignore errors
      }
    }
    this.activePages.clear();
    
    // Close browser
    await this.cleanup();
  }

  /**
   * Gets the number of active scrapes
   * @returns Number of active scrapes
   */
  getActiveScrapes(): number {
    return this.activeScrapes;
  }

  /**
   * Gets the worker ID
   * @returns Worker ID
   */
  getWorkerId(): number {
    return this.workerId;
  }

  /**
   * Sleep utility for delays
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
