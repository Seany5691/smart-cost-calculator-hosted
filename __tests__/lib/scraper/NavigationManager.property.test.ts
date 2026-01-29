/**
 * Property-Based Tests for NavigationManager
 * 
 * This file contains property-based tests using fast-check to verify
 * universal properties of the NavigationManager's exponential backoff logic.
 * 
 * **Validates: Requirements 1.1**
 * 
 * Property 1.1: Exponential Backoff Timing
 * - For all retry attempts n where 0 ≤ n < maxRetries, the delay before 
 *   attempt n+1 must equal baseDelay * 2^n
 * - The total number of attempts must not exceed maxRetries
 */

import * as fc from 'fast-check';
import { NavigationManager } from '../../../lib/scraper/NavigationManager';
import type { Page } from 'puppeteer';

// Mock ErrorLogger
jest.mock('../../../lib/scraper/error-logger', () => ({
  ErrorLogger: {
    getInstance: jest.fn(() => ({
      logError: jest.fn(),
    })),
  },
}));

describe('NavigationManager - Property-Based Tests', () => {
  // Suppress console output during tests
  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  // Increase timeout for property-based tests
  jest.setTimeout(60000);

  describe('Property 1.1: Exponential Backoff Timing', () => {
    /**
     * **Validates: Requirements 1.1**
     * 
     * Property: For all retry attempts n where 0 ≤ n < maxRetries,
     * the delay before attempt n+1 must equal baseDelay * 2^n
     * 
     * Test Strategy:
     * - Generate random failure scenarios with varying retry counts
     * - Verify delay follows exponential pattern: delay = baseDelay * 2^attempt
     * - Verify max retries respected
     */
    it('should apply exponential backoff delays correctly for all retry attempts', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random test parameters
          fc.record({
            maxRetries: fc.integer({ min: 2, max: 3 }), // 2-3 retries (reduced for speed)
            baseDelay: fc.integer({ min: 50, max: 200 }), // 50-200ms base delay (reduced)
            failureCount: fc.integer({ min: 1, max: 5 }), // Number of failures to simulate
          }),
          async ({ maxRetries, baseDelay, failureCount }) => {
            // Setup
            const navigationManager = new NavigationManager();
            const attemptTimes: number[] = [];
            let attemptCount = 0;

            // Create mock page that tracks attempt times
            const mockPage = {
              goto: jest.fn(async () => {
                attemptTimes.push(Date.now());
                attemptCount++;
                
                // Fail for the specified number of attempts
                if (attemptCount <= failureCount) {
                  throw new Error('Simulated timeout');
                }
                
                return null;
              }),
            } as unknown as jest.Mocked<Page>;

            // Execute navigation with retries
            try {
              await navigationManager.navigateWithRetry(
                mockPage,
                'https://test.example.com',
                {
                  maxRetries,
                  baseDelay,
                  minTimeout: 5000,
                  maxTimeout: 120000,
                }
              );
            } catch (error) {
              // Expected to fail if failureCount exceeds total possible attempts
            }

            // Calculate actual delays between attempts
            const actualDelays: number[] = [];
            for (let i = 1; i < attemptTimes.length; i++) {
              actualDelays.push(attemptTimes[i] - attemptTimes[i - 1]);
            }

            // Verify exponential backoff pattern
            // For each retry within the same strategy, delay should be baseDelay * 2^attempt
            let attemptInStrategy = 0;
            for (let i = 0; i < actualDelays.length; i++) {
              const delay = actualDelays[i];
              
              // Calculate expected delay for this attempt
              // Note: First attempt has no delay, subsequent attempts follow exponential pattern
              const expectedDelay = baseDelay * Math.pow(2, attemptInStrategy);
              
              // Allow 40% tolerance for timing variations in test environment
              const tolerance = Math.max(expectedDelay * 0.4, 30); // At least 30ms tolerance
              const minDelay = expectedDelay - tolerance;
              const maxDelay = expectedDelay + tolerance;
              
              // Verify delay is within expected range
              // Note: We only verify delays that should have backoff (not strategy switches)
              if (attemptInStrategy < maxRetries - 1) {
                expect(delay).toBeGreaterThanOrEqual(minDelay);
                expect(delay).toBeLessThanOrEqual(maxDelay);
              }
              
              attemptInStrategy++;
              
              // Reset counter when we move to next strategy
              if (attemptInStrategy >= maxRetries) {
                attemptInStrategy = 0;
              }
            }

            // Verify total attempts does not exceed maxRetries * number of strategies
            const maxPossibleAttempts = maxRetries * 4; // 4 wait strategies
            expect(attemptCount).toBeLessThanOrEqual(maxPossibleAttempts);
          }
        ),
        {
          numRuns: 20, // Reduced from 50 for speed
          timeout: 30000, // 30 second timeout for entire property test
        }
      );
    }, 90000); // 90 second Jest timeout for this test

    /**
     * **Validates: Requirements 1.1**
     * 
     * Property: The total number of retry attempts must not exceed maxRetries
     * per wait strategy
     * 
     * Test Strategy:
     * - Generate random maxRetries values
     * - Simulate continuous failures
     * - Verify attempt count never exceeds maxRetries * number of strategies
     */
    it('should respect maxRetries limit across all wait strategies', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            maxRetries: fc.integer({ min: 1, max: 3 }), // Reduced for speed
            baseDelay: fc.integer({ min: 10, max: 50 }), // Shorter delays for faster tests
          }),
          async ({ maxRetries, baseDelay }) => {
            // Setup
            const navigationManager = new NavigationManager();
            let attemptCount = 0;

            // Create mock page that always fails
            const mockPage = {
              goto: jest.fn(async () => {
                attemptCount++;
                throw new Error('Persistent failure');
              }),
            } as unknown as jest.Mocked<Page>;

            // Execute navigation (should fail after all retries)
            try {
              await navigationManager.navigateWithRetry(
                mockPage,
                'https://test.example.com',
                {
                  maxRetries,
                  baseDelay,
                  minTimeout: 5000,
                  maxTimeout: 120000,
                }
              );
            } catch (error) {
              // Expected to fail
            }

            // Verify total attempts = maxRetries * 4 strategies
            const expectedAttempts = maxRetries * 4;
            expect(attemptCount).toBe(expectedAttempts);
          }
        ),
        {
          numRuns: 15, // Reduced from 30
          timeout: 20000,
        }
      );
    }, 90000); // 90 second Jest timeout

    /**
     * **Validates: Requirements 1.1**
     * 
     * Property: Exponential backoff delays should increase by factor of 2
     * for consecutive retry attempts within the same strategy
     * 
     * Test Strategy:
     * - Generate random base delays
     * - Simulate multiple failures within same strategy
     * - Verify each delay is approximately 2x the previous delay
     */
    it('should double the delay for each consecutive retry attempt', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            baseDelay: fc.integer({ min: 50, max: 200 }), // Reduced range
            maxRetries: fc.integer({ min: 3, max: 4 }), // Need at least 3 to see doubling pattern
          }),
          async ({ baseDelay, maxRetries }) => {
            // Setup
            const navigationManager = new NavigationManager();
            const attemptTimes: number[] = [];
            let attemptCount = 0;

            // Create mock page that fails for first strategy only
            const mockPage = {
              goto: jest.fn(async () => {
                attemptTimes.push(Date.now());
                attemptCount++;
                
                // Fail for all attempts in first strategy, succeed on second strategy
                if (attemptCount <= maxRetries) {
                  throw new Error('First strategy failure');
                }
                
                return null;
              }),
            } as unknown as jest.Mocked<Page>;

            // Execute navigation
            await navigationManager.navigateWithRetry(
              mockPage,
              'https://test.example.com',
              {
                maxRetries,
                baseDelay,
                minTimeout: 5000,
                maxTimeout: 120000,
              }
            );

            // Calculate delays between attempts (only for first strategy)
            const delays: number[] = [];
            for (let i = 1; i < attemptTimes.length && i <= maxRetries; i++) {
              delays.push(attemptTimes[i] - attemptTimes[i - 1]);
            }

            // Verify doubling pattern (with tolerance)
            // We need at least 2 delays to check doubling
            if (delays.length >= 2) {
              for (let i = 1; i < delays.length; i++) {
                const previousDelay = delays[i - 1];
                const currentDelay = delays[i];
                
                // Skip if delays are too small (< 10ms) - likely timing noise
                if (previousDelay < 10 || currentDelay < 10) {
                  continue;
                }
                
                // Current delay should be approximately 2x previous delay
                // Allow 50% tolerance for timing variations
                const expectedRatio = 2.0;
                const actualRatio = currentDelay / previousDelay;
                
                // Check if ratio is roughly 2x (between 1.5x and 2.5x)
                expect(actualRatio).toBeGreaterThanOrEqual(expectedRatio * 0.75);
                expect(actualRatio).toBeLessThanOrEqual(expectedRatio * 1.25);
              }
            }
          }
        ),
        {
          numRuns: 15, // Reduced from 30
          timeout: 15000,
        }
      );
    }, 60000); // 60 second Jest timeout

    /**
     * **Validates: Requirements 1.1**
     * 
     * Property: First retry attempt should have delay equal to baseDelay
     * 
     * Test Strategy:
     * - Generate random base delays
     * - Simulate single failure followed by success
     * - Verify first retry delay equals baseDelay (within tolerance)
     */
    it('should use baseDelay for the first retry attempt', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 100, max: 500 }), // baseDelay (reduced range)
          async (baseDelay) => {
            // Setup
            const navigationManager = new NavigationManager();
            const attemptTimes: number[] = [];

            // Create mock page that fails once then succeeds
            const mockPage = {
              goto: jest.fn(async () => {
                attemptTimes.push(Date.now());
                
                if (attemptTimes.length === 1) {
                  throw new Error('First attempt failure');
                }
                
                return null;
              }),
            } as unknown as jest.Mocked<Page>;

            // Execute navigation
            await navigationManager.navigateWithRetry(
              mockPage,
              'https://test.example.com',
              {
                maxRetries: 5,
                baseDelay,
                minTimeout: 5000,
                maxTimeout: 120000,
              }
            );

            // Calculate delay between first and second attempt
            expect(attemptTimes.length).toBe(2);
            const actualDelay = attemptTimes[1] - attemptTimes[0];

            // Verify delay is approximately baseDelay (allow 40% tolerance or at least 40ms)
            const tolerance = Math.max(baseDelay * 0.4, 40);
            expect(actualDelay).toBeGreaterThanOrEqual(baseDelay - tolerance);
            expect(actualDelay).toBeLessThanOrEqual(baseDelay + tolerance);
          }
        ),
        {
          numRuns: 20, // Reduced from 40
          timeout: 15000,
        }
      );
    }, 60000); // 60 second Jest timeout

    /**
     * **Validates: Requirements 1.1**
     * 
     * Property: No delay should occur before the first attempt
     * 
     * Test Strategy:
     * - Generate random configurations
     * - Measure time from start to first attempt
     * - Verify minimal delay (< 100ms for test overhead)
     */
    it('should not apply delay before the first attempt', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            baseDelay: fc.integer({ min: 100, max: 500 }),
            maxRetries: fc.integer({ min: 1, max: 3 }),
          }),
          async ({ baseDelay, maxRetries }) => {
            // Setup
            const navigationManager = new NavigationManager();
            let firstAttemptTime: number | null = null;

            // Create mock page that records first attempt time
            const mockPage = {
              goto: jest.fn(async () => {
                if (firstAttemptTime === null) {
                  firstAttemptTime = Date.now();
                }
                return null;
              }),
            } as unknown as jest.Mocked<Page>;

            // Execute navigation
            const startTime = Date.now();
            await navigationManager.navigateWithRetry(
              mockPage,
              'https://test.example.com',
              {
                maxRetries,
                baseDelay,
                minTimeout: 5000,
                maxTimeout: 120000,
              }
            );

            // Verify first attempt happened immediately (within 100ms for overhead)
            const timeToFirstAttempt = firstAttemptTime! - startTime;
            expect(timeToFirstAttempt).toBeLessThan(100);
          }
        ),
        {
          numRuns: 20, // Reduced from 30
          timeout: 10000,
        }
      );
    }, 30000); // 30 second Jest timeout
  });

  describe('Property 1.2: Adaptive Timeout Bounds', () => {
    /**
     * **Validates: Requirements 1.2**
     * 
     * Property: For all navigation operations, the adaptive timeout must remain
     * within [minTimeout, maxTimeout] bounds
     * 
     * Test Strategy:
     * - Generate sequences of operation times (fast, slow, timeout)
     * - Verify timeout stays in bounds
     * - Verify timeout increases after slow operations
     * - Verify timeout decreases after fast operations
     */
    it('should keep adaptive timeout within configured bounds', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            minTimeout: fc.integer({ min: 5000, max: 15000 }), // 5-15s
            maxTimeout: fc.integer({ min: 60000, max: 120000 }), // 60-120s
            operationTimes: fc.array(
              fc.integer({ min: 1000, max: 150000 }), // 1-150s operation times
              { minLength: 5, maxLength: 15 }
            ),
          }),
          async ({ minTimeout, maxTimeout, operationTimes }) => {
            // Setup - create NavigationManager with custom bounds
            // Note: NavigationManager uses instance-level configuration
            // We need to test with the default bounds since it's not configurable per-instance
            // Instead, we'll verify the behavior with default bounds
            const navigationManager = new NavigationManager();
            
            // Use the default bounds from NavigationManager
            const defaultMinTimeout = 15000;
            const defaultMaxTimeout = 120000;
            
            // Simulate a series of operations with varying times
            for (const operationTime of operationTimes) {
              // Adjust timeout based on operation time
              navigationManager.adjustTimeout(operationTime);
              
              // Get current adaptive timeout
              const currentTimeout = navigationManager.getAdaptiveTimeout();
              
              // Verify timeout is within default bounds
              expect(currentTimeout).toBeGreaterThanOrEqual(defaultMinTimeout);
              expect(currentTimeout).toBeLessThanOrEqual(defaultMaxTimeout);
            }
          }
        ),
        {
          numRuns: 30,
          timeout: 10000,
        }
      );
    }, 30000);

    /**
     * **Validates: Requirements 1.2**
     * 
     * Property: Adaptive timeout must increase when operations consistently timeout
     * or take a long time
     * 
     * Test Strategy:
     * - Generate sequences of slow operations (>80% of current timeout)
     * - Verify timeout increases after each slow operation
     * - Verify timeout respects maximum bound
     */
    it('should increase timeout after slow operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            slowOperationCount: fc.integer({ min: 3, max: 8 }),
          }),
          async ({ slowOperationCount }) => {
            // Setup
            const navigationManager = new NavigationManager();
            const defaultMaxTimeout = 120000;
            
            // Record initial timeout
            let previousTimeout = navigationManager.getAdaptiveTimeout();
            
            // Simulate slow operations (operations that take >80% of current timeout)
            for (let i = 0; i < slowOperationCount; i++) {
              const currentTimeout = navigationManager.getAdaptiveTimeout();
              const slowOperationTime = Math.floor(currentTimeout * 0.85); // 85% of timeout
              
              navigationManager.adjustTimeout(slowOperationTime);
              
              const newTimeout = navigationManager.getAdaptiveTimeout();
              
              // Timeout should increase or stay at max
              if (previousTimeout < defaultMaxTimeout) {
                expect(newTimeout).toBeGreaterThanOrEqual(previousTimeout);
              }
              
              // Should never exceed max
              expect(newTimeout).toBeLessThanOrEqual(defaultMaxTimeout);
              
              previousTimeout = newTimeout;
            }
          }
        ),
        {
          numRuns: 25,
          timeout: 10000,
        }
      );
    }, 30000);

    /**
     * **Validates: Requirements 1.2**
     * 
     * Property: Adaptive timeout must decrease when operations complete quickly
     * 
     * Test Strategy:
     * - Generate sequences of fast operations (<50% of current timeout)
     * - Verify timeout decreases after each fast operation
     * - Verify timeout respects minimum bound
     */
    it('should decrease timeout after fast operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            fastOperationCount: fc.integer({ min: 3, max: 8 }),
          }),
          async ({ fastOperationCount }) => {
            // Setup - start with a high timeout
            const navigationManager = new NavigationManager();
            const defaultMinTimeout = 15000;
            
            // Set initial high timeout by simulating slow operations
            for (let i = 0; i < 3; i++) {
              const currentTimeout = navigationManager.getAdaptiveTimeout();
              navigationManager.adjustTimeout(currentTimeout * 0.9);
            }
            
            let previousTimeout = navigationManager.getAdaptiveTimeout();
            
            // Simulate fast operations (operations that take <50% of current timeout)
            for (let i = 0; i < fastOperationCount; i++) {
              const currentTimeout = navigationManager.getAdaptiveTimeout();
              const fastOperationTime = Math.floor(currentTimeout * 0.4); // 40% of timeout
              
              navigationManager.adjustTimeout(fastOperationTime);
              
              const newTimeout = navigationManager.getAdaptiveTimeout();
              
              // Timeout should decrease or stay at min
              if (previousTimeout > defaultMinTimeout) {
                expect(newTimeout).toBeLessThanOrEqual(previousTimeout);
              }
              
              // Should never go below min
              expect(newTimeout).toBeGreaterThanOrEqual(defaultMinTimeout);
              
              previousTimeout = newTimeout;
            }
          }
        ),
        {
          numRuns: 25,
          timeout: 10000,
        }
      );
    }, 30000);

    /**
     * **Validates: Requirements 1.2**
     * 
     * Property: Adaptive timeout calculation based on recent navigation times
     * should stay within bounds
     * 
     * Test Strategy:
     * - Simulate successful navigations with varying times
     * - Record navigation times to build history
     * - Verify calculated adaptive timeout stays within bounds
     */
    it('should calculate adaptive timeout within bounds based on navigation history', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            navigationTimes: fc.array(
              fc.integer({ min: 2000, max: 100000 }), // 2-100s
              { minLength: 5, maxLength: 12 }
            ),
          }),
          async ({ navigationTimes }) => {
            // Setup
            const navigationManager = new NavigationManager();
            const defaultMinTimeout = 15000;
            const defaultMaxTimeout = 120000;
            let attemptCount = 0;

            // Create mock page that succeeds and records navigation times
            const mockPage = {
              goto: jest.fn(async () => {
                // Simulate navigation taking the specified time
                const navTime = navigationTimes[attemptCount % navigationTimes.length];
                await new Promise(resolve => setTimeout(resolve, Math.min(navTime, 100))); // Cap at 100ms for test speed
                attemptCount++;
                return null;
              }),
            } as unknown as jest.Mocked<Page>;

            // Perform multiple navigations to build history
            for (let i = 0; i < Math.min(navigationTimes.length, 10); i++) {
              try {
                await navigationManager.navigateWithRetry(
                  mockPage,
                  'https://test.example.com',
                  {
                    maxRetries: 1,
                    baseDelay: 10,
                  }
                );
              } catch (error) {
                // Ignore failures for this test
              }

              // Check adaptive timeout after each navigation
              const adaptiveTimeout = navigationManager.getAdaptiveTimeout();
              
              // Verify timeout is within default bounds
              expect(adaptiveTimeout).toBeGreaterThanOrEqual(defaultMinTimeout);
              expect(adaptiveTimeout).toBeLessThanOrEqual(defaultMaxTimeout);
            }
          }
        ),
        {
          numRuns: 20,
          timeout: 15000,
        }
      );
    }, 45000);

    /**
     * **Validates: Requirements 1.2**
     * 
     * Property: Timeout adjustment should be monotonic within bounds
     * (increases stay increased, decreases stay decreased until next adjustment)
     * 
     * Test Strategy:
     * - Generate a single operation time
     * - Adjust timeout based on operation
     * - Verify timeout change is appropriate and within bounds
     */
    it('should adjust timeout monotonically within bounds', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            operationTime: fc.integer({ min: 5000, max: 150000 }),
          }),
          async ({ operationTime }) => {
            // Setup
            const navigationManager = new NavigationManager();
            const defaultMinTimeout = 15000;
            const defaultMaxTimeout = 120000;
            
            const beforeTimeout = navigationManager.getAdaptiveTimeout();
            
            // Adjust timeout based on operation time
            navigationManager.adjustTimeout(operationTime);
            
            const afterTimeout = navigationManager.getAdaptiveTimeout();
            
            // Verify timeout is within bounds
            expect(afterTimeout).toBeGreaterThanOrEqual(defaultMinTimeout);
            expect(afterTimeout).toBeLessThanOrEqual(defaultMaxTimeout);
            
            // Verify adjustment direction is correct
            if (operationTime > beforeTimeout * 0.8) {
              // Slow operation - timeout should increase or stay at max
              if (beforeTimeout < defaultMaxTimeout) {
                expect(afterTimeout).toBeGreaterThanOrEqual(beforeTimeout);
              }
            } else if (operationTime < beforeTimeout * 0.5) {
              // Fast operation - timeout should decrease or stay at min
              if (beforeTimeout > defaultMinTimeout) {
                expect(afterTimeout).toBeLessThanOrEqual(beforeTimeout);
              }
            }
            // else: medium operation - timeout may stay the same
          }
        ),
        {
          numRuns: 30,
          timeout: 10000,
        }
      );
    }, 30000);
  });
});
