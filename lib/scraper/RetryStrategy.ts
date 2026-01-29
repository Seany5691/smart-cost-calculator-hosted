/**
 * RetryStrategy - Implements exponential backoff retry logic
 * 
 * Provides resilient error handling for transient failures in scraping operations.
 * Uses exponential backoff to avoid overwhelming services during retries.
 * 
 * Copied from OLD working scraper (smart-cost-calculator) to maintain exact behavior.
 */

export class RetryStrategy {
  private maxAttempts: number;
  private baseDelay: number;

  /**
   * Creates a new RetryStrategy instance
   * @param maxAttempts - Maximum number of retry attempts (default: 3)
   * @param baseDelay - Base delay in milliseconds for exponential backoff (default: 2000)
   */
  constructor(maxAttempts: number = 3, baseDelay: number = 2000) {
    this.maxAttempts = maxAttempts;
    this.baseDelay = baseDelay;
  }

  /**
   * Executes an operation with exponential backoff retry logic
   * @param operation - Async function to execute
   * @returns Promise resolving to the operation result
   * @throws Error after max retries exceeded
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | unknown;

    for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // If this was the last attempt, propagate the error
        if (attempt === this.maxAttempts - 1) {
          break;
        }

        // Calculate exponential backoff delay: baseDelay * 2^attempt
        const delay = this.baseDelay * Math.pow(2, attempt);
        
        console.warn(
          `Retry attempt ${attempt + 1}/${this.maxAttempts} failed. ` +
          `Retrying in ${delay}ms...`,
          error
        );

        // Wait before next retry
        await this.sleep(delay);
      }
    }

    // All retries exhausted, throw the last error
    throw new Error(
      `Operation failed after ${this.maxAttempts} attempts: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`
    );
  }

  /**
   * Sleep utility for delays
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Updates the max attempts configuration
   * @param maxAttempts - New max attempts value
   */
  setMaxAttempts(maxAttempts: number): void {
    this.maxAttempts = maxAttempts;
  }

  /**
   * Updates the base delay configuration
   * @param baseDelay - New base delay in milliseconds
   */
  setBaseDelay(baseDelay: number): void {
    this.baseDelay = baseDelay;
  }

  /**
   * Gets current max attempts configuration
   */
  getMaxAttempts(): number {
    return this.maxAttempts;
  }

  /**
   * Gets current base delay configuration
   */
  getBaseDelay(): number {
    return this.baseDelay;
  }
}

