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
   * Starts the scraping orchestration
   * Requirement 4.1: Create worker pool with simultaneousTowns workers
   * Requirement 4.2: Distribute towns from queue to available workers
   * Requirement 4.4: Perform provider lookups after all towns are processed
   * 
   * @returns Promise that resolves when scraping is complete
   */
  async start(): Promise<void> {
    try {
      this.status = 'running';
      this.loggingManager.logMessage('Starting scraping orchestration...');
      
      console.log(`[Orchestrator] Starting with ${this.towns.length} towns and ${this.industries.length} industries`);
      console.log(`[Orchestrator] Worker pool size: ${this.config.simultaneousTowns}`);
      console.log(`[Orchestrator] Industries per worker: ${this.config.simultaneousIndustries}`);

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

      // Requirement 4.4: Perform provider lookups after scraping completes
      await this.performProviderLookups();

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
    }
  }

  /**
   * Worker loop that processes towns from the queue
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

        // Process town with all industries
        const businesses = await worker.processTown(town, this.industries);

        // Calculate duration
        const townDuration = Date.now() - townStartTime;

        // Add businesses to results
        this.allBusinesses.push(...businesses);

        // Update progress
        this.progress.completedTowns++;
        this.progress.totalBusinesses += businesses.length;
        this.progress.townCompletionTimes.push(townDuration);
        this.progress.successfulTowns.push(town); // Phase 4: Track success

        // Log town completion
        this.loggingManager.logTownComplete(town, businesses.length, townDuration);

        // Emit town-complete event (Phase 2)
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
        
        // Phase 4: Track failed town
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
   * Performs provider lookups for all collected phone numbers
   * Requirement 4.4: Perform provider lookups after all towns are processed
   * 
   * @returns Promise that resolves when lookups are complete
   */
  private async performProviderLookups(): Promise<void> {
    try {
      // Extract all phone numbers
      const phoneNumbers = this.allBusinesses
        .map(b => b.phone)
        .filter(phone => phone && phone.trim() !== '');

      if (phoneNumbers.length === 0) {
        this.loggingManager.logMessage('No phone numbers to lookup');
        return;
      }

      this.loggingManager.logMessage(`Starting provider lookups for ${phoneNumbers.length} phone numbers...`);
      console.log(`[Orchestrator] Starting provider lookups for ${phoneNumbers.length} numbers`);

      // Create provider lookup service
      const providerService = new ProviderLookupService({
        maxConcurrentBatches: this.config.simultaneousLookups,
        eventEmitter: this.eventEmitter,
      });

      // Perform lookups
      const providerMap = await providerService.lookupProviders(phoneNumbers);

      // Update businesses with provider information
      for (const business of this.allBusinesses) {
        if (business.phone && business.phone.trim() !== '') {
          // Try exact match first
          let provider = providerMap.get(business.phone);
          
          // If no exact match, try cleaned version (remove spaces, dashes, etc.)
          if (!provider) {
            const cleanedPhone = business.phone.replace(/\D/g, '');
            // Try to find a match with cleaned phone number
            for (const [mapPhone, mapProvider] of providerMap.entries()) {
              const cleanedMapPhone = mapPhone.replace(/\D/g, '');
              if (cleanedPhone === cleanedMapPhone) {
                provider = mapProvider;
                break;
              }
            }
          }
          
          if (provider) {
            business.provider = provider;
          } else {
            console.warn(`[Orchestrator] No provider found for phone: ${business.phone}`);
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
    
    // Workers will check isStopped flag and stop after current town
    this.loggingManager.logMessage('Stopping scraping (waiting for active workers to finish)...');
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
}
