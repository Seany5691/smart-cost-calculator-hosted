/**
 * Unit tests for CaptchaDetector
 * 
 * Tests cover:
 * - HTML content detection
 * - Selector detection
 * - HTTP 429 detection
 * - Failed lookup rate detection
 * - Configuration validation
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { CaptchaDetector, CaptchaAction } from './CaptchaDetector';
import type { Page } from 'puppeteer';

// Mock logger
jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('CaptchaDetector', () => {
  let detector: CaptchaDetector;

  beforeEach(() => {
    detector = new CaptchaDetector();
    jest.clearAllMocks();
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with default configuration', () => {
      const config = detector.getConfig();
      
      expect(config.failedLookupThreshold).toBe(0.5);
      expect(config.enableHtmlDetection).toBe(true);
      expect(config.enableHttpDetection).toBe(true);
      expect(config.enableSelectorDetection).toBe(true);
    });

    it('should accept custom configuration', () => {
      const customDetector = new CaptchaDetector({
        failedLookupThreshold: 0.7,
        enableHtmlDetection: false,
        enableHttpDetection: true,
        enableSelectorDetection: false,
      });

      const config = customDetector.getConfig();
      
      expect(config.failedLookupThreshold).toBe(0.7);
      expect(config.enableHtmlDetection).toBe(false);
      expect(config.enableHttpDetection).toBe(true);
      expect(config.enableSelectorDetection).toBe(false);
    });

    it('should validate failedLookupThreshold bounds', () => {
      const invalidDetector = new CaptchaDetector({
        failedLookupThreshold: 1.5, // Invalid: > 1
      });

      const config = invalidDetector.getConfig();
      expect(config.failedLookupThreshold).toBe(0.5); // Should fall back to default
    });

    it('should validate negative failedLookupThreshold', () => {
      const invalidDetector = new CaptchaDetector({
        failedLookupThreshold: -0.1, // Invalid: < 0
      });

      const config = invalidDetector.getConfig();
      expect(config.failedLookupThreshold).toBe(0.5); // Should fall back to default
    });
  });

  describe('detectFailedLookupRate', () => {
    it('should not detect captcha when success rate is above threshold', () => {
      const result = detector.detectFailedLookupRate(4, 5); // 80% success rate
      
      expect(result.detected).toBe(false);
    });

    it('should detect captcha when failure rate exceeds threshold (50%)', () => {
      const result = detector.detectFailedLookupRate(2, 5); // 40% success rate, 60% failure rate
      
      expect(result.detected).toBe(true);
      expect(result.detectionMethod).toBe('failed_lookup_rate');
      expect(result.recommendedAction).toBe(CaptchaAction.REDUCE_BATCH_SIZE);
      expect(result.details?.failureRate).toBe(0.6);
    });

    it('should detect captcha when all lookups fail', () => {
      const result = detector.detectFailedLookupRate(0, 5); // 0% success rate
      
      expect(result.detected).toBe(true);
      expect(result.detectionMethod).toBe('failed_lookup_rate');
      expect(result.recommendedAction).toBe(CaptchaAction.REDUCE_BATCH_SIZE);
      expect(result.details?.failureRate).toBe(1.0);
    });

    it('should not detect captcha when totalLookups is 0', () => {
      const result = detector.detectFailedLookupRate(0, 0);
      
      expect(result.detected).toBe(false);
    });

    it('should detect captcha at exactly 50% failure rate', () => {
      const result = detector.detectFailedLookupRate(2, 4); // 50% success, 50% failure
      
      // 50% failure is NOT > 50% threshold, so should not detect
      expect(result.detected).toBe(false);
    });

    it('should detect captcha just above 50% failure rate', () => {
      const result = detector.detectFailedLookupRate(2, 5); // 40% success, 60% failure
      
      expect(result.detected).toBe(true);
      expect(result.detectionMethod).toBe('failed_lookup_rate');
    });

    it('should respect custom threshold', () => {
      const customDetector = new CaptchaDetector({
        failedLookupThreshold: 0.3, // 30% failure threshold
      });

      // 40% failure rate should trigger detection with 30% threshold
      const result = customDetector.detectFailedLookupRate(3, 5);
      
      expect(result.detected).toBe(true);
      expect(result.details?.failureRate).toBe(0.4);
    });

    it('should include detailed statistics in result', () => {
      const result = detector.detectFailedLookupRate(1, 5);
      
      expect(result.details).toMatchObject({
        successfulLookups: 1,
        totalLookups: 5,
        successRate: 0.2,
        failureRate: 0.8,
        threshold: 0.5,
      });
    });
  });

  describe('detectCaptcha (HTML content)', () => {
    it('should detect recaptcha keyword in HTML', async () => {
      const mockPage = {
        url: () => 'https://example.com',
        content: jest.fn().mockResolvedValue('<html><body><div class="g-recaptcha"></div></body></html>'),
        $: jest.fn().mockResolvedValue(null),
        goto: jest.fn().mockResolvedValue({ status: () => 200 }),
      } as unknown as Page;

      const result = await detector.detectCaptcha(mockPage);
      
      expect(result.detected).toBe(true);
      expect(result.detectionMethod).toBe('html_content');
      expect(result.recommendedAction).toBe(CaptchaAction.PAUSE_AND_ALERT);
      expect(result.details?.keyword).toBe('recaptcha');
    });

    it('should detect captcha keyword in HTML', async () => {
      const mockPage = {
        url: () => 'https://example.com',
        content: jest.fn().mockResolvedValue('<html><body>Please complete the captcha</body></html>'),
        $: jest.fn().mockResolvedValue(null),
        goto: jest.fn().mockResolvedValue({ status: () => 200 }),
      } as unknown as Page;

      const result = await detector.detectCaptcha(mockPage);
      
      expect(result.detected).toBe(true);
      expect(result.detectionMethod).toBe('html_content');
      expect(result.details?.keyword).toBe('captcha');
    });

    it('should detect "verify you are human" text', async () => {
      const mockPage = {
        url: () => 'https://example.com',
        content: jest.fn().mockResolvedValue('<html><body>Please verify you are human</body></html>'),
        $: jest.fn().mockResolvedValue(null),
        goto: jest.fn().mockResolvedValue({ status: () => 200 }),
      } as unknown as Page;

      const result = await detector.detectCaptcha(mockPage);
      
      expect(result.detected).toBe(true);
      expect(result.detectionMethod).toBe('html_content');
      expect(result.details?.keyword).toBe('verify you are human');
    });

    it('should detect "unusual traffic" text', async () => {
      const mockPage = {
        url: () => 'https://example.com',
        content: jest.fn().mockResolvedValue('<html><body>We detected unusual traffic from your network</body></html>'),
        $: jest.fn().mockResolvedValue(null),
        goto: jest.fn().mockResolvedValue({ status: () => 200 }),
      } as unknown as Page;

      const result = await detector.detectCaptcha(mockPage);
      
      expect(result.detected).toBe(true);
      expect(result.detectionMethod).toBe('html_content');
      expect(result.details?.keyword).toBe('unusual traffic');
    });

    it('should be case-insensitive for keyword detection', async () => {
      const mockPage = {
        url: () => 'https://example.com',
        content: jest.fn().mockResolvedValue('<html><body>RECAPTCHA</body></html>'),
        $: jest.fn().mockResolvedValue(null),
        goto: jest.fn().mockResolvedValue({ status: () => 200 }),
      } as unknown as Page;

      const result = await detector.detectCaptcha(mockPage);
      
      expect(result.detected).toBe(true);
      expect(result.detectionMethod).toBe('html_content');
    });

    it('should not detect captcha in normal HTML', async () => {
      const mockPage = {
        url: () => 'https://example.com',
        content: jest.fn().mockResolvedValue('<html><body><h1>Normal Page</h1></body></html>'),
        $: jest.fn().mockResolvedValue(null),
        goto: jest.fn().mockResolvedValue({ status: () => 200 }),
      } as unknown as Page;

      const result = await detector.detectCaptcha(mockPage);
      
      expect(result.detected).toBe(false);
    });

    it('should skip HTML detection when disabled', async () => {
      const customDetector = new CaptchaDetector({
        enableHtmlDetection: false,
      });

      const mockPage = {
        url: () => 'https://example.com',
        content: jest.fn().mockResolvedValue('<html><body>recaptcha</body></html>'),
        $: jest.fn().mockResolvedValue(null),
        goto: jest.fn().mockResolvedValue({ status: () => 200 }),
      } as unknown as Page;

      const result = await customDetector.detectCaptcha(mockPage);
      
      expect(result.detected).toBe(false);
      expect(mockPage.content).not.toHaveBeenCalled();
    });
  });

  describe('detectCaptcha (Selectors)', () => {
    it('should detect recaptcha iframe selector', async () => {
      const mockElement = {};
      const mockPage = {
        url: () => 'https://example.com',
        content: jest.fn().mockResolvedValue('<html><body>Normal content</body></html>'),
        $: jest.fn().mockImplementation((selector: string) => {
          if (selector === 'iframe[src*="recaptcha"]') {
            return Promise.resolve(mockElement);
          }
          return Promise.resolve(null);
        }),
        goto: jest.fn().mockResolvedValue({ status: () => 200 }),
      } as unknown as Page;

      const result = await detector.detectCaptcha(mockPage);
      
      expect(result.detected).toBe(true);
      expect(result.detectionMethod).toBe('selector');
      expect(result.recommendedAction).toBe(CaptchaAction.PAUSE_AND_ALERT);
      expect(result.details?.selector).toBe('iframe[src*="recaptcha"]');
    });

    it('should detect g-recaptcha class selector', async () => {
      const mockElement = {};
      const mockPage = {
        url: () => 'https://example.com',
        content: jest.fn().mockResolvedValue('<html><body>Normal content</body></html>'),
        $: jest.fn().mockImplementation((selector: string) => {
          if (selector === '.g-recaptcha') {
            return Promise.resolve(mockElement);
          }
          return Promise.resolve(null);
        }),
        goto: jest.fn().mockResolvedValue({ status: () => 200 }),
      } as unknown as Page;

      const result = await detector.detectCaptcha(mockPage);
      
      expect(result.detected).toBe(true);
      expect(result.detectionMethod).toBe('selector');
      expect(result.details?.selector).toBe('.g-recaptcha');
    });

    it('should skip selector detection when disabled', async () => {
      const customDetector = new CaptchaDetector({
        enableSelectorDetection: false,
      });

      const mockElement = {};
      const mockPage = {
        url: () => 'https://example.com',
        content: jest.fn().mockResolvedValue('<html><body>Normal content</body></html>'),
        $: jest.fn().mockResolvedValue(mockElement),
        goto: jest.fn().mockResolvedValue({ status: () => 200 }),
      } as unknown as Page;

      const result = await customDetector.detectCaptcha(mockPage);
      
      expect(result.detected).toBe(false);
      expect(mockPage.$).not.toHaveBeenCalled();
    });
  });

  describe('detectCaptcha (HTTP 429)', () => {
    it('should detect HTTP 429 response', async () => {
      const mockPage = {
        url: () => 'https://example.com',
        content: jest.fn().mockResolvedValue('<html><body>Normal content</body></html>'),
        $: jest.fn().mockResolvedValue(null),
        goto: jest.fn().mockResolvedValue({ status: () => 429 }),
      } as unknown as Page;

      const result = await detector.detectCaptcha(mockPage);
      
      expect(result.detected).toBe(true);
      expect(result.detectionMethod).toBe('http_429');
      expect(result.recommendedAction).toBe(CaptchaAction.INCREASE_DELAY);
      expect(result.details?.statusCode).toBe(429);
    });

    it('should not detect captcha on HTTP 200', async () => {
      const mockPage = {
        url: () => 'https://example.com',
        content: jest.fn().mockResolvedValue('<html><body>Normal content</body></html>'),
        $: jest.fn().mockResolvedValue(null),
        goto: jest.fn().mockResolvedValue({ status: () => 200 }),
      } as unknown as Page;

      const result = await detector.detectCaptcha(mockPage);
      
      expect(result.detected).toBe(false);
    });

    it('should skip HTTP detection when disabled', async () => {
      const customDetector = new CaptchaDetector({
        enableHttpDetection: false,
      });

      const mockPage = {
        url: () => 'https://example.com',
        content: jest.fn().mockResolvedValue('<html><body>Normal content</body></html>'),
        $: jest.fn().mockResolvedValue(null),
        goto: jest.fn().mockResolvedValue({ status: () => 429 }),
      } as unknown as Page;

      const result = await customDetector.detectCaptcha(mockPage);
      
      expect(result.detected).toBe(false);
    });

    it('should handle navigation errors gracefully', async () => {
      const mockPage = {
        url: () => 'https://example.com',
        content: jest.fn().mockResolvedValue('<html><body>Normal content</body></html>'),
        $: jest.fn().mockResolvedValue(null),
        goto: jest.fn().mockRejectedValue(new Error('Navigation timeout')),
      } as unknown as Page;

      const result = await detector.detectCaptcha(mockPage);
      
      // Should not detect captcha on navigation error
      expect(result.detected).toBe(false);
    });
  });

  describe('detectCaptcha (Error Handling)', () => {
    it('should handle page.content() errors gracefully', async () => {
      const mockPage = {
        url: () => 'https://example.com',
        content: jest.fn().mockRejectedValue(new Error('Content error')),
        $: jest.fn().mockResolvedValue(null),
        goto: jest.fn().mockResolvedValue({ status: () => 200 }),
      } as unknown as Page;

      const result = await detector.detectCaptcha(mockPage);
      
      // Should not crash, should return no detection
      expect(result.detected).toBe(false);
    });

    it('should handle page.$() errors gracefully', async () => {
      const mockPage = {
        url: () => 'https://example.com',
        content: jest.fn().mockResolvedValue('<html><body>Normal content</body></html>'),
        $: jest.fn().mockRejectedValue(new Error('Selector error')),
        goto: jest.fn().mockResolvedValue({ status: () => 200 }),
      } as unknown as Page;

      const result = await detector.detectCaptcha(mockPage);
      
      // Should not crash, should return no detection
      expect(result.detected).toBe(false);
    });
  });

  describe('handleCaptcha', () => {
    it('should return recommended action when captcha detected', () => {
      const detectionResult = {
        detected: true,
        detectionMethod: 'html_content',
        recommendedAction: CaptchaAction.REDUCE_BATCH_SIZE,
        details: { keyword: 'recaptcha' },
      };

      const action = detector.handleCaptcha(detectionResult);
      
      expect(action).toBe(CaptchaAction.REDUCE_BATCH_SIZE);
    });

    it('should return default action when no captcha detected', () => {
      const detectionResult = {
        detected: false,
      };

      const action = detector.handleCaptcha(detectionResult);
      
      expect(action).toBe(CaptchaAction.PAUSE_AND_ALERT);
    });

    it('should return default action when no recommended action provided', () => {
      const detectionResult = {
        detected: true,
        detectionMethod: 'html_content',
        details: { keyword: 'recaptcha' },
      };

      const action = detector.handleCaptcha(detectionResult);
      
      expect(action).toBe(CaptchaAction.PAUSE_AND_ALERT);
    });
  });

  describe('Integration Scenarios', () => {
    it('should prioritize HTML detection over selector detection', async () => {
      const mockElement = {};
      const mockPage = {
        url: () => 'https://example.com',
        content: jest.fn().mockResolvedValue('<html><body>recaptcha content</body></html>'),
        $: jest.fn().mockResolvedValue(mockElement),
        goto: jest.fn().mockResolvedValue({ status: () => 200 }),
      } as unknown as Page;

      const result = await detector.detectCaptcha(mockPage);
      
      // Should detect via HTML first
      expect(result.detected).toBe(true);
      expect(result.detectionMethod).toBe('html_content');
    });

    it('should check selectors when HTML detection finds nothing', async () => {
      const mockElement = {};
      const mockPage = {
        url: () => 'https://example.com',
        content: jest.fn().mockResolvedValue('<html><body>Normal content</body></html>'),
        $: jest.fn().mockImplementation((selector: string) => {
          if (selector === '.g-recaptcha') {
            return Promise.resolve(mockElement);
          }
          return Promise.resolve(null);
        }),
        goto: jest.fn().mockResolvedValue({ status: () => 200 }),
      } as unknown as Page;

      const result = await detector.detectCaptcha(mockPage);
      
      expect(result.detected).toBe(true);
      expect(result.detectionMethod).toBe('selector');
    });

    it('should check HTTP status when HTML and selector detection find nothing', async () => {
      const mockPage = {
        url: () => 'https://example.com',
        content: jest.fn().mockResolvedValue('<html><body>Normal content</body></html>'),
        $: jest.fn().mockResolvedValue(null),
        goto: jest.fn().mockResolvedValue({ status: () => 429 }),
      } as unknown as Page;

      const result = await detector.detectCaptcha(mockPage);
      
      expect(result.detected).toBe(true);
      expect(result.detectionMethod).toBe('http_429');
    });
  });

  describe('Captcha Response Actions', () => {
    describe('executeAction', () => {
      it('should execute PAUSE_AND_ALERT action', async () => {
        const pauseScraping = jest.fn().mockResolvedValue(undefined);
        const sendAlert = jest.fn().mockResolvedValue(undefined);
        
        const context = {
          pauseScraping,
          sendAlert,
        };

        await detector.executeAction(CaptchaAction.PAUSE_AND_ALERT, context);

        expect(pauseScraping).toHaveBeenCalledTimes(1);
        expect(sendAlert).toHaveBeenCalledTimes(1);
        expect(sendAlert).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'captcha_detected',
            severity: 'high',
            message: expect.stringContaining('Captcha detected'),
          })
        );
      });

      it('should execute REDUCE_BATCH_SIZE action', async () => {
        const reduceBatchSize = jest.fn().mockResolvedValue(undefined);
        const getCurrentBatchSize = jest.fn()
          .mockReturnValueOnce(5)  // Before reduction
          .mockReturnValueOnce(3); // After reduction
        const sendAlert = jest.fn().mockResolvedValue(undefined);
        
        const context = {
          reduceBatchSize,
          getCurrentBatchSize,
          sendAlert,
        };

        await detector.executeAction(CaptchaAction.REDUCE_BATCH_SIZE, context);

        expect(reduceBatchSize).toHaveBeenCalledTimes(1);
        expect(getCurrentBatchSize).toHaveBeenCalledTimes(2);
        expect(sendAlert).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'batch_size_reduced',
            severity: 'medium',
            details: expect.objectContaining({
              previousSize: 5,
              newSize: 3,
            }),
          })
        );
      });

      it('should execute INCREASE_DELAY action', async () => {
        const increaseDelay = jest.fn().mockResolvedValue(undefined);
        const getCurrentDelay = jest.fn()
          .mockReturnValueOnce(2000)  // Before increase
          .mockReturnValueOnce(5000); // After increase
        const sendAlert = jest.fn().mockResolvedValue(undefined);
        
        const context = {
          increaseDelay,
          getCurrentDelay,
          sendAlert,
        };

        await detector.executeAction(CaptchaAction.INCREASE_DELAY, context);

        expect(increaseDelay).toHaveBeenCalledTimes(1);
        expect(getCurrentDelay).toHaveBeenCalledTimes(2);
        expect(sendAlert).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'delay_increased',
            severity: 'medium',
            details: expect.objectContaining({
              previousDelay: 2000,
              newDelay: 5000,
            }),
          })
        );
      });

      it('should execute STOP_SESSION action', async () => {
        const stopSession = jest.fn().mockResolvedValue(undefined);
        const sendAlert = jest.fn().mockResolvedValue(undefined);
        
        const context = {
          stopSession,
          sendAlert,
        };

        await detector.executeAction(CaptchaAction.STOP_SESSION, context);

        expect(sendAlert).toHaveBeenCalledTimes(1);
        expect(sendAlert).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'session_stopped',
            severity: 'critical',
            message: expect.stringContaining('stopped'),
          })
        );
        expect(stopSession).toHaveBeenCalledTimes(1);
      });

      it('should handle missing callbacks gracefully for PAUSE_AND_ALERT', async () => {
        const context = {}; // No callbacks provided

        // Should not throw
        await expect(detector.executeAction(CaptchaAction.PAUSE_AND_ALERT, context)).resolves.not.toThrow();
      });

      it('should handle missing callbacks gracefully for REDUCE_BATCH_SIZE', async () => {
        const context = {}; // No callbacks provided

        // Should not throw
        await expect(detector.executeAction(CaptchaAction.REDUCE_BATCH_SIZE, context)).resolves.not.toThrow();
      });

      it('should handle missing callbacks gracefully for INCREASE_DELAY', async () => {
        const context = {}; // No callbacks provided

        // Should not throw
        await expect(detector.executeAction(CaptchaAction.INCREASE_DELAY, context)).resolves.not.toThrow();
      });

      it('should handle missing callbacks gracefully for STOP_SESSION', async () => {
        const context = {}; // No callbacks provided

        // Should not throw
        await expect(detector.executeAction(CaptchaAction.STOP_SESSION, context)).resolves.not.toThrow();
      });

      it('should default to PAUSE_AND_ALERT for unknown action', async () => {
        const pauseScraping = jest.fn().mockResolvedValue(undefined);
        const sendAlert = jest.fn().mockResolvedValue(undefined);
        
        const context = {
          pauseScraping,
          sendAlert,
        };

        // Cast to any to test unknown action handling
        await detector.executeAction('UNKNOWN_ACTION' as any, context);

        // Should fall back to PAUSE_AND_ALERT
        expect(pauseScraping).toHaveBeenCalledTimes(1);
        expect(sendAlert).toHaveBeenCalledTimes(1);
      });
    });

    describe('Action execution without optional callbacks', () => {
      it('should execute REDUCE_BATCH_SIZE without sendAlert', async () => {
        const reduceBatchSize = jest.fn().mockResolvedValue(undefined);
        const getCurrentBatchSize = jest.fn().mockReturnValue(3);
        
        const context = {
          reduceBatchSize,
          getCurrentBatchSize,
          // No sendAlert
        };

        await detector.executeAction(CaptchaAction.REDUCE_BATCH_SIZE, context);

        expect(reduceBatchSize).toHaveBeenCalledTimes(1);
      });

      it('should execute REDUCE_BATCH_SIZE without getCurrentBatchSize', async () => {
        const reduceBatchSize = jest.fn().mockResolvedValue(undefined);
        const sendAlert = jest.fn().mockResolvedValue(undefined);
        
        const context = {
          reduceBatchSize,
          sendAlert,
          // No getCurrentBatchSize
        };

        await detector.executeAction(CaptchaAction.REDUCE_BATCH_SIZE, context);

        expect(reduceBatchSize).toHaveBeenCalledTimes(1);
        expect(sendAlert).toHaveBeenCalledWith(
          expect.objectContaining({
            details: expect.objectContaining({
              previousSize: 'unknown',
              newSize: 'unknown',
            }),
          })
        );
      });

      it('should execute INCREASE_DELAY without sendAlert', async () => {
        const increaseDelay = jest.fn().mockResolvedValue(undefined);
        const getCurrentDelay = jest.fn().mockReturnValue(5000);
        
        const context = {
          increaseDelay,
          getCurrentDelay,
          // No sendAlert
        };

        await detector.executeAction(CaptchaAction.INCREASE_DELAY, context);

        expect(increaseDelay).toHaveBeenCalledTimes(1);
      });

      it('should execute INCREASE_DELAY without getCurrentDelay', async () => {
        const increaseDelay = jest.fn().mockResolvedValue(undefined);
        const sendAlert = jest.fn().mockResolvedValue(undefined);
        
        const context = {
          increaseDelay,
          sendAlert,
          // No getCurrentDelay
        };

        await detector.executeAction(CaptchaAction.INCREASE_DELAY, context);

        expect(increaseDelay).toHaveBeenCalledTimes(1);
        expect(sendAlert).toHaveBeenCalledWith(
          expect.objectContaining({
            details: expect.objectContaining({
              previousDelay: 'unknown',
              newDelay: 'unknown',
            }),
          })
        );
      });

      it('should execute STOP_SESSION without sendAlert', async () => {
        const stopSession = jest.fn().mockResolvedValue(undefined);
        
        const context = {
          stopSession,
          // No sendAlert
        };

        await detector.executeAction(CaptchaAction.STOP_SESSION, context);

        expect(stopSession).toHaveBeenCalledTimes(1);
      });
    });

    describe('Full workflow integration', () => {
      it('should detect captcha and execute recommended action', async () => {
        const mockPage = {
          url: () => 'https://example.com',
          content: jest.fn().mockResolvedValue('<html><body>recaptcha</body></html>'),
          $: jest.fn().mockResolvedValue(null),
          goto: jest.fn().mockResolvedValue({ status: () => 200 }),
        } as unknown as Page;

        const pauseScraping = jest.fn().mockResolvedValue(undefined);
        const sendAlert = jest.fn().mockResolvedValue(undefined);
        
        const context = {
          pauseScraping,
          sendAlert,
        };

        // Detect captcha
        const detectionResult = await detector.detectCaptcha(mockPage);
        expect(detectionResult.detected).toBe(true);
        expect(detectionResult.recommendedAction).toBe(CaptchaAction.PAUSE_AND_ALERT);

        // Execute recommended action
        const action = detector.handleCaptcha(detectionResult);
        await detector.executeAction(action, context);

        expect(pauseScraping).toHaveBeenCalledTimes(1);
        expect(sendAlert).toHaveBeenCalledTimes(1);
      });

      it('should detect high failure rate and execute REDUCE_BATCH_SIZE', async () => {
        const reduceBatchSize = jest.fn().mockResolvedValue(undefined);
        const getCurrentBatchSize = jest.fn()
          .mockReturnValueOnce(5)
          .mockReturnValueOnce(3);
        
        const context = {
          reduceBatchSize,
          getCurrentBatchSize,
        };

        // Detect high failure rate
        const detectionResult = detector.detectFailedLookupRate(1, 5); // 80% failure
        expect(detectionResult.detected).toBe(true);
        expect(detectionResult.recommendedAction).toBe(CaptchaAction.REDUCE_BATCH_SIZE);

        // Execute recommended action
        const action = detector.handleCaptcha(detectionResult);
        await detector.executeAction(action, context);

        expect(reduceBatchSize).toHaveBeenCalledTimes(1);
      });

      it('should detect HTTP 429 and execute INCREASE_DELAY', async () => {
        const mockPage = {
          url: () => 'https://example.com',
          content: jest.fn().mockResolvedValue('<html><body>Normal</body></html>'),
          $: jest.fn().mockResolvedValue(null),
          goto: jest.fn().mockResolvedValue({ status: () => 429 }),
        } as unknown as Page;

        const increaseDelay = jest.fn().mockResolvedValue(undefined);
        const getCurrentDelay = jest.fn()
          .mockReturnValueOnce(2000)
          .mockReturnValueOnce(5000);
        
        const context = {
          increaseDelay,
          getCurrentDelay,
        };

        // Detect HTTP 429
        const detectionResult = await detector.detectCaptcha(mockPage);
        expect(detectionResult.detected).toBe(true);
        expect(detectionResult.recommendedAction).toBe(CaptchaAction.INCREASE_DELAY);

        // Execute recommended action
        const action = detector.handleCaptcha(detectionResult);
        await detector.executeAction(action, context);

        expect(increaseDelay).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Additional Edge Cases', () => {
    it('should detect hcaptcha keyword in HTML', async () => {
      const mockPage = {
        url: () => 'https://example.com',
        content: jest.fn().mockResolvedValue('<html><body><div class="h-captcha"></div></body></html>'),
        $: jest.fn().mockResolvedValue(null),
        goto: jest.fn().mockResolvedValue({ status: () => 200 }),
      } as unknown as Page;

      const result = await detector.detectCaptcha(mockPage);
      
      expect(result.detected).toBe(true);
      expect(result.detectionMethod).toBe('html_content');
      // Note: "captcha" keyword matches before "hcaptcha" in the keyword list
      expect(result.details?.keyword).toBe('captcha');
    });

    it('should detect "automated requests" text', async () => {
      const mockPage = {
        url: () => 'https://example.com',
        content: jest.fn().mockResolvedValue('<html><body>We have detected automated requests from your IP</body></html>'),
        $: jest.fn().mockResolvedValue(null),
        goto: jest.fn().mockResolvedValue({ status: () => 200 }),
      } as unknown as Page;

      const result = await detector.detectCaptcha(mockPage);
      
      expect(result.detected).toBe(true);
      expect(result.detectionMethod).toBe('html_content');
      expect(result.details?.keyword).toBe('automated requests');
    });

    it('should detect captcha with multiple selectors present', async () => {
      const mockElement = {};
      const mockPage = {
        url: () => 'https://example.com',
        content: jest.fn().mockResolvedValue('<html><body>Normal content</body></html>'),
        $: jest.fn().mockImplementation((selector: string) => {
          // Multiple captcha selectors present
          if (selector === 'iframe[src*="recaptcha"]' || selector === 'div[class*="captcha"]') {
            return Promise.resolve(mockElement);
          }
          return Promise.resolve(null);
        }),
        goto: jest.fn().mockResolvedValue({ status: () => 200 }),
      } as unknown as Page;

      const result = await detector.detectCaptcha(mockPage);
      
      // Should detect the first matching selector
      expect(result.detected).toBe(true);
      expect(result.detectionMethod).toBe('selector');
    });

    it('should handle very high failure rates (100%)', async () => {
      const result = detector.detectFailedLookupRate(0, 10);
      
      expect(result.detected).toBe(true);
      expect(result.details?.failureRate).toBe(1.0);
      expect(result.details?.successRate).toBe(0);
    });

    it('should handle edge case with 1 total lookup', async () => {
      // 0 success, 1 total = 100% failure
      const result1 = detector.detectFailedLookupRate(0, 1);
      expect(result1.detected).toBe(true);
      
      // 1 success, 1 total = 0% failure
      const result2 = detector.detectFailedLookupRate(1, 1);
      expect(result2.detected).toBe(false);
    });

    it('should detect captcha with mixed case keywords', async () => {
      const mockPage = {
        url: () => 'https://example.com',
        content: jest.fn().mockResolvedValue('<html><body>Please complete the CAPTCHA challenge</body></html>'),
        $: jest.fn().mockResolvedValue(null),
        goto: jest.fn().mockResolvedValue({ status: () => 200 }),
      } as unknown as Page;

      const result = await detector.detectCaptcha(mockPage);
      
      expect(result.detected).toBe(true);
      expect(result.detectionMethod).toBe('html_content');
    });

    it('should not detect captcha with partial keyword matches', async () => {
      const mockPage = {
        url: () => 'https://example.com',
        // "recap" is not "recaptcha"
        content: jest.fn().mockResolvedValue('<html><body>Let me recap the situation</body></html>'),
        $: jest.fn().mockResolvedValue(null),
        goto: jest.fn().mockResolvedValue({ status: () => 200 }),
      } as unknown as Page;

      const result = await detector.detectCaptcha(mockPage);
      
      // Should not detect because "recap" is a substring but not the full keyword
      // Actually, this WILL detect because we use .includes() which matches substrings
      // This is intentional - better to have false positives than miss captchas
      expect(result.detected).toBe(false);
    });

    it('should handle all detection methods disabled', async () => {
      const customDetector = new CaptchaDetector({
        enableHtmlDetection: false,
        enableHttpDetection: false,
        enableSelectorDetection: false,
      });

      const mockPage = {
        url: () => 'https://example.com',
        content: jest.fn().mockResolvedValue('<html><body>recaptcha</body></html>'),
        $: jest.fn().mockResolvedValue({}),
        goto: jest.fn().mockResolvedValue({ status: () => 429 }),
      } as unknown as Page;

      const result = await customDetector.detectCaptcha(mockPage);
      
      // Should not detect anything when all methods are disabled
      expect(result.detected).toBe(false);
    });

    it('should include URL in detection details', async () => {
      const mockPage = {
        url: () => 'https://maps.google.com/search',
        content: jest.fn().mockResolvedValue('<html><body>recaptcha</body></html>'),
        $: jest.fn().mockResolvedValue(null),
        goto: jest.fn().mockResolvedValue({ status: () => 200 }),
      } as unknown as Page;

      const result = await detector.detectCaptcha(mockPage);
      
      expect(result.detected).toBe(true);
      expect(result.details?.url).toBe('https://maps.google.com/search');
    });

    it('should handle page with null response from goto', async () => {
      const mockPage = {
        url: () => 'https://example.com',
        content: jest.fn().mockResolvedValue('<html><body>Normal</body></html>'),
        $: jest.fn().mockResolvedValue(null),
        goto: jest.fn().mockResolvedValue(null), // Null response
      } as unknown as Page;

      const result = await detector.detectCaptcha(mockPage);
      
      // Should not crash, should not detect captcha
      expect(result.detected).toBe(false);
    });

    it('should detect multiple captcha keywords in same page', async () => {
      const mockPage = {
        url: () => 'https://example.com',
        content: jest.fn().mockResolvedValue('<html><body>This page has recaptcha and also mentions unusual traffic</body></html>'),
        $: jest.fn().mockResolvedValue(null),
        goto: jest.fn().mockResolvedValue({ status: () => 200 }),
      } as unknown as Page;

      const result = await detector.detectCaptcha(mockPage);
      
      // Should detect the first keyword found
      expect(result.detected).toBe(true);
      expect(result.detectionMethod).toBe('html_content');
      expect(result.details?.keyword).toBe('recaptcha'); // First in the keyword list
    });

    it('should handle very large batch sizes in failure rate detection', async () => {
      const result = detector.detectFailedLookupRate(40, 100);
      
      // 40% success, 60% failure - should detect
      expect(result.detected).toBe(true);
      expect(result.details?.failureRate).toBe(0.6);
    });

    it('should detect captcha with div[id*="captcha"] selector', async () => {
      const mockElement = {};
      const mockPage = {
        url: () => 'https://example.com',
        content: jest.fn().mockResolvedValue('<html><body>Normal content</body></html>'),
        $: jest.fn().mockImplementation((selector: string) => {
          if (selector === 'div[id*="captcha"]') {
            return Promise.resolve(mockElement);
          }
          return Promise.resolve(null);
        }),
        goto: jest.fn().mockResolvedValue({ status: () => 200 }),
      } as unknown as Page;

      const result = await detector.detectCaptcha(mockPage);
      
      expect(result.detected).toBe(true);
      expect(result.detectionMethod).toBe('selector');
      expect(result.details?.selector).toBe('div[id*="captcha"]');
    });

    it('should handle threshold at boundary (exactly 0.5)', async () => {
      const customDetector = new CaptchaDetector({
        failedLookupThreshold: 0.5,
      });

      // Exactly 50% failure should NOT trigger (> not >=)
      const result1 = customDetector.detectFailedLookupRate(5, 10);
      expect(result1.detected).toBe(false);

      // 51% failure should trigger
      const result2 = customDetector.detectFailedLookupRate(49, 100);
      expect(result2.detected).toBe(true);
    });

    it('should execute actions in correct order for full workflow', async () => {
      const executionOrder: string[] = [];
      
      const pauseScraping = jest.fn().mockImplementation(async () => {
        executionOrder.push('pause');
      });
      const sendAlert = jest.fn().mockImplementation(async () => {
        executionOrder.push('alert');
      });
      
      const context = {
        pauseScraping,
        sendAlert,
      };

      await detector.executeAction(CaptchaAction.PAUSE_AND_ALERT, context);

      // Pause should happen before alert
      expect(executionOrder).toEqual(['pause', 'alert']);
    });

    it('should handle STOP_SESSION with alert sent before stopping', async () => {
      const executionOrder: string[] = [];
      
      const stopSession = jest.fn().mockImplementation(async () => {
        executionOrder.push('stop');
      });
      const sendAlert = jest.fn().mockImplementation(async () => {
        executionOrder.push('alert');
      });
      
      const context = {
        stopSession,
        sendAlert,
      };

      await detector.executeAction(CaptchaAction.STOP_SESSION, context);

      // Alert should be sent before stopping
      expect(executionOrder).toEqual(['alert', 'stop']);
    });
  });
});
