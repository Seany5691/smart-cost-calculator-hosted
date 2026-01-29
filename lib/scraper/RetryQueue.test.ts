/**
 * Unit tests for RetryQueue class
 * 
 * Tests:
 * - Enqueue with retry item metadata
 * - Dequeue with time-based ordering
 * - Exponential backoff calculation
 * - Database persistence
 * - Max retries enforcement
 * - Queue size tracking
 * 
 * Spec: scraper-robustness-enhancement
 * Phase: 1 - Core Resilience
 */

import { RetryQueue, RetryItem, RetryItemType } from './RetryQueue';
import { query } from '../db';

// Mock the database module
jest.mock('../db');
const mockQuery = query as jest.MockedFunction<typeof query>;

describe('RetryQueue', () => {
  let retryQueue: RetryQueue;
  const sessionId = 'test-session-123';

  beforeEach(() => {
    jest.clearAllMocks();
    retryQueue = new RetryQueue(sessionId);
  });

  describe('constructor', () => {
    it('should create RetryQueue with default config', () => {
      const queue = new RetryQueue(sessionId);
      expect(queue).toBeInstanceOf(RetryQueue);
    });

    it('should create RetryQueue with custom config', () => {
      const queue = new RetryQueue(sessionId, {
        maxRetries: 5,
        baseDelay: 2000,
      });
      expect(queue).toBeInstanceOf(RetryQueue);
    });
  });

  describe('enqueue', () => {
    it('should enqueue a navigation retry item', async () => {
      const mockId = 'retry-item-1';
      const mockTimestamp = new Date('2024-01-01T12:00:00Z');
      
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: mockId,
            type: 'navigation',
            data: { url: 'https://example.com' },
            attempts: 0,
            next_retry_time: mockTimestamp,
          },
        ],
        rowCount: 1,
      } as any);

      const item = await retryQueue.enqueue({
        type: 'navigation',
        data: { url: 'https://example.com' },
        attempts: 0,
      });

      expect(item.id).toBe(mockId);
      expect(item.type).toBe('navigation');
      expect(item.data).toEqual({ url: 'https://example.com' });
      expect(item.attempts).toBe(0);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO scraper_retry_queue'),
        expect.arrayContaining([sessionId, 'navigation', expect.any(String), 0, expect.any(Date)])
      );
    });

    it('should enqueue a lookup retry item', async () => {
      const mockId = 'retry-item-2';
      const mockTimestamp = new Date('2024-01-01T12:00:00Z');
      
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: mockId,
            type: 'lookup',
            data: { businessId: '123', phone: '555-1234' },
            attempts: 1,
            next_retry_time: mockTimestamp,
          },
        ],
        rowCount: 1,
      } as any);

      const item = await retryQueue.enqueue({
        type: 'lookup',
        data: { businessId: '123', phone: '555-1234' },
        attempts: 1,
      });

      expect(item.id).toBe(mockId);
      expect(item.type).toBe('lookup');
      expect(item.attempts).toBe(1);
    });

    it('should enqueue an extraction retry item', async () => {
      const mockId = 'retry-item-3';
      const mockTimestamp = new Date('2024-01-01T12:00:00Z');
      
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: mockId,
            type: 'extraction',
            data: { selector: '.business-card', element: 'name' },
            attempts: 2,
            next_retry_time: mockTimestamp,
          },
        ],
        rowCount: 1,
      } as any);

      const item = await retryQueue.enqueue({
        type: 'extraction',
        data: { selector: '.business-card', element: 'name' },
        attempts: 2,
      });

      expect(item.id).toBe(mockId);
      expect(item.type).toBe('extraction');
      expect(item.attempts).toBe(2);
    });

    it('should calculate nextRetryTime with exponential backoff', async () => {
      const now = Date.now();
      
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'retry-1',
            type: 'navigation',
            data: {},
            attempts: 0,
            next_retry_time: new Date(now + 1000), // 1 second
          },
        ],
        rowCount: 1,
      } as any);

      await retryQueue.enqueue({
        type: 'navigation',
        data: {},
        attempts: 0,
      });

      // Check that nextRetryTime was calculated (baseDelay * 2^0 = 1000ms)
      const callArgs = mockQuery.mock.calls[0][1];
      const nextRetryTime = callArgs![4] as Date;
      const delay = nextRetryTime.getTime() - now;
      
      // Allow 100ms tolerance for test execution time
      expect(delay).toBeGreaterThanOrEqual(900);
      expect(delay).toBeLessThanOrEqual(1100);
    });
  });

  describe('dequeue', () => {
    it('should dequeue the next ready item ordered by nextRetryTime', async () => {
      const mockId = 'retry-item-1';
      const mockTimestamp = new Date('2024-01-01T12:00:00Z');
      
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: mockId,
            type: 'navigation',
            data: { url: 'https://example.com' },
            attempts: 0,
            next_retry_time: mockTimestamp,
          },
        ],
        rowCount: 1,
      } as any);

      const item = await retryQueue.dequeue();

      expect(item).not.toBeNull();
      expect(item!.id).toBe(mockId);
      expect(item!.type).toBe('navigation');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM scraper_retry_queue'),
        [sessionId]
      );
    });

    it('should return null when queue is empty', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const item = await retryQueue.dequeue();

      expect(item).toBeNull();
    });

    it('should return null when no items are ready (nextRetryTime > now)', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const item = await retryQueue.dequeue();

      expect(item).toBeNull();
    });

    it('should only dequeue items where nextRetryTime <= now', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      await retryQueue.dequeue();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('next_retry_time <= NOW()'),
        [sessionId]
      );
    });
  });

  describe('peek', () => {
    it('should peek at the next ready item without removing it', async () => {
      const mockId = 'retry-item-1';
      const mockTimestamp = new Date('2024-01-01T12:00:00Z');
      
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: mockId,
            type: 'navigation',
            data: { url: 'https://example.com' },
            attempts: 0,
            next_retry_time: mockTimestamp,
          },
        ],
        rowCount: 1,
      } as any);

      const item = await retryQueue.peek();

      expect(item).not.toBeNull();
      expect(item!.id).toBe(mockId);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [sessionId]
      );
      expect(mockQuery).not.toHaveBeenCalledWith(
        expect.stringContaining('DELETE'),
        expect.anything()
      );
    });

    it('should return null when no items are ready', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const item = await retryQueue.peek();

      expect(item).toBeNull();
    });
  });

  describe('getQueueSize', () => {
    it('should return the total number of items in the queue', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '5' }],
        rowCount: 1,
      } as any);

      const size = await retryQueue.getQueueSize();

      expect(size).toBe(5);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*)'),
        [sessionId]
      );
    });

    it('should return 0 when queue is empty', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '0' }],
        rowCount: 1,
      } as any);

      const size = await retryQueue.getQueueSize();

      expect(size).toBe(0);
    });
  });

  describe('getReadyCount', () => {
    it('should return the number of items ready for retry', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '3' }],
        rowCount: 1,
      } as any);

      const count = await retryQueue.getReadyCount();

      expect(count).toBe(3);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('next_retry_time <= NOW()'),
        [sessionId]
      );
    });
  });

  describe('shouldRetry', () => {
    it('should return true when attempts < maxRetries', () => {
      expect(retryQueue.shouldRetry(0)).toBe(true);
      expect(retryQueue.shouldRetry(1)).toBe(true);
      expect(retryQueue.shouldRetry(2)).toBe(true);
    });

    it('should return false when attempts >= maxRetries', () => {
      expect(retryQueue.shouldRetry(3)).toBe(false);
      expect(retryQueue.shouldRetry(4)).toBe(false);
    });

    it('should respect custom maxRetries config', () => {
      const customQueue = new RetryQueue(sessionId, { maxRetries: 5 });
      expect(customQueue.shouldRetry(4)).toBe(true);
      expect(customQueue.shouldRetry(5)).toBe(false);
    });
  });

  describe('clear', () => {
    it('should delete all retry items for the session', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      await retryQueue.clear();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM scraper_retry_queue'),
        [sessionId]
      );
    });
  });

  describe('getAllItems', () => {
    it('should return all retry items ordered by nextRetryTime', async () => {
      const mockItems = [
        {
          id: 'item-1',
          type: 'navigation',
          data: { url: 'https://example1.com' },
          attempts: 0,
          next_retry_time: new Date('2024-01-01T12:00:00Z'),
        },
        {
          id: 'item-2',
          type: 'lookup',
          data: { businessId: '123' },
          attempts: 1,
          next_retry_time: new Date('2024-01-01T12:01:00Z'),
        },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockItems,
        rowCount: 2,
      } as any);

      const items = await retryQueue.getAllItems();

      expect(items).toHaveLength(2);
      expect(items[0].id).toBe('item-1');
      expect(items[1].id).toBe('item-2');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY next_retry_time ASC'),
        [sessionId]
      );
    });

    it('should return empty array when queue is empty', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const items = await retryQueue.getAllItems();

      expect(items).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('should return queue statistics', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '10' }], rowCount: 1 } as any) // totalItems
        .mockResolvedValueOnce({ rows: [{ count: '5' }], rowCount: 1 } as any) // readyItems
        .mockResolvedValueOnce({
          rows: [
            { item_type: 'navigation', count: '3' },
            { item_type: 'lookup', count: '5' },
            { item_type: 'extraction', count: '2' },
          ],
          rowCount: 3,
        } as any) // itemsByType
        .mockResolvedValueOnce({
          rows: [
            { attempts: 0, count: '4' },
            { attempts: 1, count: '3' },
            { attempts: 2, count: '3' },
          ],
          rowCount: 3,
        } as any); // itemsByAttempts

      const stats = await retryQueue.getStats();

      expect(stats.totalItems).toBe(10);
      expect(stats.readyItems).toBe(5);
      expect(stats.itemsByType).toEqual({
        navigation: 3,
        lookup: 5,
        extraction: 2,
      });
      expect(stats.itemsByAttempts).toEqual({
        0: 4,
        1: 3,
        2: 3,
      });
    });
  });

  describe('exponential backoff calculation', () => {
    it('should calculate correct delays for different attempts', async () => {
      const baseDelay = 1000;
      const queue = new RetryQueue(sessionId, { baseDelay });

      // Test with different attempt counts
      const testCases = [
        { attempts: 0, expectedDelay: 1000 }, // 1000 * 2^0 = 1000ms
        { attempts: 1, expectedDelay: 2000 }, // 1000 * 2^1 = 2000ms
        { attempts: 2, expectedDelay: 4000 }, // 1000 * 2^2 = 4000ms
        { attempts: 3, expectedDelay: 8000 }, // 1000 * 2^3 = 8000ms
      ];

      for (const testCase of testCases) {
        const now = Date.now();
        
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: `retry-${testCase.attempts}`,
              type: 'navigation',
              data: {},
              attempts: testCase.attempts,
              next_retry_time: new Date(now + testCase.expectedDelay),
            },
          ],
          rowCount: 1,
        } as any);

        await queue.enqueue({
          type: 'navigation',
          data: {},
          attempts: testCase.attempts,
        });

        const callArgs = mockQuery.mock.calls[mockQuery.mock.calls.length - 1][1];
        const nextRetryTime = callArgs![4] as Date;
        const actualDelay = nextRetryTime.getTime() - now;

        // Allow 100ms tolerance for test execution time
        expect(actualDelay).toBeGreaterThanOrEqual(testCase.expectedDelay - 100);
        expect(actualDelay).toBeLessThanOrEqual(testCase.expectedDelay + 100);
      }
    });

    it('should use custom baseDelay', async () => {
      const customBaseDelay = 2000;
      const queue = new RetryQueue(sessionId, { baseDelay: customBaseDelay });
      const now = Date.now();

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'retry-1',
            type: 'navigation',
            data: {},
            attempts: 0,
            next_retry_time: new Date(now + customBaseDelay),
          },
        ],
        rowCount: 1,
      } as any);

      await queue.enqueue({
        type: 'navigation',
        data: {},
        attempts: 0,
      });

      const callArgs = mockQuery.mock.calls[0][1];
      const nextRetryTime = callArgs![4] as Date;
      const delay = nextRetryTime.getTime() - now;

      // Should be 2000ms (2000 * 2^0)
      expect(delay).toBeGreaterThanOrEqual(1900);
      expect(delay).toBeLessThanOrEqual(2100);
    });
  });

  describe('persist and restore', () => {
    it('should have persist method (no-op for database persistence)', async () => {
      await expect(retryQueue.persist()).resolves.toBeUndefined();
    });

    it('should have restore method (no-op for database persistence)', async () => {
      await expect(retryQueue.restore()).resolves.toBeUndefined();
    });
  });

  describe('processRetry', () => {
    it('should process a successful retry and return success status', async () => {
      const mockItem = {
        id: 'retry-item-1',
        type: 'navigation' as RetryItemType,
        data: { url: 'https://example.com' },
        attempts: 0,
        next_retry_time: new Date('2024-01-01T12:00:00Z'),
      };

      // Mock dequeue to return an item
      mockQuery.mockResolvedValueOnce({
        rows: [mockItem],
        rowCount: 1,
      } as any);

      // Mock operation callback that succeeds
      const operationCallback = jest.fn().mockResolvedValue(true);

      const result = await retryQueue.processRetry(operationCallback);

      expect(result).not.toBeNull();
      expect(result!.status).toBe('success');
      expect(result!.item.id).toBe('retry-item-1');
      expect(result!.finalAttempts).toBe(1);
      expect(operationCallback).toHaveBeenCalledWith(expect.objectContaining({
        id: 'retry-item-1',
        type: 'navigation',
      }));
    });

    it('should re-enqueue item when operation fails and attempts < maxRetries', async () => {
      const mockItem = {
        id: 'retry-item-1',
        type: 'lookup' as RetryItemType,
        data: { businessId: '123' },
        attempts: 0,
        next_retry_time: new Date('2024-01-01T12:00:00Z'),
      };

      // Mock dequeue to return an item
      mockQuery.mockResolvedValueOnce({
        rows: [mockItem],
        rowCount: 1,
      } as any);

      // Mock enqueue for re-queueing
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'retry-item-2',
          type: 'lookup',
          data: { businessId: '123' },
          attempts: 1,
          next_retry_time: new Date('2024-01-01T12:00:02Z'),
        }],
        rowCount: 1,
      } as any);

      // Mock operation callback that fails
      const operationCallback = jest.fn().mockResolvedValue(false);

      const result = await retryQueue.processRetry(operationCallback);

      expect(result).not.toBeNull();
      expect(result!.status).toBe('retrying');
      expect(result!.finalAttempts).toBe(1);
      expect(operationCallback).toHaveBeenCalled();
      
      // Verify enqueue was called with incremented attempts
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO scraper_retry_queue'),
        expect.arrayContaining([sessionId, 'lookup', expect.any(String), 1, expect.any(Date)])
      );
    });

    it('should discard item when operation fails and attempts >= maxRetries', async () => {
      const mockItem = {
        id: 'retry-item-1',
        type: 'extraction' as RetryItemType,
        data: { selector: '.business-card' },
        attempts: 2, // Already at 2 attempts, next will be 3 (max)
        next_retry_time: new Date('2024-01-01T12:00:00Z'),
      };

      // Mock dequeue to return an item
      mockQuery.mockResolvedValueOnce({
        rows: [mockItem],
        rowCount: 1,
      } as any);

      // Mock operation callback that fails
      const operationCallback = jest.fn().mockResolvedValue(false);

      const result = await retryQueue.processRetry(operationCallback);

      expect(result).not.toBeNull();
      expect(result!.status).toBe('failed');
      expect(result!.finalAttempts).toBe(3);
      expect(operationCallback).toHaveBeenCalled();
      
      // Verify enqueue was NOT called (item should be discarded)
      expect(mockQuery).not.toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO scraper_retry_queue'),
        expect.anything()
      );
    });

    it('should return null when no items are ready', async () => {
      // Mock dequeue to return null (no items ready)
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const operationCallback = jest.fn();

      const result = await retryQueue.processRetry(operationCallback);

      expect(result).toBeNull();
      expect(operationCallback).not.toHaveBeenCalled();
    });

    it('should handle exceptions during operation and re-enqueue if attempts < maxRetries', async () => {
      const mockItem = {
        id: 'retry-item-1',
        type: 'navigation' as RetryItemType,
        data: { url: 'https://example.com' },
        attempts: 0,
        next_retry_time: new Date('2024-01-01T12:00:00Z'),
      };

      // Mock dequeue to return an item
      mockQuery.mockResolvedValueOnce({
        rows: [mockItem],
        rowCount: 1,
      } as any);

      // Mock enqueue for re-queueing
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'retry-item-2',
          type: 'navigation',
          data: { url: 'https://example.com' },
          attempts: 1,
          next_retry_time: new Date('2024-01-01T12:00:02Z'),
        }],
        rowCount: 1,
      } as any);

      // Mock operation callback that throws an exception
      const operationCallback = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await retryQueue.processRetry(operationCallback);

      expect(result).not.toBeNull();
      expect(result!.status).toBe('retrying');
      expect(result!.finalAttempts).toBe(1);
      
      // Verify enqueue was called with incremented attempts
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO scraper_retry_queue'),
        expect.arrayContaining([sessionId, 'navigation', expect.any(String), 1, expect.any(Date)])
      );
    });

    it('should discard item when exception occurs and attempts >= maxRetries', async () => {
      const mockItem = {
        id: 'retry-item-1',
        type: 'navigation' as RetryItemType,
        data: { url: 'https://example.com' },
        attempts: 2,
        next_retry_time: new Date('2024-01-01T12:00:00Z'),
      };

      // Mock dequeue to return an item
      mockQuery.mockResolvedValueOnce({
        rows: [mockItem],
        rowCount: 1,
      } as any);

      // Mock operation callback that throws an exception
      const operationCallback = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await retryQueue.processRetry(operationCallback);

      expect(result).not.toBeNull();
      expect(result!.status).toBe('failed');
      expect(result!.finalAttempts).toBe(3);
      
      // Verify enqueue was NOT called (item should be discarded)
      expect(mockQuery).not.toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO scraper_retry_queue'),
        expect.anything()
      );
    });
  });

  describe('processAllReady', () => {
    it('should process all ready items until queue is empty', async () => {
      const mockItems = [
        {
          id: 'retry-item-1',
          type: 'navigation' as RetryItemType,
          data: { url: 'https://example1.com' },
          attempts: 0,
          next_retry_time: new Date('2024-01-01T12:00:00Z'),
        },
        {
          id: 'retry-item-2',
          type: 'lookup' as RetryItemType,
          data: { businessId: '123' },
          attempts: 1,
          next_retry_time: new Date('2024-01-01T12:00:01Z'),
        },
        {
          id: 'retry-item-3',
          type: 'extraction' as RetryItemType,
          data: { selector: '.business-card' },
          attempts: 0,
          next_retry_time: new Date('2024-01-01T12:00:02Z'),
        },
      ];

      // Mock dequeue to return items one by one, then null
      mockQuery
        .mockResolvedValueOnce({ rows: [mockItems[0]], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [mockItems[1]], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [mockItems[2]], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      // Mock operation callback that succeeds for all items
      const operationCallback = jest.fn().mockResolvedValue(true);

      const results = await retryQueue.processAllReady(operationCallback);

      expect(results).toHaveLength(3);
      expect(results[0].status).toBe('success');
      expect(results[1].status).toBe('success');
      expect(results[2].status).toBe('success');
      expect(operationCallback).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed success and failure results', async () => {
      const mockItems = [
        {
          id: 'retry-item-1',
          type: 'navigation' as RetryItemType,
          data: { url: 'https://example1.com' },
          attempts: 0,
          next_retry_time: new Date('2024-01-01T12:00:00Z'),
        },
        {
          id: 'retry-item-2',
          type: 'lookup' as RetryItemType,
          data: { businessId: '123' },
          attempts: 0,
          next_retry_time: new Date('2024-01-01T12:00:01Z'),
        },
      ];

      // Mock dequeue to return items
      mockQuery
        .mockResolvedValueOnce({ rows: [mockItems[0]], rowCount: 1 } as any)
        .mockResolvedValueOnce({
          rows: [{
            id: 'retry-item-3',
            type: 'lookup',
            data: { businessId: '123' },
            attempts: 1,
            next_retry_time: new Date('2024-01-01T12:00:03Z'),
          }],
          rowCount: 1,
        } as any) // Re-enqueue for failed item
        .mockResolvedValueOnce({ rows: [mockItems[1]], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      // Mock operation callback: first succeeds, second fails
      const operationCallback = jest.fn()
        .mockResolvedValueOnce(true)  // First item succeeds
        .mockResolvedValueOnce(false); // Second item fails

      const results = await retryQueue.processAllReady(operationCallback);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('success');
      expect(results[1].status).toBe('retrying');
      expect(operationCallback).toHaveBeenCalledTimes(2);
    });

    it('should return empty array when no items are ready', async () => {
      // Mock dequeue to return null immediately
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const operationCallback = jest.fn();

      const results = await retryQueue.processAllReady(operationCallback);

      expect(results).toHaveLength(0);
      expect(operationCallback).not.toHaveBeenCalled();
    });

    it('should handle items that exceed max retries', async () => {
      const mockItem = {
        id: 'retry-item-1',
        type: 'navigation' as RetryItemType,
        data: { url: 'https://example.com' },
        attempts: 2, // Will be 3 after failure (max retries)
        next_retry_time: new Date('2024-01-01T12:00:00Z'),
      };

      // Mock dequeue to return item, then null
      mockQuery
        .mockResolvedValueOnce({ rows: [mockItem], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      // Mock operation callback that fails
      const operationCallback = jest.fn().mockResolvedValue(false);

      const results = await retryQueue.processAllReady(operationCallback);

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('failed');
      expect(results[0].finalAttempts).toBe(3);
      expect(operationCallback).toHaveBeenCalledTimes(1);
    });
  });
});
