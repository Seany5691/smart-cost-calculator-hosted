/**
 * NavigationManager - Handles page navigation with exponential backoff and adaptive timeouts
 * 
 * This class provides robust navigation with:
 * - Exponential backoff retry logic (delay = baseDelay * 2^attempt)
 * - Adaptive timeout adjustment based on historical performance
 * - Multiple fallback wait strategies
 * - Comprehensive logging for debugging
 * - Integration with RetryQueue for failed navigations
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */

import type { Page } from 'puppeteer';
import { ErrorLogger } from './error-logger';
import { RetryQueue } from './RetryQueue';

/**
 * Configuration options for NavigationManager
 */
export interface NavigationOptions {
  /** Maximum number of retry attempts (default: 5) */
  maxRetries?: number;
  /** Base delay in milliseconds for exponential backoff (default: 3000) */
  baseDelay?: number;
  /** Minimum timeout in milliseconds (default: 15000) */
  minTimeout?: number;
  /** Maximum timeout in milliseconds (default: 120000) */
  maxTimeout?: number;
  /** Initial timeout in milliseconds (default: 60000) */
  initialTimeout?: number;
  /** Wait strategy to use (default: 'networkidle2') */
  waitStrategy?: 'networkidle2' | 'networkidle0' | 'domcontentloaded' | 'load';
  /** RetryQueue instance for enqueueing failed navigations (optional) */
  retryQueue?: RetryQueue;
}

/**
 * Wait strategies for page navigation, in order of preference
 */
const WAIT_STRATEGIES = [
  'networkidle2',
  'networkidle0',
  'domcontentloaded',
  'load',
] as const;

type WaitStrategy = typeof WAIT_STRATEGIES[number];

/**
 * NavigationManager class
 * Manages page navigation with retry logic, exponential backoff, and adaptive timeouts
 */
export class NavigationManager {
  private recentNavigationTimes: number[] = [];
  private currentTimeout: number;
  private readonly maxHistorySize = 10;
  private readonly errorLogger: ErrorLogger;
  private retryQueue: RetryQueue | null = null;
  
  // Default configuration
  private readonly defaultOptions: Required<Omit<NavigationOptions, 'retryQueue'>> = {
    maxRetries: 5,
    baseDelay: 3000, // 3 seconds
    minTimeout: 15000, // 15 seconds
    maxTimeout: 120000, // 120 seconds
    initialTimeout: 60000, // 60 seconds
    waitStrategy: 'networkidle2',
  };

  constructor(retryQueue?: RetryQueue) {
    this.currentTimeout = this.defaultOptions.initialTimeout;
    this.errorLogger = ErrorLogger.getInstance();
    this.retryQueue = retryQueue || null;
  }

  /**
   * Set the RetryQueue instance for enqueueing failed navigations
   * @param retryQueue - RetryQueue instance
   */
  setRetryQueue(retryQueue: RetryQueue): void {
    this.retryQueue = retryQueue;
  }

  /**
   * Navigate to a URL with retry logic and exponential backoff
   * 
   * Requirement 1.1: Retry with exponential backoff delays (3s, 6s, 12s)
   * Requirement 1.2: Increase timeout from 60s to 90s for second attempt
   * Requirement 1.3: Increase timeout to 120s for third attempt
   * Requirement 1.4: Retry with different wait strategies if domcontentloaded fails
   * Requirement 1.5: Retry with networkidle2, then load strategy
   * Requirement 1.6: Log successful strategy and timeout values
   * Requirement 1.7: Throw error if all strategies exhausted
   * 
   * @param page - Puppeteer page instance
   * @param url - URL to navigate to
   * @param options - Navigation options
   * @returns Promise that resolves when navigation succeeds
   * @throws Error if all retry attempts are exhausted
   */
  async navigateWithRetry(
    page: Page,
    url: string,
    options?: NavigationOptions
  ): Promise<void> {
    const config = { ...this.defaultOptions, ...options };
    const startTime = Date.now();
    
    let lastError: Error | null = null;
    let successfulStrategy: WaitStrategy | null = null;
    let successfulTimeout: number | null = null;

    // Try each wait strategy
    for (const waitStrategy of WAIT_STRATEGIES) {
      // Try with retries for this strategy
      for (let attempt = 0; attempt < config.maxRetries; attempt++) {
        try {
          // Calculate timeout for this attempt
          // Requirement 1.2 & 1.3: Increase timeout on subsequent attempts
          const attemptTimeout = this.calculateAttemptTimeout(
            attempt,
            config.minTimeout,
            config.maxTimeout
          );

          console.log(
            `[NavigationManager] Attempt ${attempt + 1}/${config.maxRetries} ` +
            `with strategy '${waitStrategy}' and timeout ${attemptTimeout}ms for URL: ${url}`
          );

          // Attempt navigation
          await page.goto(url, {
            waitUntil: waitStrategy,
            timeout: attemptTimeout,
          });

          // Success! Record metrics
          const navigationTime = Date.now() - startTime;
          this.recordNavigationTime(navigationTime);
          successfulStrategy = waitStrategy;
          successfulTimeout = attemptTimeout;

          // Requirement 1.6: Log successful strategy and timeout values
          console.log(
            `[NavigationManager] ✓ Navigation successful after ${attempt + 1} attempt(s) ` +
            `using strategy '${waitStrategy}' with timeout ${attemptTimeout}ms ` +
            `(took ${navigationTime}ms)`
          );

          return; // Success!

        } catch (error) {
          lastError = error as Error;
          
          console.warn(
            `[NavigationManager] ✗ Attempt ${attempt + 1}/${config.maxRetries} failed ` +
            `with strategy '${waitStrategy}': ${lastError.message}`
          );

          // If this is not the last attempt for this strategy, apply exponential backoff
          if (attempt < config.maxRetries - 1) {
            // Requirement 1.1: Exponential backoff: delay = baseDelay * 2^attempt
            const delay = config.baseDelay * Math.pow(2, attempt);
            console.log(`[NavigationManager] Waiting ${delay}ms before retry...`);
            await this.sleep(delay);
          }
        }
      }

      // If we get here, all retries for this strategy failed
      // Try next strategy
      console.log(
        `[NavigationManager] All retries exhausted for strategy '${waitStrategy}', ` +
        `trying next strategy...`
      );
    }

    // Requirement 1.7: All strategies exhausted, throw error
    const totalTime = Date.now() - startTime;
    const errorMessage = 
      `Navigation failed after trying all strategies and retries. ` +
      `URL: ${url}, Total time: ${totalTime}ms, Last error: ${lastError?.message}`;
    
    this.errorLogger.logError(errorMessage, lastError, {
      url,
      totalTime,
      strategiesTried: WAIT_STRATEGIES.length,
      retriesPerStrategy: config.maxRetries,
    });

    // Enqueue failed navigation to retry queue if available
    if (this.retryQueue || options?.retryQueue) {
      const queue = options?.retryQueue || this.retryQueue;
      if (queue) {
        try {
          await queue.enqueue({
            type: 'navigation',
            data: { url, options: config },
            attempts: 0,
          });
          
          console.log(
            `[NavigationManager] Failed navigation enqueued to retry queue: ${url}`
          );
        } catch (enqueueError) {
          console.error(
            `[NavigationManager] Failed to enqueue navigation to retry queue`,
            { url, error: enqueueError instanceof Error ? enqueueError.message : String(enqueueError) }
          );
        }
      }
    }

    throw new Error(errorMessage);
  }

  /**
   * Calculate timeout for a specific attempt
   * Increases timeout on subsequent attempts
   * 
   * @param attempt - Current attempt number (0-indexed)
   * @param minTimeout - Minimum timeout
   * @param maxTimeout - Maximum timeout
   * @returns Timeout in milliseconds
   */
  private calculateAttemptTimeout(
    attempt: number,
    minTimeout: number,
    maxTimeout: number
  ): number {
    // Start with adaptive timeout, then increase by 30s per attempt
    const baseTimeout = this.getAdaptiveTimeout();
    const attemptTimeout = baseTimeout + (attempt * 30000); // +30s per attempt
    
    // Enforce bounds
    return Math.max(minTimeout, Math.min(maxTimeout, attemptTimeout));
  }

  /**
   * Adjust timeout based on operation time
   * Increases timeout if operations are slow, decreases if fast
   * 
   * @param operationTime - Time taken for the operation in milliseconds
   */
  adjustTimeout(operationTime: number): void {
    const { minTimeout, maxTimeout } = this.defaultOptions;
    
    // If operation took longer than 80% of current timeout, increase timeout
    if (operationTime > this.currentTimeout * 0.8) {
      this.currentTimeout = Math.min(
        maxTimeout,
        this.currentTimeout + 15000 // Increase by 15s
      );
      console.log(
        `[NavigationManager] Timeout increased to ${this.currentTimeout}ms ` +
        `(operation took ${operationTime}ms)`
      );
    }
    // If operation was fast (< 50% of timeout), decrease timeout
    else if (operationTime < this.currentTimeout * 0.5) {
      this.currentTimeout = Math.max(
        minTimeout,
        this.currentTimeout - 10000 // Decrease by 10s
      );
      console.log(
        `[NavigationManager] Timeout decreased to ${this.currentTimeout}ms ` +
        `(operation took ${operationTime}ms)`
      );
    }
  }

  /**
   * Get the current adaptive timeout
   * Calculates timeout based on recent navigation times
   * 
   * @returns Current adaptive timeout in milliseconds
   */
  getAdaptiveTimeout(): number {
    const { minTimeout, maxTimeout } = this.defaultOptions;
    
    // If we don't have enough history, use current timeout
    if (this.recentNavigationTimes.length < 3) {
      return this.currentTimeout;
    }

    // Calculate average of recent navigation times
    const avgTime = this.recentNavigationTimes.reduce((a, b) => a + b, 0) / 
                    this.recentNavigationTimes.length;
    
    // Set timeout to 2x average time (with some buffer)
    const calculatedTimeout = Math.ceil(avgTime * 2);
    
    // Enforce bounds
    return Math.max(minTimeout, Math.min(maxTimeout, calculatedTimeout));
  }

  /**
   * Record a navigation time for adaptive timeout calculation
   * Maintains a rolling window of the last 10 navigation times
   * 
   * @param time - Navigation time in milliseconds
   */
  private recordNavigationTime(time: number): void {
    this.recentNavigationTimes.push(time);
    
    // Keep only the last 10 times
    if (this.recentNavigationTimes.length > this.maxHistorySize) {
      this.recentNavigationTimes.shift();
    }

    // Adjust timeout based on this operation
    this.adjustTimeout(time);
  }

  /**
   * Get navigation statistics for monitoring
   * 
   * @returns Object with navigation statistics
   */
  getStatistics(): {
    currentTimeout: number;
    averageNavigationTime: number;
    navigationCount: number;
    recentTimes: number[];
  } {
    const avgTime = this.recentNavigationTimes.length > 0
      ? this.recentNavigationTimes.reduce((a, b) => a + b, 0) / this.recentNavigationTimes.length
      : 0;

    return {
      currentTimeout: this.currentTimeout,
      averageNavigationTime: Math.round(avgTime),
      navigationCount: this.recentNavigationTimes.length,
      recentTimes: [...this.recentNavigationTimes],
    };
  }

  /**
   * Reset navigation statistics
   * Useful when starting a new scraping session
   */
  reset(): void {
    this.recentNavigationTimes = [];
    this.currentTimeout = this.defaultOptions.initialTimeout;
    console.log('[NavigationManager] Statistics reset');
  }

  /**
   * Sleep utility for delays
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
