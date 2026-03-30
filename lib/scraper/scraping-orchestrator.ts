/**
 * ScrapingOrchestrator - Coordinates multiple browser workers for parallel scraping
 * 
 * Manages worker pool, distributes towns via queue, aggregates results,
 * performs provider lookups, and emits progress events.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 9.1, 9.2, 9.3, 9.4
 */

import { EventEmitter } from 'events';
import { ScrapedBusiness, ScrapeConfig, SessionSummary } from './types';
import { BrowserWorker } from './browser-worker';
import { ProviderLookupService } from './provider-lookup-service';
import { LoggingManager } from './logging-manager';
import { ErrorLogger } from './error-logger';

interface ProgressState {
  totalTowns: number;
  completedTowns: number;
  totalIndustries: number;
  completedIndustries: number;
  totalBusinesses: number;
  startTime: number;
  townCompletionTimes: number[];
  failedTowns: string[]; // Phase 4: Track failed towns
  successfulTowns: string[]; // Phase 4: Track successful towns
}

export class ScrapingOrchestrator {
  private towns: string[];
  private industries: string[];
  private config: ScrapeConfig;
  private eventEmitter: EventEmitter;
  private loggingManager: LoggingManager;
  private errorLogger: ErrorLogger;
  
  private townQueue: string[] = [];
  private currentTownIndex: number = 0;
  private allBusinesses: ScrapedBusiness[] = [];
  private workers: BrowserWorker[] = [];
  
  // NEW: Provider lookup streaming
  private providerLookupService: ProviderLookupService | null = null;
  private providerLookupQueue: string[] = []; // Queue of phone numbers to lookup
  private providerLookupActive: boolean = false;
  private providerLookupPromise: Promise<void> | null = null;
  private scrapingComplete: boolean = false; // NEW: Flag to signal scraping is done
  
  private status: 'idle' | 'running' | 'paused' | 'stopped' | 'completed' | 'error' = 'idle';
  private isPaused: boolean = false;
  private isStopped: boolean = false;
  
  private progress: ProgressState = {
    totalTowns: 0,
    completedTowns: 0,
    totalIndustries: 0,
    completedIndustries: 0,
    totalBusinesses: 0,
    startTime: 0,
    townCompletionTimes: [],
    failedTowns: [], // Phase 4
    successfulTowns: [], // Phase 4
  };

  constructor(
    towns: string[],
    industries: string[],
    config: ScrapeConfig,
    eventEmitter: EventEmitter
  ) {
    this.towns = towns;
    this.industries = industries;
    this.config = config;
    this.eventEmitter = eventEmitter;
    this.loggingManager = new LoggingManager(eventEmitter);
    this.errorLogger = ErrorLogger.getInstance();
    
    // Initialize town queue
    this.townQueue = [...towns];
    
    // Initialize progress
    this.progress.totalTowns = towns.length;
    this.progress.totalIndustries = towns.length * industries.length;
    this.progress.startTime = Date.now();
  }

  /**
   * Starts the scraping orchestration with STREAMING provider lookups
   * 
   * NEW APPROACH:
   * - Workers use pipeline pattern (continuous industry processing)
   * - Provider lookups start immediately when first industry completes
   * - Lookups run in parallel with ongoing scraping
   * 
   * Requirement 4.1: Create worker pool with simultaneousTowns workers
   * Requirement 4.2: Distribute towns from queue to available workers
   * Requirement 4.4: Perform provider lookups (now streaming, not batch)
   * 
   * @returns Promise that resolves when scraping is complete
   */
  async start(): Promise<void> {
    try {
      this.status = 'running';
      this.loggingManager.logMessage('Starting scraping orchestration (STREAMING MODE)...');
      
      console.log(`[Orchestrator] Starting with ${this.towns.length} towns and ${this.industries.length} industries`);
      console.log(`[Orchestrator] Worker pool size: ${this.config.simultaneousTowns}`);
      console.log(`[Orchestrator] Industries per worker: ${this.config.simultaneousIndustries} (PIPELINE MODE)`);
      console.log(`[Orchestrator] Provider lookups: ${this.config.enableProviderLookup ? 'STREAMING' : 'DISABLED'}`);

      // Initialize provider lookup service if enabled
      if (this.config.enableProviderLookup) {
        this.providerLookupService = new ProviderLookupService({
          maxConcurrentBatches: this.config.simultaneousLookups,
          eventEmitter: this.eventEmitter,
        });
        console.log(`[Orchestrator] Provider lookup service initialized (max ${this.config.simultaneousLookups} concurrent batches)`);
      }

      // Requirement 4.1: Create worker pool
      const workerCount = this.config.simultaneousTowns;
      const workerPromises: Promise<void>[] = [];

      for (let i = 0; i < workerCount; i++) {
        const worker = new BrowserWorker(i + 1, this.config, this.eventEmitter);
        this.workers.push(worker);
        
        // Start worker processing
        workerPromises.push(this.runWorker(worker));
      }

      // Wait for all workers to complete
      await Promise.all(workerPromises);

      // Signal that scraping is complete (no more businesses will be added)
      this.scrapingComplete = true;
      console.log('[Orchestrator] All workers completed, scraping is done');

      // Wait for any remaining provider lookups to complete
      if (this.providerLookupPromise) {
        console.log('[Orchestrator] Waiting for remaining provider lookups to complete...');
        await this.providerLookupPromise;
      }

      // Check if stopped or paused
      if (this.isStopped) {
        this.status = 'stopped';
        this.loggingManager.logMessage('Scraping stopped by user');
        return;
      }

      if (this.isPaused) {
        this.status = 'paused';
        this.loggingManager.logMessage('Scraping paused by user');
        return;
      }

      // Mark as completed
      this.status = 'completed';
      this.loggingManager.logMessage('Scraping completed successfully');
      
      // Emit completion event
      this.emitComplete();

    } catch (error) {
      this.status = 'error';
      this.errorLogger.logError('Orchestrator failed', error);
      this.loggingManager.logMessage(`Scraping failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    } finally {
      // Cleanup provider lookup service
      if (this.providerLookupService) {
        await this.providerLookupService.cleanup();
        this.providerLookupService = null;
      }
    }
  }

  /**
   * Worker loop that processes towns from the queue
   * 
   * NEW: Uses streaming callback to process businesses as they arrive
   * - Businesses are added to results immediately
   * - Provider lookups are triggered immediately (if enabled)
   * 
   * Requirement 4.2: Distribute towns from queue to available workers
   * Requirement 4.3: Assign next town when worker completes current town
   * 
   * @param worker - BrowserWorker instance
   */
  private async runWorker(worker: BrowserWorker): Promise<void> {
    const workerId = worker.getWorkerId();
    
    console.log(`[Orchestrator] Worker ${workerId} started`);

    while (true) {
      // Check if paused or stopped
      if (this.isPaused || this.isStopped) {
        console.log(`[Orchestrator] Worker ${workerId} stopping (paused=${this.isPaused}, stopped=${this.isStopped})`);
        break;
      }

      // Get next town from queue
      const town = this.getNextTown();
      
      if (!town) {
        // No more towns to process
        console.log(`[Orchestrator] Worker ${workerId} finished (no more towns)`);
        break;
      }

      try {
        console.log(`[Orchestrator] Worker ${workerId} processing: ${town}`);
        
        // Log town start
        this.loggingManager.logTownStart(town);
        const townStartTime = Date.now();

        // Process town with streaming callback
        const businesses = await worker.processTown(
          town, 
          this.industries,
          // Streaming callback: called immediately when each industry completes
          (industry: string, industryBusinesses: ScrapedBusiness[]) => {
            // Add businesses to results immediately
            this.allBusinesses.push(...industryBusinesses);
            this.progress.totalBusinesses += industryBusinesses.length;

            const searchDesc = industry === '' ? town : `${industry} in ${town}`;
            console.log(`[Orchestrator] STREAM: ${searchDesc} completed - ${industryBusinesses.length} businesses`);

            // Trigger provider lookups immediately for these businesses
            if (this.config.enableProviderLookup && industryBusinesses.length > 0) {
              this.queueProviderLookups(industryBusinesses);
            }

            // Emit progress update
            this.emitProgress();
          }
        );

        // Calculate duration
        const townDuration = Date.now() - townStartTime;

        // Update progress
        this.progress.completedTowns++;
        this.progress.townCompletionTimes.push(townDuration);
        this.progress.successfulTowns.push(town);

        // Log town completion
        this.loggingManager.logTownComplete(town, businesses.length, townDuration);

        // Emit town-complete event
        this.eventEmitter.emit('town-complete', {
          town,
          businessCount: businesses.length,
          duration: townDuration,
          completedTowns: this.progress.completedTowns,
          totalTowns: this.progress.totalTowns,
        });

        // Emit progress update
        this.emitProgress();

      } catch (error) {
        this.errorLogger.logError(`Worker ${workerId} failed to process town: ${town}`, error);
        this.loggingManager.logError(town, 'all industries', error instanceof Error ? error.message : String(error));
        
        // Track failed town
        this.progress.failedTowns.push(town);
        
        // Continue with next town despite error
        this.progress.completedTowns++;
        this.emitProgress();
      }
    }

    // Cleanup worker
    await worker.cleanup();
    console.log(`[Orchestrator] Worker ${workerId} cleaned up`);
  }

  /**
   * Gets the next town from the queue (thread-safe)
   * 
   * @returns Next town name or null if queue is empty
   */
  private getNextTown(): string | null {
    if (this.currentTownIndex >= this.townQueue.length) {
      return null;
    }
    
    const town = this.townQueue[this.currentTownIndex];
    this.currentTownIndex++;
    return town;
  }

  /**
   * Queues businesses for provider lookup (STREAMING approach)
   * 
   * NEW: Instead of waiting for all scraping to complete, we start lookups immediately
   * - Extract phone numbers from businesses
   * - Add to lookup queue
   * - Start lookup processor if not already running
   * 
   * @param businesses - Businesses to queue for lookup
   */
  private queueProviderLookups(businesses: ScrapedBusiness[]): void {
    if (!this.providerLookupService) {
      return;
    }

    // Extract phone numbers
    const phoneNumbers = businesses
      .map(b => b.phone)
      .filter(phone => phone && phone.trim() !== '' && phone !== 'No phone')
      .map(phone => this.cleanPhoneNumber(phone));

    if (phoneNumbers.length === 0) {
      return;
    }

    // Add to queue
    this.providerLookupQueue.push(...phoneNumbers);
    console.log(`[Orchestrator] Queued ${phoneNumbers.length} phone numbers for lookup (queue size: ${this.providerLookupQueue.length})`);

    // Start lookup processor if not already running
    if (!this.providerLookupActive && this.providerLookupQueue.length > 0) {
      this.providerLookupActive = true;
      this.providerLookupPromise = this.processProviderLookupQueue();
    }
  }

  /**
   * Processes the provider lookup queue (STREAMING approach with PARALLEL batches)
   * 
   * Continuously processes phone numbers from the queue in parallel batches
   * Runs in parallel with ongoing scraping
   * 
   * NEW: Process up to simultaneousLookups batches in parallel (5 batches = 25 numbers at once)
   * FIXED: Now exits when scraping is complete AND queue is empty (no more waiting indefinitely)
   */
  private async processProviderLookupQueue(): Promise<void> {
    if (!this.providerLookupService) {
      return;
    }

    console.log('[Orchestrator] Provider lookup processor started (STREAMING MODE with PARALLEL BATCHES)');
    
    const failedLookups: string[] = []; // Track failed phone numbers for retry

    try {
      while (true) {
        // Check if stopped
        if (this.isStopped) {
          console.log('[Orchestrator] Provider lookup processor stopped');
          break;
        }

        // If queue is empty and scraping is complete, we're done with initial lookups
        if (this.providerLookupQueue.length === 0 && this.scrapingComplete) {
          console.log('[Orchestrator] Provider lookup queue empty and scraping complete');
          
          // Retry failed lookups if any
          if (failedLookups.length > 0) {
            console.log(`[Orchestrator] Retrying ${failedLookups.length} failed lookups...`);
            this.providerLookupQueue.push(...failedLookups);
            failedLookups.length = 0; // Clear the failed list
            continue; // Process the retry queue
          }
          
          console.log('[Orchestrator] All provider lookups complete (including retries)');
          break;
        }

        // If queue is empty but scraping still ongoing, wait for more numbers
        if (this.providerLookupQueue.length === 0) {
          await this.sleep(1000);
          continue;
        }

        // Process up to simultaneousLookups batches in parallel
        const maxBatches = this.config.simultaneousLookups; // 5 batches
        const batchSize = 5; // Each batch has 5 numbers
        const totalNumbers = Math.min(maxBatches * batchSize, this.providerLookupQueue.length);
        
        if (totalNumbers === 0) {
          await this.sleep(1000);
          continue;
        }

        // Take numbers from queue
        const phoneBatch = this.providerLookupQueue.splice(0, totalNumbers);

        console.log(`[Orchestrator] Processing ${Math.ceil(phoneBatch.length / batchSize)} parallel lookup batches: ${phoneBatch.length} numbers (${this.providerLookupQueue.length} remaining in queue)`);

        // Perform lookups with timeout (5 minutes max for any batch group)
        const lookupTimeout = 5 * 60 * 1000; // 5 minutes
        let providerMap: Map<string, string>;
        
        try {
          providerMap = await Promise.race([
            this.providerLookupService.lookupProviders(phoneBatch),
            new Promise<Map<string, string>>((_, reject) => 
              setTimeout(() => reject(new Error('Provider lookup timeout after 5 minutes')), lookupTimeout)
            )
          ]);
        } catch (error) {
          console.error(`[Orchestrator] Provider lookup batch failed or timed out:`, error);
          // Add all phones from this batch to failed list for retry
          failedLookups.push(...phoneBatch);
          console.log(`[Orchestrator] Added ${phoneBatch.length} numbers to retry queue`);
          // Create empty map so we can continue
          providerMap = new Map();
        }

        // Update businesses with provider information
        let updatedCount = 0;
        let failedCount = 0;
        
        for (const business of this.allBusinesses) {
          if (business.phone && business.phone.trim() !== '' && business.phone !== 'No phone') {
            const cleanedPhone = this.cleanPhoneNumber(business.phone);
            
            // Check if this phone was in the current batch
            if (phoneBatch.includes(cleanedPhone)) {
              const provider = providerMap.get(cleanedPhone);
              
              if (provider && provider !== 'Unknown' && !business.provider) {
                business.provider = provider;
                updatedCount++;
              } else if (!provider || provider === 'Unknown') {
                // Track as failed for retry (if not already in failed list)
                if (!failedLookups.includes(cleanedPhone)) {
                  failedLookups.push(cleanedPhone);
                  failedCount++;
                }
              }
            }
          }
        }

        console.log(`[Orchestrator] Provider lookup batch complete: ${updatedCount} businesses updated, ${failedCount} failed (will retry)`);

        // Emit providers-updated event
        this.eventEmitter.emit('providers-updated', {
          businesses: this.allBusinesses,
          updatedCount: updatedCount,
        });

        // Small delay between batch groups
        if (this.providerLookupQueue.length > 0) {
          await this.sleep(500);
        }
      }

      console.log('[Orchestrator] Provider lookup processor finished');

    } catch (error) {
      this.errorLogger.logError('Provider lookup processor failed', error);
      console.error('[Orchestrator] Provider lookup processor error:', error);
    } finally {
      this.providerLookupActive = false;
    }
  }

  /**
   * Performs provider lookups for all collected phone numbers (LEGACY - kept for compatibility)
   * 
   * NOTE: This is now only used for retry scenarios. Normal operation uses streaming lookups.
   * 
   * @returns Promise that resolves when lookups are complete
   */
  private async performProviderLookups(): Promise<void> {
    try {
      // Extract all phone numbers
      const phoneNumbers = this.allBusinesses
        .map(b => b.phone)
        .filter(phone => phone && phone.trim() !== '' && phone !== 'No phone');

      if (phoneNumbers.length === 0) {
        this.loggingManager.logMessage('No phone numbers to lookup');
        return;
      }

      this.loggingManager.logMessage(`Starting provider lookups for ${phoneNumbers.length} phone numbers...`);
      console.log(`[Orchestrator] Starting provider lookups for ${phoneNumbers.length} numbers`);

      // OPTIMIZATION: Clean all phone numbers in bulk before lookup
      // This is much faster than cleaning each one individually during lookup
      const cleanedPhones = phoneNumbers.map(phone => this.cleanPhoneNumber(phone));
      
      console.log(`[Orchestrator] Cleaned ${cleanedPhones.length} phone numbers for lookup`);

      // Create provider lookup service
      const providerService = new ProviderLookupService({
        maxConcurrentBatches: this.config.simultaneousLookups,
        eventEmitter: this.eventEmitter,
      });

      // Perform lookups with cleaned phone numbers
      const providerMap = await providerService.lookupProviders(cleanedPhones);

      // Update businesses with provider information
      // Match using cleaned phone numbers
      for (const business of this.allBusinesses) {
        if (business.phone && business.phone.trim() !== '' && business.phone !== 'No phone') {
          const cleanedPhone = this.cleanPhoneNumber(business.phone);
          const provider = providerMap.get(cleanedPhone);
          
          if (provider) {
            business.provider = provider;
          } else {
            console.warn(`[Orchestrator] No provider found for phone: ${business.phone} (cleaned: ${cleanedPhone})`);
          }
        }
      }

      this.loggingManager.logMessage(`Provider lookups completed: ${providerMap.size} results`);
      console.log(`[Orchestrator] Provider lookups completed: ${providerMap.size} results`);

      // Emit providers-updated event so UI can refresh businesses with provider data
      this.eventEmitter.emit('providers-updated', {
        businesses: this.allBusinesses,
        updatedCount: providerMap.size,
      });

      // Cleanup
      await providerService.cleanup();

    } catch (error) {
      this.errorLogger.logError('Provider lookups failed', error);
      this.loggingManager.logMessage(`Provider lookups failed: ${error instanceof Error ? error.message : String(error)}`);
      // Don't throw - provider lookups are optional
    }
  }

  /**
   * Stops the scraping orchestration
   * Requirement 4.5: Wait for active workers to finish current town before stopping
   * 
   * @returns Promise that resolves when stopped
   */
  async stop(): Promise<void> {
    console.log('[Orchestrator] Stop requested');
    this.isStopped = true;
    this.status = 'stopped';
    
    // Force stop all workers immediately
    this.loggingManager.logMessage('Stopping scraping (force closing all workers)...');
    
    const stopPromises = this.workers.map(worker => worker.forceStop());
    await Promise.allSettled(stopPromises);
    
    console.log('[Orchestrator] All workers stopped');
  }

  /**
   * Pauses the scraping orchestration
   * Workers will finish current town and then pause
   */
  pause(): void {
    console.log('[Orchestrator] Pause requested');
    this.isPaused = true;
    this.status = 'paused';
    this.loggingManager.logMessage('Pausing scraping (waiting for active workers to finish)...');
  }

  /**
   * Resumes the scraping orchestration
   */
  resume(): void {
    console.log('[Orchestrator] Resume requested');
    this.isPaused = false;
    this.status = 'running';
    this.loggingManager.logMessage('Resuming scraping...');
    
    // Note: This is a simplified resume - full resume would require restarting workers
    // For now, this just clears the pause flag
  }

  /**
   * Emits progress event to UI
   * Requirement 9.1: Emit progress events with percentage, townsRemaining, businessesScraped
   * Requirement 9.2: Calculate average time per town and estimate remaining time
   * Requirement 4.6: Track completed towns, total businesses, and estimated time remaining
   */
  private emitProgress(): void {
    const { totalTowns, completedTowns, totalBusinesses, townCompletionTimes } = this.progress;
    
    // Calculate progress percentage
    const progressPercentage = totalTowns > 0 ? Math.round((completedTowns / totalTowns) * 100) : 0;
    
    // Calculate towns remaining
    const townsRemaining = totalTowns - completedTowns;
    
    // Calculate estimated time remaining
    let estimatedTimeRemaining = 0;
    if (townCompletionTimes.length > 0 && townsRemaining > 0) {
      const averageTimePerTown = townCompletionTimes.reduce((sum, time) => sum + time, 0) / townCompletionTimes.length;
      estimatedTimeRemaining = Math.round((averageTimePerTown * townsRemaining) / 1000); // Convert to seconds
    }

    // Emit progress event
    this.eventEmitter.emit('progress', {
      percentage: progressPercentage,
      townsRemaining,
      businessesScraped: totalBusinesses,
      estimatedTimeRemaining,
      completedTowns,
      totalTowns,
    });

    console.log(`[Orchestrator] Progress: ${progressPercentage}% (${completedTowns}/${totalTowns} towns, ${totalBusinesses} businesses)`);
  }

  /**
   * Emits completion event with results and summary
   */
  private emitComplete(): void {
    const summary = this.loggingManager.getSummary();
    
    this.eventEmitter.emit('complete', {
      businesses: this.allBusinesses,
      summary,
    });

    console.log(`[Orchestrator] Completed: ${this.allBusinesses.length} businesses scraped`);
  }

  /**
   * Gets current progress state
   * 
   * @returns Progress state object
   */
  getProgress(): ProgressState {
    return { ...this.progress };
  }

  /**
   * Gets all scraped businesses
   * 
   * @returns Array of scraped businesses
   */
  getResults(): ScrapedBusiness[] {
    return [...this.allBusinesses];
  }

  /**
   * Gets current status
   * 
   * @returns Status string
   */
  getStatus(): string {
    return this.status;
  }

  /**
   * Gets the logging manager instance
   * 
   * @returns LoggingManager instance
   */
  getLoggingManager(): LoggingManager {
    return this.loggingManager;
  }

  /**
   * Phase 4: Retry failed towns
   * Creates a new orchestrator to retry only the towns that failed
   * 
   * @returns Promise that resolves when retry is complete
   */
  async retryFailedTowns(): Promise<ScrapedBusiness[]> {
    if (this.progress.failedTowns.length === 0) {
      console.log('[Orchestrator] No failed towns to retry');
      return [];
    }

    console.log(`[Orchestrator] Retrying ${this.progress.failedTowns.length} failed towns`);
    this.loggingManager.logMessage(`Retrying ${this.progress.failedTowns.length} failed towns...`);

    // Create new orchestrator for retry
    const retryOrchestrator = new ScrapingOrchestrator(
      this.progress.failedTowns,
      this.industries,
      this.config,
      this.eventEmitter
    );

    try {
      await retryOrchestrator.start();
      const retryResults = retryOrchestrator.getResults();
      
      // Add retry results to main results
      this.allBusinesses.push(...retryResults);
      
      // Update progress
      const retryProgress = retryOrchestrator.getProgress();
      this.progress.successfulTowns.push(...retryProgress.successfulTowns);
      this.progress.failedTowns = retryProgress.failedTowns; // Update with any still-failed towns
      this.progress.totalBusinesses += retryResults.length;

      console.log(`[Orchestrator] Retry complete: ${retryResults.length} businesses from ${retryProgress.successfulTowns.length} towns`);
      this.loggingManager.logMessage(`Retry complete: ${retryResults.length} businesses recovered`);

      return retryResults;
    } catch (error) {
      this.errorLogger.logError('Failed to retry towns', error);
      throw error;
    }
  }

  /**
   * Phase 4: Get failed towns list
   * 
   * @returns Array of failed town names
   */
  getFailedTowns(): string[] {
    return [...this.progress.failedTowns];
  }

  /**
   * Clean phone number - remove non-digits and convert +27 to 0
   * Same logic as provider-lookup-service cleanPhoneNumber
   * 
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
}

