/**
 * CaptchaDetector - Detects captcha challenges during scraping operations
 * 
 * Detection Methods:
 * - HTML content detection (recaptcha, captcha keywords)
 * - HTTP 429 (Too Many Requests) response detection
 * - Failed lookup rate detection (>50% in batch)
 * - Captcha selector detection
 * 
 * Requirements: 3.3, 4.1
 */

import type { Page } from 'puppeteer';
import { logger } from '../logger';

/**
 * Actions to take when captcha is detected
 */
export enum CaptchaAction {
  /** Pause scraping and alert the user */
  PAUSE_AND_ALERT = 'PAUSE_AND_ALERT',
  /** Reduce batch size to minimum */
  REDUCE_BATCH_SIZE = 'REDUCE_BATCH_SIZE',
  /** Increase inter-batch delay */
  INCREASE_DELAY = 'INCREASE_DELAY',
  /** Stop the scraping session */
  STOP_SESSION = 'STOP_SESSION',
}

/**
 * Alert sent to user when captcha is detected
 */
export interface CaptchaAlert {
  /** Type of alert */
  type: 'captcha_detected' | 'batch_size_reduced' | 'delay_increased' | 'session_stopped';
  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Human-readable message */
  message: string;
  /** Timestamp of the alert */
  timestamp: Date;
  /** Additional details */
  details?: Record<string, any>;
}

/**
 * Context object for executing captcha response actions
 * 
 * This interface defines the callbacks and state accessors needed
 * to execute captcha response actions. Implementations should provide
 * the appropriate callbacks for their scraping system.
 */
export interface CaptchaResponseContext {
  /** Callback to pause scraping */
  pauseScraping?: () => Promise<void>;
  
  /** Callback to send alert to user */
  sendAlert?: (alert: CaptchaAlert) => Promise<void>;
  
  /** Callback to reduce batch size to minimum */
  reduceBatchSize?: () => Promise<void>;
  
  /** Callback to get current batch size */
  getCurrentBatchSize?: () => number;
  
  /** Callback to increase inter-batch delay */
  increaseDelay?: () => Promise<void>;
  
  /** Callback to get current delay */
  getCurrentDelay?: () => number;
  
  /** Callback to stop the scraping session */
  stopSession?: () => Promise<void>;
}

/**
 * Result of captcha detection
 */
export interface CaptchaDetectionResult {
  /** Whether captcha was detected */
  detected: boolean;
  /** Detection method that found the captcha */
  detectionMethod?: string;
  /** Recommended action to take */
  recommendedAction?: CaptchaAction;
  /** Additional details about the detection */
  details?: Record<string, any>;
}

/**
 * Configuration for CaptchaDetector
 */
export interface CaptchaDetectorConfig {
  /** Failed lookup rate threshold (default: 0.5 = 50%) */
  failedLookupThreshold?: number;
  /** Enable HTML content detection (default: true) */
  enableHtmlDetection?: boolean;
  /** Enable HTTP 429 detection (default: true) */
  enableHttpDetection?: boolean;
  /** Enable selector detection (default: true) */
  enableSelectorDetection?: boolean;
}

/**
 * CaptchaDetector class - Detects captcha challenges using multiple methods
 */
export class CaptchaDetector {
  private failedLookupThreshold: number;
  private enableHtmlDetection: boolean;
  private enableHttpDetection: boolean;
  private enableSelectorDetection: boolean;

  // Captcha-related keywords to search for in HTML
  private readonly CAPTCHA_KEYWORDS = [
    'recaptcha',
    'captcha',
    'g-recaptcha',
    'grecaptcha',
    'hcaptcha',
    'h-captcha',
    'challenge',
    'verify you are human',
    'verify you\'re human',
    'unusual traffic',
    'automated requests',
  ];

  // Captcha-related selectors
  private readonly CAPTCHA_SELECTORS = [
    'iframe[src*="recaptcha"]',
    'iframe[src*="captcha"]',
    'div[class*="recaptcha"]',
    'div[class*="captcha"]',
    'div[id*="recaptcha"]',
    'div[id*="captcha"]',
    '.g-recaptcha',
    '#g-recaptcha',
  ];

  constructor(config: CaptchaDetectorConfig = {}) {
    this.failedLookupThreshold = config.failedLookupThreshold ?? 0.5;
    this.enableHtmlDetection = config.enableHtmlDetection ?? true;
    this.enableHttpDetection = config.enableHttpDetection ?? true;
    this.enableSelectorDetection = config.enableSelectorDetection ?? true;

    // Validate threshold
    if (this.failedLookupThreshold < 0 || this.failedLookupThreshold > 1) {
      logger.warn('CaptchaDetector: failedLookupThreshold must be between 0 and 1, using default 0.5', undefined, {
        providedValue: this.failedLookupThreshold,
      });
      this.failedLookupThreshold = 0.5;
    }

    logger.info('CaptchaDetector initialized', undefined, {
      failedLookupThreshold: this.failedLookupThreshold,
      enableHtmlDetection: this.enableHtmlDetection,
      enableHttpDetection: this.enableHttpDetection,
      enableSelectorDetection: this.enableSelectorDetection,
    });
  }

  /**
   * Detect captcha on a page using multiple detection methods
   * 
   * This method checks for:
   * 1. HTML content containing captcha keywords
   * 2. Captcha-related selectors in the DOM
   * 3. HTTP 429 responses (if page has response)
   * 
   * @param page - Puppeteer page to check for captcha
   * @returns CaptchaDetectionResult with detection status and recommended action
   */
  async detectCaptcha(page: Page): Promise<CaptchaDetectionResult> {
    logger.debug('CaptchaDetector: Starting captcha detection', undefined, {
      url: page.url(),
    });

    try {
      // Check HTML content for captcha keywords
      if (this.enableHtmlDetection) {
        const htmlDetection = await this.detectCaptchaInHtml(page);
        if (htmlDetection.detected) {
          logger.warn('CaptchaDetector: Captcha detected via HTML content', undefined, htmlDetection.details);
          return htmlDetection;
        }
      }

      // Check for captcha selectors
      if (this.enableSelectorDetection) {
        const selectorDetection = await this.detectCaptchaSelectors(page);
        if (selectorDetection.detected) {
          logger.warn('CaptchaDetector: Captcha detected via selectors', undefined, selectorDetection.details);
          return selectorDetection;
        }
      }

      // Check HTTP response status
      if (this.enableHttpDetection) {
        const httpDetection = await this.detectHttp429(page);
        if (httpDetection.detected) {
          logger.warn('CaptchaDetector: Captcha detected via HTTP 429', undefined, httpDetection.details);
          return httpDetection;
        }
      }

      // No captcha detected
      logger.debug('CaptchaDetector: No captcha detected', undefined, {
        url: page.url(),
      });

      return {
        detected: false,
      };
    } catch (error) {
      logger.error('CaptchaDetector: Error during captcha detection', error as Error, undefined, {
        url: page.url(),
      });

      // Return no detection on error (fail open)
      return {
        detected: false,
        details: {
          error: (error as Error).message,
        },
      };
    }
  }

  /**
   * Detect captcha by checking HTML content for captcha keywords
   * 
   * @param page - Puppeteer page to check
   * @returns CaptchaDetectionResult
   */
  private async detectCaptchaInHtml(page: Page): Promise<CaptchaDetectionResult> {
    try {
      const html = await page.content();
      const htmlLower = html.toLowerCase();

      // Check for each captcha keyword
      for (const keyword of this.CAPTCHA_KEYWORDS) {
        if (htmlLower.includes(keyword.toLowerCase())) {
          return {
            detected: true,
            detectionMethod: 'html_content',
            recommendedAction: CaptchaAction.PAUSE_AND_ALERT,
            details: {
              keyword,
              url: page.url(),
            },
          };
        }
      }

      return { detected: false };
    } catch (error) {
      logger.error('CaptchaDetector: Error checking HTML content', error as Error);
      return { detected: false };
    }
  }

  /**
   * Detect captcha by checking for captcha-related selectors
   * 
   * @param page - Puppeteer page to check
   * @returns CaptchaDetectionResult
   */
  private async detectCaptchaSelectors(page: Page): Promise<CaptchaDetectionResult> {
    try {
      // Check for each captcha selector
      for (const selector of this.CAPTCHA_SELECTORS) {
        const element = await page.$(selector);
        if (element) {
          return {
            detected: true,
            detectionMethod: 'selector',
            recommendedAction: CaptchaAction.PAUSE_AND_ALERT,
            details: {
              selector,
              url: page.url(),
            },
          };
        }
      }

      return { detected: false };
    } catch (error) {
      logger.error('CaptchaDetector: Error checking selectors', error as Error);
      return { detected: false };
    }
  }

  /**
   * Detect HTTP 429 (Too Many Requests) response
   * 
   * Note: This checks the current page's response status.
   * For more comprehensive detection, you may want to monitor all network requests.
   * 
   * @param page - Puppeteer page to check
   * @returns CaptchaDetectionResult
   */
  private async detectHttp429(page: Page): Promise<CaptchaDetectionResult> {
    try {
      // Get the response for the current page
      const response = await page.goto(page.url(), { waitUntil: 'domcontentloaded', timeout: 5000 });
      
      if (response && response.status() === 429) {
        return {
          detected: true,
          detectionMethod: 'http_429',
          recommendedAction: CaptchaAction.INCREASE_DELAY,
          details: {
            statusCode: 429,
            url: page.url(),
          },
        };
      }

      return { detected: false };
    } catch (error) {
      // Timeout or navigation error - not necessarily a captcha
      logger.debug('CaptchaDetector: Error checking HTTP status', undefined, {
        error: (error as Error).message,
      });
      return { detected: false };
    }
  }

  /**
   * Detect captcha based on failed lookup rate in a batch
   * 
   * This method checks if the failure rate exceeds the threshold (default: 50%).
   * A high failure rate may indicate captcha challenges or rate limiting.
   * 
   * @param successfulLookups - Number of successful lookups
   * @param totalLookups - Total number of lookups attempted
   * @returns CaptchaDetectionResult
   */
  detectFailedLookupRate(successfulLookups: number, totalLookups: number): CaptchaDetectionResult {
    if (totalLookups === 0) {
      return { detected: false };
    }

    const successRate = successfulLookups / totalLookups;
    const failureRate = 1 - successRate;

    logger.debug('CaptchaDetector: Checking failed lookup rate', undefined, {
      successfulLookups,
      totalLookups,
      successRate,
      failureRate,
      threshold: this.failedLookupThreshold,
    });

    if (failureRate > this.failedLookupThreshold) {
      logger.warn('CaptchaDetector: High failure rate detected', undefined, {
        successfulLookups,
        totalLookups,
        failureRate,
        threshold: this.failedLookupThreshold,
      });

      return {
        detected: true,
        detectionMethod: 'failed_lookup_rate',
        recommendedAction: CaptchaAction.REDUCE_BATCH_SIZE,
        details: {
          successfulLookups,
          totalLookups,
          successRate,
          failureRate,
          threshold: this.failedLookupThreshold,
        },
      };
    }

    return { detected: false };
  }

  /**
   * Handle captcha detection by returning the appropriate action
   * 
   * This method can be extended to implement automatic responses to captcha detection,
   * such as pausing scraping, reducing batch size, or increasing delays.
   * 
   * @param detectionResult - Result from captcha detection
   * @returns CaptchaAction to take
   */
  handleCaptcha(detectionResult: CaptchaDetectionResult): CaptchaAction {
    if (!detectionResult.detected) {
      logger.debug('CaptchaDetector: No captcha detected, no action needed');
      return CaptchaAction.PAUSE_AND_ALERT; // Default action
    }

    const action = detectionResult.recommendedAction || CaptchaAction.PAUSE_AND_ALERT;

    logger.warn('CaptchaDetector: Captcha detected, recommending action', undefined, {
      detectionMethod: detectionResult.detectionMethod,
      recommendedAction: action,
      details: detectionResult.details,
    });

    return action;
  }

  /**
   * Execute captcha response action
   * 
   * This method executes the appropriate response action when captcha is detected.
   * It works with a CaptchaResponseContext that provides the necessary callbacks
   * and state for each action.
   * 
   * @param action - The captcha action to execute
   * @param context - Context object with callbacks and state for executing actions
   * @returns Promise that resolves when the action is complete
   */
  async executeAction(action: CaptchaAction, context: CaptchaResponseContext): Promise<void> {
    logger.warn('CaptchaDetector: Executing captcha response action', undefined, {
      action,
    });

    switch (action) {
      case CaptchaAction.PAUSE_AND_ALERT:
        await this.executePauseAndAlert(context);
        break;

      case CaptchaAction.REDUCE_BATCH_SIZE:
        await this.executeReduceBatchSize(context);
        break;

      case CaptchaAction.INCREASE_DELAY:
        await this.executeIncreaseDelay(context);
        break;

      case CaptchaAction.STOP_SESSION:
        await this.executeStopSession(context);
        break;

      default:
        logger.error('CaptchaDetector: Unknown captcha action', new Error(`Unknown action: ${action}`));
        // Default to pause and alert for unknown actions
        await this.executePauseAndAlert(context);
    }
  }

  /**
   * Execute PAUSE_AND_ALERT action
   * 
   * Pauses scraping and sends an alert to the user.
   * The scraping can be resumed manually by the user.
   * 
   * @param context - Context with pause and alert callbacks
   */
  private async executePauseAndAlert(context: CaptchaResponseContext): Promise<void> {
    logger.warn('CaptchaDetector: PAUSE_AND_ALERT - Pausing scraping and alerting user', undefined, {
      timestamp: new Date().toISOString(),
    });

    // Pause scraping
    if (context.pauseScraping) {
      await context.pauseScraping();
      logger.info('CaptchaDetector: Scraping paused');
    } else {
      logger.warn('CaptchaDetector: No pauseScraping callback provided in context');
    }

    // Send alert to user
    if (context.sendAlert) {
      await context.sendAlert({
        type: 'captcha_detected',
        severity: 'high',
        message: 'Captcha detected during scraping. Scraping has been paused. Please review and resume manually.',
        timestamp: new Date(),
        details: {
          action: CaptchaAction.PAUSE_AND_ALERT,
        },
      });
      logger.info('CaptchaDetector: Alert sent to user');
    } else {
      logger.warn('CaptchaDetector: No sendAlert callback provided in context');
    }
  }

  /**
   * Execute REDUCE_BATCH_SIZE action
   * 
   * Reduces the batch size to the minimum configured value.
   * This helps avoid further captcha detection by reducing request rate.
   * 
   * @param context - Context with batch size reduction callback
   */
  private async executeReduceBatchSize(context: CaptchaResponseContext): Promise<void> {
    logger.warn('CaptchaDetector: REDUCE_BATCH_SIZE - Reducing batch size to minimum', undefined, {
      timestamp: new Date().toISOString(),
    });

    if (context.reduceBatchSize) {
      const previousSize = context.getCurrentBatchSize ? context.getCurrentBatchSize() : 'unknown';
      await context.reduceBatchSize();
      const newSize = context.getCurrentBatchSize ? context.getCurrentBatchSize() : 'unknown';

      logger.info('CaptchaDetector: Batch size reduced', undefined, {
        previousSize,
        newSize,
      });

      // Optionally send alert about the change
      if (context.sendAlert) {
        await context.sendAlert({
          type: 'batch_size_reduced',
          severity: 'medium',
          message: `Batch size reduced from ${previousSize} to ${newSize} due to captcha detection.`,
          timestamp: new Date(),
          details: {
            action: CaptchaAction.REDUCE_BATCH_SIZE,
            previousSize,
            newSize,
          },
        });
      }
    } else {
      logger.warn('CaptchaDetector: No reduceBatchSize callback provided in context');
    }
  }

  /**
   * Execute INCREASE_DELAY action
   * 
   * Increases the inter-batch delay to slow down request rate.
   * This helps avoid further captcha detection by spacing out requests more.
   * 
   * @param context - Context with delay increase callback
   */
  private async executeIncreaseDelay(context: CaptchaResponseContext): Promise<void> {
    logger.warn('CaptchaDetector: INCREASE_DELAY - Increasing inter-batch delay', undefined, {
      timestamp: new Date().toISOString(),
    });

    if (context.increaseDelay) {
      const previousDelay = context.getCurrentDelay ? context.getCurrentDelay() : 'unknown';
      await context.increaseDelay();
      const newDelay = context.getCurrentDelay ? context.getCurrentDelay() : 'unknown';

      logger.info('CaptchaDetector: Inter-batch delay increased', undefined, {
        previousDelay,
        newDelay,
      });

      // Optionally send alert about the change
      if (context.sendAlert) {
        await context.sendAlert({
          type: 'delay_increased',
          severity: 'medium',
          message: `Inter-batch delay increased from ${previousDelay}ms to ${newDelay}ms due to captcha detection.`,
          timestamp: new Date(),
          details: {
            action: CaptchaAction.INCREASE_DELAY,
            previousDelay,
            newDelay,
          },
        });
      }
    } else {
      logger.warn('CaptchaDetector: No increaseDelay callback provided in context');
    }
  }

  /**
   * Execute STOP_SESSION action
   * 
   * Stops the scraping session completely.
   * This is the most severe action and should be used when captcha detection
   * indicates that continuing would be futile or risky.
   * 
   * @param context - Context with session stop callback
   */
  private async executeStopSession(context: CaptchaResponseContext): Promise<void> {
    logger.error('CaptchaDetector: STOP_SESSION - Stopping scraping session', undefined, undefined, {
      timestamp: new Date().toISOString(),
    });

    // Send alert before stopping
    if (context.sendAlert) {
      await context.sendAlert({
        type: 'session_stopped',
        severity: 'critical',
        message: 'Scraping session stopped due to captcha detection. Manual intervention required.',
        timestamp: new Date(),
        details: {
          action: CaptchaAction.STOP_SESSION,
        },
      });
      logger.info('CaptchaDetector: Critical alert sent to user');
    }

    // Stop the session
    if (context.stopSession) {
      await context.stopSession();
      logger.info('CaptchaDetector: Scraping session stopped');
    } else {
      logger.warn('CaptchaDetector: No stopSession callback provided in context');
    }
  }

  /**
   * Get the current configuration
   * 
   * @returns Current configuration
   */
  getConfig(): CaptchaDetectorConfig {
    return {
      failedLookupThreshold: this.failedLookupThreshold,
      enableHtmlDetection: this.enableHtmlDetection,
      enableHttpDetection: this.enableHttpDetection,
      enableSelectorDetection: this.enableSelectorDetection,
    };
  }
}
