/**
 * RetryStrategy - Implements exponential backoff retry logic
 * 
 * This class provides a configurable retry mechanism with exponential backoff
 * for handling transient failures in scraping operations.
 * 
 * Validates Requirements: 7.1, 7.2, 7.3, 7.4, 24.4
 * Requirement 24.4: Use exponential backoff for retries
 */

export class RetryStrategy {
  private maxAttempts: number;
  private baseDelay: number;

  /**
   * Creates a new RetryStrategy instance
   * 
   * @param maxAttempts - Maximum number of attempts (including initial attempt). Default: 3
   * @param baseDelay - Base delay in milliseconds for exponential backoff. Default: 2000
   */
  constructor(maxAttempts: number = 3, baseDelay: number = 2000) {
    this.maxAttempts = maxAttempts;
    this.baseDelay = baseDelay;
  }

  /**
   * Executes an operation with retry logic and exponential backoff
   * 
   * The delay before attempt N (0-indexed) is calculated as: baseDelay * 2^N
   * - Attempt 0 (initial): no delay
   * - Attempt 1 (first retry): baseDelay * 2^0 = baseDelay
   * - Attempt 2 (second retry): baseDelay * 2^1 = baseDelay * 2
   * - Attempt 3 (third retry): baseDelay * 2^2 = baseDelay * 4
   * 
   * @param operation - Async function to execute with retry logic
   * @returns Promise resolving to the operation result
   * @throws Error with attempt count if all retries are exhausted
   * 
   * Validates Requirements:
   * - 7.1: Retry up to maxAttempts times
   * - 7.2: Wait baseDelay * 2^attempt milliseconds between attempts
   * - 7.3: Throw error with attempt count when retries exhausted
   * - 7.4: Log each retry attempt with delay duration
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | unknown;

    for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
      try {
        // If this is a retry (not the initial attempt), wait with exponential backoff
        if (attempt > 0) {
          const delay = this.calculateDelay(attempt);
          console.log(`[RetryStrategy] Retry attempt ${attempt + 1}/${this.maxAttempts} after ${delay}ms delay`);
          await this.sleep(delay);
        }

        // Execute the operation
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Log the error for this attempt
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[RetryStrategy] Attempt ${attempt + 1}/${this.maxAttempts} failed: ${errorMessage}`);

        // If this was the last attempt, we'll throw after the loop
        if (attempt === this.maxAttempts - 1) {
          break;
        }
      }
    }

    // All retries exhausted, throw error with context
    const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error(
      `Operation failed after ${this.maxAttempts} attempts. Last error: ${errorMessage}`
    );
  }

  /**
   * Calculates the delay for a given attempt using exponential backoff
   * 
   * Formula: baseDelay * 2^attempt
   * 
   * @param attempt - The attempt number (0-indexed)
   * @returns Delay in milliseconds
   */
  private calculateDelay(attempt: number): number {
    // For attempt 0 (initial), no delay
    // For attempt 1 (first retry), delay = baseDelay * 2^0 = baseDelay
    // For attempt 2 (second retry), delay = baseDelay * 2^1 = baseDelay * 2
    // For attempt 3 (third retry), delay = baseDelay * 2^2 = baseDelay * 4
    return this.baseDelay * Math.pow(2, attempt - 1);
  }

  /**
   * Sleeps for the specified duration
   * 
   * @param ms - Duration in milliseconds
   * @returns Promise that resolves after the delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Sets the maximum number of attempts
   * 
   * @param maxAttempts - Maximum number of attempts (including initial attempt)
   */
  setMaxAttempts(maxAttempts: number): void {
    if (maxAttempts < 1) {
      throw new Error('maxAttempts must be at least 1');
    }
    this.maxAttempts = maxAttempts;
  }

  /**
   * Sets the base delay for exponential backoff
   * 
   * @param baseDelay - Base delay in milliseconds
   */
  setBaseDelay(baseDelay: number): void {
    if (baseDelay < 0) {
      throw new Error('baseDelay must be non-negative');
    }
    this.baseDelay = baseDelay;
  }

  /**
   * Gets the current maximum number of attempts
   * 
   * @returns Maximum number of attempts
   */
  getMaxAttempts(): number {
    return this.maxAttempts;
  }

  /**
   * Gets the current base delay
   * 
   * @returns Base delay in milliseconds
   */
  getBaseDelay(): number {
    return this.baseDelay;
  }
}
