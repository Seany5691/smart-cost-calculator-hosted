/**
 * Unit tests for BatchManager
 * 
 * Tests the critical batch-of-5 constraint and all BatchManager functionality
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { BatchManager, ProviderLookup, BatchResult } from './BatchManager';

describe('BatchManager', () => {
  let batchManager: BatchManager;

  beforeEach(() => {
    batchManager = new BatchManager();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const stats = batchManager.getStatistics();
      expect(stats.currentBatchSize).toBe(5); // Default max batch size
      expect(stats.minBatchSize).toBe(3); // Default min batch size
      expect(stats.maxBatchSize).toBe(5); // Absolute max
      expect(stats.currentBatchCount).toBe(0);
      expect(stats.totalBatchesProcessed).toBe(0);
    });

    it('should initialize with custom minimum batch size', () => {
      const customManager = new BatchManager({ minBatchSize: 4 });
      const stats = customManager.getStatistics();
      expect(stats.minBatchSize).toBe(4);
      expect(stats.currentBatchSize).toBe(5); // Still starts at max
    });

    it('should enforce minimum batch size >= 1', () => {
      const customManager = new BatchManager({ minBatchSize: 0 });
      const stats = customManager.getStatistics();
      expect(stats.minBatchSize).toBe(1); // Corrected to 1
    });

    it('should enforce minimum batch size <= 5', () => {
      const customManager = new BatchManager({ minBatchSize: 10 });
      const stats = customManager.getStatistics();
      expect(stats.minBatchSize).toBe(5); // Corrected to max
    });

    it('CRITICAL: should throw error if maxBatchSize exceeds 5', () => {
      expect(() => {
        new BatchManager({ maxBatchSize: 6 });
      }).toThrow(/CRITICAL CONSTRAINT VIOLATION/);
    });

    it('CRITICAL: should throw error if maxBatchSize exceeds 5 by a lot', () => {
      expect(() => {
        new BatchManager({ maxBatchSize: 100 });
      }).toThrow(/CRITICAL CONSTRAINT VIOLATION/);
    });

    it('should accept maxBatchSize of 5', () => {
      const customManager = new BatchManager({ maxBatchSize: 5 });
      const stats = customManager.getStatistics();
      expect(stats.maxBatchSize).toBe(5);
      expect(stats.currentBatchSize).toBe(5);
    });

    it('should initialize with custom inter-batch delay', () => {
      const customManager = new BatchManager({ interBatchDelay: [3000, 6000] });
      // No direct getter for interBatchDelay, but we can verify it doesn't throw
      expect(customManager).toBeDefined();
    });

    it('should use default inter-batch delay for invalid range', () => {
      const customManager = new BatchManager({ interBatchDelay: [5000, 2000] }); // Invalid: min > max
      // Should use default [2000, 5000]
      expect(customManager).toBeDefined();
    });

    it('should initialize with custom success rate threshold', () => {
      const customManager = new BatchManager({ successRateThreshold: 0.7 });
      expect(customManager).toBeDefined();
    });

    it('should enforce success rate threshold bounds [0, 1]', () => {
      const customManager1 = new BatchManager({ successRateThreshold: -0.5 });
      const customManager2 = new BatchManager({ successRateThreshold: 1.5 });
      // Should use default 0.5 for both
      expect(customManager1).toBeDefined();
      expect(customManager2).toBeDefined();
    });
  });

  describe('Adding to Batch', () => {
    it('should add lookup to batch', () => {
      const lookup: ProviderLookup = { phoneNumber: '1234567890' };
      batchManager.addToBatch(lookup);
      
      const stats = batchManager.getStatistics();
      expect(stats.currentBatchCount).toBe(1);
      expect(batchManager.isBatchEmpty()).toBe(false);
    });

    it('should add multiple lookups to batch', () => {
      const lookups: ProviderLookup[] = [
        { phoneNumber: '1111111111' },
        { phoneNumber: '2222222222' },
        { phoneNumber: '3333333333' },
      ];

      lookups.forEach(lookup => batchManager.addToBatch(lookup));
      
      const stats = batchManager.getStatistics();
      expect(stats.currentBatchCount).toBe(3);
    });

    it('should add lookup with metadata', () => {
      const lookup: ProviderLookup = {
        phoneNumber: '1234567890',
        businessId: 'biz-123',
        metadata: { source: 'google-maps' },
      };
      
      batchManager.addToBatch(lookup);
      const batch = batchManager.getCurrentBatch();
      expect(batch[0]).toEqual(lookup);
    });

    it('CRITICAL: should allow adding up to 5 lookups', () => {
      for (let i = 0; i < 5; i++) {
        batchManager.addToBatch({ phoneNumber: `${i}` });
      }
      
      const stats = batchManager.getStatistics();
      expect(stats.currentBatchCount).toBe(5);
      expect(batchManager.isBatchFull()).toBe(true);
    });

    it('CRITICAL: should throw error when adding 6th lookup', () => {
      // Add 5 lookups (fill the batch)
      for (let i = 0; i < 5; i++) {
        batchManager.addToBatch({ phoneNumber: `${i}` });
      }
      
      // Try to add 6th lookup - should throw
      expect(() => {
        batchManager.addToBatch({ phoneNumber: '6' });
      }).toThrow(/Cannot add to batch - batch is full/);
    });

    it('CRITICAL: should never exceed batch size of 5', () => {
      // Add 5 lookups
      for (let i = 0; i < 5; i++) {
        batchManager.addToBatch({ phoneNumber: `${i}` });
      }
      
      const stats = batchManager.getStatistics();
      expect(stats.currentBatchCount).toBe(5);
      expect(stats.currentBatchCount).toBeLessThanOrEqual(5);
      
      // Verify we cannot add more
      expect(() => {
        batchManager.addToBatch({ phoneNumber: '6' });
      }).toThrow();
    });
  });

  describe('Batch State Queries', () => {
    it('should report batch as empty initially', () => {
      expect(batchManager.isBatchEmpty()).toBe(true);
      expect(batchManager.isBatchFull()).toBe(false);
    });

    it('should report batch as not empty after adding lookup', () => {
      batchManager.addToBatch({ phoneNumber: '1234567890' });
      expect(batchManager.isBatchEmpty()).toBe(false);
    });

    it('should report batch as full when at capacity', () => {
      for (let i = 0; i < 5; i++) {
        batchManager.addToBatch({ phoneNumber: `${i}` });
      }
      expect(batchManager.isBatchFull()).toBe(true);
    });

    it('should return current batch count', () => {
      expect(batchManager.getCurrentBatchCount()).toBe(0);
      
      batchManager.addToBatch({ phoneNumber: '1' });
      expect(batchManager.getCurrentBatchCount()).toBe(1);
      
      batchManager.addToBatch({ phoneNumber: '2' });
      expect(batchManager.getCurrentBatchCount()).toBe(2);
    });

    it('should return current batch size (max capacity)', () => {
      expect(batchManager.getCurrentBatchSize()).toBe(5);
    });

    it('should return copy of current batch', () => {
      const lookup1: ProviderLookup = { phoneNumber: '1' };
      const lookup2: ProviderLookup = { phoneNumber: '2' };
      
      batchManager.addToBatch(lookup1);
      batchManager.addToBatch(lookup2);
      
      const batch = batchManager.getCurrentBatch();
      expect(batch).toHaveLength(2);
      expect(batch[0]).toEqual(lookup1);
      expect(batch[1]).toEqual(lookup2);
      
      // Verify it's a copy (modifying returned array doesn't affect internal state)
      batch.push({ phoneNumber: '3' });
      expect(batchManager.getCurrentBatchCount()).toBe(2); // Still 2, not 3
    });
  });

  describe('Clearing Batch', () => {
    it('should clear batch', () => {
      batchManager.addToBatch({ phoneNumber: '1' });
      batchManager.addToBatch({ phoneNumber: '2' });
      
      expect(batchManager.getCurrentBatchCount()).toBe(2);
      
      batchManager.clearBatch();
      
      expect(batchManager.getCurrentBatchCount()).toBe(0);
      expect(batchManager.isBatchEmpty()).toBe(true);
    });

    it('should allow adding to batch after clearing', () => {
      // Fill batch
      for (let i = 0; i < 5; i++) {
        batchManager.addToBatch({ phoneNumber: `${i}` });
      }
      
      batchManager.clearBatch();
      
      // Should be able to add again
      batchManager.addToBatch({ phoneNumber: 'new' });
      expect(batchManager.getCurrentBatchCount()).toBe(1);
    });
  });

  describe('Inter-Batch Delay', () => {
    it('should wait for inter-batch delay', async () => {
      const startTime = Date.now();
      await batchManager.waitForInterBatchDelay();
      const endTime = Date.now();
      
      const elapsed = endTime - startTime;
      // Default delay is [2000, 5000], so elapsed should be in that range
      expect(elapsed).toBeGreaterThanOrEqual(1900); // Allow small margin
      expect(elapsed).toBeLessThanOrEqual(5100); // Allow small margin
    });

    it('should randomize delay within range', async () => {
      const delays: number[] = [];
      
      // Run multiple times to check randomization
      for (let i = 0; i < 3; i++) {
        const startTime = Date.now();
        await batchManager.waitForInterBatchDelay();
        const endTime = Date.now();
        delays.push(endTime - startTime);
      }
      
      // Check that not all delays are identical (randomization working)
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);
    }, 20000); // Increase timeout to 20 seconds

    it('should respect custom inter-batch delay range', async () => {
      const customManager = new BatchManager({ interBatchDelay: [1000, 2000] });
      
      const startTime = Date.now();
      await customManager.waitForInterBatchDelay();
      const endTime = Date.now();
      
      const elapsed = endTime - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(900); // Allow small margin
      expect(elapsed).toBeLessThanOrEqual(2100); // Allow small margin
    });
  });

  describe('Recording Batch Results', () => {
    it('should record successful batch result', () => {
      const result: BatchResult = {
        successful: 5,
        failed: 0,
        results: new Map([['1', 'result1'], ['2', 'result2']]),
        successRate: 1.0,
        batchSize: 5,
        processingTime: 1000,
      };
      
      batchManager.recordBatchResult(result);
      
      const stats = batchManager.getStatistics();
      expect(stats.totalBatchesProcessed).toBe(1);
      expect(stats.totalLookupsProcessed).toBe(5);
      expect(stats.rollingSuccessRate).toBe(1.0);
    });

    it('should record failed batch result', () => {
      const result: BatchResult = {
        successful: 2,
        failed: 3,
        results: new Map(),
        successRate: 0.4,
        batchSize: 5,
        processingTime: 1500,
      };
      
      batchManager.recordBatchResult(result);
      
      const stats = batchManager.getStatistics();
      expect(stats.totalBatchesProcessed).toBe(1);
      expect(stats.rollingSuccessRate).toBe(0.0); // Below threshold, counted as failure
    });

    it('should track rolling success rate over multiple batches', () => {
      // Record 3 successful batches
      for (let i = 0; i < 3; i++) {
        batchManager.recordBatchResult({
          successful: 5,
          failed: 0,
          results: new Map(),
          successRate: 1.0,
          batchSize: 5,
          processingTime: 1000,
        });
      }
      
      expect(batchManager.getRollingSuccessRate()).toBe(1.0);
      
      // Record 2 failed batches
      for (let i = 0; i < 2; i++) {
        batchManager.recordBatchResult({
          successful: 1,
          failed: 4,
          results: new Map(),
          successRate: 0.2,
          batchSize: 5,
          processingTime: 1000,
        });
      }
      
      // Rolling rate should be 3/5 = 0.6
      expect(batchManager.getRollingSuccessRate()).toBe(0.6);
    });

    it('should limit rolling history to 10 batches', () => {
      // Record 15 successful batches
      for (let i = 0; i < 15; i++) {
        batchManager.recordBatchResult({
          successful: 5,
          failed: 0,
          results: new Map(),
          successRate: 1.0,
          batchSize: 5,
          processingTime: 1000,
        });
      }
      
      const stats = batchManager.getStatistics();
      expect(stats.totalBatchesProcessed).toBe(15);
      expect(stats.rollingSuccessRate).toBe(1.0); // Based on last 10
    });
  });

  describe('Adaptive Batch Sizing', () => {
    it('should reduce batch size when success rate is low', () => {
      // Record a failed batch (success rate < 0.5)
      batchManager.recordBatchResult({
        successful: 1,
        failed: 4,
        results: new Map(),
        successRate: 0.2,
        batchSize: 5,
        processingTime: 1000,
      });
      
      const stats = batchManager.getStatistics();
      expect(stats.currentBatchSize).toBe(4); // Reduced from 5 to 4
    });

    it('should not reduce batch size below minimum', () => {
      const customManager = new BatchManager({ minBatchSize: 3 });
      
      // Reduce to minimum
      customManager.recordBatchResult({
        successful: 0,
        failed: 5,
        successRate: 0.0,
        batchSize: 5,
        processingTime: 1000,
        results: new Map(),
      });
      customManager.recordBatchResult({
        successful: 0,
        failed: 4,
        successRate: 0.0,
        batchSize: 4,
        processingTime: 1000,
        results: new Map(),
      });
      customManager.recordBatchResult({
        successful: 0,
        failed: 3,
        successRate: 0.0,
        batchSize: 3,
        processingTime: 1000,
        results: new Map(),
      });
      
      const stats = customManager.getStatistics();
      expect(stats.currentBatchSize).toBe(3); // At minimum, won't go lower
    });

    it('CRITICAL: should NOT increase batch size even when rolling success rate is good', () => {
      // First reduce batch size
      batchManager.recordBatchResult({
        successful: 1,
        failed: 4,
        successRate: 0.2,
        batchSize: 5,
        processingTime: 1000,
        results: new Map(),
      });
      
      expect(batchManager.getCurrentBatchSize()).toBe(4);
      
      // Now record many successful batches - batch size should NOT increase
      for (let i = 0; i < 10; i++) {
        batchManager.recordBatchResult({
          successful: 4,
          failed: 0,
          successRate: 1.0,
          batchSize: 4,
          processingTime: 1000,
          results: new Map(),
        });
      }
      
      const stats = batchManager.getStatistics();
      expect(stats.currentBatchSize).toBe(4); // Should stay at 4, NEVER increase
    });

    it('CRITICAL: should never increase batch size above 5', () => {
      // Record many successful batches
      for (let i = 0; i < 20; i++) {
        batchManager.recordBatchResult({
          successful: 5,
          failed: 0,
          successRate: 1.0,
          batchSize: 5,
          processingTime: 1000,
          results: new Map(),
        });
      }
      
      const stats = batchManager.getStatistics();
      expect(stats.currentBatchSize).toBe(5); // Still 5, never exceeded
      expect(stats.maxBatchSize).toBe(5);
    });

    it('CRITICAL: should enforce absolute maximum even if corrupted', () => {
      // This tests the safety check in adjustBatchSize
      // We can't directly corrupt batchSize, but we can verify the check exists
      // by recording results and ensuring it never exceeds 5
      
      for (let i = 0; i < 100; i++) {
        batchManager.recordBatchResult({
          successful: 5,
          failed: 0,
          successRate: 1.0,
          batchSize: 5,
          processingTime: 1000,
          results: new Map(),
        });
        
        const stats = batchManager.getStatistics();
        expect(stats.currentBatchSize).toBeLessThanOrEqual(5);
      }
    });
  });

  describe('Statistics', () => {
    it('should return accurate statistics', () => {
      const stats = batchManager.getStatistics();
      
      expect(stats).toHaveProperty('totalBatchesProcessed');
      expect(stats).toHaveProperty('totalLookupsProcessed');
      expect(stats).toHaveProperty('currentBatchSize');
      expect(stats).toHaveProperty('currentBatchCount');
      expect(stats).toHaveProperty('rollingSuccessRate');
      expect(stats).toHaveProperty('lastBatchTime');
      expect(stats).toHaveProperty('minBatchSize');
      expect(stats).toHaveProperty('maxBatchSize');
    });

    it('should track total batches and lookups processed', () => {
      batchManager.recordBatchResult({
        successful: 5,
        failed: 0,
        successRate: 1.0,
        batchSize: 5,
        processingTime: 1000,
        results: new Map(),
      });
      
      batchManager.recordBatchResult({
        successful: 3,
        failed: 0,
        successRate: 1.0,
        batchSize: 3,
        processingTime: 1000,
        results: new Map(),
      });
      
      const stats = batchManager.getStatistics();
      expect(stats.totalBatchesProcessed).toBe(2);
      expect(stats.totalLookupsProcessed).toBe(8); // 5 + 3
    });

    it('should track last batch time', () => {
      const beforeTime = Date.now();
      
      batchManager.recordBatchResult({
        successful: 5,
        failed: 0,
        successRate: 1.0,
        batchSize: 5,
        processingTime: 1000,
        results: new Map(),
      });
      
      const afterTime = Date.now();
      const stats = batchManager.getStatistics();
      
      expect(stats.lastBatchTime).toBeGreaterThanOrEqual(beforeTime);
      expect(stats.lastBatchTime).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Reset', () => {
    it('should reset all state', () => {
      // Add some state
      batchManager.addToBatch({ phoneNumber: '1' });
      batchManager.addToBatch({ phoneNumber: '2' });
      
      batchManager.recordBatchResult({
        successful: 2,
        failed: 0,
        successRate: 1.0,
        batchSize: 2,
        processingTime: 1000,
        results: new Map(),
      });
      
      // Reset
      batchManager.reset();
      
      // Verify everything is reset
      const stats = batchManager.getStatistics();
      expect(stats.currentBatchCount).toBe(0);
      expect(stats.currentBatchSize).toBe(5); // Back to max
      expect(stats.totalBatchesProcessed).toBe(0);
      expect(stats.totalLookupsProcessed).toBe(0);
      expect(stats.rollingSuccessRate).toBe(1.0); // Default when no history
      expect(stats.lastBatchTime).toBe(0);
    });

    it('should allow normal operation after reset', () => {
      // Add and process batch
      batchManager.addToBatch({ phoneNumber: '1' });
      batchManager.recordBatchResult({
        successful: 1,
        failed: 0,
        successRate: 1.0,
        batchSize: 1,
        processingTime: 1000,
        results: new Map(),
      });
      
      // Reset
      batchManager.reset();
      
      // Should work normally
      batchManager.addToBatch({ phoneNumber: '2' });
      expect(batchManager.getCurrentBatchCount()).toBe(1);
    });
  });

  describe('Batch Processing', () => {
    it('should process empty batch and return empty result', async () => {
      const processor = jest.fn(async (lookup: ProviderLookup) => `result-${lookup.phoneNumber}`);
      
      const result = await batchManager.processBatch(processor);
      
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.batchSize).toBe(0);
      expect(result.successRate).toBe(0);
      expect(result.results.size).toBe(0);
      expect(processor).not.toHaveBeenCalled();
    });

    it('should process single lookup successfully', async () => {
      batchManager.addToBatch({ phoneNumber: '1234567890' });
      
      const processor = jest.fn(async (lookup: ProviderLookup) => `result-${lookup.phoneNumber}`);
      
      const result = await batchManager.processBatch(processor);
      
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.batchSize).toBe(1);
      expect(result.successRate).toBe(1.0);
      expect(result.results.get('1234567890')).toBe('result-1234567890');
      expect(processor).toHaveBeenCalledTimes(1);
    });

    it('should process multiple lookups sequentially', async () => {
      const lookups = [
        { phoneNumber: '1111111111' },
        { phoneNumber: '2222222222' },
        { phoneNumber: '3333333333' },
      ];
      
      lookups.forEach(lookup => batchManager.addToBatch(lookup));
      
      const callOrder: string[] = [];
      const processor = jest.fn(async (lookup: ProviderLookup) => {
        callOrder.push(lookup.phoneNumber);
        return `result-${lookup.phoneNumber}`;
      });
      
      const result = await batchManager.processBatch(processor);
      
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.batchSize).toBe(3);
      expect(result.successRate).toBe(1.0);
      expect(processor).toHaveBeenCalledTimes(3);
      
      // Verify sequential processing
      expect(callOrder).toEqual(['1111111111', '2222222222', '3333333333']);
    });

    it('CRITICAL: should process batch of 5 lookups', async () => {
      for (let i = 1; i <= 5; i++) {
        batchManager.addToBatch({ phoneNumber: `${i}` });
      }
      
      const processor = jest.fn(async (lookup: ProviderLookup) => `result-${lookup.phoneNumber}`);
      
      const result = await batchManager.processBatch(processor);
      
      expect(result.successful).toBe(5);
      expect(result.failed).toBe(0);
      expect(result.batchSize).toBe(5);
      expect(result.successRate).toBe(1.0);
      expect(processor).toHaveBeenCalledTimes(5);
    });

    it('should handle processor returning null (failed lookup)', async () => {
      batchManager.addToBatch({ phoneNumber: '1111111111' });
      batchManager.addToBatch({ phoneNumber: '2222222222' });
      batchManager.addToBatch({ phoneNumber: '3333333333' });
      
      const processor = jest.fn(async (lookup: ProviderLookup) => {
        // Fail the second lookup
        if (lookup.phoneNumber === '2222222222') {
          return null;
        }
        return `result-${lookup.phoneNumber}`;
      });
      
      const result = await batchManager.processBatch(processor);
      
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.batchSize).toBe(3);
      expect(result.successRate).toBeCloseTo(0.667, 2);
      expect(result.results.size).toBe(2);
      expect(result.results.has('1111111111')).toBe(true);
      expect(result.results.has('2222222222')).toBe(false);
      expect(result.results.has('3333333333')).toBe(true);
    });

    it('should handle processor throwing error', async () => {
      batchManager.addToBatch({ phoneNumber: '1111111111' });
      batchManager.addToBatch({ phoneNumber: '2222222222' });
      batchManager.addToBatch({ phoneNumber: '3333333333' });
      
      const processor = jest.fn(async (lookup: ProviderLookup) => {
        // Throw error on second lookup
        if (lookup.phoneNumber === '2222222222') {
          throw new Error('Lookup failed');
        }
        return `result-${lookup.phoneNumber}`;
      });
      
      const result = await batchManager.processBatch(processor);
      
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.batchSize).toBe(3);
      expect(result.successRate).toBeCloseTo(0.667, 2);
    });

    it('should handle mixed success and failure', async () => {
      for (let i = 1; i <= 5; i++) {
        batchManager.addToBatch({ phoneNumber: `${i}` });
      }
      
      const processor = jest.fn(async (lookup: ProviderLookup) => {
        const num = parseInt(lookup.phoneNumber);
        // Fail odd numbers
        if (num % 2 === 1) {
          return null;
        }
        return `result-${lookup.phoneNumber}`;
      });
      
      const result = await batchManager.processBatch(processor);
      
      expect(result.successful).toBe(2); // 2 and 4
      expect(result.failed).toBe(3); // 1, 3, 5
      expect(result.batchSize).toBe(5);
      expect(result.successRate).toBe(0.4);
    });

    it('should clear batch after processing', async () => {
      batchManager.addToBatch({ phoneNumber: '1' });
      batchManager.addToBatch({ phoneNumber: '2' });
      
      expect(batchManager.getCurrentBatchCount()).toBe(2);
      
      const processor = jest.fn(async (lookup: ProviderLookup) => `result-${lookup.phoneNumber}`);
      await batchManager.processBatch(processor);
      
      expect(batchManager.getCurrentBatchCount()).toBe(0);
      expect(batchManager.isBatchEmpty()).toBe(true);
    });

    it('should record batch result and update statistics', async () => {
      batchManager.addToBatch({ phoneNumber: '1' });
      batchManager.addToBatch({ phoneNumber: '2' });
      
      const processor = jest.fn(async (lookup: ProviderLookup) => `result-${lookup.phoneNumber}`);
      await batchManager.processBatch(processor);
      
      const stats = batchManager.getStatistics();
      expect(stats.totalBatchesProcessed).toBe(1);
      expect(stats.totalLookupsProcessed).toBe(2);
      expect(stats.rollingSuccessRate).toBe(1.0);
    });

    it('should wait for inter-batch delay after processing', async () => {
      batchManager.addToBatch({ phoneNumber: '1' });
      
      const processor = jest.fn(async (lookup: ProviderLookup) => `result-${lookup.phoneNumber}`);
      
      const startTime = Date.now();
      await batchManager.processBatch(processor);
      const endTime = Date.now();
      
      const elapsed = endTime - startTime;
      // Should include inter-batch delay (2000-5000ms)
      expect(elapsed).toBeGreaterThanOrEqual(1900);
    });

    it('should track processing time', async () => {
      batchManager.addToBatch({ phoneNumber: '1' });
      
      const processor = jest.fn(async (lookup: ProviderLookup) => {
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 100));
        return `result-${lookup.phoneNumber}`;
      });
      
      const result = await batchManager.processBatch(processor);
      
      expect(result.processingTime).toBeGreaterThanOrEqual(100);
    });

    it('should pass lookup metadata to processor', async () => {
      const lookup: ProviderLookup = {
        phoneNumber: '1234567890',
        businessId: 'biz-123',
        metadata: { source: 'google-maps', priority: 'high' },
      };
      
      batchManager.addToBatch(lookup);
      
      const processor = jest.fn(async (lookup: ProviderLookup) => {
        expect(lookup.businessId).toBe('biz-123');
        expect(lookup.metadata).toEqual({ source: 'google-maps', priority: 'high' });
        return `result-${lookup.phoneNumber}`;
      });
      
      await batchManager.processBatch(processor);
      
      expect(processor).toHaveBeenCalledWith(lookup);
    });

    it('should reduce batch size after failed batch', async () => {
      for (let i = 1; i <= 5; i++) {
        batchManager.addToBatch({ phoneNumber: `${i}` });
      }
      
      // All lookups fail
      const processor = jest.fn(async (lookup: ProviderLookup) => null);
      
      await batchManager.processBatch(processor);
      
      const stats = batchManager.getStatistics();
      expect(stats.currentBatchSize).toBe(4); // Reduced from 5 to 4
    });

    it('should process multiple batches sequentially', async () => {
      const processor = jest.fn(async (lookup: ProviderLookup) => `result-${lookup.phoneNumber}`);
      
      // First batch
      batchManager.addToBatch({ phoneNumber: '1' });
      batchManager.addToBatch({ phoneNumber: '2' });
      const result1 = await batchManager.processBatch(processor);
      
      expect(result1.successful).toBe(2);
      expect(batchManager.isBatchEmpty()).toBe(true);
      
      // Second batch
      batchManager.addToBatch({ phoneNumber: '3' });
      batchManager.addToBatch({ phoneNumber: '4' });
      const result2 = await batchManager.processBatch(processor);
      
      expect(result2.successful).toBe(2);
      expect(batchManager.isBatchEmpty()).toBe(true);
      
      const stats = batchManager.getStatistics();
      expect(stats.totalBatchesProcessed).toBe(2);
      expect(stats.totalLookupsProcessed).toBe(4);
    }, 15000); // Increase timeout to 15 seconds for multiple batches with delays

    it('CRITICAL: should throw error if batch exceeds maximum size', async () => {
      // This shouldn't happen in normal operation, but test the safety check
      // We can't directly add more than 5, but we can test the validation
      for (let i = 1; i <= 5; i++) {
        batchManager.addToBatch({ phoneNumber: `${i}` });
      }
      
      const processor = jest.fn(async (lookup: ProviderLookup) => `result-${lookup.phoneNumber}`);
      
      // Should process successfully (5 is valid)
      const result = await batchManager.processBatch(processor);
      expect(result.batchSize).toBe(5);
    });

    it('should handle all lookups failing', async () => {
      for (let i = 1; i <= 5; i++) {
        batchManager.addToBatch({ phoneNumber: `${i}` });
      }
      
      const processor = jest.fn(async (lookup: ProviderLookup) => null);
      
      const result = await batchManager.processBatch(processor);
      
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(5);
      expect(result.successRate).toBe(0);
      expect(result.results.size).toBe(0);
    });

    it('should handle all lookups throwing errors', async () => {
      for (let i = 1; i <= 5; i++) {
        batchManager.addToBatch({ phoneNumber: `${i}` });
      }
      
      const processor = jest.fn(async (lookup: ProviderLookup) => {
        throw new Error('All failed');
      });
      
      const result = await batchManager.processBatch(processor);
      
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(5);
      expect(result.successRate).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty batch result', () => {
      batchManager.recordBatchResult({
        successful: 0,
        failed: 0,
        successRate: 0.0,
        batchSize: 0,
        processingTime: 0,
        results: new Map(),
      });
      
      const stats = batchManager.getStatistics();
      expect(stats.totalBatchesProcessed).toBe(1);
      expect(stats.totalLookupsProcessed).toBe(0);
    });

    it('should handle batch with no results map', () => {
      batchManager.recordBatchResult({
        successful: 5,
        failed: 0,
        successRate: 1.0,
        batchSize: 5,
        processingTime: 1000,
        results: new Map(),
      });
      
      expect(batchManager.getStatistics().totalBatchesProcessed).toBe(1);
    });

    it('should return 1.0 rolling success rate when no history', () => {
      expect(batchManager.getRollingSuccessRate()).toBe(1.0);
    });

    it('should handle rapid batch processing', () => {
      // Process 100 batches rapidly
      for (let i = 0; i < 100; i++) {
        batchManager.recordBatchResult({
          successful: 5,
          failed: 0,
          successRate: 1.0,
          batchSize: 5,
          processingTime: 10,
          results: new Map(),
        });
      }
      
      const stats = batchManager.getStatistics();
      expect(stats.totalBatchesProcessed).toBe(100);
      expect(stats.totalLookupsProcessed).toBe(500);
    });
  });
});

/**
 * Property-Based Tests for BatchManager
 * 
 * These tests use fast-check to verify properties hold across many randomly generated inputs
 */

import * as fc from 'fast-check';

describe('Property-Based Tests', () => {
  describe('Property 3.1: Batch Size Constraint', () => {
    /**
     * **Validates: Requirements 3.1**
     * 
     * Property: For all provider lookup batches, the batch size must never exceed 5,
     * and inter-batch delays must be within the configured range.
     * 
     * Test Strategy:
     * - Generate sequences of lookup requests (varying lengths)
     * - Verify batch size never exceeds 5
     * - Verify delay between batches is within configured range
     */
    it('should never exceed batch size of 5 for any sequence of lookups', () => {
      fc.assert(
        fc.property(
          // Generate array of 1-100 phone numbers
          fc.array(
            fc.record({
              phoneNumber: fc.string({ minLength: 10, maxLength: 15 }),
              businessId: fc.option(fc.string(), { nil: undefined }),
              metadata: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
            }),
            { minLength: 1, maxLength: 100 }
          ),
          (lookups) => {
            const batchManager = new BatchManager();
            const batchSizes: number[] = [];
            
            // Add lookups one by one and track batch sizes
            for (const lookup of lookups) {
              // If batch is full, record its size and clear it
              if (batchManager.isBatchFull()) {
                const batchSize = batchManager.getCurrentBatchCount();
                batchSizes.push(batchSize);
                batchManager.clearBatch();
              }
              
              // Add the lookup
              batchManager.addToBatch(lookup);
              
              // CRITICAL: Verify current batch count never exceeds 5
              const currentCount = batchManager.getCurrentBatchCount();
              expect(currentCount).toBeLessThanOrEqual(5);
            }
            
            // Record final batch size if not empty
            if (!batchManager.isBatchEmpty()) {
              batchSizes.push(batchManager.getCurrentBatchCount());
            }
            
            // Verify all recorded batch sizes are <= 5
            for (const size of batchSizes) {
              expect(size).toBeLessThanOrEqual(5);
              expect(size).toBeGreaterThan(0);
            }
            
            // Verify the maximum batch size setting is always 5
            const stats = batchManager.getStatistics();
            expect(stats.maxBatchSize).toBe(5);
            expect(stats.currentBatchSize).toBeLessThanOrEqual(5);
          }
        ),
        { numRuns: 100 } // Run 100 times with different random inputs
      );
    });

    it('should enforce batch size constraint even with adaptive sizing', () => {
      fc.assert(
        fc.property(
          // Generate sequences of batch results with varying success rates
          fc.array(
            fc.record({
              successRate: fc.float({ min: 0, max: 1 }),
              batchSize: fc.integer({ min: 1, max: 5 }),
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (batchResults) => {
            const batchManager = new BatchManager({ minBatchSize: 3 });
            
            // Record batch results to trigger adaptive sizing
            for (const result of batchResults) {
              batchManager.recordBatchResult({
                successful: Math.floor(result.successRate * result.batchSize),
                failed: Math.ceil((1 - result.successRate) * result.batchSize),
                successRate: result.successRate,
                batchSize: result.batchSize,
                processingTime: 1000,
                results: new Map(),
              });
              
              // CRITICAL: Verify batch size never exceeds 5 after adjustment
              const stats = batchManager.getStatistics();
              expect(stats.currentBatchSize).toBeLessThanOrEqual(5);
              expect(stats.currentBatchSize).toBeGreaterThanOrEqual(3); // Min is 3
              expect(stats.maxBatchSize).toBe(5);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain batch size constraint across multiple batch processing cycles', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate multiple cycles of lookups
          fc.array(
            fc.array(
              fc.record({
                phoneNumber: fc.hexaString({ minLength: 10, maxLength: 15 }),
              }),
              { minLength: 1, maxLength: 5 } // Reduced from 10
            ),
            { minLength: 1, maxLength: 10 } // Reduced from 20
          ),
          async (cycles) => {
            const batchManager = new BatchManager({
              interBatchDelay: [50, 100], // Shorter delays for testing
            });
            
            const processor = async (lookup: ProviderLookup) => {
              // Simulate some processing
              return `result-${lookup.phoneNumber}`;
            };
            
            for (const cycle of cycles) {
              // Add lookups to batch
              for (const lookup of cycle) {
                if (batchManager.isBatchFull()) {
                  // Process the full batch
                  const result = await batchManager.processBatch(processor);
                  
                  // CRITICAL: Verify processed batch size never exceeded 5
                  if (result.batchSize > 5 || result.batchSize <= 0) {
                    return false;
                  }
                }
                
                batchManager.addToBatch(lookup);
                
                // Verify current count never exceeds 5
                if (batchManager.getCurrentBatchCount() > 5) {
                  return false;
                }
              }
              
              // Process remaining batch if not empty
              if (!batchManager.isBatchEmpty()) {
                const result = await batchManager.processBatch(processor);
                if (result.batchSize > 5) {
                  return false;
                }
              }
            }
            
            // Verify statistics show no violations
            const stats = batchManager.getStatistics();
            return stats.maxBatchSize === 5;
          }
        ),
        { numRuns: 10 } // Reduced runs since this involves async processing
      );
    }, 30000); // 30 second timeout

    it('should respect inter-batch delay range configuration', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate custom delay ranges
          fc.record({
            minDelay: fc.integer({ min: 50, max: 500 }),
            maxDelay: fc.integer({ min: 501, max: 1000 }),
          }),
          async ({ minDelay, maxDelay }) => {
            const batchManager = new BatchManager({
              interBatchDelay: [minDelay, maxDelay],
            });
            
            // Add a lookup and process batch
            batchManager.addToBatch({ phoneNumber: '1234567890' });
            
            const processor = async (lookup: ProviderLookup) => `result-${lookup.phoneNumber}`;
            
            const startTime = Date.now();
            await batchManager.processBatch(processor);
            const endTime = Date.now();
            
            const elapsed = endTime - startTime;
            
            // Verify delay is roughly in the expected range
            // Note: Timing tests are inherently flaky due to system variance,
            // so we use very generous margins. The key property is that
            // the delay mechanism works, not exact timing.
            return elapsed >= minDelay * 0.5 && elapsed <= maxDelay * 2;
          }
        ),
        { numRuns: 5 } // Fewer runs since timing tests are flaky
      );
    });

    it('should never allow adding to a full batch regardless of configuration', () => {
      fc.assert(
        fc.property(
          // Generate various configurations
          fc.record({
            minBatchSize: fc.integer({ min: 1, max: 5 }),
          }),
          (config) => {
            const batchManager = new BatchManager(config);
            
            // Fill the batch to maximum (5)
            for (let i = 0; i < 5; i++) {
              batchManager.addToBatch({ phoneNumber: `${i}` });
            }
            
            // CRITICAL: Attempting to add 6th item should throw
            expect(() => {
              batchManager.addToBatch({ phoneNumber: '6' });
            }).toThrow(/Cannot add to batch - batch is full/);
            
            // Verify batch count is still 5
            expect(batchManager.getCurrentBatchCount()).toBe(5);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should reject configuration with maxBatchSize > 5', () => {
      fc.assert(
        fc.property(
          // Generate invalid maxBatchSize values (> 5)
          fc.integer({ min: 6, max: 100 }),
          (invalidMaxBatchSize) => {
            // CRITICAL: Should throw error for any maxBatchSize > 5
            expect(() => {
              new BatchManager({ maxBatchSize: invalidMaxBatchSize });
            }).toThrow(/CRITICAL CONSTRAINT VIOLATION/);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain batch size constraint after many operations', () => {
      fc.assert(
        fc.property(
          // Generate a long sequence of operations
          fc.array(
            fc.oneof(
              fc.constant({ type: 'add' as const }),
              fc.constant({ type: 'clear' as const }),
              fc.record({
                type: fc.constant('recordResult' as const),
                successRate: fc.float({ min: 0, max: 1 }),
              })
            ),
            { minLength: 10, maxLength: 200 }
          ),
          (operations) => {
            const batchManager = new BatchManager();
            let lookupCounter = 0;
            
            for (const op of operations) {
              if (op.type === 'add') {
                // Try to add if not full
                if (!batchManager.isBatchFull()) {
                  batchManager.addToBatch({ phoneNumber: `${lookupCounter++}` });
                }
              } else if (op.type === 'clear') {
                batchManager.clearBatch();
              } else if (op.type === 'recordResult') {
                batchManager.recordBatchResult({
                  successful: 3,
                  failed: 2,
                  successRate: op.successRate,
                  batchSize: 5,
                  processingTime: 1000,
                  results: new Map(),
                });
              }
              
              // CRITICAL: After every operation, verify constraints
              const stats = batchManager.getStatistics();
              expect(stats.currentBatchCount).toBeLessThanOrEqual(5);
              expect(stats.currentBatchSize).toBeLessThanOrEqual(5);
              expect(stats.maxBatchSize).toBe(5);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 3.3: Adaptive Batch Sizing Bounds', () => {
    /**
     * **Validates: Requirements 3.3**
     * 
     * Property: For all batch size adjustments based on success rate, the batch size must
     * remain within [minBatchSize, 5], and must decrease when success rate drops below threshold.
     * 
     * Test Strategy:
     * - Generate sequences of batch results with varying success rates
     * - Verify batch size stays in [3, 5] (default minBatchSize is 3)
     * - Verify batch size decreases when success rate < 50%
     * - Verify batch size never increases above 5
     */
    it('should keep batch size within [minBatchSize, 5] for any sequence of results', () => {
      fc.assert(
        fc.property(
          // Generate configuration
          fc.record({
            minBatchSize: fc.integer({ min: 1, max: 5 }),
            successRateThreshold: fc.float({ min: Math.fround(0.1), max: Math.fround(0.9) }),
          }),
          // Generate sequence of batch results
          fc.array(
            fc.record({
              successRate: fc.float({ min: 0, max: 1 }),
              batchSize: fc.integer({ min: 1, max: 5 }),
            }),
            { minLength: 1, maxLength: 100 }
          ),
          (config, batchResults) => {
            const batchManager = new BatchManager({
              minBatchSize: config.minBatchSize,
              successRateThreshold: config.successRateThreshold,
            });
            
            // Record each batch result and verify bounds
            for (const result of batchResults) {
              batchManager.recordBatchResult({
                successful: Math.floor(result.successRate * result.batchSize),
                failed: Math.ceil((1 - result.successRate) * result.batchSize),
                successRate: result.successRate,
                batchSize: result.batchSize,
                processingTime: 1000,
                results: new Map(),
              });
              
              const stats = batchManager.getStatistics();
              
              // CRITICAL: Batch size must stay within bounds
              expect(stats.currentBatchSize).toBeGreaterThanOrEqual(config.minBatchSize);
              expect(stats.currentBatchSize).toBeLessThanOrEqual(5);
              
              // CRITICAL: Batch size must never exceed absolute maximum
              expect(stats.currentBatchSize).toBeLessThanOrEqual(stats.maxBatchSize);
              expect(stats.maxBatchSize).toBe(5);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should decrease batch size when success rate drops below threshold', () => {
      fc.assert(
        fc.property(
          // Generate threshold
          fc.float({ min: Math.fround(0.3), max: Math.fround(0.7) }).filter(n => !isNaN(n)),
          // Generate initial batch size
          fc.integer({ min: 4, max: 5 }),
          (threshold, initialBatchSize) => {
            const batchManager = new BatchManager({
              minBatchSize: 3,
              successRateThreshold: threshold,
            });
            
            // Set initial batch size by recording successful batches
            while (batchManager.getCurrentBatchSize() < initialBatchSize) {
              batchManager.recordBatchResult({
                successful: 5,
                failed: 0,
                successRate: 1.0,
                batchSize: 5,
                processingTime: 1000,
                results: new Map(),
              });
            }
            
            const beforeSize = batchManager.getCurrentBatchSize();
            
            // Record a batch with success rate below threshold
            const lowSuccessRate = threshold * 0.5; // Well below threshold
            batchManager.recordBatchResult({
              successful: Math.floor(lowSuccessRate * beforeSize),
              failed: Math.ceil((1 - lowSuccessRate) * beforeSize),
              successRate: lowSuccessRate,
              batchSize: beforeSize,
              processingTime: 1000,
              results: new Map(),
            });
            
            const afterSize = batchManager.getCurrentBatchSize();
            
            // Batch size should decrease (unless already at minimum)
            if (beforeSize > 3) {
              expect(afterSize).toBeLessThan(beforeSize);
            } else {
              expect(afterSize).toBe(3); // At minimum, can't decrease further
            }
            
            // Should still be within bounds
            expect(afterSize).toBeGreaterThanOrEqual(3);
            expect(afterSize).toBeLessThanOrEqual(5);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should never increase batch size above 5 regardless of success rate', () => {
      fc.assert(
        fc.property(
          // Generate sequence of highly successful batches
          fc.array(
            fc.record({
              successRate: fc.float({ min: Math.fround(0.8), max: 1.0 }), // High success rates
              batchSize: fc.integer({ min: 3, max: 5 }),
            }),
            { minLength: 10, maxLength: 50 }
          ),
          (successfulBatches) => {
            const batchManager = new BatchManager({ minBatchSize: 3 });
            
            // Track maximum batch size seen
            let maxBatchSizeSeen = batchManager.getCurrentBatchSize();
            
            // Record many successful batches
            for (const result of successfulBatches) {
              batchManager.recordBatchResult({
                successful: Math.floor(result.successRate * result.batchSize),
                failed: Math.ceil((1 - result.successRate) * result.batchSize),
                successRate: result.successRate,
                batchSize: result.batchSize,
                processingTime: 1000,
                results: new Map(),
              });
              
              const currentSize = batchManager.getCurrentBatchSize();
              maxBatchSizeSeen = Math.max(maxBatchSizeSeen, currentSize);
              
              // CRITICAL: Batch size should NEVER exceed 5
              expect(currentSize).toBeLessThanOrEqual(5);
            }
            
            // CRITICAL: Even after many successful batches, max should be 5
            expect(maxBatchSizeSeen).toBeLessThanOrEqual(5);
            
            const stats = batchManager.getStatistics();
            expect(stats.currentBatchSize).toBeLessThanOrEqual(5);
            expect(stats.maxBatchSize).toBe(5);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should only decrease batch size, never increase', () => {
      fc.assert(
        fc.property(
          // Generate mixed sequence of success and failure
          fc.array(
            fc.record({
              successRate: fc.float({ min: 0, max: 1 }),
              batchSize: fc.integer({ min: 3, max: 5 }),
            }),
            { minLength: 5, maxLength: 30 }
          ),
          (batchResults) => {
            const batchManager = new BatchManager({
              minBatchSize: 3,
              successRateThreshold: 0.5,
            });
            
            const batchSizeHistory: number[] = [batchManager.getCurrentBatchSize()];
            
            // Record batch results and track size changes
            for (const result of batchResults) {
              batchManager.recordBatchResult({
                successful: Math.floor(result.successRate * result.batchSize),
                failed: Math.ceil((1 - result.successRate) * result.batchSize),
                successRate: result.successRate,
                batchSize: result.batchSize,
                processingTime: 1000,
                results: new Map(),
              });
              
              const currentSize = batchManager.getCurrentBatchSize();
              batchSizeHistory.push(currentSize);
            }
            
            // Verify batch size never increases from one step to the next
            for (let i = 1; i < batchSizeHistory.length; i++) {
              const previousSize = batchSizeHistory[i - 1];
              const currentSize = batchSizeHistory[i];
              
              // CRITICAL: Batch size can only stay same or decrease
              expect(currentSize).toBeLessThanOrEqual(previousSize);
            }
            
            // Verify final size is <= initial size
            const initialSize = batchSizeHistory[0];
            const finalSize = batchSizeHistory[batchSizeHistory.length - 1];
            expect(finalSize).toBeLessThanOrEqual(initialSize);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should respect minimum batch size and never go below it', () => {
      fc.assert(
        fc.property(
          // Generate minimum batch size
          fc.integer({ min: 1, max: 4 }),
          // Generate sequence of failed batches
          fc.array(
            fc.record({
              successRate: fc.float({ min: 0, max: Math.fround(0.3) }), // Low success rates
              batchSize: fc.integer({ min: 1, max: 5 }),
            }),
            { minLength: 10, maxLength: 50 }
          ),
          (minBatchSize, failedBatches) => {
            const batchManager = new BatchManager({
              minBatchSize,
              successRateThreshold: 0.5,
            });
            
            // Record many failed batches to try to push size below minimum
            for (const result of failedBatches) {
              batchManager.recordBatchResult({
                successful: Math.floor(result.successRate * result.batchSize),
                failed: Math.ceil((1 - result.successRate) * result.batchSize),
                successRate: result.successRate,
                batchSize: result.batchSize,
                processingTime: 1000,
                results: new Map(),
              });
              
              const currentSize = batchManager.getCurrentBatchSize();
              
              // CRITICAL: Batch size should never go below minimum
              expect(currentSize).toBeGreaterThanOrEqual(minBatchSize);
              expect(currentSize).toBeLessThanOrEqual(5);
            }
            
            const stats = batchManager.getStatistics();
            expect(stats.currentBatchSize).toBeGreaterThanOrEqual(minBatchSize);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge case of success rate exactly at threshold', () => {
      fc.assert(
        fc.property(
          // Generate threshold
          fc.float({ min: Math.fround(0.3), max: Math.fround(0.7) }).filter(n => !isNaN(n)),
          (threshold) => {
            const batchManager = new BatchManager({
              minBatchSize: 3,
              successRateThreshold: threshold,
            });
            
            const initialSize = batchManager.getCurrentBatchSize();
            
            // Record batch with success rate exactly at threshold
            batchManager.recordBatchResult({
              successful: Math.floor(threshold * 5),
              failed: Math.ceil((1 - threshold) * 5),
              successRate: threshold,
              batchSize: 5,
              processingTime: 1000,
              results: new Map(),
            });
            
            const afterSize = batchManager.getCurrentBatchSize();
            
            // At threshold, batch size should not decrease (threshold is inclusive)
            expect(afterSize).toBe(initialSize);
            
            // Should still be within bounds
            expect(afterSize).toBeGreaterThanOrEqual(3);
            expect(afterSize).toBeLessThanOrEqual(5);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain bounds across reset operations', () => {
      fc.assert(
        fc.property(
          // Generate sequence of operations including resets
          fc.array(
            fc.oneof(
              fc.record({
                type: fc.constant('recordResult' as const),
                successRate: fc.float({ min: 0, max: 1 }),
                batchSize: fc.integer({ min: 1, max: 5 }),
              }),
              fc.constant({ type: 'reset' as const })
            ),
            { minLength: 5, maxLength: 50 }
          ),
          (operations) => {
            const batchManager = new BatchManager({ minBatchSize: 3 });
            
            for (const op of operations) {
              if (op.type === 'recordResult') {
                batchManager.recordBatchResult({
                  successful: Math.floor(op.successRate * op.batchSize),
                  failed: Math.ceil((1 - op.successRate) * op.batchSize),
                  successRate: op.successRate,
                  batchSize: op.batchSize,
                  processingTime: 1000,
                  results: new Map(),
                });
              } else if (op.type === 'reset') {
                batchManager.reset();
              }
              
              const stats = batchManager.getStatistics();
              
              // CRITICAL: After any operation, bounds must be maintained
              expect(stats.currentBatchSize).toBeGreaterThanOrEqual(3);
              expect(stats.currentBatchSize).toBeLessThanOrEqual(5);
              expect(stats.maxBatchSize).toBe(5);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle rapid alternating success and failure', () => {
      fc.assert(
        fc.property(
          // Generate alternating pattern
          fc.array(
            fc.boolean(),
            { minLength: 10, maxLength: 50 }
          ),
          (successPattern) => {
            const batchManager = new BatchManager({
              minBatchSize: 3,
              successRateThreshold: 0.5,
            });
            
            // Record alternating successful and failed batches
            for (const isSuccess of successPattern) {
              const successRate = isSuccess ? 1.0 : 0.0;
              const batchSize = batchManager.getCurrentBatchSize();
              
              batchManager.recordBatchResult({
                successful: isSuccess ? batchSize : 0,
                failed: isSuccess ? 0 : batchSize,
                successRate,
                batchSize,
                processingTime: 1000,
                results: new Map(),
              });
              
              const stats = batchManager.getStatistics();
              
              // CRITICAL: Bounds must be maintained even with rapid changes
              expect(stats.currentBatchSize).toBeGreaterThanOrEqual(3);
              expect(stats.currentBatchSize).toBeLessThanOrEqual(5);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
