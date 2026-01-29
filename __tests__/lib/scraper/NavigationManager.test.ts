/**
 * Unit tests for NavigationManager
 * 
 * Tests the NavigationManager class functionality including:
 * - Exponential backoff retry logic
 * - Adaptive timeout adjustment
 * - Fallback wait strategies
 * - Navigation statistics tracking
 * 
 * Validates Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */

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

describe('NavigationManager', () => {
  let navigationManager: NavigationManager;
  let mockPage: jest.Mocked<Page>;

  beforeEach(() => {
    navigationManager = new NavigationManager();
    
    // Create mock page
    mockPage = {
      goto: jest.fn(),
    } as any;

    // Clear console spies
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with default timeout', () => {
      const stats = navigationManager.getStatistics();
      expect(stats.currentTimeout).toBe(60000); // 60 seconds default
      expect(stats.navigationCount).toBe(0);
      expect(stats.recentTimes).toEqual([]);
    });
  });

  describe('navigateWithRetry - Success Cases', () => {
    it('should navigate successfully on first attempt', async () => {
      mockPage.goto.mockResolvedValueOnce(null as any);

      await navigationManager.navigateWithRetry(mockPage, 'https://example.com');

      expect(mockPage.goto).toHaveBeenCalledTimes(1);
      expect(mockPage.goto).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          waitUntil: 'networkidle2',
        })
      );
    });

    it('should record navigation time after success', async () => {
      // Add small delay to ensure non-zero time
      mockPage.goto.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return null as any;
      });

      await navigationManager.navigateWithRetry(mockPage, 'https://example.com');

      const stats = navigationManager.getStatistics();
      expect(stats.navigationCount).toBe(1);
      expect(stats.recentTimes.length).toBe(1);
      expect(stats.recentTimes[0]).toBeGreaterThanOrEqual(0);
    });

    it('should succeed after retry with exponential backoff', async () => {
      // Fail first attempt, succeed on second
      mockPage.goto
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce(null as any);

      await navigationManager.navigateWithRetry(mockPage, 'https://example.com', {
        maxRetries: 2,
        baseDelay: 100, // Use shorter delay for testing
      });

      expect(mockPage.goto).toHaveBeenCalledTimes(2);
    });

    it('should try different wait strategies on failure', async () => {
      // Fail with networkidle2 (1 attempt), succeed with networkidle0 (1 attempt)
      mockPage.goto
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce(null as any);

      await navigationManager.navigateWithRetry(mockPage, 'https://example.com', {
        maxRetries: 1, // Only 1 retry per strategy
        baseDelay: 10,
      });

      // Should have tried networkidle2 (failed), then networkidle0 (success)
      expect(mockPage.goto).toHaveBeenCalledTimes(2);
      
      // Check that different strategies were used
      const calls = mockPage.goto.mock.calls;
      expect(calls[0][1]?.waitUntil).toBe('networkidle2');
      expect(calls[1][1]?.waitUntil).toBe('networkidle0');
    });
  });

  describe('navigateWithRetry - Exponential Backoff', () => {
    it('should apply exponential backoff delays', async () => {
      const delays: number[] = [];
      const startTimes: number[] = [];
      
      mockPage.goto.mockImplementation(async () => {
        startTimes.push(Date.now());
        throw new Error('Timeout');
      });

      try {
        await navigationManager.navigateWithRetry(mockPage, 'https://example.com', {
          maxRetries: 3,
          baseDelay: 100, // 100ms base delay
        });
      } catch (error) {
        // Expected to fail
      }

      // Calculate delays between attempts
      for (let i = 1; i < startTimes.length; i++) {
        delays.push(startTimes[i] - startTimes[i - 1]);
      }

      // Verify exponential backoff pattern (with some tolerance for timing)
      // Attempt 1: no delay
      // Attempt 2: 100ms delay (baseDelay * 2^0)
      // Attempt 3: 200ms delay (baseDelay * 2^1)
      expect(delays.length).toBeGreaterThan(0);
      if (delays.length >= 1) {
        expect(delays[0]).toBeGreaterThanOrEqual(90); // ~100ms with tolerance
        expect(delays[0]).toBeLessThan(150);
      }
      if (delays.length >= 2) {
        expect(delays[1]).toBeGreaterThanOrEqual(180); // ~200ms with tolerance
        expect(delays[1]).toBeLessThan(250);
      }
    });

    it('should respect maxRetries limit', async () => {
      mockPage.goto.mockRejectedValue(new Error('Timeout'));

      try {
        await navigationManager.navigateWithRetry(mockPage, 'https://example.com', {
          maxRetries: 3,
          baseDelay: 10,
        });
      } catch (error) {
        // Expected to fail
      }

      // Should try 3 times per strategy, 4 strategies = 12 total attempts
      expect(mockPage.goto).toHaveBeenCalledTimes(12);
    });
  });

  describe('navigateWithRetry - Adaptive Timeout', () => {
    it('should increase timeout on subsequent attempts', async () => {
      mockPage.goto
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce(null as any);

      await navigationManager.navigateWithRetry(mockPage, 'https://example.com', {
        maxRetries: 3,
        baseDelay: 10,
      });

      const calls = mockPage.goto.mock.calls;
      
      // First attempt should use base timeout
      const timeout1 = calls[0][1]?.timeout;
      // Second attempt should have increased timeout (+30s)
      const timeout2 = calls[1][1]?.timeout;
      // Third attempt should have further increased timeout (+60s)
      const timeout3 = calls[2][1]?.timeout;

      expect(timeout2).toBeGreaterThan(timeout1!);
      expect(timeout3).toBeGreaterThan(timeout2!);
    });

    it('should enforce minimum timeout', async () => {
      mockPage.goto.mockResolvedValueOnce(null as any);

      await navigationManager.navigateWithRetry(mockPage, 'https://example.com', {
        minTimeout: 20000,
      });

      const timeout = mockPage.goto.mock.calls[0][1]?.timeout;
      expect(timeout).toBeGreaterThanOrEqual(20000);
    });

    it('should enforce maximum timeout', async () => {
      // Simulate many slow navigations to increase adaptive timeout
      for (let i = 0; i < 10; i++) {
        mockPage.goto.mockResolvedValueOnce(null as any);
        await navigationManager.navigateWithRetry(mockPage, 'https://example.com');
        // Manually adjust timeout to simulate slow operations
        navigationManager.adjustTimeout(150000); // 150 seconds
      }

      mockPage.goto.mockResolvedValueOnce(null as any);
      await navigationManager.navigateWithRetry(mockPage, 'https://example.com', {
        maxTimeout: 120000,
      });

      const timeout = mockPage.goto.mock.calls[mockPage.goto.mock.calls.length - 1][1]?.timeout;
      expect(timeout).toBeLessThanOrEqual(120000);
    });
  });

  describe('navigateWithRetry - Failure Cases', () => {
    it('should throw error after all retries exhausted', async () => {
      mockPage.goto.mockRejectedValue(new Error('Persistent timeout'));

      await expect(
        navigationManager.navigateWithRetry(mockPage, 'https://example.com', {
          maxRetries: 2,
          baseDelay: 10,
        })
      ).rejects.toThrow('Navigation failed after trying all strategies and retries');
    });

    it('should include URL in error message', async () => {
      mockPage.goto.mockRejectedValue(new Error('Timeout'));

      await expect(
        navigationManager.navigateWithRetry(mockPage, 'https://example.com/test', {
          maxRetries: 1,
          baseDelay: 10,
        })
      ).rejects.toThrow('https://example.com/test');
    });
  });

  describe('adjustTimeout', () => {
    it('should increase timeout for slow operations', () => {
      const initialTimeout = navigationManager.getAdaptiveTimeout();
      
      // Simulate slow operation (80% of timeout)
      navigationManager.adjustTimeout(initialTimeout * 0.85);
      
      const newTimeout = navigationManager.getAdaptiveTimeout();
      expect(newTimeout).toBeGreaterThan(initialTimeout);
    });

    it('should decrease timeout for fast operations', () => {
      // First, increase timeout
      navigationManager.adjustTimeout(100000);
      const highTimeout = navigationManager.getAdaptiveTimeout();
      
      // Then simulate fast operation (< 50% of timeout)
      navigationManager.adjustTimeout(highTimeout * 0.3);
      
      const newTimeout = navigationManager.getAdaptiveTimeout();
      expect(newTimeout).toBeLessThan(highTimeout);
    });

    it('should not decrease below minimum timeout', () => {
      // Simulate many fast operations
      for (let i = 0; i < 20; i++) {
        navigationManager.adjustTimeout(1000); // Very fast
      }
      
      const timeout = navigationManager.getAdaptiveTimeout();
      expect(timeout).toBeGreaterThanOrEqual(15000); // Min timeout
    });

    it('should not increase above maximum timeout', () => {
      // Simulate many slow operations
      for (let i = 0; i < 20; i++) {
        navigationManager.adjustTimeout(200000); // Very slow
      }
      
      const timeout = navigationManager.getAdaptiveTimeout();
      expect(timeout).toBeLessThanOrEqual(120000); // Max timeout
    });
  });

  describe('getAdaptiveTimeout', () => {
    it('should return current timeout when insufficient history', () => {
      const timeout = navigationManager.getAdaptiveTimeout();
      expect(timeout).toBe(60000); // Default initial timeout
    });

    it('should calculate timeout based on average navigation times', async () => {
      // Simulate several navigations with known times
      mockPage.goto.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return null as any;
      });

      for (let i = 0; i < 5; i++) {
        await navigationManager.navigateWithRetry(mockPage, 'https://example.com', {
          baseDelay: 10,
        });
      }

      const stats = navigationManager.getStatistics();
      expect(stats.navigationCount).toBe(5);
      expect(stats.averageNavigationTime).toBeGreaterThan(0);
      
      // Adaptive timeout should be roughly 2x average time
      const adaptiveTimeout = navigationManager.getAdaptiveTimeout();
      expect(adaptiveTimeout).toBeGreaterThan(stats.averageNavigationTime);
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics', async () => {
      // Add small delay to ensure non-zero time
      mockPage.goto.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return null as any;
      });

      await navigationManager.navigateWithRetry(mockPage, 'https://example.com');
      await navigationManager.navigateWithRetry(mockPage, 'https://example.com');

      const stats = navigationManager.getStatistics();
      
      expect(stats.navigationCount).toBe(2);
      expect(stats.recentTimes).toHaveLength(2);
      expect(stats.averageNavigationTime).toBeGreaterThanOrEqual(0);
      expect(stats.currentTimeout).toBeGreaterThan(0);
    });

    it('should maintain rolling window of last 10 navigation times', async () => {
      mockPage.goto.mockResolvedValue(null as any);

      // Perform 15 navigations
      for (let i = 0; i < 15; i++) {
        await navigationManager.navigateWithRetry(mockPage, 'https://example.com');
      }

      const stats = navigationManager.getStatistics();
      expect(stats.navigationCount).toBe(10); // Should only keep last 10
      expect(stats.recentTimes).toHaveLength(10);
    });

    it('should return zero average when no navigations', () => {
      const stats = navigationManager.getStatistics();
      expect(stats.averageNavigationTime).toBe(0);
      expect(stats.navigationCount).toBe(0);
    });
  });

  describe('reset', () => {
    it('should reset all statistics', async () => {
      mockPage.goto.mockResolvedValue(null as any);

      // Perform some navigations
      await navigationManager.navigateWithRetry(mockPage, 'https://example.com');
      await navigationManager.navigateWithRetry(mockPage, 'https://example.com');

      expect(navigationManager.getStatistics().navigationCount).toBe(2);

      // Reset
      navigationManager.reset();

      const stats = navigationManager.getStatistics();
      expect(stats.navigationCount).toBe(0);
      expect(stats.recentTimes).toEqual([]);
      expect(stats.currentTimeout).toBe(60000); // Back to default
      expect(stats.averageNavigationTime).toBe(0);
    });
  });

  describe('Custom Options', () => {
    it('should respect custom maxRetries', async () => {
      mockPage.goto.mockRejectedValue(new Error('Timeout'));

      try {
        await navigationManager.navigateWithRetry(mockPage, 'https://example.com', {
          maxRetries: 2,
          baseDelay: 10,
        });
      } catch (error) {
        // Expected
      }

      // 2 retries per strategy, 4 strategies = 8 total attempts
      expect(mockPage.goto).toHaveBeenCalledTimes(8);
    });

    it('should respect custom baseDelay', async () => {
      const startTimes: number[] = [];
      
      mockPage.goto.mockImplementation(async () => {
        startTimes.push(Date.now());
        throw new Error('Timeout');
      });

      try {
        await navigationManager.navigateWithRetry(mockPage, 'https://example.com', {
          maxRetries: 2,
          baseDelay: 200, // 200ms base delay
        });
      } catch (error) {
        // Expected
      }

      // Check that delay is approximately 200ms
      const delay = startTimes[1] - startTimes[0];
      expect(delay).toBeGreaterThanOrEqual(180);
      expect(delay).toBeLessThan(250);
    });

    it('should respect custom timeout bounds', async () => {
      mockPage.goto.mockResolvedValueOnce(null as any);

      await navigationManager.navigateWithRetry(mockPage, 'https://example.com', {
        minTimeout: 30000,
        maxTimeout: 90000,
        initialTimeout: 45000,
      });

      const timeout = mockPage.goto.mock.calls[0][1]?.timeout;
      expect(timeout).toBeGreaterThanOrEqual(30000);
      expect(timeout).toBeLessThanOrEqual(90000);
    });
  });

  describe('Wait Strategies', () => {
    it('should try all wait strategies in order', async () => {
      mockPage.goto.mockRejectedValue(new Error('Timeout'));

      try {
        await navigationManager.navigateWithRetry(mockPage, 'https://example.com', {
          maxRetries: 1,
          baseDelay: 10,
        });
      } catch (error) {
        // Expected
      }

      const calls = mockPage.goto.mock.calls;
      const strategies = calls.map(call => call[1]?.waitUntil);
      
      // Should have tried all 4 strategies
      expect(strategies).toContain('networkidle2');
      expect(strategies).toContain('networkidle0');
      expect(strategies).toContain('domcontentloaded');
      expect(strategies).toContain('load');
    });

    it('should stop trying strategies after success', async () => {
      // Fail with first strategy, succeed with second
      mockPage.goto
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce(null as any);

      await navigationManager.navigateWithRetry(mockPage, 'https://example.com', {
        maxRetries: 1,
        baseDelay: 10,
      });

      // Should only have tried 2 strategies
      expect(mockPage.goto).toHaveBeenCalledTimes(2);
    });
  });

  describe('Logging', () => {
    it('should log each retry attempt', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      mockPage.goto
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce(null as any);

      await navigationManager.navigateWithRetry(mockPage, 'https://example.com', {
        maxRetries: 2,
        baseDelay: 10,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Attempt 1/')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Attempt 2/')
      );
    });

    it('should log successful navigation', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      mockPage.goto.mockResolvedValueOnce(null as any);

      await navigationManager.navigateWithRetry(mockPage, 'https://example.com');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Navigation successful')
      );
    });

    it('should log failed attempts', async () => {
      const consoleSpy = jest.spyOn(console, 'warn');
      
      mockPage.goto
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce(null as any);

      await navigationManager.navigateWithRetry(mockPage, 'https://example.com', {
        baseDelay: 10,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('failed')
      );
    });
  });
});
