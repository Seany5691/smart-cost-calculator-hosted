/**
 * BatchManager - Manages phone number lookups in batches to avoid captcha detection
 * 
 * CRITICAL CONSTRAINT: Batch size must NEVER exceed 5 lookups per batch.
 * This is the most important rule in the entire system for captcha avoidance.
 * 
 * Features:
 * - Fixed maximum batch size of 5 (NEVER EXCEED)
 * - Configurable minimum batch size (default: 3)
 * - Inter-batch delay with randomization (2-5 seconds)
 * - Adaptive batch sizing based on success rate (can only decrease from 5)
 * - Comprehensive validation to prevent exceeding batch size
 * - Integrated captcha detection before each batch
 * 
 * Requirements: 3.1, 3.6, 3.7, 4.3
 * Validates: Property 3.1 (Batch Size Constraint)
 */

import { logger } from '../logger';
import type { Page } from 'puppeteer';
import { CaptchaDetector, CaptchaAction, type CaptchaResponseContext } from './CaptchaDetector';
import { RetryQueue } from './RetryQueue';

/**
 * Configuration options for BatchManager
 */
export interface BatchManagerConfig {
  /** Minimum batch size (default: 3) */
  minBatchSize?: number;
  /** Maximum batch size - ALWAYS 5, cannot be changed (default: 5) */
  maxBatchSize?: number;
  /** Inter-batch delay range in milliseconds [min, max] (default: [2000, 5000]) */
  interBatchDelay?: [number, number];
  /** Success rate threshold for reducing batch size (default: 0.5 = 50%) */
  successRateThreshold?: number;
  /** CaptchaDetector instance for captcha detection (optional) */
  captchaDetector?: CaptchaDetector;
  /** Enable captcha detection before each batch (default: true) */
  enableCaptchaDetection?: boolean;
  /** RetryQueue instance for enqueueing failed lookups (optional) */
  retryQueue?: RetryQueue;
}

/**
 * Represents a provider lookup item to be batched
 */
export interface ProviderLookup {
  phoneNumber: string;
  businessId?: string;
  metadata?: Record<string, any>;
}

/**
 * Result of processing a batch
 */
export interface BatchResult {
  successful: number;
  failed: number;
  results: Map<string, string>;
  successRate: number;
  batchSize: number;
  processingTime: number;
}

/**
 * BatchManager class - Manages batched provider lookups with strict size constraints
 */
export class BatchManager {
  // CRITICAL: Maximum batch size is ALWAYS 5, cannot be changed
  private readonly ABSOLUTE_MAX_BATCH_SIZE = 5;
  
  private currentBatch: ProviderLookup[] = [];
  private batchSize: number;
  private minBatchSize: number;
  private interBatchDelay: [number, number];
  private successRateThreshold: number;
  private captchaDetector: CaptchaDetector | null;
  private enableCaptchaDetection: boolean;
  private retryQueue: RetryQueue | null;
  
  // Rolling success rate tracking (last 10 batches)
  private recentBatchResults: boolean[] = [];
  private readonly MAX_HISTORY_SIZE = 10;
  
  private lastBatchTime: number = 0;
  private totalBatchesProcessed: number = 0;
  private totalLookupsProcessed: number = 0;
  private captchaDetectionCount: number = 0;

  constructor(config: BatchManagerConfig = {}) {
    // Validate and set minimum batch size
    this.minBatchSize = config.minBatchSize ?? 3;
    if (this.minBatchSize < 1) {
      logger.warn('BatchManager: minBatchSize cannot be less than 1, setting to 1', undefined, {
        providedValue: this.minBatchSize,
      });
      this.minBatchSize = 1;
    }
    if (this.minBatchSize > this.ABSOLUTE_MAX_BATCH_SIZE) {
      logger.warn(
        `BatchManager: minBatchSize cannot exceed ${this.ABSOLUTE_MAX_BATCH_SIZE}, setting to ${this.ABSOLUTE_MAX_BATCH_SIZE}`,
        undefined,
        { providedValue: this.minBatchSize }
      );
      this.minBatchSize = this.ABSOLUTE_MAX_BATCH_SIZE;
    }

    // CRITICAL: Enforce absolute maximum batch size of 5
    const requestedMaxBatchSize = config.maxBatchSize ?? this.ABSOLUTE_MAX_BATCH_SIZE;
    if (requestedMaxBatchSize > this.ABSOLUTE_MAX_BATCH_SIZE) {
      logger.error(
        `BatchManager: CRITICAL - Attempted to set maxBatchSize to ${requestedMaxBatchSize}, which exceeds the absolute maximum of ${this.ABSOLUTE_MAX_BATCH_SIZE}. This is a CRITICAL constraint violation!`,
        undefined,
        undefined,
        { requestedValue: requestedMaxBatchSize, enforcedValue: this.ABSOLUTE_MAX_BATCH_SIZE }
      );
      throw new Error(
        `CRITICAL CONSTRAINT VIOLATION: maxBatchSize cannot exceed ${this.ABSOLUTE_MAX_BATCH_SIZE}. Requested: ${requestedMaxBatchSize}`
      );
    }

    // Start with maximum batch size (5)
    this.batchSize = this.ABSOLUTE_MAX_BATCH_SIZE;

    // Set inter-batch delay range
    this.interBatchDelay = config.interBatchDelay ?? [2000, 5000];
    if (this.interBatchDelay[0] < 0 || this.interBatchDelay[1] < this.interBatchDelay[0]) {
      logger.warn('BatchManager: Invalid interBatchDelay range, using default [2000, 5000]', undefined, {
        providedValue: this.interBatchDelay,
      });
      this.interBatchDelay = [2000, 5000];
    }

    // Set success rate threshold
    this.successRateThreshold = config.successRateThreshold ?? 0.5;
    if (this.successRateThreshold < 0 || this.successRateThreshold > 1) {
      logger.warn('BatchManager: successRateThreshold must be between 0 and 1, using default 0.5', undefined, {
        providedValue: this.successRateThreshold,
      });
      this.successRateThreshold = 0.5;
    }

    // Set captcha detector
    this.captchaDetector = config.captchaDetector ?? null;
    this.enableCaptchaDetection = config.enableCaptchaDetection ?? true;

    // Set retry queue
    this.retryQueue = config.retryQueue ?? null;

    logger.info('BatchManager initialized', undefined, {
      batchSize: this.batchSize,
      minBatchSize: this.minBatchSize,
      maxBatchSize: this.ABSOLUTE_MAX_BATCH_SIZE,
      interBatchDelay: this.interBatchDelay,
      successRateThreshold: this.successRateThreshold,
      captchaDetectionEnabled: this.enableCaptchaDetection,
      hasCaptchaDetector: this.captchaDetector !== null,
      hasRetryQueue: this.retryQueue !== null,
    });
  }

  /**
   * Set the RetryQueue instance for enqueueing failed lookups
   * @param retryQueue - RetryQueue instance
   */
  setRetryQueue(retryQueue: RetryQueue): void {
    this.retryQueue = retryQueue;
    logger.info('BatchManager: RetryQueue set', undefined, {
      hasRetryQueue: this.retryQueue !== null,
    });
  }

  /**
   * Add a lookup to the current batch
   * 
   * CRITICAL: This method enforces the batch size constraint.
   * If the batch is full, it will throw an error to prevent exceeding the limit.
   * 
   * @param lookup - Provider lookup to add to batch
   * @throws Error if batch is full
   */
  addToBatch(lookup: ProviderLookup): void {
    // CRITICAL: Validate batch size before adding
    if (this.currentBatch.length >= this.batchSize) {
      const error = new Error(
        `CRITICAL: Cannot add to batch - batch is full (size: ${this.currentBatch.length}, max: ${this.batchSize})`
      );
      logger.error('BatchManager: Attempted to exceed batch size', error, undefined, {
        currentBatchSize: this.currentBatch.length,
        maxBatchSize: this.batchSize,
        absoluteMaxBatchSize: this.ABSOLUTE_MAX_BATCH_SIZE,
      });
      throw error;
    }

    // CRITICAL: Double-check we're not exceeding absolute maximum
    if (this.currentBatch.length >= this.ABSOLUTE_MAX_BATCH_SIZE) {
      const error = new Error(
        `CRITICAL CONSTRAINT VIOLATION: Batch size would exceed absolute maximum of ${this.ABSOLUTE_MAX_BATCH_SIZE}`
      );
      logger.critical('BatchManager: CRITICAL - Absolute batch size constraint violation', error, undefined, {
        currentBatchSize: this.currentBatch.length,
        absoluteMaxBatchSize: this.ABSOLUTE_MAX_BATCH_SIZE,
      });
      throw error;
    }

    this.currentBatch.push(lookup);

    logger.debug('BatchManager: Added lookup to batch', undefined, {
      phoneNumber: lookup.phoneNumber,
      currentBatchSize: this.currentBatch.length,
      maxBatchSize: this.batchSize,
    });
  }

  /**
   * Check if the current batch is full
   * 
   * @returns true if batch is full, false otherwise
   */
  isBatchFull(): boolean {
    return this.currentBatch.length >= this.batchSize;
  }

  /**
   * Check if the current batch is empty
   * 
   * @returns true if batch is empty, false otherwise
   */
  isBatchEmpty(): boolean {
    return this.currentBatch.length === 0;
  }

  /**
   * Get the current batch size (number of items in batch)
   * 
   * @returns Current number of items in batch
   */
  getCurrentBatchCount(): number {
    return this.currentBatch.length;
  }

  /**
   * Get the maximum batch size (3-5)
   * 
   * @returns Current maximum batch size
   */
  getCurrentBatchSize(): number {
    return this.batchSize;
  }

  /**
   * Get the current batch items
   * 
   * @returns Array of provider lookups in current batch
   */
  getCurrentBatch(): ProviderLookup[] {
    return [...this.currentBatch]; // Return copy to prevent external modification
  }

  /**
   * Clear the current batch
   */
  clearBatch(): void {
    logger.debug('BatchManager: Clearing batch', undefined, {
      previousBatchSize: this.currentBatch.length,
    });
    this.currentBatch = [];
  }

  /**
   * Wait for inter-batch delay with randomization
   * 
   * Implements randomized delay between batches (2-5 seconds by default)
   * to avoid detection patterns.
   */
  async waitForInterBatchDelay(): Promise<void> {
    const [minDelay, maxDelay] = this.interBatchDelay;
    const delay = minDelay + Math.random() * (maxDelay - minDelay);
    const delayMs = Math.round(delay);

    logger.debug('BatchManager: Waiting for inter-batch delay', undefined, {
      delayMs,
      minDelay,
      maxDelay,
    });

    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  /**
   * Check for captcha before processing a batch
   * 
   * This method integrates with CaptchaDetector to check for captcha challenges
   * before processing a batch. If captcha is detected, it triggers the appropriate
   * action based on the detection result.
   * 
   * Requirements: 4.3
   * 
   * @param page - Puppeteer page to check for captcha (optional)
   * @param context - Context for executing captcha response actions (optional)
   * @returns true if no captcha detected or captcha handled, false if should abort batch
   */
  async checkForCaptcha(
    page?: Page,
    context?: CaptchaResponseContext
  ): Promise<boolean> {
    // Skip if captcha detection is disabled
    if (!this.enableCaptchaDetection) {
      logger.debug('BatchManager: Captcha detection disabled, skipping check');
      return true;
    }

    // Skip if no captcha detector configured
    if (!this.captchaDetector) {
      logger.debug('BatchManager: No captcha detector configured, skipping check');
      return true;
    }

    logger.debug('BatchManager: Checking for captcha before batch processing', undefined, {
      batchSize: this.currentBatch.length,
      totalBatchesProcessed: this.totalBatchesProcessed,
    });

    try {
      // Check for captcha on page if provided
      if (page) {
        const detectionResult = await this.captchaDetector.detectCaptcha(page);
        
        if (detectionResult.detected) {
          this.captchaDetectionCount++;
          
          logger.warn('BatchManager: Captcha detected before batch processing', undefined, {
            detectionMethod: detectionResult.detectionMethod,
            recommendedAction: detectionResult.recommendedAction,
            captchaDetectionCount: this.captchaDetectionCount,
            details: detectionResult.details,
          });

          // Get the recommended action
          const action = this.captchaDetector.handleCaptcha(detectionResult);

          // Execute the action if context is provided
          if (context) {
            await this.captchaDetector.executeAction(action, context);
          }

          // Handle specific actions that affect batch processing
          if (action === CaptchaAction.REDUCE_BATCH_SIZE) {
            // Reduce batch size to minimum
            if (this.batchSize > this.minBatchSize) {
              const previousSize = this.batchSize;
              this.batchSize = this.minBatchSize;
              
              logger.warn('BatchManager: Reduced batch size due to captcha detection', undefined, {
                previousSize,
                newSize: this.batchSize,
                minBatchSize: this.minBatchSize,
              });
            }
            
            // Continue processing with reduced batch size
            return true;
          } else if (action === CaptchaAction.STOP_SESSION) {
            // Stop processing - return false to abort batch
            logger.error('BatchManager: Stopping batch processing due to captcha detection', undefined, undefined, {
              action: CaptchaAction.STOP_SESSION,
            });
            return false;
          } else if (action === CaptchaAction.PAUSE_AND_ALERT) {
            // Pause and alert - return false to abort batch
            logger.warn('BatchManager: Pausing batch processing due to captcha detection', undefined, {
              action: CaptchaAction.PAUSE_AND_ALERT,
            });
            return false;
          } else if (action === CaptchaAction.INCREASE_DELAY) {
            // Increase delay - adjust inter-batch delay
            const [minDelay, maxDelay] = this.interBatchDelay;
            this.interBatchDelay = [minDelay * 1.5, maxDelay * 1.5];
            
            logger.warn('BatchManager: Increased inter-batch delay due to captcha detection', undefined, {
              previousDelay: [minDelay, maxDelay],
              newDelay: this.interBatchDelay,
            });
            
            // Continue processing with increased delay
            return true;
          }
        }
      }

      // Also check failed lookup rate from recent batches
      if (this.recentBatchResults.length > 0) {
        const successCount = this.recentBatchResults.filter(result => result).length;
        const totalCount = this.recentBatchResults.length;
        
        const failedLookupDetection = this.captchaDetector.detectFailedLookupRate(
          successCount,
          totalCount
        );
        
        if (failedLookupDetection.detected) {
          this.captchaDetectionCount++;
          
          logger.warn('BatchManager: High failure rate detected (possible captcha)', undefined, {
            detectionMethod: failedLookupDetection.detectionMethod,
            recommendedAction: failedLookupDetection.recommendedAction,
            captchaDetectionCount: this.captchaDetectionCount,
            details: failedLookupDetection.details,
          });

          // Reduce batch size if recommended
          if (failedLookupDetection.recommendedAction === CaptchaAction.REDUCE_BATCH_SIZE) {
            if (this.batchSize > this.minBatchSize) {
              const previousSize = this.batchSize;
              this.batchSize = this.minBatchSize;
              
              logger.warn('BatchManager: Reduced batch size due to high failure rate', undefined, {
                previousSize,
                newSize: this.batchSize,
                minBatchSize: this.minBatchSize,
              });
            }
          }
        }
      }

      // No captcha detected or captcha handled successfully
      return true;
    } catch (error) {
      logger.error('BatchManager: Error during captcha detection', error as Error, undefined, {
        batchSize: this.currentBatch.length,
      });
      
      // On error, continue processing (fail open)
      return true;
    }
  }

  /**
   * Process the current batch with a provided processor function
   * 
   * This method:
   * 1. Validates the batch is not empty
   * 2. Checks for captcha (if enabled and page provided)
   * 3. Processes each lookup sequentially using the provided processor
   * 4. Tracks success/failure for each lookup
   * 5. Calculates batch success rate
   * 6. Records the batch result for adaptive sizing
   * 7. Clears the batch after processing
   * 8. Waits for inter-batch delay before returning
   * 
   * @param processor - Async function that processes a single lookup and returns result or null on failure
   * @param page - Optional Puppeteer page for captcha detection
   * @param captchaContext - Optional context for executing captcha response actions
   * @returns BatchResult with processing statistics
   */
  async processBatch(
    processor: (lookup: ProviderLookup) => Promise<string | null>,
    page?: Page,
    captchaContext?: CaptchaResponseContext
  ): Promise<BatchResult> {
    const startTime = Date.now();
    
    // Validate batch is not empty
    if (this.isBatchEmpty()) {
      logger.warn('BatchManager: Attempted to process empty batch', undefined, {
        currentBatchSize: this.currentBatch.length,
      });
      
      return {
        successful: 0,
        failed: 0,
        results: new Map(),
        successRate: 0,
        batchSize: 0,
        processingTime: 0,
      };
    }

    // Check for captcha before processing batch
    const shouldContinue = await this.checkForCaptcha(page, captchaContext);
    if (!shouldContinue) {
      logger.warn('BatchManager: Batch processing aborted due to captcha detection', undefined, {
        batchSize: this.currentBatch.length,
        captchaDetectionCount: this.captchaDetectionCount,
      });
      
      // Return empty result to indicate batch was not processed
      return {
        successful: 0,
        failed: this.currentBatch.length,
        results: new Map(),
        successRate: 0,
        batchSize: this.currentBatch.length,
        processingTime: Date.now() - startTime,
      };
    }

    const batchToProcess = [...this.currentBatch]; // Copy to avoid modification during processing
    const batchSize = batchToProcess.length;
    
    logger.info('BatchManager: Starting batch processing', undefined, {
      batchSize,
      maxBatchSize: this.batchSize,
      totalBatchesProcessed: this.totalBatchesProcessed,
      captchaDetectionCount: this.captchaDetectionCount,
    });

    // CRITICAL: Validate batch size doesn't exceed maximum
    if (batchSize > this.ABSOLUTE_MAX_BATCH_SIZE) {
      const error = new Error(
        `CRITICAL CONSTRAINT VIOLATION: Batch size ${batchSize} exceeds absolute maximum of ${this.ABSOLUTE_MAX_BATCH_SIZE}`
      );
      logger.critical('BatchManager: CRITICAL - Processing batch that exceeds maximum size', error, undefined, {
        batchSize,
        absoluteMaxBatchSize: this.ABSOLUTE_MAX_BATCH_SIZE,
      });
      throw error;
    }

    const results = new Map<string, string>();
    let successful = 0;
    let failed = 0;
    const failedLookups: ProviderLookup[] = []; // Track failed lookups for retry queue

    // Process each lookup sequentially
    for (let i = 0; i < batchToProcess.length; i++) {
      const lookup = batchToProcess[i];
      
      logger.debug('BatchManager: Processing lookup', undefined, {
        lookupIndex: i + 1,
        totalInBatch: batchSize,
        phoneNumber: lookup.phoneNumber,
        businessId: lookup.businessId,
      });

      try {
        const result = await processor(lookup);
        
        if (result !== null) {
          results.set(lookup.phoneNumber, result);
          successful++;
          
          logger.debug('BatchManager: Lookup successful', undefined, {
            lookupIndex: i + 1,
            phoneNumber: lookup.phoneNumber,
            resultLength: result.length,
          });
        } else {
          failed++;
          failedLookups.push(lookup); // Add to failed lookups
          
          logger.warn('BatchManager: Lookup failed (returned null)', undefined, {
            lookupIndex: i + 1,
            phoneNumber: lookup.phoneNumber,
          });
        }
      } catch (error) {
        failed++;
        failedLookups.push(lookup); // Add to failed lookups
        
        logger.error('BatchManager: Lookup threw error', error as Error, undefined, {
          lookupIndex: i + 1,
          phoneNumber: lookup.phoneNumber,
          businessId: lookup.businessId,
        });
      }
    }

    // Enqueue failed lookups to retry queue if available
    if (this.retryQueue && failedLookups.length > 0) {
      logger.info('BatchManager: Enqueueing failed lookups to retry queue', undefined, {
        failedCount: failedLookups.length,
        totalBatchSize: batchSize,
      });

      for (const failedLookup of failedLookups) {
        try {
          await this.retryQueue.enqueue({
            type: 'lookup',
            data: failedLookup,
            attempts: 0,
          });
          
          logger.debug('BatchManager: Failed lookup enqueued', undefined, {
            phoneNumber: failedLookup.phoneNumber,
            businessId: failedLookup.businessId,
          });
        } catch (enqueueError) {
          logger.error('BatchManager: Failed to enqueue lookup to retry queue', enqueueError as Error, undefined, {
            phoneNumber: failedLookup.phoneNumber,
            businessId: failedLookup.businessId,
          });
        }
      }
    }

    const processingTime = Date.now() - startTime;
    const successRate = batchSize > 0 ? successful / batchSize : 0;

    const batchResult: BatchResult = {
      successful,
      failed,
      results,
      successRate,
      batchSize,
      processingTime,
    };

    logger.info('BatchManager: Batch processing complete', undefined, {
      batchNumber: this.totalBatchesProcessed + 1,
      successful,
      failed,
      successRate,
      batchSize,
      processingTime,
      captchaDetectionCount: this.captchaDetectionCount,
    });

    // Record the batch result (updates statistics and adjusts batch size)
    this.recordBatchResult(batchResult);

    // Clear the batch after processing
    this.clearBatch();

    // Wait for inter-batch delay before returning
    await this.waitForInterBatchDelay();

    return batchResult;
  }

  /**
   * Record the result of a batch processing operation
   * 
   * This updates the rolling success rate and may trigger adaptive batch sizing.
   * 
   * @param result - Result of batch processing
   */
  recordBatchResult(result: BatchResult): void {
    this.totalBatchesProcessed++;
    this.totalLookupsProcessed += result.batchSize;
    this.lastBatchTime = Date.now();

    // Record success/failure for rolling average
    const batchSuccessful = result.successRate >= this.successRateThreshold;
    this.recentBatchResults.push(batchSuccessful);

    // Keep only last MAX_HISTORY_SIZE results
    if (this.recentBatchResults.length > this.MAX_HISTORY_SIZE) {
      this.recentBatchResults.shift();
    }

    logger.info('BatchManager: Batch result recorded', undefined, {
      batchNumber: this.totalBatchesProcessed,
      successful: result.successful,
      failed: result.failed,
      successRate: result.successRate,
      batchSize: result.batchSize,
      processingTime: result.processingTime,
      rollingSuccessRate: this.getRollingSuccessRate(),
    });

    // Adjust batch size based on success rate
    this.adjustBatchSize(result.successRate);
  }

  /**
   * Adjust batch size based on success rate
   * 
   * CRITICAL: Can only DECREASE batch size from 5, NEVER increase.
   * This is a key requirement for captcha avoidance - batch size can be reduced
   * from 5 to 3-4 based on success rate, but should NEVER increase back up.
   * 
   * Rules:
   * - If success rate < threshold: reduce batch size by 1 (min: minBatchSize)
   * - NEVER increase batch size (can only decrease)
   * - NEVER exceed absolute maximum of 5
   * 
   * @param successRate - Success rate of last batch (0-1)
   */
  adjustBatchSize(successRate: number): void {
    const previousBatchSize = this.batchSize;
    const rollingSuccessRate = this.getRollingSuccessRate();

    // Reduce batch size if success rate is below threshold
    if (successRate < this.successRateThreshold) {
      if (this.batchSize > this.minBatchSize) {
        this.batchSize--;
        logger.warn('BatchManager: Reducing batch size due to low success rate', undefined, {
          previousBatchSize,
          newBatchSize: this.batchSize,
          successRate,
          threshold: this.successRateThreshold,
          rollingSuccessRate,
        });
      } else {
        logger.warn('BatchManager: Success rate below threshold but already at minimum batch size', undefined, {
          batchSize: this.batchSize,
          minBatchSize: this.minBatchSize,
          successRate,
          threshold: this.successRateThreshold,
        });
      }
    }
    // NOTE: We do NOT increase batch size even if success rate is good.
    // This is a critical requirement - batch size can only decrease from 5.
    else if (successRate >= this.successRateThreshold) {
      logger.debug('BatchManager: Success rate is good, maintaining current batch size', undefined, {
        batchSize: this.batchSize,
        successRate,
        rollingSuccessRate,
        threshold: this.successRateThreshold,
      });
    }

    // CRITICAL: Final validation to ensure we never exceed maximum
    if (this.batchSize > this.ABSOLUTE_MAX_BATCH_SIZE) {
      logger.critical(
        `BatchManager: CRITICAL - Batch size exceeded absolute maximum! Forcing back to ${this.ABSOLUTE_MAX_BATCH_SIZE}`,
        undefined,
        undefined,
        {
          invalidBatchSize: this.batchSize,
          absoluteMaxBatchSize: this.ABSOLUTE_MAX_BATCH_SIZE,
        }
      );
      this.batchSize = this.ABSOLUTE_MAX_BATCH_SIZE;
    }
  }

  /**
   * Get rolling success rate from recent batch results
   * 
   * @returns Success rate (0-1) based on recent batches
   */
  getRollingSuccessRate(): number {
    if (this.recentBatchResults.length === 0) {
      return 1.0; // Assume success if no history
    }

    const successCount = this.recentBatchResults.filter(result => result).length;
    return successCount / this.recentBatchResults.length;
  }

  /**
   * Get statistics about batch processing
   * 
   * @returns Statistics object
   */
  getStatistics(): {
    totalBatchesProcessed: number;
    totalLookupsProcessed: number;
    currentBatchSize: number;
    currentBatchCount: number;
    rollingSuccessRate: number;
    lastBatchTime: number;
    minBatchSize: number;
    maxBatchSize: number;
    captchaDetectionCount: number;
    captchaDetectionEnabled: boolean;
  } {
    return {
      totalBatchesProcessed: this.totalBatchesProcessed,
      totalLookupsProcessed: this.totalLookupsProcessed,
      currentBatchSize: this.batchSize,
      currentBatchCount: this.currentBatch.length,
      rollingSuccessRate: this.getRollingSuccessRate(),
      lastBatchTime: this.lastBatchTime,
      minBatchSize: this.minBatchSize,
      maxBatchSize: this.ABSOLUTE_MAX_BATCH_SIZE,
      captchaDetectionCount: this.captchaDetectionCount,
      captchaDetectionEnabled: this.enableCaptchaDetection,
    };
  }

  /**
   * Reset the batch manager state
   * 
   * Useful for testing or starting a new scraping session
   */
  reset(): void {
    logger.info('BatchManager: Resetting state', undefined, {
      previousStats: this.getStatistics(),
    });

    this.currentBatch = [];
    this.batchSize = this.ABSOLUTE_MAX_BATCH_SIZE;
    this.recentBatchResults = [];
    this.lastBatchTime = 0;
    this.totalBatchesProcessed = 0;
    this.totalLookupsProcessed = 0;
    this.captchaDetectionCount = 0;
  }
}
