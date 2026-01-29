/**
 * RetryQueue - Manages failed scraper operations with exponential backoff and database persistence
 * 
 * Features:
 * - Enqueue failed operations with metadata (type, data, attempts)
 * - Dequeue operations in time-based order (nextRetryTime)
 * - Exponential backoff calculation: delay = 1000 * 2^attempt ms
 * - Database persistence for durability across restarts
 * - Max retries: 3 attempts
 * 
 * Spec: scraper-robustness-enhancement
 * Phase: 1 - Core Resilience
 */

import { query } from '../db';

/**
 * Retry item types
 */
export type RetryItemType = 'navigation' | 'lookup' | 'extraction';

/**
 * Retry item interface
 */
export interface RetryItem {
  id: string;
  type: RetryItemType;
  data: any;
  attempts: number;
  nextRetryTime: Date;
}

/**
 * Result of a retry operation
 */
export interface RetryResult {
  status: 'success' | 'retrying' | 'failed';
  item: RetryItem;
  finalAttempts: number;
}

/**
 * RetryQueue configuration
 */
export interface RetryQueueConfig {
  maxRetries?: number; // Default: 3
  baseDelay?: number; // Default: 1000ms (1 second)
}

/**
 * RetryQueue class with database persistence
 */
export class RetryQueue {
  private sessionId: string;
  private maxRetries: number;
  private baseDelay: number;

  /**
   * Create a new RetryQueue instance
   * @param sessionId - The scraping session ID
   * @param config - Optional configuration
   */
  constructor(sessionId: string, config: RetryQueueConfig = {}) {
    this.sessionId = sessionId;
    this.maxRetries = config.maxRetries ?? 3;
    this.baseDelay = config.baseDelay ?? 1000;
  }

  /**
   * Calculate exponential backoff delay
   * Formula: delay = baseDelay * 2^attempt ms
   * @param attempts - Current number of attempts
   * @returns Delay in milliseconds
   */
  private calculateBackoffDelay(attempts: number): number {
    return this.baseDelay * Math.pow(2, attempts);
  }

  /**
   * Calculate next retry time based on current attempts
   * @param attempts - Current number of attempts
   * @returns Next retry time as Date
   */
  private calculateNextRetryTime(attempts: number): Date {
    const delay = this.calculateBackoffDelay(attempts);
    return new Date(Date.now() + delay);
  }

  /**
   * Enqueue a failed operation for retry
   * @param item - Retry item without id and nextRetryTime (will be calculated)
   * @returns The enqueued item with id and nextRetryTime
   */
  async enqueue(item: Omit<RetryItem, 'id' | 'nextRetryTime'>): Promise<RetryItem> {
    const nextRetryTime = this.calculateNextRetryTime(item.attempts);

    const result = await query(
      `INSERT INTO scraper_retry_queue 
       (session_id, item_type, item_data, attempts, next_retry_time)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, item_type as type, item_data as data, attempts, next_retry_time`,
      [this.sessionId, item.type, JSON.stringify(item.data), item.attempts, nextRetryTime]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      type: row.type,
      data: row.data,
      attempts: row.attempts,
      nextRetryTime: new Date(row.next_retry_time),
    };
  }

  /**
   * Dequeue the next item ready for retry (ordered by nextRetryTime)
   * Only returns items where nextRetryTime <= now
   * @returns The next retry item or null if queue is empty or no items ready
   */
  async dequeue(): Promise<RetryItem | null> {
    const result = await query(
      `DELETE FROM scraper_retry_queue
       WHERE id = (
         SELECT id FROM scraper_retry_queue
         WHERE session_id = $1 AND next_retry_time <= NOW()
         ORDER BY next_retry_time ASC
         LIMIT 1
       )
       RETURNING id, item_type as type, item_data as data, attempts, next_retry_time`,
      [this.sessionId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      type: row.type,
      data: row.data,
      attempts: row.attempts,
      nextRetryTime: new Date(row.next_retry_time),
    };
  }

  /**
   * Peek at the next item ready for retry without removing it
   * @returns The next retry item or null if queue is empty or no items ready
   */
  async peek(): Promise<RetryItem | null> {
    const result = await query(
      `SELECT id, item_type as type, item_data as data, attempts, next_retry_time
       FROM scraper_retry_queue
       WHERE session_id = $1 AND next_retry_time <= NOW()
       ORDER BY next_retry_time ASC
       LIMIT 1`,
      [this.sessionId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      type: row.type,
      data: row.data,
      attempts: row.attempts,
      nextRetryTime: new Date(row.next_retry_time),
    };
  }

  /**
   * Get the current size of the retry queue for this session
   * @returns Number of items in the queue
   */
  async getQueueSize(): Promise<number> {
    const result = await query(
      `SELECT COUNT(*) as count FROM scraper_retry_queue WHERE session_id = $1`,
      [this.sessionId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Get the number of items ready for retry (nextRetryTime <= now)
   * @returns Number of items ready for retry
   */
  async getReadyCount(): Promise<number> {
    const result = await query(
      `SELECT COUNT(*) as count FROM scraper_retry_queue 
       WHERE session_id = $1 AND next_retry_time <= NOW()`,
      [this.sessionId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Check if an item should be retried based on max retries
   * @param attempts - Current number of attempts
   * @returns True if item should be retried, false if max retries exceeded
   */
  shouldRetry(attempts: number): boolean {
    return attempts < this.maxRetries;
  }

  /**
   * Clear all retry items for this session
   * Useful for cleanup after session completion
   */
  async clear(): Promise<void> {
    await query(
      `DELETE FROM scraper_retry_queue WHERE session_id = $1`,
      [this.sessionId]
    );
  }

  /**
   * Get all retry items for this session (for debugging/monitoring)
   * @returns Array of all retry items
   */
  async getAllItems(): Promise<RetryItem[]> {
    const result = await query(
      `SELECT id, item_type as type, item_data as data, attempts, next_retry_time
       FROM scraper_retry_queue
       WHERE session_id = $1
       ORDER BY next_retry_time ASC`,
      [this.sessionId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      type: row.type,
      data: row.data,
      attempts: row.attempts,
      nextRetryTime: new Date(row.next_retry_time),
    }));
  }

  /**
   * Persist the retry queue state (no-op as we use database)
   * Included for interface compatibility
   */
  async persist(): Promise<void> {
    // No-op: Database persistence is automatic
    // This method exists for interface compatibility
  }

  /**
   * Restore the retry queue state (no-op as we use database)
   * Included for interface compatibility
   */
  async restore(): Promise<void> {
    // No-op: Database persistence is automatic
    // This method exists for interface compatibility
  }

  /**
   * Get queue statistics for monitoring
   * @returns Queue statistics
   */
  async getStats(): Promise<{
    totalItems: number;
    readyItems: number;
    itemsByType: Record<RetryItemType, number>;
    itemsByAttempts: Record<number, number>;
  }> {
    const [totalResult, readyResult, typeResult, attemptsResult] = await Promise.all([
      query(
        `SELECT COUNT(*) as count FROM scraper_retry_queue WHERE session_id = $1`,
        [this.sessionId]
      ),
      query(
        `SELECT COUNT(*) as count FROM scraper_retry_queue 
         WHERE session_id = $1 AND next_retry_time <= NOW()`,
        [this.sessionId]
      ),
      query(
        `SELECT item_type, COUNT(*) as count FROM scraper_retry_queue 
         WHERE session_id = $1 GROUP BY item_type`,
        [this.sessionId]
      ),
      query(
        `SELECT attempts, COUNT(*) as count FROM scraper_retry_queue 
         WHERE session_id = $1 GROUP BY attempts`,
        [this.sessionId]
      ),
    ]);

    const itemsByType: Record<RetryItemType, number> = {
      navigation: 0,
      lookup: 0,
      extraction: 0,
    };
    typeResult.rows.forEach((row) => {
      itemsByType[row.item_type as RetryItemType] = parseInt(row.count, 10);
    });

    const itemsByAttempts: Record<number, number> = {};
    attemptsResult.rows.forEach((row) => {
      itemsByAttempts[row.attempts] = parseInt(row.count, 10);
    });

    return {
      totalItems: parseInt(totalResult.rows[0].count, 10),
      readyItems: parseInt(readyResult.rows[0].count, 10),
      itemsByType,
      itemsByAttempts,
    };
  }

  /**
   * Process a retry item: dequeue, execute operation, and handle result
   * This is the main retry logic that:
   * 1. Dequeues items when nextRetryTime is reached
   * 2. Executes the operation via callback
   * 3. Increments attempt counter on failure
   * 4. Re-enqueues if attempts < maxRetries
   * 5. Logs and discards if max retries exceeded
   * 
   * @param operationCallback - Async function that executes the operation and returns success/failure
   * @returns The retry result with status and item details
   */
  async processRetry(
    operationCallback: (item: RetryItem) => Promise<boolean>
  ): Promise<RetryResult | null> {
    // Dequeue the next ready item
    const item = await this.dequeue();
    
    if (!item) {
      return null; // No items ready for retry
    }

    try {
      // Execute the operation
      const success = await operationCallback(item);

      if (success) {
        // Operation succeeded - log and return success
        console.log(
          `[RetryQueue] Retry successful for ${item.type} after ${item.attempts + 1} attempt(s)`,
          { itemId: item.id, type: item.type, attempts: item.attempts + 1 }
        );
        
        return {
          status: 'success',
          item,
          finalAttempts: item.attempts + 1,
        };
      } else {
        // Operation failed - increment attempts and check if we should retry
        const newAttempts = item.attempts + 1;
        
        if (this.shouldRetry(newAttempts)) {
          // Re-enqueue for another retry
          await this.enqueue({
            type: item.type,
            data: item.data,
            attempts: newAttempts,
          });
          
          console.log(
            `[RetryQueue] Retry failed for ${item.type}, re-enqueuing (attempt ${newAttempts}/${this.maxRetries})`,
            { itemId: item.id, type: item.type, attempts: newAttempts, maxRetries: this.maxRetries }
          );
          
          return {
            status: 'retrying',
            item,
            finalAttempts: newAttempts,
          };
        } else {
          // Max retries exceeded - log and discard
          console.error(
            `[RetryQueue] Max retries exceeded for ${item.type}, discarding item`,
            { itemId: item.id, type: item.type, attempts: newAttempts, maxRetries: this.maxRetries, data: item.data }
          );
          
          return {
            status: 'failed',
            item,
            finalAttempts: newAttempts,
          };
        }
      }
    } catch (error) {
      // Exception during operation - treat as failure
      const newAttempts = item.attempts + 1;
      
      console.error(
        `[RetryQueue] Exception during retry for ${item.type}`,
        { itemId: item.id, type: item.type, attempts: newAttempts, error: error instanceof Error ? error.message : String(error) }
      );
      
      if (this.shouldRetry(newAttempts)) {
        // Re-enqueue for another retry
        await this.enqueue({
          type: item.type,
          data: item.data,
          attempts: newAttempts,
        });
        
        return {
          status: 'retrying',
          item,
          finalAttempts: newAttempts,
        };
      } else {
        // Max retries exceeded - log and discard
        console.error(
          `[RetryQueue] Max retries exceeded for ${item.type} after exception, discarding item`,
          { itemId: item.id, type: item.type, attempts: newAttempts, maxRetries: this.maxRetries }
        );
        
        return {
          status: 'failed',
          item,
          finalAttempts: newAttempts,
        };
      }
    }
  }

  /**
   * Process all ready retry items in the queue
   * Continues processing until no more items are ready
   * 
   * @param operationCallback - Async function that executes the operation and returns success/failure
   * @returns Array of retry results
   */
  async processAllReady(
    operationCallback: (item: RetryItem) => Promise<boolean>
  ): Promise<RetryResult[]> {
    const results: RetryResult[] = [];
    
    // Process items until no more are ready
    while (true) {
      const result = await this.processRetry(operationCallback);
      
      if (!result) {
        break; // No more items ready
      }
      
      results.push(result);
    }
    
    return results;
  }
}
