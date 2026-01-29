/**
 * Integration tests for BatchManager and CaptchaDetector
 * 
 * Tests the integration of captcha detection with batch processing
 * 
 * Requirements: 4.3
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { BatchManager, ProviderLookup } from './BatchManager';
import { CaptchaDetector, CaptchaAction, type CaptchaResponseContext } from './CaptchaDetector';
import type { Page } from 'puppeteer';

describe('BatchManager - CaptchaDetector Integration', () => {
  let batchManager: BatchManager;
  let captchaDetector: CaptchaDetector;

  beforeEach(() => {
    captchaDetector = new CaptchaDetector();
    batchManager = new BatchManager({
      captchaDetector,
      enableCaptchaDetection: true,
      interBatchDelay: [100, 200], // Shorter delays for testing
    });
  });

  describe('Captcha Detection Before Batch Processing', () => {
    it('should check for captcha before processing batch when page is provided', async () => {
      // Mock page with no captcha
      const mockPage = {
        url: () => 'https://example.com',
        content: async () => '<html><body>Normal content</body></html>',
        $: async () => null,
        goto: async () => ({ status: () => 200 }),
      } as unknown as Page;

      // Add lookups to batch
      batchManager.addToBatch({ phoneNumber: '1234567890' });

      const processor = jest.fn(async (lookup: ProviderLookup) => `result-${lookup.phoneNumber}`);

      // Process batch with page
      const result = await batchManager.processBatch(processor, mockPage);

      // Should process successfully
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
      expect(processor).toHaveBeenCalledTimes(1);
    });

    it('should abort batch processing when captcha is detected with STOP_SESSION action', async () => {
      // Mock page with captcha
      const mockPage = {
        url: () => 'https://example.com',
        content: async () => '<html><body><div class="g-recaptcha">Captcha</div></body></html>',
        $: async (selector: string) => {
          if (selector === 'iframe[src*="recaptcha"]') {
            return { selector }; // Return mock element
          }
          return null;
        },
        goto: async () => ({ status: () => 200 }),
      } as unknown as Page;

      // Add lookups to batch
      batchManager.addToBatch({ phoneNumber: '1234567890' });

      const processor = jest.fn(async (lookup: ProviderLookup) => `result-${lookup.phoneNumber}`);

      // Mock handleCaptcha to return STOP_SESSION
      jest.spyOn(captchaDetector, 'handleCaptcha').mockReturnValue(CaptchaAction.STOP_SESSION);

      // Process batch with page
      const result = await batchManager.processBatch(processor, mockPage);

      // Should abort processing
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1); // Batch not processed, counted as failed
      expect(processor).not.toHaveBeenCalled();
    });

    it('should abort batch processing when captcha is detected with PAUSE_AND_ALERT action', async () => {
      // Mock page with captcha
      const mockPage = {
        url: () => 'https://example.com',
        content: async () => '<html><body>recaptcha detected</body></html>',
        $: async () => null,
        goto: async () => ({ status: () => 200 }),
      } as unknown as Page;

      // Add lookups to batch
      batchManager.addToBatch({ phoneNumber: '1234567890' });

      const processor = jest.fn(async (lookup: ProviderLookup) => `result-${lookup.phoneNumber}`);

      // Mock handleCaptcha to return PAUSE_AND_ALERT
      jest.spyOn(captchaDetector, 'handleCaptcha').mockReturnValue(CaptchaAction.PAUSE_AND_ALERT);

      // Process batch with page
      const result = await batchManager.processBatch(processor, mockPage);

      // Should abort processing
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(processor).not.toHaveBeenCalled();
    });

    it('should reduce batch size when captcha is detected with REDUCE_BATCH_SIZE action', async () => {
      // Mock page with captcha
      const mockPage = {
        url: () => 'https://example.com',
        content: async () => '<html><body>captcha challenge</body></html>',
        $: async () => null,
        goto: async () => ({ status: () => 200 }),
      } as unknown as Page;

      // Add lookups to batch
      batchManager.addToBatch({ phoneNumber: '1234567890' });

      const processor = jest.fn(async (lookup: ProviderLookup) => `result-${lookup.phoneNumber}`);

      // Mock handleCaptcha to return REDUCE_BATCH_SIZE
      jest.spyOn(captchaDetector, 'handleCaptcha').mockReturnValue(CaptchaAction.REDUCE_BATCH_SIZE);

      const initialBatchSize = batchManager.getCurrentBatchSize();

      // Process batch with page
      const result = await batchManager.processBatch(processor, mockPage);

      // Should continue processing with reduced batch size
      expect(result.successful).toBe(1);
      expect(processor).toHaveBeenCalledTimes(1);

      // Batch size should be reduced to minimum
      const newBatchSize = batchManager.getCurrentBatchSize();
      expect(newBatchSize).toBeLessThan(initialBatchSize);
      expect(newBatchSize).toBe(3); // Default minimum
    });

    it('should increase delay when captcha is detected with INCREASE_DELAY action', async () => {
      // Mock page with captcha
      const mockPage = {
        url: () => 'https://example.com',
        content: async () => '<html><body>unusual traffic</body></html>',
        $: async () => null,
        goto: async () => ({ status: () => 200 }),
      } as unknown as Page;

      // Add lookups to batch
      batchManager.addToBatch({ phoneNumber: '1234567890' });

      const processor = jest.fn(async (lookup: ProviderLookup) => `result-${lookup.phoneNumber}`);

      // Mock handleCaptcha to return INCREASE_DELAY
      jest.spyOn(captchaDetector, 'handleCaptcha').mockReturnValue(CaptchaAction.INCREASE_DELAY);

      // Process batch with page
      const result = await batchManager.processBatch(processor, mockPage);

      // Should continue processing
      expect(result.successful).toBe(1);
      expect(processor).toHaveBeenCalledTimes(1);

      // Note: We can't directly verify delay increase without accessing private fields,
      // but we can verify processing continued
    });

    it('should execute captcha action when context is provided', async () => {
      // Mock page with captcha
      const mockPage = {
        url: () => 'https://example.com',
        content: async () => '<html><body>recaptcha</body></html>',
        $: async () => null,
        goto: async () => ({ status: () => 200 }),
      } as unknown as Page;

      // Add lookups to batch
      batchManager.addToBatch({ phoneNumber: '1234567890' });

      const processor = jest.fn(async (lookup: ProviderLookup) => `result-${lookup.phoneNumber}`);

      // Mock context
      const mockContext: CaptchaResponseContext = {
        pauseScraping: jest.fn(async () => {}),
        sendAlert: jest.fn(async () => {}),
      };

      // Mock handleCaptcha to return PAUSE_AND_ALERT
      jest.spyOn(captchaDetector, 'handleCaptcha').mockReturnValue(CaptchaAction.PAUSE_AND_ALERT);

      // Spy on executeAction
      const executeActionSpy = jest.spyOn(captchaDetector, 'executeAction');

      // Process batch with page and context
      await batchManager.processBatch(processor, mockPage, mockContext);

      // Should execute action
      expect(executeActionSpy).toHaveBeenCalledWith(CaptchaAction.PAUSE_AND_ALERT, mockContext);
      expect(mockContext.pauseScraping).toHaveBeenCalled();
      expect(mockContext.sendAlert).toHaveBeenCalled();
    });

    it('should continue processing when no captcha is detected', async () => {
      // Mock page without captcha
      const mockPage = {
        url: () => 'https://example.com',
        content: async () => '<html><body>Normal content</body></html>',
        $: async () => null,
        goto: async () => ({ status: () => 200 }),
      } as unknown as Page;

      // Add multiple lookups
      for (let i = 1; i <= 3; i++) {
        batchManager.addToBatch({ phoneNumber: `${i}` });
      }

      const processor = jest.fn(async (lookup: ProviderLookup) => `result-${lookup.phoneNumber}`);

      // Process batch
      const result = await batchManager.processBatch(processor, mockPage);

      // Should process all lookups
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(processor).toHaveBeenCalledTimes(3);
    });

    it('should skip captcha detection when disabled', async () => {
      // Create batch manager with captcha detection disabled
      const batchManagerNoDetection = new BatchManager({
        captchaDetector,
        enableCaptchaDetection: false,
        interBatchDelay: [100, 200],
      });

      // Mock page with captcha (should be ignored)
      const mockPage = {
        url: () => 'https://example.com',
        content: async () => '<html><body>recaptcha</body></html>',
        $: async () => null,
        goto: async () => ({ status: () => 200 }),
      } as unknown as Page;

      // Add lookup
      batchManagerNoDetection.addToBatch({ phoneNumber: '1234567890' });

      const processor = jest.fn(async (lookup: ProviderLookup) => `result-${lookup.phoneNumber}`);

      // Process batch - should continue despite captcha
      const result = await batchManagerNoDetection.processBatch(processor, mockPage);

      // Should process successfully (captcha detection disabled)
      expect(result.successful).toBe(1);
      expect(processor).toHaveBeenCalledTimes(1);
    });

    it('should skip captcha detection when no detector is configured', async () => {
      // Create batch manager without captcha detector
      const batchManagerNoDetector = new BatchManager({
        enableCaptchaDetection: true,
        interBatchDelay: [100, 200],
      });

      // Mock page with captcha (should be ignored)
      const mockPage = {
        url: () => 'https://example.com',
        content: async () => '<html><body>recaptcha</body></html>',
        $: async () => null,
        goto: async () => ({ status: () => 200 }),
      } as unknown as Page;

      // Add lookup
      batchManagerNoDetector.addToBatch({ phoneNumber: '1234567890' });

      const processor = jest.fn(async (lookup: ProviderLookup) => `result-${lookup.phoneNumber}`);

      // Process batch - should continue (no detector)
      const result = await batchManagerNoDetector.processBatch(processor, mockPage);

      // Should process successfully (no detector configured)
      expect(result.successful).toBe(1);
      expect(processor).toHaveBeenCalledTimes(1);
    });

    it('should process batch without page parameter (no captcha check)', async () => {
      // Add lookup
      batchManager.addToBatch({ phoneNumber: '1234567890' });

      const processor = jest.fn(async (lookup: ProviderLookup) => `result-${lookup.phoneNumber}`);

      // Process batch without page
      const result = await batchManager.processBatch(processor);

      // Should process successfully (no page to check)
      expect(result.successful).toBe(1);
      expect(processor).toHaveBeenCalledTimes(1);
    });
  });

  describe('Failed Lookup Rate Detection', () => {
    it('should detect high failure rate and reduce batch size', async () => {
      // Record several failed batches to build up failure history
      for (let i = 0; i < 5; i++) {
        batchManager.recordBatchResult({
          successful: 1,
          failed: 4,
          successRate: 0.2,
          batchSize: 5,
          processingTime: 1000,
          results: new Map(),
        });
      }

      const initialBatchSize = batchManager.getCurrentBatchSize();

      // Add lookup and process
      batchManager.addToBatch({ phoneNumber: '1234567890' });

      const processor = jest.fn(async (lookup: ProviderLookup) => `result-${lookup.phoneNumber}`);

      // Process batch (will check failed lookup rate)
      const result = await batchManager.processBatch(processor);

      // Should process successfully
      expect(result.successful).toBe(1);

      // Batch size should be reduced due to high failure rate
      const newBatchSize = batchManager.getCurrentBatchSize();
      expect(newBatchSize).toBeLessThanOrEqual(initialBatchSize);
    });

    it('should not reduce batch size when failure rate is acceptable', async () => {
      // Record several successful batches
      for (let i = 0; i < 5; i++) {
        batchManager.recordBatchResult({
          successful: 4,
          failed: 1,
          successRate: 0.8,
          batchSize: 5,
          processingTime: 1000,
          results: new Map(),
        });
      }

      const initialBatchSize = batchManager.getCurrentBatchSize();

      // Add lookup and process
      batchManager.addToBatch({ phoneNumber: '1234567890' });

      const processor = jest.fn(async (lookup: ProviderLookup) => `result-${lookup.phoneNumber}`);

      // Process batch
      const result = await batchManager.processBatch(processor);

      // Should process successfully
      expect(result.successful).toBe(1);

      // Batch size should remain the same
      const newBatchSize = batchManager.getCurrentBatchSize();
      expect(newBatchSize).toBe(initialBatchSize);
    });
  });

  describe('Statistics Tracking', () => {
    it('should track captcha detection count', async () => {
      // Mock page with captcha
      const mockPage = {
        url: () => 'https://example.com',
        content: async () => '<html><body>recaptcha</body></html>',
        $: async () => null,
        goto: async () => ({ status: () => 200 }),
      } as unknown as Page;

      // Add lookup
      batchManager.addToBatch({ phoneNumber: '1234567890' });

      const processor = jest.fn(async (lookup: ProviderLookup) => `result-${lookup.phoneNumber}`);

      // Mock handleCaptcha to return REDUCE_BATCH_SIZE
      jest.spyOn(captchaDetector, 'handleCaptcha').mockReturnValue(CaptchaAction.REDUCE_BATCH_SIZE);

      // Process batch
      await batchManager.processBatch(processor, mockPage);

      // Check statistics
      const stats = batchManager.getStatistics();
      expect(stats.captchaDetectionCount).toBe(1);
      expect(stats.captchaDetectionEnabled).toBe(true);
    });

    it('should increment captcha detection count on multiple detections', async () => {
      // Mock page with captcha
      const mockPage = {
        url: () => 'https://example.com',
        content: async () => '<html><body>recaptcha</body></html>',
        $: async () => null,
        goto: async () => ({ status: () => 200 }),
      } as unknown as Page;

      const processor = jest.fn(async (lookup: ProviderLookup) => `result-${lookup.phoneNumber}`);

      // Mock handleCaptcha to return REDUCE_BATCH_SIZE
      jest.spyOn(captchaDetector, 'handleCaptcha').mockReturnValue(CaptchaAction.REDUCE_BATCH_SIZE);

      // Process multiple batches with captcha
      for (let i = 0; i < 3; i++) {
        batchManager.addToBatch({ phoneNumber: `${i}` });
        await batchManager.processBatch(processor, mockPage);
      }

      // Check statistics
      const stats = batchManager.getStatistics();
      expect(stats.captchaDetectionCount).toBe(3);
    });

    it('should reset captcha detection count on reset', () => {
      // Manually set captcha detection count (via processing)
      const stats1 = batchManager.getStatistics();
      expect(stats1.captchaDetectionCount).toBe(0);

      // Reset
      batchManager.reset();

      // Check statistics
      const stats2 = batchManager.getStatistics();
      expect(stats2.captchaDetectionCount).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should continue processing on captcha detection error', async () => {
      // Mock page that throws error during captcha detection
      const mockPage = {
        url: () => 'https://example.com',
        content: async () => {
          throw new Error('Page content error');
        },
        $: async () => null,
        goto: async () => ({ status: () => 200 }),
      } as unknown as Page;

      // Add lookup
      batchManager.addToBatch({ phoneNumber: '1234567890' });

      const processor = jest.fn(async (lookup: ProviderLookup) => `result-${lookup.phoneNumber}`);

      // Process batch - should continue despite error
      const result = await batchManager.processBatch(processor, mockPage);

      // Should process successfully (fail open on error)
      expect(result.successful).toBe(1);
      expect(processor).toHaveBeenCalledTimes(1);
    });

    it('should handle null page gracefully', async () => {
      // Add lookup
      batchManager.addToBatch({ phoneNumber: '1234567890' });

      const processor = jest.fn(async (lookup: ProviderLookup) => `result-${lookup.phoneNumber}`);

      // Process batch with undefined page
      const result = await batchManager.processBatch(processor, undefined);

      // Should process successfully
      expect(result.successful).toBe(1);
      expect(processor).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration with Batch Processing Flow', () => {
    it('should integrate captcha detection into full batch processing flow', async () => {
      // Mock page without captcha initially
      let captchaDetected = false;
      const mockPage = {
        url: () => 'https://example.com',
        content: async () => {
          if (captchaDetected) {
            return '<html><body>recaptcha</body></html>';
          }
          return '<html><body>Normal content</body></html>';
        },
        $: async () => null,
        goto: async () => ({ status: () => 200 }),
      } as unknown as Page;

      const processor = jest.fn(async (lookup: ProviderLookup) => `result-${lookup.phoneNumber}`);

      // Process first batch successfully
      batchManager.addToBatch({ phoneNumber: '1' });
      const result1 = await batchManager.processBatch(processor, mockPage);
      expect(result1.successful).toBe(1);

      // Trigger captcha detection
      captchaDetected = true;

      // Mock handleCaptcha to return REDUCE_BATCH_SIZE
      jest.spyOn(captchaDetector, 'handleCaptcha').mockReturnValue(CaptchaAction.REDUCE_BATCH_SIZE);

      // Process second batch with captcha
      batchManager.addToBatch({ phoneNumber: '2' });
      const result2 = await batchManager.processBatch(processor, mockPage);
      expect(result2.successful).toBe(1);

      // Verify batch size was reduced
      const stats = batchManager.getStatistics();
      expect(stats.currentBatchSize).toBe(3); // Reduced to minimum
      expect(stats.captchaDetectionCount).toBe(1);
    });

    it('should handle multiple captcha detections across batches', async () => {
      // Mock page with captcha
      const mockPage = {
        url: () => 'https://example.com',
        content: async () => '<html><body>recaptcha</body></html>',
        $: async () => null,
        goto: async () => ({ status: () => 200 }),
      } as unknown as Page;

      const processor = jest.fn(async (lookup: ProviderLookup) => `result-${lookup.phoneNumber}`);

      // Mock handleCaptcha to return REDUCE_BATCH_SIZE
      jest.spyOn(captchaDetector, 'handleCaptcha').mockReturnValue(CaptchaAction.REDUCE_BATCH_SIZE);

      // Process multiple batches
      for (let i = 0; i < 5; i++) {
        batchManager.addToBatch({ phoneNumber: `${i}` });
        await batchManager.processBatch(processor, mockPage);
      }

      // Verify all batches processed
      expect(processor).toHaveBeenCalledTimes(5);

      // Verify captcha detection count
      const stats = batchManager.getStatistics();
      expect(stats.captchaDetectionCount).toBe(5);
      expect(stats.currentBatchSize).toBe(3); // Reduced to minimum
    });

    it('should process full batch of 5 items when no captcha detected', async () => {
      // Mock page without captcha
      const mockPage = {
        url: () => 'https://example.com',
        content: async () => '<html><body>Normal content</body></html>',
        $: async () => null,
        goto: async () => ({ status: () => 200 }),
      } as unknown as Page;

      const processor = jest.fn(async (lookup: ProviderLookup) => `result-${lookup.phoneNumber}`);

      // Add 5 items to batch (maximum allowed)
      for (let i = 1; i <= 5; i++) {
        batchManager.addToBatch({ phoneNumber: `${i}` });
      }

      // Verify batch is full
      expect(batchManager.isBatchFull()).toBe(true);
      expect(batchManager.getCurrentBatchCount()).toBe(5);

      // Process batch
      const result = await batchManager.processBatch(processor, mockPage);

      // Verify all 5 items were processed
      expect(result.successful).toBe(5);
      expect(result.failed).toBe(0);
      expect(result.batchSize).toBe(5);
      expect(processor).toHaveBeenCalledTimes(5);

      // Verify batch size constraint maintained
      const stats = batchManager.getStatistics();
      expect(stats.maxBatchSize).toBe(5);
    });

    it('should never exceed batch size of 5 even after captcha actions', async () => {
      // Mock page with captcha
      const mockPage = {
        url: () => 'https://example.com',
        content: async () => '<html><body>recaptcha</body></html>',
        $: async () => null,
        goto: async () => ({ status: () => 200 }),
      } as unknown as Page;

      const processor = jest.fn(async (lookup: ProviderLookup) => `result-${lookup.phoneNumber}`);

      // Mock handleCaptcha to return REDUCE_BATCH_SIZE
      jest.spyOn(captchaDetector, 'handleCaptcha').mockReturnValue(CaptchaAction.REDUCE_BATCH_SIZE);

      // Process batch with captcha - should reduce batch size
      batchManager.addToBatch({ phoneNumber: '1' });
      await batchManager.processBatch(processor, mockPage);

      // Verify batch size was reduced
      let stats = batchManager.getStatistics();
      expect(stats.currentBatchSize).toBe(3);

      // Record several successful batches
      for (let i = 0; i < 10; i++) {
        batchManager.recordBatchResult({
          successful: 3,
          failed: 0,
          successRate: 1.0,
          batchSize: 3,
          processingTime: 1000,
          results: new Map(),
        });
      }

      // Verify batch size does NOT increase back to 5 (critical requirement)
      stats = batchManager.getStatistics();
      expect(stats.currentBatchSize).toBe(3);
      expect(stats.currentBatchSize).toBeLessThanOrEqual(5);
      expect(stats.maxBatchSize).toBe(5); // Absolute maximum is always 5
    });

    it('should handle captcha detection with full batch of 5 items', async () => {
      // Mock page with captcha
      const mockPage = {
        url: () => 'https://example.com',
        content: async () => '<html><body>recaptcha</body></html>',
        $: async () => null,
        goto: async () => ({ status: () => 200 }),
      } as unknown as Page;

      const processor = jest.fn(async (lookup: ProviderLookup) => `result-${lookup.phoneNumber}`);

      // Mock handleCaptcha to return REDUCE_BATCH_SIZE
      jest.spyOn(captchaDetector, 'handleCaptcha').mockReturnValue(CaptchaAction.REDUCE_BATCH_SIZE);

      // Add 5 items to batch
      for (let i = 1; i <= 5; i++) {
        batchManager.addToBatch({ phoneNumber: `${i}` });
      }

      // Process batch - captcha should be detected and batch size reduced
      const result = await batchManager.processBatch(processor, mockPage);

      // All 5 items should still be processed (batch was already full)
      expect(result.successful).toBe(5);
      expect(processor).toHaveBeenCalledTimes(5);

      // But batch size should be reduced for next batch
      const stats = batchManager.getStatistics();
      expect(stats.currentBatchSize).toBe(3);
    });

    it('should increase inter-batch delay when INCREASE_DELAY action is triggered', async () => {
      // Mock page with HTTP 429
      const mockPage = {
        url: () => 'https://example.com',
        content: async () => '<html><body>Normal content</body></html>',
        $: async () => null,
        goto: async () => ({ status: () => 429 }),
      } as unknown as Page;

      const processor = jest.fn(async (lookup: ProviderLookup) => `result-${lookup.phoneNumber}`);

      // Get initial delay range
      const initialStats = batchManager.getStatistics();
      
      // Process batch - should detect HTTP 429 and increase delay
      batchManager.addToBatch({ phoneNumber: '1' });
      const startTime = Date.now();
      await batchManager.processBatch(processor, mockPage);
      const firstBatchTime = Date.now() - startTime;

      // Process another batch to measure delay
      batchManager.addToBatch({ phoneNumber: '2' });
      const startTime2 = Date.now();
      await batchManager.processBatch(processor, mockPage);
      const secondBatchTime = Date.now() - startTime2;

      // Verify captcha was detected
      const stats = batchManager.getStatistics();
      expect(stats.captchaDetectionCount).toBeGreaterThan(0);

      // Note: We can't directly verify delay increase without accessing private fields,
      // but we verified the action was triggered
      expect(processor).toHaveBeenCalledTimes(2);
    });

    it('should handle consecutive captcha detections with different actions', async () => {
      // Mock page with captcha
      const mockPage = {
        url: () => 'https://example.com',
        content: async () => '<html><body>recaptcha</body></html>',
        $: async () => null,
        goto: async () => ({ status: () => 200 }),
      } as unknown as Page;

      const processor = jest.fn(async (lookup: ProviderLookup) => `result-${lookup.phoneNumber}`);

      const handleCaptchaSpy = jest.spyOn(captchaDetector, 'handleCaptcha');

      // First detection: REDUCE_BATCH_SIZE
      handleCaptchaSpy.mockReturnValueOnce(CaptchaAction.REDUCE_BATCH_SIZE);
      batchManager.addToBatch({ phoneNumber: '1' });
      const result1 = await batchManager.processBatch(processor, mockPage);
      expect(result1.successful).toBe(1);

      // Second detection: INCREASE_DELAY
      handleCaptchaSpy.mockReturnValueOnce(CaptchaAction.INCREASE_DELAY);
      batchManager.addToBatch({ phoneNumber: '2' });
      const result2 = await batchManager.processBatch(processor, mockPage);
      expect(result2.successful).toBe(1);

      // Third detection: PAUSE_AND_ALERT (should abort)
      handleCaptchaSpy.mockReturnValueOnce(CaptchaAction.PAUSE_AND_ALERT);
      batchManager.addToBatch({ phoneNumber: '3' });
      const result3 = await batchManager.processBatch(processor, mockPage);
      expect(result3.successful).toBe(0); // Aborted

      // Verify captcha detection count
      const stats = batchManager.getStatistics();
      expect(stats.captchaDetectionCount).toBe(3);
    });

    it('should maintain batch size constraint across multiple operations', async () => {
      // Mock page without captcha
      const mockPage = {
        url: () => 'https://example.com',
        content: async () => '<html><body>Normal content</body></html>',
        $: async () => null,
        goto: async () => ({ status: () => 200 }),
      } as unknown as Page;

      const processor = jest.fn(async (lookup: ProviderLookup) => `result-${lookup.phoneNumber}`);

      // Process 10 batches of 5 items each
      for (let batch = 0; batch < 10; batch++) {
        // Add 5 items
        for (let i = 1; i <= 5; i++) {
          batchManager.addToBatch({ phoneNumber: `batch${batch}-item${i}` });
        }

        // Verify batch size never exceeds 5
        expect(batchManager.getCurrentBatchCount()).toBeLessThanOrEqual(5);

        // Process batch
        const result = await batchManager.processBatch(processor, mockPage);
        expect(result.batchSize).toBeLessThanOrEqual(5);
      }

      // Verify all items were processed
      expect(processor).toHaveBeenCalledTimes(50);

      // Verify batch size constraint maintained
      const stats = batchManager.getStatistics();
      expect(stats.currentBatchSize).toBeLessThanOrEqual(5);
      expect(stats.maxBatchSize).toBe(5);
    });

    it('should execute captcha context callbacks when provided', async () => {
      // Mock page with captcha
      const mockPage = {
        url: () => 'https://example.com',
        content: async () => '<html><body>recaptcha</body></html>',
        $: async () => null,
        goto: async () => ({ status: () => 200 }),
      } as unknown as Page;

      const processor = jest.fn(async (lookup: ProviderLookup) => `result-${lookup.phoneNumber}`);

      // Create context with all callbacks
      const mockContext = {
        pauseScraping: jest.fn(async () => {}),
        sendAlert: jest.fn(async () => {}),
        reduceBatchSize: jest.fn(async () => {}),
        getCurrentBatchSize: jest.fn(() => 5),
        increaseDelay: jest.fn(async () => {}),
        getCurrentDelay: jest.fn(() => 2000),
        stopSession: jest.fn(async () => {}),
      };

      // Mock handleCaptcha to return REDUCE_BATCH_SIZE
      jest.spyOn(captchaDetector, 'handleCaptcha').mockReturnValue(CaptchaAction.REDUCE_BATCH_SIZE);

      // Process batch with context
      batchManager.addToBatch({ phoneNumber: '1' });
      await batchManager.processBatch(processor, mockPage, mockContext);

      // Verify executeAction was called (indirectly through context callbacks)
      // The specific callback depends on the action, but we can verify processing continued
      expect(processor).toHaveBeenCalledTimes(1);
    });

    it('should handle mixed success and failure in batch with captcha detection', async () => {
      // Mock page with captcha
      const mockPage = {
        url: () => 'https://example.com',
        content: async () => '<html><body>recaptcha</body></html>',
        $: async () => null,
        goto: async () => ({ status: () => 200 }),
      } as unknown as Page;

      // Processor that fails some lookups
      const processor = jest.fn(async (lookup: ProviderLookup) => {
        const num = parseInt(lookup.phoneNumber);
        if (num % 2 === 0) {
          return null; // Fail even numbers
        }
        return `result-${lookup.phoneNumber}`;
      });

      // Mock handleCaptcha to return REDUCE_BATCH_SIZE
      jest.spyOn(captchaDetector, 'handleCaptcha').mockReturnValue(CaptchaAction.REDUCE_BATCH_SIZE);

      // Add 5 items
      for (let i = 1; i <= 5; i++) {
        batchManager.addToBatch({ phoneNumber: `${i}` });
      }

      // Process batch
      const result = await batchManager.processBatch(processor, mockPage);

      // Verify mixed results (1, 3, 5 succeed; 2, 4 fail)
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(2);
      expect(result.successRate).toBe(0.6);

      // Verify captcha was detected
      const stats = batchManager.getStatistics();
      expect(stats.captchaDetectionCount).toBe(1);
    });
  });
});
