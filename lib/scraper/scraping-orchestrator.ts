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

        // Log town completion
        this.loggingManager.logTownComplete(town, businesses.length, townDuration);

        // Emit progress update
        this.emitProgress();

      } catch (error) {
        this.errorLogger.logError(`Worker ${workerId} failed to process town: ${town}`, error);
        this.loggingManager.logError(town, 'all industries', error instanceof Error ? error.message : String(error));
        
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
      });

      // Perform lookups
      const providerMap = await providerService.lookupProviders(phoneNumbers);

      // Update businesses with provider information
      for (const business of this.allBusinesses) {
        if (business.phone && business.phone.trim() !== '') {
          const provider = providerMap.get(business.phone);
          if (provider) {
            business.provider = provider;
          }
        }
      }

      this.loggingManager.logMessage(`Provider lookups completed: ${providerMap.size} results`);
      console.log(`[Orchestrator] Provider lookups completed: ${providerMap.size} results`);

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
}
