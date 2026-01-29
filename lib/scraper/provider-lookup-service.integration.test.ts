/**
 * Integration tests for ProviderLookupService with BatchManager
 * 
 * Tests the integration between ProviderLookupService and BatchManager
 * to ensure backward compatibility and proper batch processing.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ProviderLookupService } from './provider-lookup-service';
import type { Browser, Page } from 'puppeteer';

// Mock puppeteer
jest.mock('puppeteer', () => ({
  default: {
    launch: jest.fn(),
  },
}));

// Mock ProviderCache
jest.mock('./provider-cache', () => ({
  ProviderCache: {
    getMany: jest.fn(async () => new Map()),
    setMany: jest.fn(async () => {}),
  },
}));

describe('ProviderLookupService Integration with BatchManager', () => {
  let service: ProviderLookupService;
  let mockBrowser: any;
  let mockPage: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock page
    mockPage = {
      goto: jest.fn(async () => {}),
      waitForSelector: jest.fn(async () => {}),
      $: jest.fn(async () => ({
        evaluate: jest.fn(async () => 'Number is serviced by Vodacom.'),
      })),
      close: jest.fn(async () => {}),
    };

    // Create mock browser
    mockBrowser = {
      newPage: jest.fn(async () => mockPage),
      close: jest.fn(async () => {}),
    };

    // Mock puppeteer.launch
    const puppeteer = require('puppeteer');
    puppeteer.default.launch.mockResolvedValue(mockBrowser);

    // Create service instance
    service = new ProviderLookupService({
      maxConcurrentBatches: 1,
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain the same public API', () => {
      expect(service).toHaveProperty('lookupProviders');
      expect(service).toHaveProperty('createBatchesOfFive');
      expect(service).toHaveProperty('processBatchWithNewBrowser');
      expect(service).toHaveProperty('cleanup');
      expect(service).toHaveProperty('getActiveLookups');
    });

    it('should have new BatchManager methods', () => {
      expect(service).toHaveProperty('getBatchManagerStatistics');
      expect(service).toHaveProperty('resetBatchManager');
    });

    it('should return Map<string, string> from lookupProviders', async () => {
      const result = await service.lookupProviders(['0123456789']);
      expect(result).toBeInstanceOf(Map);
    });
  });

  describe('BatchManager Integration', () => {
    it('should use BatchManager for processing lookups', async () => {
      const phoneNumbers = ['0111111111', '0222222222', '0333333333'];
      
      const result = await service.lookupProviders(phoneNumbers);
      
      expect(result.size).toBe(3);
      expect(mockBrowser.newPage).toHaveBeenCalled();
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should process batches of up to 5 numbers', async () => {
      const phoneNumbers = [
        '0111111111',
        '0222222222',
        '0333333333',
        '0444444444',
        '0555555555',
      ];
      
      const result = await service.lookupProviders(phoneNumbers);
      
      expect(result.size).toBe(5);
      
      // Verify BatchManager statistics
      const stats = service.getBatchManagerStatistics();
      expect(stats.totalBatchesProcessed).toBe(1);
      expect(stats.totalLookupsProcessed).toBe(5);
      expect(stats.currentBatchSize).toBeLessThanOrEqual(5);
    });

    it('should process multiple batches for more than 5 numbers', async () => {
      const phoneNumbers = [
        '0111111111',
        '0222222222',
        '0333333333',
        '0444444444',
        '0555555555',
        '0666666666',
        '0777777777',
      ];
      
      const result = await service.lookupProviders(phoneNumbers);
      
      expect(result.size).toBe(7);
      
      // Verify BatchManager statistics
      const stats = service.getBatchManagerStatistics();
      expect(stats.totalBatchesProcessed).toBe(2); // 5 + 2
      expect(stats.totalLookupsProcessed).toBe(7);
    }, 15000); // Increase timeout for multiple batches with delays

    it('should track success rate in BatchManager', async () => {
      const phoneNumbers = ['0111111111', '0222222222', '0333333333'];
      
      await service.lookupProviders(phoneNumbers);
      
      const stats = service.getBatchManagerStatistics();
      expect(stats.rollingSuccessRate).toBeGreaterThan(0);
      expect(stats.rollingSuccessRate).toBeLessThanOrEqual(1);
    });

    it('should handle empty phone number array', async () => {
      const result = await service.lookupProviders([]);
      
      expect(result.size).toBe(0);
      
      const stats = service.getBatchManagerStatistics();
      expect(stats.totalBatchesProcessed).toBe(0);
    });

    it('should filter out empty phone numbers', async () => {
      const phoneNumbers = ['0111111111', '', '0222222222', '   ', '0333333333'];
      
      const result = await service.lookupProviders(phoneNumbers);
      
      expect(result.size).toBe(3);
      
      const stats = service.getBatchManagerStatistics();
      expect(stats.totalLookupsProcessed).toBe(3);
    });

    it('should reset BatchManager state', async () => {
      // Process some lookups
      await service.lookupProviders(['0111111111', '0222222222']);
      
      let stats = service.getBatchManagerStatistics();
      expect(stats.totalBatchesProcessed).toBeGreaterThan(0);
      
      // Reset
      service.resetBatchManager();
      
      stats = service.getBatchManagerStatistics();
      expect(stats.totalBatchesProcessed).toBe(0);
      expect(stats.totalLookupsProcessed).toBe(0);
      expect(stats.currentBatchSize).toBe(5); // Back to max
    });
  });

  describe('Error Handling', () => {
    it('should handle lookup failures gracefully', async () => {
      // Mock a failure
      mockPage.goto.mockRejectedValueOnce(new Error('Network error'));
      
      const result = await service.lookupProviders(['0111111111']);
      
      // Should still return a result (even if it's null/Unknown)
      expect(result).toBeInstanceOf(Map);
    });

    it('should continue processing after a failed lookup', async () => {
      // Mock first lookup to fail, second to succeed
      mockPage.goto
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined);
      
      const result = await service.lookupProviders(['0111111111', '0222222222']);
      
      expect(result).toBeInstanceOf(Map);
      
      const stats = service.getBatchManagerStatistics();
      expect(stats.totalLookupsProcessed).toBe(2);
    });
  });

  describe('Adaptive Batch Sizing', () => {
    it('should reduce batch size after failures', async () => {
      // Mock all lookups to fail
      mockPage.goto.mockRejectedValue(new Error('Network error'));
      
      // Process a batch that will fail
      await service.lookupProviders(['0111111111', '0222222222', '0333333333', '0444444444', '0555555555']);
      
      const stats = service.getBatchManagerStatistics();
      
      // Batch size should be reduced from 5
      expect(stats.currentBatchSize).toBeLessThan(5);
    }, 10000);

    it('should never exceed batch size of 5', async () => {
      // Process many successful batches
      for (let i = 0; i < 10; i++) {
        await service.lookupProviders(['0111111111', '0222222222']);
      }
      
      const stats = service.getBatchManagerStatistics();
      
      // Batch size should never exceed 5
      expect(stats.currentBatchSize).toBeLessThanOrEqual(5);
      expect(stats.maxBatchSize).toBe(5);
    }, 60000); // Long timeout for multiple batches
  });

  describe('Statistics and Monitoring', () => {
    it('should provide detailed statistics', async () => {
      await service.lookupProviders(['0111111111', '0222222222', '0333333333']);
      
      const stats = service.getBatchManagerStatistics();
      
      expect(stats).toHaveProperty('totalBatchesProcessed');
      expect(stats).toHaveProperty('totalLookupsProcessed');
      expect(stats).toHaveProperty('currentBatchSize');
      expect(stats).toHaveProperty('currentBatchCount');
      expect(stats).toHaveProperty('rollingSuccessRate');
      expect(stats).toHaveProperty('lastBatchTime');
      expect(stats).toHaveProperty('minBatchSize');
      expect(stats).toHaveProperty('maxBatchSize');
    });

    it('should track processing time', async () => {
      const startTime = Date.now();
      
      await service.lookupProviders(['0111111111', '0222222222']);
      
      const endTime = Date.now();
      const stats = service.getBatchManagerStatistics();
      
      expect(stats.lastBatchTime).toBeGreaterThanOrEqual(startTime);
      expect(stats.lastBatchTime).toBeLessThanOrEqual(endTime);
    });
  });

  describe('Deprecated Methods', () => {
    it('should still support createBatchesOfFive for backward compatibility', () => {
      const phoneNumbers = ['0111111111', '0222222222', '0333333333', '0444444444', '0555555555', '0666666666'];
      
      const batches = service.createBatchesOfFive(phoneNumbers);
      
      expect(batches).toHaveLength(2);
      expect(batches[0]).toHaveLength(5);
      expect(batches[1]).toHaveLength(1);
    });

    it('should still support processBatchWithNewBrowser for backward compatibility', async () => {
      const batch = ['0111111111', '0222222222'];
      const results = new Map<string, string>();
      
      await service.processBatchWithNewBrowser(batch, results, 1);
      
      expect(results.size).toBe(2);
      expect(mockBrowser.newPage).toHaveBeenCalled();
      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });
});
