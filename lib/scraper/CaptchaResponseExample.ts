/**
 * Example: Integrating CaptchaDetector with BatchManager
 * 
 * This file demonstrates how to use the CaptchaDetector's response actions
 * with the BatchManager to handle captcha detection during scraping.
 * 
 * This is an example/documentation file and is not meant to be executed directly.
 */

import { CaptchaDetector, CaptchaAction, CaptchaResponseContext, CaptchaAlert } from './CaptchaDetector';
import { BatchManager } from './BatchManager';
import type { Page } from 'puppeteer';

/**
 * Example implementation of captcha response context for a scraping session
 */
class ScrapingSessionContext implements CaptchaResponseContext {
  private batchManager: BatchManager;
  private isPaused: boolean = false;
  private isStopped: boolean = false;
  private alertCallback?: (alert: CaptchaAlert) => void;

  constructor(batchManager: BatchManager, alertCallback?: (alert: CaptchaAlert) => void) {
    this.batchManager = batchManager;
    this.alertCallback = alertCallback;
  }

  /**
   * Pause scraping - sets a flag that the scraping loop should check
   */
  async pauseScraping(): Promise<void> {
    this.isPaused = true;
    console.log('Scraping paused - waiting for manual resume');
  }

  /**
   * Send alert to user - could be email, webhook, UI notification, etc.
   */
  async sendAlert(alert: CaptchaAlert): Promise<void> {
    console.log('ALERT:', alert);
    
    // Call the provided callback if available
    if (this.alertCallback) {
      this.alertCallback(alert);
    }
    
    // In a real implementation, you might:
    // - Send an email notification
    // - Post to a webhook
    // - Update a UI notification system
    // - Log to a monitoring service
  }

  /**
   * Reduce batch size to minimum
   * 
   * Note: BatchManager already has adaptive batch sizing built in,
   * but this provides a way to force it to minimum immediately.
   */
  async reduceBatchSize(): Promise<void> {
    // Force batch size to minimum by simulating failed batches
    // This is a workaround since BatchManager doesn't expose a direct method
    // In a real implementation, you might want to add a method to BatchManager
    // like: batchManager.forceBatchSizeToMinimum()
    
    const stats = this.batchManager.getStatistics();
    console.log(`Reducing batch size from ${stats.currentBatchSize} to ${stats.minBatchSize}`);
    
    // For now, we rely on BatchManager's adaptive sizing to reduce batch size
    // when it detects failures
  }

  /**
   * Get current batch size
   */
  getCurrentBatchSize(): number {
    return this.batchManager.getCurrentBatchSize();
  }

  /**
   * Increase inter-batch delay
   * 
   * Note: This would require extending BatchManager to support dynamic delay adjustment.
   * For now, this is a placeholder showing the intended behavior.
   */
  async increaseDelay(): Promise<void> {
    // In a real implementation, you would:
    // 1. Add a method to BatchManager to adjust delay
    // 2. Or maintain delay state in this context and pass it to batch processing
    
    console.log('Increasing inter-batch delay (placeholder - requires BatchManager extension)');
  }

  /**
   * Get current delay
   */
  getCurrentDelay(): number {
    // This would return the current inter-batch delay
    // For now, return a placeholder value
    return 3500; // Average of default [2000, 5000] range
  }

  /**
   * Stop the scraping session
   */
  async stopSession(): Promise<void> {
    this.isStopped = true;
    console.log('Scraping session stopped - manual restart required');
  }

  /**
   * Check if scraping is paused
   */
  isPausedState(): boolean {
    return this.isPaused;
  }

  /**
   * Check if scraping is stopped
   */
  isStoppedState(): boolean {
    return this.isStopped;
  }

  /**
   * Resume scraping (manual action)
   */
  resume(): void {
    this.isPaused = false;
    console.log('Scraping resumed');
  }
}

/**
 * Example: Using CaptchaDetector with BatchManager in a scraping loop
 */
async function exampleScrapingLoop() {
  // Initialize components
  const batchManager = new BatchManager({
    minBatchSize: 3,
    maxBatchSize: 5,
    interBatchDelay: [2000, 5000],
    successRateThreshold: 0.5,
  });

  const captchaDetector = new CaptchaDetector({
    failedLookupThreshold: 0.5,
    enableHtmlDetection: true,
    enableHttpDetection: true,
    enableSelectorDetection: true,
  });

  // Create context with alert callback
  const context = new ScrapingSessionContext(batchManager, (alert) => {
    console.log('Alert received:', alert.message);
    // In a real app, you might send this to a notification service
  });

  // Mock page for example
  const mockPage = {} as Page;

  // Example scraping loop
  while (!context.isStoppedState()) {
    // Check if paused
    if (context.isPausedState()) {
      console.log('Scraping is paused, waiting...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      continue;
    }

    // Check for captcha before processing batch
    const detectionResult = await captchaDetector.detectCaptcha(mockPage);
    
    if (detectionResult.detected) {
      console.log('Captcha detected!', detectionResult);
      
      // Get recommended action
      const action = captchaDetector.handleCaptcha(detectionResult);
      
      // Execute the action
      await captchaDetector.executeAction(action, context);
      
      // If stopped, break out of loop
      if (context.isStoppedState()) {
        break;
      }
      
      // If paused, continue to next iteration (which will wait)
      if (context.isPausedState()) {
        continue;
      }
    }

    // Process batch (example - in real code, you'd add lookups first)
    if (!batchManager.isBatchEmpty()) {
      const result = await batchManager.processBatch(async (lookup) => {
        // Process lookup
        console.log('Processing lookup:', lookup.phoneNumber);
        return 'result'; // Return result or null on failure
      });

      console.log('Batch processed:', result);

      // Check for high failure rate
      const failureDetection = captchaDetector.detectFailedLookupRate(
        result.successful,
        result.batchSize
      );

      if (failureDetection.detected) {
        console.log('High failure rate detected!');
        const action = captchaDetector.handleCaptcha(failureDetection);
        await captchaDetector.executeAction(action, context);
      }
    }

    // Add some delay between iterations
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('Scraping loop ended');
}

/**
 * Example: Manual captcha response
 * 
 * Sometimes you might want to manually trigger a captcha response
 * based on external signals (e.g., monitoring system alerts)
 */
async function exampleManualResponse() {
  const batchManager = new BatchManager();
  const captchaDetector = new CaptchaDetector();
  const context = new ScrapingSessionContext(batchManager);

  // Manually trigger a specific action
  console.log('Manually triggering REDUCE_BATCH_SIZE action');
  await captchaDetector.executeAction(CaptchaAction.REDUCE_BATCH_SIZE, context);

  console.log('Manually triggering INCREASE_DELAY action');
  await captchaDetector.executeAction(CaptchaAction.INCREASE_DELAY, context);

  console.log('Manually triggering PAUSE_AND_ALERT action');
  await captchaDetector.executeAction(CaptchaAction.PAUSE_AND_ALERT, context);
}

/**
 * Example: Custom action logic
 * 
 * You can implement custom logic for handling different captcha scenarios
 */
async function exampleCustomActionLogic() {
  const batchManager = new BatchManager();
  const captchaDetector = new CaptchaDetector();
  const context = new ScrapingSessionContext(batchManager);
  const mockPage = {} as Page;

  // Detect captcha
  const detectionResult = await captchaDetector.detectCaptcha(mockPage);

  if (detectionResult.detected) {
    // Custom logic based on detection method
    switch (detectionResult.detectionMethod) {
      case 'html_content':
      case 'selector':
        // Visual captcha detected - pause and alert
        console.log('Visual captcha detected - pausing for manual intervention');
        await captchaDetector.executeAction(CaptchaAction.PAUSE_AND_ALERT, context);
        break;

      case 'http_429':
        // Rate limiting detected - increase delay
        console.log('Rate limiting detected - increasing delay');
        await captchaDetector.executeAction(CaptchaAction.INCREASE_DELAY, context);
        break;

      case 'failed_lookup_rate':
        // High failure rate - reduce batch size
        console.log('High failure rate - reducing batch size');
        await captchaDetector.executeAction(CaptchaAction.REDUCE_BATCH_SIZE, context);
        break;

      default:
        // Unknown detection method - use recommended action
        const action = captchaDetector.handleCaptcha(detectionResult);
        await captchaDetector.executeAction(action, context);
    }
  }
}

// Export for documentation purposes
export {
  ScrapingSessionContext,
  exampleScrapingLoop,
  exampleManualResponse,
  exampleCustomActionLogic,
};
