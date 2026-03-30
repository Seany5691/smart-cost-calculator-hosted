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

import type { BrowserContext, Page } from 'playwright';
import { EventEmitter } from 'events';
import { ScrapedBusiness, ScrapeConfig } from './types';
import { IndustryScraper } from './industry-scraper';
import { ErrorLogger } from './error-logger';
import { browserManager } from './browser-manager';

export class BrowserWorker {
  private workerId: number;
  private config: ScrapeConfig;
  private eventEmitter: EventEmitter;
  private context: BrowserContext | null = null;
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
   * Processes all industries for a town using a PIPELINE approach
   * 
   * NEW APPROACH: Instead of batching industries, we use a worker pool pattern:
   * - Maintain exactly `simultaneousIndustries` workers active at all times
   * - Each worker: pulls industry from queue → scrapes → reports results → pulls next industry
   * - This creates a continuous pipeline with no idle workers
   * - Results are streamed back as they complete (not batched)
   * 
   * UPDATED: If no industries provided, searches for the town/business name directly
   * - With industries: Searches "industry in town" (e.g., "Restaurants in Cape Town")
   * - Without industries: Searches just the town/business name (e.g., "REGAL VANDERBIJLPARK")
   * 
   * Requirement 5.1: Initialize browser instance if not already initialized
   * Requirement 5.2: Process up to simultaneousIndustries in parallel (now as worker pool)
   * Requirement 5.3: Log errors and continue with remaining industries
   * Requirement 5.4: Close browser after town is complete to free resources
   * 
   * @param town - Town name to scrape OR business name if no industries
   * @param industries - Array of industries to scrape (empty array for business-only search)
   * @param onIndustryComplete - Optional callback when each industry completes (for streaming results)
   * @returns Array of all scraped businesses
   */
  async processTown(
    town: string, 
    industries: string[],
    onIndustryComplete?: (industry: string, businesses: ScrapedBusiness[]) => void
  ): Promise<ScrapedBusiness[]> {
    const allBusinesses: ScrapedBusiness[] = [];

    try {
      // Check if stopped before starting
      if (this.isStopped) {
        console.log(`[Worker ${this.workerId}] Stopped before processing town: ${town}`);
        return allBusinesses;
      }

      // Initialize context if not already initialized
      if (!this.context) {
        await this.initContext();
      }

      // If no industries, treat as a single search with empty industry string
      const industriesToProcess = industries.length === 0 ? [''] : industries;

      console.log(`[Worker ${this.workerId}] Processing: ${town} with ${industries.length === 0 ? 'no industry filter' : `${industries.length} industries`} (PIPELINE MODE)`);

      // Create industry queue
      const industryQueue = [...industriesToProcess];
      let queueIndex = 0;

      // Get next industry from queue
      const getNextIndustry = (): string | null => {
        if (queueIndex >= industryQueue.length) {
          return null;
        }
        return industryQueue[queueIndex++];
      };

      // Worker function that processes industries from queue
      const workerFunction = async (workerIndex: number) => {
        const workerBusinesses: ScrapedBusiness[] = [];
        
        while (true) {
          // Check if stopped
          if (this.isStopped) {
            console.log(`[Worker ${this.workerId}] [Pipeline ${workerIndex}] Stopped`);
            break;
          }

          // Get next industry from queue
          const industry = getNextIndustry();
          if (industry === null) {
            console.log(`[Worker ${this.workerId}] [Pipeline ${workerIndex}] No more industries in queue`);
            break;
          }

          const searchDesc = industry === '' ? town : `${industry} in ${town}`;
          console.log(`[Worker ${this.workerId}] [Pipeline ${workerIndex}] Starting: ${searchDesc}`);

          try {
            // Scrape this industry with timeout protection
            const SCRAPE_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes
            
            const businesses = await Promise.race([
              this.scrapeIndustry(town, industry),
              new Promise<ScrapedBusiness[]>((resolve, reject) => {
                const startTime = Date.now();
                const checkInterval = setInterval(() => {
                  if (this.isStopped) {
                    clearInterval(checkInterval);
                    resolve([]);
                  }
                  if (Date.now() - startTime >= SCRAPE_TIMEOUT_MS) {
                    clearInterval(checkInterval);
                    reject(new Error(`Scraping timeout after 3 minutes for ${searchDesc}`));
                  }
                }, 500);
              })
            ]);

            workerBusinesses.push(...businesses);
            console.log(`[Worker ${this.workerId}] [Pipeline ${workerIndex}] Completed: ${searchDesc} - Found ${businesses.length} businesses`);

            // Stream results back immediately via callback
            if (onIndustryComplete) {
              onIndustryComplete(industry, businesses);
            }

          } catch (error) {
            console.error(`[Worker ${this.workerId}] [Pipeline ${workerIndex}] Failed: ${searchDesc} - ${error instanceof Error ? error.message : String(error)}`);
            this.errorLogger.logScrapingError(town, industry || 'business search', error, {
              workerId: this.workerId,
              pipelineWorker: workerIndex,
              timeout: true,
            });
            
            // Stream empty result on error
            if (onIndustryComplete) {
              onIndustryComplete(industry, []);
            }
          }

          // Small delay between industries for this worker (rate limiting)
          if (!this.isStopped) {
            await this.sleep(500);
          }
        }

        return workerBusinesses;
      };

      // Start worker pool (exactly simultaneousIndustries workers)
      const concurrency = this.config.simultaneousIndustries;
      console.log(`[Worker ${this.workerId}] Starting ${concurrency} pipeline workers for ${industriesToProcess.length} industries`);

      const workerPromises: Promise<ScrapedBusiness[]>[] = [];
      for (let i = 0; i < concurrency; i++) {
        // Stagger worker startup slightly to avoid thundering herd
        if (i > 0) {
          await this.sleep(200);
        }
        workerPromises.push(workerFunction(i + 1));
      }

      // Wait for all workers to complete
      const workerResults = await Promise.all(workerPromises);

      // Aggregate results from all workers
      for (const businesses of workerResults) {
        allBusinesses.push(...businesses);
      }

      console.log(`[Worker ${this.workerId}] Completed: ${town} - Total businesses: ${allBusinesses.length} (PIPELINE MODE)`);

    } catch (error) {
      this.errorLogger.logError(
        `Worker ${this.workerId} failed to process: ${town}`,
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
   * Scrapes a single industry for a town
   * 
   * @param businessQuery - Business name to search (e.g., "REGAL VANDERBIJLPARK")
  /**
   * Scrapes a single industry for a town (or just the town if industry is empty)
   * Creates a new page and uses IndustryScraper to extract businesses
   * 
   * @param town - Town name or business name
   * @param industry - Industry name (empty string for business-only search)
   * @returns Array of scraped businesses
   */
  private async scrapeIndustry(town: string, industry: string): Promise<ScrapedBusiness[]> {
    if (!this.context) {
      throw new Error(`Worker ${this.workerId}: Context not initialized`);
    }

    // Check if stopped
    if (this.isStopped) {
      const searchDesc = industry === '' ? town : `${town} - ${industry}`;
      console.log(`[Worker ${this.workerId}] Stopped, skipping ${searchDesc}`);
      return [];
    }

    this.activeScrapes++;
    let page: Page | null = null;

    try {
      // Create new page for this search
      page = await this.context.newPage();
      this.activePages.add(page);

      // OPTIMIZATION: Block unnecessary resources for faster page loads
      await page.route('**/*', (route) => {
        const resourceType = route.request().resourceType();
        // Block images, stylesheets, fonts, and media - we only need HTML and scripts
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          route.abort();
        } else {
          route.continue();
        }
      });

      // Set timeouts to prevent hanging on individual operations
      // Note: These are per-operation timeouts, not total page lifetime
      // Page can stay open for hours as long as each operation completes within timeout
      // Reduced from 60s to 30s for faster failure detection
      page.setDefaultTimeout(30000); // 30 seconds per operation (selector waits, etc.)
      page.setDefaultNavigationTimeout(30000); // 30 seconds per navigation

      // Create scraper and scrape
      const scraper = new IndustryScraper(page, town, industry, this.eventEmitter, () => this.isStopped);
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
   * Initializes the browser context with optimal configuration
   * Requirement 5.5: Throw error with full context if context initialization fails
   * 
   * @throws Error if context fails to initialize
   */
  private async initContext(): Promise<void> {
    try {
      console.log(`[Worker ${this.workerId}] Initializing context...`);

      // Use centralized browser manager to get context
      this.context = await browserManager.getContext(`scraper-worker-${this.workerId}`);

      console.log(`[Worker ${this.workerId}] Context initialized successfully`);

      // Requirement 24.3: Wait 2 seconds after context creation before first request
      await this.sleep(2000);

    } catch (error) {
      // Requirement 5.5: Throw error with full context
      this.errorLogger.logBrowserError(error, {
        workerId: this.workerId,
        operation: 'initContext',
      });

      // Better error serialization for debugging
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null
          ? JSON.stringify(error, Object.getOwnPropertyNames(error))
          : String(error);
      
      throw new Error(
        `Worker ${this.workerId}: Failed to initialize context - ${errorMessage}`
      );
    }
  }

  /**
   * Cleans up context resources
   * Releases context back to manager
   */
  async cleanup(): Promise<void> {
    if (this.context) {
      try {
        console.log(`[Worker ${this.workerId}] Cleaning up context...`);
        
        // Close all active pages first
        for (const page of this.activePages) {
          try {
            await page.close();
          } catch (err) {
            // Ignore errors when closing individual pages
          }
        }
        this.activePages.clear();
        
        // Release context back to manager
        await browserManager.releaseContext(this.context);
        this.context = null;
        console.log(`[Worker ${this.workerId}] Context released successfully`);
      } catch (error) {
        this.errorLogger.logBrowserError(error, {
          workerId: this.workerId,
          operation: 'cleanup',
        });
        console.error(`[Worker ${this.workerId}] Error cleaning up context:`, error);
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
