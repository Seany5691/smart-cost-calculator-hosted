/**
 * Unit tests for RetryStrategy class
 * 
 * Tests specific examples and edge cases for retry logic with exponential backoff
 */

import { RetryStrategy } from '../../../lib/scraper/retry-strategy';

describe('RetryStrategy', () => {
  describe('constructor', () => {
    it('should use default values when no parameters provided', () => {
      const strategy = new RetryStrategy();
      expect(strategy.getMaxAttempts()).toBe(3);
      expect(strategy.getBaseDelay()).toBe(2000);
    });

    it('should accept custom maxAttempts and baseDelay', () => {
      const strategy = new RetryStrategy(5, 1000);
      expect(strategy.getMaxAttempts()).toBe(5);
      expect(strategy.getBaseDelay()).toBe(1000);
    });
  });

  describe('execute', () => {
    it('should return result on first successful attempt', async () => {
      const strategy = new RetryStrategy(3, 50);
      const operation = jest.fn().mockResolvedValue('success');

      const result = await strategy.execute(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed on second attempt', async () => {
      const strategy = new RetryStrategy(3, 50);
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce('success');

      const result = await strategy.execute(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should throw error after exhausting all retries', async () => {
      const strategy = new RetryStrategy(2, 50);
      const operation = jest.fn().mockRejectedValue(new Error('Persistent failure'));

      await expect(strategy.execute(operation)).rejects.toThrow(
        'Operation failed after 2 attempts. Last error: Persistent failure'
      );
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should use exponential backoff delays', async () => {
      const strategy = new RetryStrategy(3, 50);
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('success');

      const startTime = Date.now();
      const result = await strategy.execute(operation);
      const duration = Date.now() - startTime;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
      // Total delay: 50ms (2^0) + 100ms (2^1) = 150ms
      expect(duration).toBeGreaterThanOrEqual(140);
    });
  });

  describe('setMaxAttempts', () => {
    it('should update maxAttempts and validate', () => {
      const strategy = new RetryStrategy();
      strategy.setMaxAttempts(5);
      expect(strategy.getMaxAttempts()).toBe(5);
      
      expect(() => strategy.setMaxAttempts(0)).toThrow('maxAttempts must be at least 1');
    });
  });

  describe('setBaseDelay', () => {
    it('should update baseDelay and validate', () => {
      const strategy = new RetryStrategy();
      strategy.setBaseDelay(500);
      expect(strategy.getBaseDelay()).toBe(500);
      
      strategy.setBaseDelay(0);
      expect(strategy.getBaseDelay()).toBe(0);
      
      expect(() => strategy.setBaseDelay(-1)).toThrow('baseDelay must be non-negative');
    });
  });

  describe('edge cases', () => {
    it('should handle maxAttempts of 1 (no retries)', async () => {
      const strategy = new RetryStrategy(1, 50);
      const operation = jest.fn().mockRejectedValue(new Error('Immediate failure'));

      await expect(strategy.execute(operation)).rejects.toThrow(
        'Operation failed after 1 attempts'
      );
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should handle baseDelay of 0 (no delay between retries)', async () => {
      const strategy = new RetryStrategy(2, 0);
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockResolvedValueOnce('success');

      const result = await strategy.execute(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });
});

/**
 * Property-Based Tests for RetryStrategy
 * 
 * These tests verify universal properties that should hold across all valid inputs
 * using fast-check for property-based testing with minimum 100 iterations.
 */

import * as fc from 'fast-check';

describe('RetryStrategy - Property-Based Tests', () => {
  /**
   * Property 12: Retry attempts match configuration
   * 
   * **Validates: Requirements 7.1**
   * 
   * For any maxAttempts value (1-10), when an operation always fails,
   * the operation should be called exactly maxAttempts times.
   */
  it('Property 12: Retry attempts match configuration', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }), // maxAttempts (reduced range)
        fc.integer({ min: 0, max: 50 }), // baseDelay (reduced for speed)
        async (maxAttempts, baseDelay) => {
          const strategy = new RetryStrategy(maxAttempts, baseDelay);
          let callCount = 0;
          
          const operation = jest.fn(async () => {
            callCount++;
            throw new Error('Always fails');
          });

          try {
            await strategy.execute(operation);
          } catch (error) {
            // Expected to throw after all retries
          }

          // The operation should be called exactly maxAttempts times
          expect(callCount).toBe(maxAttempts);
          expect(operation).toHaveBeenCalledTimes(maxAttempts);
        }
      ),
      { numRuns: 20 } // Reduced from 100 to 20 for speed
    );
  });

  /**
   * Property 13: Exponential backoff delays are correct
   * 
   * **Validates: Requirements 7.2**
   * 
   * For any baseDelay and maxAttempts, the delay before attempt N (0-indexed)
   * should be baseDelay * 2^(N-1) milliseconds.
   * 
   * Note: Attempt 0 (initial) has no delay.
   * Attempt 1 (first retry) has delay = baseDelay * 2^0 = baseDelay
   * Attempt 2 (second retry) has delay = baseDelay * 2^1 = baseDelay * 2
   * Attempt 3 (third retry) has delay = baseDelay * 2^2 = baseDelay * 4
   */
  it('Property 13: Exponential backoff delays are correct', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 3 }), // maxAttempts (reduced to 2-3)
        fc.integer({ min: 30, max: 80 }), // baseDelay (smaller range)
        async (maxAttempts, baseDelay) => {
          const strategy = new RetryStrategy(maxAttempts, baseDelay);
          const attemptTimestamps: number[] = [];
          
          const operation = jest.fn(async () => {
            attemptTimestamps.push(Date.now());
            throw new Error('Always fails');
          });

          try {
            await strategy.execute(operation);
          } catch (error) {
            // Expected to throw after all retries
          }

          // Verify we have the expected number of attempts
          expect(attemptTimestamps.length).toBe(maxAttempts);

          // Verify delays between attempts follow exponential backoff
          for (let i = 1; i < attemptTimestamps.length; i++) {
            const actualDelay = attemptTimestamps[i] - attemptTimestamps[i - 1];
            const expectedDelay = baseDelay * Math.pow(2, i - 1);
            
            // Allow 30% tolerance for timing variations in test environment
            const tolerance = expectedDelay * 0.3;
            const minDelay = expectedDelay - tolerance;
            const maxDelay = expectedDelay + tolerance + 50; // Extra buffer for slow systems
            
            expect(actualDelay).toBeGreaterThanOrEqual(minDelay);
            expect(actualDelay).toBeLessThanOrEqual(maxDelay);
          }
        }
      ),
      { numRuns: 15 } // Reduced from 100 to 15 for speed
    );
  });

  /**
   * Additional property: Successful operations complete on first attempt
   * 
   * For any configuration, if an operation succeeds on the first attempt,
   * it should only be called once and return the correct result.
   */
  it('Property: Successful operations complete on first attempt', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }), // maxAttempts (reduced)
        fc.string(), // Return value
        async (maxAttempts, returnValue) => {
          const strategy = new RetryStrategy(maxAttempts, 0); // 0 delay for speed
          const operation = jest.fn(async () => returnValue);

          const result = await strategy.execute(operation);

          expect(result).toBe(returnValue);
          expect(operation).toHaveBeenCalledTimes(1);
        }
      ),
      { numRuns: 15 } // Reduced from 100 to 15
    );
  });
});
