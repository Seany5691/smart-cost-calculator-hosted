/**
 * Integration tests for RetryQueue with NavigationManager and BatchManager
 * 
 * Tests:
 * - NavigationManager enqueues failed navigations to RetryQueue
 * - BatchManager enqueues failed provider lookups to RetryQueue
 * - Retry processing works end-to-end
 * 
 * Spec: scraper-robustness-enhancement
 * Task: 5.4 - Integrate with NavigationManager and BatchManager
 */

import { RetryQueue } from './RetryQueue';
import { NavigationManager } from './NavigationManager';
import { BatchManager, ProviderLookup } from './BatchManager';
import { query } from '../db';
import type { Page } from 'puppeteer';

// Mock the database module
jest.mock('../db');
const mockQuery = query as jest.MockedFunction<typeof query>;

// Mock ErrorLogger
jest.mock('./error-logger', () => ({
  ErrorLogger: {
    getInstance: jest.fn(() => ({
      logError: jest.fn(),
    })),
  },
}));

// Mock logger
jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    critical: jest.fn(),
  },
}));

describe('RetryQueue Integration Tests', () => {
  const sessionId = 'test-session-integration';
  let retryQueue: RetryQueue;

  beforeEach(() => {
    jest.clearAllMocks();
    retryQueue = new RetryQueue(sessionId);
  });

  describe('NavigationManager Integration', () => {
    let navigationManager: NavigationManager;
    let mockPage: jest.Mocked<Page>;

    beforeEach(() => {
      navigationManager = new NavigationManager(retryQueue);
      
      // Create a mock page
      mockPage = {
        goto: jest.fn(),
      } as any;
    });

    it('should enqueue failed navigation to retry queue', async () => {
      // Mock page.goto to always fail
      mockPage.goto.mockRejectedValue(new Error('Navigation timeout'));

      // Mock enqueue to succeed
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'retry-item-1',
          type: 'navigation',
          data: { url: 'https://example.com', options: expect.any(Object) },
          attempts: 0,
          next_retry_time: new Date(),
        }],
        rowCount: 1,
      } as any);

      // Try to navigate (should fail and enqueue)
      await expect(
        navigationManager.navigateWithRetry(mockPage, 'https://example.com', {
          maxRetries: 1, // Reduce retries for faster test
        })
      ).rejects.toThrow('Navigation failed');

      // Verify enqueue was called
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO scraper_retry_queue'),
        expect.arrayContaining([
          sessionId,
          'navigation',
          expect.any(String), // JSON stringified data
          0, // attempts
          expect.any(Date), // next_retry_time
        ])
      );
    });

    it('should not enqueue if RetryQueue is not set', async () => {
      // Create NavigationManager without RetryQueue
      const navManagerNoQueue = new NavigationManager();
      
      // Mock page.goto to always fail
      mockPage.goto.mockRejectedValue(new Error('Navigation timeout'));

      // Try to navigate (should fail but not enqueue)
      await expect(
        navManagerNoQueue.navigateWithRetry(mockPage, 'https://example.com', {
          maxRetries: 1,
        })
      ).rejects.toThrow('Navigation failed');

      // Verify enqueue was NOT called
      expect(mockQuery).not.toHaveBeen