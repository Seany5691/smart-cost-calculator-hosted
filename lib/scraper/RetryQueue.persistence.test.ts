/**
 * Persistence Verification Tests for RetryQueue
 * 
 * This test suite verifies that the RetryQueue class correctly implements
 * automatic database persistence for retry items. The persistence is automatic
 * because all operations (enqueue, dequeue, etc.) directly interact with the
 * database via SQL queries.
 * 
 * Task 5.2: Implement retry queue persistence
 * - Save retry items to scraper_retry_queue table ✓ (via enqueue)
 * - Load retry items on session resume ✓ (via dequeue/getAllItems)
 * - Clean up completed retry items ✓ (via dequeue which deletes)
 * 
 * Spec: scraper-robustness-enhancement
 * Phase: 1 - Core Resilience
 */

import { RetryQueue, RetryItem } from './RetryQueue';
import { query } from '../db';

// Mock the database module
jest.mock('../db');
const mockQuery = query as jest.MockedFunction<typeof query>;

describe('RetryQueue - Persistence Verification', () => {
  let retryQueue: RetryQueue;
  const sessionId = 'persistence-test-session';

  beforeEach(() => {
    jest.clearAllMocks();
    retryQueue = new RetryQueue(sessionId);
  });

  describe('Automatic Persistence via Database Operations', () => {
    it('should automatically save retry items to database when enqueued', async () => {
      // Arrange
      const retryItem = {
        type: 'navigation' as const,
        data: { url: 'https://maps.google.com/search?q=plumbers' },
        attempts: 0,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'item-1',
            type: 'navigation',
            data: retryItem.data,
            attempts: 0,
            next_retry_time: new Date(),
          },
        ],
        rowCount: 1,
      } as any);

      // Act
      await retryQueue.enqueue(retryItem);

      // Assert - Verify INSERT query was executed
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO scraper_retry_queue'),
        expect.arrayContaining([
          sessionId,
          'navigation',
          JSON.stringify(retryItem.data),
          0,
          expect.any(Date),
        ])
      );
    });

    it('should automatically load retry items from database when dequeued', async () => {
      // Arrange
      const storedItem = {
        id: 'item-1',
        type: 'lookup',
        data: { businessId: '123', phone: '555-1234' },
        attempts: 1,
        next_retry_time: new Date(Date.now() - 1000), // Ready for retry
      };

      mockQuery.mockResolvedValueOnce({
        rows: [storedItem],
        rowCount: 1,
      } as any);

      // Act
      const item = await retryQueue.dequeue();

      // Assert - Verify SELECT and DELETE queries were executed
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM scraper_retry_queue'),
        [sessionId]
      );
      expect(item).not.toBeNull();
      expect(item!.id).toBe(storedItem.id);
      expect(item!.type).toBe(storedItem.type);
    });

    it('should automatically clean up completed retry items when dequeued', async () => {
      // Arrange
      const completedItem = {
        id: 'completed-item',
        type: 'extraction',
        data: { selector: '.business-name' },
        attempts: 2,
        next_retry_time: new Date(Date.now() - 1000),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [completedItem],
        rowCount: 1,
      } as any);

      // Act
      const item = await retryQueue.dequeue();

      // Assert - Verify DELETE was called (cleanup happens automatically)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM scraper_retry_queue'),
        [sessionId]
      );
      expect(item).not.toBeNull();
    });
  });

  describe('Session Resume - Loading Existing Retry Items', () => {
    it('should load all retry items for a session using getAllItems', async () => {
      // Arrange - Simulate existing items in database from previous session
      const existingItems = [
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
        {
          id: 'item-3',
          type: 'extraction',
          data: { selector: '.business-card' },
          attempts: 2,
          next_retry_time: new Date('2024-01-01T12:02:00Z'),
        },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: existingItems,
        rowCount: 3,
      } as any);

      // Act - Resume session and load existing retry items
      const items = await retryQueue.getAllItems();

      // Assert - Verify all items were loaded from database
      expect(items).toHaveLength(3);
      expect(items[0].id).toBe('item-1');
      expect(items[1].id).toBe('item-2');
      expect(items[2].id).toBe('item-3');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [sessionId]
      );
    });

    it('should process ready items in order when resuming session', async () => {
      // Arrange - Simulate items ready for retry
      const readyItem = {
        id: 'ready-item',
        type: 'navigation',
        data: { url: 'https://example.com' },
        attempts: 1,
        next_retry_time: new Date(Date.now() - 5000), // 5 seconds ago
      };

      mockQuery.mockResolvedValueOnce({
        rows: [readyItem],
        rowCount: 1,
      } as any);

      // Act - Dequeue next ready item
      const item = await retryQueue.dequeue();

      // Assert - Verify item was loaded and removed from database
      expect(item).not.toBeNull();
      expect(item!.id).toBe('ready-item');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('next_retry_time <= NOW()'),
        [sessionId]
      );
    });

    it('should respect retry time ordering when loading items', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'item-1',
            type: 'navigation',
            data: {},
            attempts: 0,
            next_retry_time: new Date('2024-01-01T12:00:00Z'),
          },
        ],
        rowCount: 1,
      } as any);

      // Act
      await retryQueue.getAllItems();

      // Assert - Verify ORDER BY clause
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY next_retry_time ASC'),
        [sessionId]
      );
    });
  });

  describe('Persistence State Management', () => {
    it('should maintain queue size across operations', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '5' }],
        rowCount: 1,
      } as any);

      // Act
      const size = await retryQueue.getQueueSize();

      // Assert - Verify COUNT query was executed
      expect(size).toBe(5);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*)'),
        [sessionId]
      );
    });

    it('should track ready items count for monitoring', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '3' }],
        rowCount: 1,
      } as any);

      // Act
      const readyCount = await retryQueue.getReadyCount();

      // Assert
      expect(readyCount).toBe(3);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('next_retry_time <= NOW()'),
        [sessionId]
      );
    });

    it('should provide detailed statistics for monitoring', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '10' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ count: '5' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({
          rows: [
            { item_type: 'navigation', count: '3' },
            { item_type: 'lookup', count: '5' },
            { item_type: 'extraction', count: '2' },
          ],
          rowCount: 3,
        } as any)
        .mockResolvedValueOnce({
          rows: [
            { attempts: 0, count: '4' },
            { attempts: 1, count: '3' },
            { attempts: 2, count: '3' },
          ],
          rowCount: 3,
        } as any);

      // Act
      const stats = await retryQueue.getStats();

      // Assert - Verify comprehensive statistics
      expect(stats.totalItems).toBe(10);
      expect(stats.readyItems).toBe(5);
      expect(stats.itemsByType.navigation).toBe(3);
      expect(stats.itemsByType.lookup).toBe(5);
      expect(stats.itemsByType.extraction).toBe(2);
      expect(stats.itemsByAttempts[0]).toBe(4);
      expect(stats.itemsByAttempts[1]).toBe(3);
      expect(stats.itemsByAttempts[2]).toBe(3);
    });
  });

  describe('Cleanup Operations', () => {
    it('should clean up all items for a session', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      // Act
      await retryQueue.clear();

      // Assert - Verify DELETE query for all session items
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM scraper_retry_queue'),
        [sessionId]
      );
    });

    it('should automatically clean up items when dequeued (successful retry)', async () => {
      // Arrange - Item that will be successfully retried
      const itemToRetry = {
        id: 'success-item',
        type: 'lookup',
        data: { businessId: '456' },
        attempts: 1,
        next_retry_time: new Date(Date.now() - 1000),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [itemToRetry],
        rowCount: 1,
      } as any);

      // Act - Dequeue removes item from database
      const item = await retryQueue.dequeue();

      // Assert - Item is removed from database (cleanup)
      expect(item).not.toBeNull();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM scraper_retry_queue'),
        [sessionId]
      );
    });
  });

  describe('persist() and restore() Methods', () => {
    it('should have persist() method as no-op (database persistence is automatic)', async () => {
      // Act & Assert - Method exists but does nothing (automatic persistence)
      await expect(retryQueue.persist()).resolves.toBeUndefined();
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should have restore() method as no-op (database persistence is automatic)', async () => {
      // Act & Assert - Method exists but does nothing (automatic persistence)
      await expect(retryQueue.restore()).resolves.toBeUndefined();
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should document that persistence is automatic via database operations', () => {
      // This test documents the design decision:
      // - persist() and restore() are no-ops because persistence is automatic
      // - Every enqueue() saves to database immediately
      // - Every dequeue() loads from database and removes item
      // - getAllItems() loads all items from database
      // - No separate persist/restore step needed
      
      expect(retryQueue.persist).toBeDefined();
      expect(retryQueue.restore).toBeDefined();
      expect(typeof retryQueue.persist).toBe('function');
      expect(typeof retryQueue.restore).toBe('function');
    });
  });

  describe('Integration Scenario: Full Session Lifecycle', () => {
    it('should handle complete session lifecycle with persistence', async () => {
      // Scenario: Scraper session with failures, restart, and resume
      
      // Step 1: Enqueue failed operations during scraping
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'item-1',
            type: 'navigation',
            data: { url: 'https://example.com' },
            attempts: 0,
            next_retry_time: new Date(Date.now() + 1000),
          },
        ],
        rowCount: 1,
      } as any);

      await retryQueue.enqueue({
        type: 'navigation',
        data: { url: 'https://example.com' },
        attempts: 0,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO scraper_retry_queue'),
        expect.any(Array)
      );

      // Step 2: Session crashes/restarts - items persist in database
      // (No action needed - items are already in database)

      // Step 3: Resume session - load existing retry items
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'item-1',
            type: 'navigation',
            data: { url: 'https://example.com' },
            attempts: 0,
            next_retry_time: new Date(Date.now() - 1000), // Now ready
          },
        ],
        rowCount: 1,
      } as any);

      const items = await retryQueue.getAllItems();
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('item-1');

      // Step 4: Process retry items
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'item-1',
            type: 'navigation',
            data: { url: 'https://example.com' },
            attempts: 0,
            next_retry_time: new Date(Date.now() - 1000),
          },
        ],
        rowCount: 1,
      } as any);

      const item = await retryQueue.dequeue();
      expect(item).not.toBeNull();

      // Step 5: Clean up after session completion
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
});
