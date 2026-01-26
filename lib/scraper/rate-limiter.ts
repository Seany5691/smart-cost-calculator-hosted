/**
 * Rate Limiter with Exponential Backoff
 * Implements rate limiting and retry logic for scraping operations
 */

export interface RateLimiterConfig {
  requestsPerSecond: number;
  maxRetries: number;
  initialBackoffMs: number;
  maxBackoffMs: number;
}

export class RateLimiter {
  private config: RateLimiterConfig;
  private lastRequestTime: number = 0;
  private requestQueue: Array<() => void> = [];
  private isProcessing: boolean = false;

  constructor(config?: Partial<RateLimiterConfig>) {
    this.config = {
      requestsPerSecond: config?.requestsPerSecond || 1,
      maxRetries: config?.maxRetries || 3,
      initialBackoffMs: config?.initialBackoffMs || 1000,
      maxBackoffMs: config?.maxBackoffMs || 30000,
    };
  }

  /**
   * Execute a function with rate limiting
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await this.executeWithRetry(fn);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process the request queue
   */
  private async processQueue(): Promise<void> {
    if (this.requestQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;

    const now = Date.now();
    const minInterval = 1000 / this.config.requestsPerSecond;
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < minInterval) {
      await this.sleep(minInterval - timeSinceLastRequest);
    }

    const request = this.requestQueue.shift();
    if (request) {
      this.lastRequestTime = Date.now();
      await request();
    }

    // Continue processing queue
    this.processQueue();
  }

  /**
   * Execute function with retry logic and exponential backoff
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    attempt: number = 0
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      if (attempt >= this.config.maxRetries) {
        throw new Error(
          `Max retries (${this.config.maxRetries}) exceeded: ${error.message}`
        );
      }

      // Calculate backoff time with exponential increase
      const backoffMs = Math.min(
        this.config.initialBackoffMs * Math.pow(2, attempt),
        this.config.maxBackoffMs
      );

      console.warn(
        `Attempt ${attempt + 1} failed, retrying in ${backoffMs}ms:`,
        error.message
      );

      await this.sleep(backoffMs);

      return this.executeWithRetry(fn, attempt + 1);
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.requestQueue.length;
  }

  /**
   * Clear the queue
   */
  clearQueue(): void {
    this.requestQueue = [];
  }
}

/**
 * Singleton rate limiter instance
 */
let rateLimiterInstance: RateLimiter | null = null;

export function getRateLimiter(config?: Partial<RateLimiterConfig>): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter(config);
  }
  return rateLimiterInstance;
}

export function resetRateLimiter(): void {
  rateLimiterInstance = null;
}
