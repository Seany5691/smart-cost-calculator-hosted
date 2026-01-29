/**
 * RetryQueue Usage Examples
 * 
 * This file demonstrates how to use the RetryQueue retry logic
 * for handling failed scraper operations.
 * 
 * Spec: scraper-robustness-enhancement
 * Task: 5.3 - Implement retry logic
 */

import { RetryQueue, RetryItem } from './RetryQueue';

/**
 * Example 1: Basic retry processing with processRetry()
 * 
 * This example shows how to process a single retry item from the queue.
 */
async function example1_basicRetryProcessing() {
  const sessionId = 'scraping-session-123';
  const retryQueue = new RetryQueue(sessionId);

  // Define an operation callback that attempts to navigate to a URL
  const navigationOperation = async (item: RetryItem): Promise<boolean> => {
    try {
      console.log(`Attempting to navigate to: ${item.data.url}`);
      
      // Simulate navigation logic (replace with actual Puppeteer navigation)
      const success = await simulateNavigation(item.data.url);
      
      return success;
    } catch (error) {
      console.error('Navigation failed:', error);
      return false;
    }
  };

  // Process the next ready retry item
  const result = await retryQueue.processRetry(navigationOperation);

  if (!result) {
    console.log('No items ready for retry');
  } else if (result.status === 'success') {
    console.log(`✓ Retry succeeded after ${result.finalAttempts} attempt(s)`);
  } else if (result.status === 'retrying') {
    console.log(`⟳ Retry failed, re-queued for attempt ${result.finalAttempts}`);
  } else if (result.status === 'failed') {
    console.log(`✗ Max retries exceeded, item discarded after ${result.finalAttempts} attempts`);
  }
}

/**
 * Example 2: Process all ready items with processAllReady()
 * 
 * This example shows how to process all items that are ready for retry.
 */
async function example2_processAllReady() {
  const sessionId = 'scraping-session-123';
  const retryQueue = new RetryQueue(sessionId);

  // Define an operation callback for provider lookups
  const providerLookupOperation = async (item: RetryItem): Promise<boolean> => {
    try {
      console.log(`Looking up provider for business: ${item.data.businessId}`);
      
      // Simulate provider lookup (replace with actual ProviderLookupService call)
      const phoneNumber = await simulateProviderLookup(item.data.businessId);
      
      if (phoneNumber) {
        // Update business record with phone number
        console.log(`Found phone number: ${phoneNumber}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Provider lookup failed:', error);
      return false;
    }
  };

  // Process all ready items
  const results = await retryQueue.processAllReady(providerLookupOperation);

  console.log(`\nProcessed ${results.length} retry items:`);
  console.log(`  Successful: ${results.filter(r => r.status === 'success').length}`);
  console.log(`  Retrying: ${results.filter(r => r.status === 'retrying').length}`);
  console.log(`  Failed: ${results.filter(r => r.status === 'failed').length}`);
}

/**
 * Example 3: Integration with scraper workflow
 * 
 * This example shows how to integrate retry processing into the main scraper loop.
 */
async function example3_scraperIntegration() {
  const sessionId = 'scraping-session-123';
  const retryQueue = new RetryQueue(sessionId, {
    maxRetries: 3,
    baseDelay: 1000, // 1 second base delay
  });

  // Main scraping loop
  while (true) {
    // 1. Process any ready retry items first
    console.log('\n--- Processing retry queue ---');
    const retryResults = await retryQueue.processAllReady(async (item) => {
      switch (item.type) {
        case 'navigation':
          return await retryNavigation(item);
        case 'lookup':
          return await retryProviderLookup(item);
        case 'extraction':
          return await retryExtraction(item);
        default:
          return false;
      }
    });

    console.log(`Processed ${retryResults.length} retry items`);

    // 2. Perform new scraping operations
    console.log('\n--- Performing new scraping operations ---');
    try {
      await performScrapingOperations(retryQueue);
    } catch (error) {
      console.error('Scraping error:', error);
    }

    // 3. Check queue size and log warning if needed
    const queueSize = await retryQueue.getQueueSize();
    if (queueSize > 50) {
      console.warn(`⚠ Retry queue size is high: ${queueSize} items`);
    }

    // 4. Get queue statistics
    const stats = await retryQueue.getStats();
    console.log('\n--- Queue Statistics ---');
    console.log(`Total items: ${stats.totalItems}`);
    console.log(`Ready items: ${stats.readyItems}`);
    console.log(`By type:`, stats.itemsByType);
    console.log(`By attempts:`, stats.itemsByAttempts);

    // 5. Wait before next iteration
    await sleep(5000); // 5 seconds

    // Check if scraping is complete
    const isComplete = await checkScrapingComplete();
    if (isComplete) {
      break;
    }
  }

  // Clean up retry queue after session completes
  await retryQueue.clear();
  console.log('Retry queue cleared');
}

/**
 * Example 4: Handling different retry scenarios
 * 
 * This example shows how to handle different types of failures.
 */
async function example4_handlingDifferentScenarios() {
  const sessionId = 'scraping-session-123';
  const retryQueue = new RetryQueue(sessionId);

  // Scenario 1: Navigation timeout
  await retryQueue.enqueue({
    type: 'navigation',
    data: {
      url: 'https://maps.google.com/maps?q=restaurants+Cape+Town',
      timeout: 60000,
    },
    attempts: 0,
  });

  // Scenario 2: Provider lookup failure
  await retryQueue.enqueue({
    type: 'lookup',
    data: {
      businessId: 'business-123',
      businessName: 'Example Restaurant',
      phone: '0821234567',
    },
    attempts: 0,
  });

  // Scenario 3: Extraction failure (selector not found)
  await retryQueue.enqueue({
    type: 'extraction',
    data: {
      url: 'https://maps.google.com/maps?cid=12345',
      selector: '.business-card',
      field: 'address',
    },
    attempts: 0,
  });

  // Process each type with appropriate handler
  const result = await retryQueue.processRetry(async (item) => {
    console.log(`\nProcessing ${item.type} retry (attempt ${item.attempts + 1})`);
    
    switch (item.type) {
      case 'navigation':
        // Increase timeout for retries
        const timeout = item.data.timeout * 1.5;
        console.log(`Using increased timeout: ${timeout}ms`);
        return await simulateNavigation(item.data.url, timeout);
        
      case 'lookup':
        // Add delay before retry to avoid rate limiting
        await sleep(2000);
        const lookupResult = await simulateProviderLookup(item.data.businessId);
        return lookupResult !== null; // Convert to boolean
        
      case 'extraction':
        // Try alternative selectors
        console.log('Trying alternative extraction strategies');
        return await simulateExtraction(item.data.url, item.data.field);
        
      default:
        return false;
    }
  });

  if (result) {
    console.log(`\nResult: ${result.status} (${result.finalAttempts} attempts)`);
  }
}

/**
 * Example 5: Monitoring and alerting
 * 
 * This example shows how to monitor the retry queue and send alerts.
 */
async function example5_monitoringAndAlerting() {
  const sessionId = 'scraping-session-123';
  const retryQueue = new RetryQueue(sessionId);

  // Get queue statistics
  const stats = await retryQueue.getStats();

  // Check for high queue size
  if (stats.totalItems > 50) {
    console.warn('⚠ ALERT: Retry queue size exceeds 50 items');
    console.warn(`  Total items: ${stats.totalItems}`);
    console.warn(`  Ready items: ${stats.readyItems}`);
    
    // Send alert to monitoring system
    await sendAlert({
      level: 'warning',
      message: 'High retry queue size',
      details: stats,
    });
  }

  // Check for items with high attempt counts
  const highAttemptItems = Object.entries(stats.itemsByAttempts)
    .filter(([attempts]) => parseInt(attempts) >= 2)
    .reduce((sum, [, count]) => sum + count, 0);

  if (highAttemptItems > 10) {
    console.warn('⚠ ALERT: Many items with high attempt counts');
    console.warn(`  Items with 2+ attempts: ${highAttemptItems}`);
    
    // Send alert to monitoring system
    await sendAlert({
      level: 'warning',
      message: 'High retry attempt counts',
      details: { highAttemptItems, itemsByAttempts: stats.itemsByAttempts },
    });
  }

  // Check for specific failure types
  if (stats.itemsByType.navigation > 20) {
    console.warn('⚠ ALERT: High number of navigation failures');
    console.warn('  This may indicate network issues or Google Maps changes');
    
    await sendAlert({
      level: 'critical',
      message: 'High navigation failure rate',
      details: stats.itemsByType,
    });
  }
}

// ============================================================================
// Helper functions (simulated - replace with actual implementations)
// ============================================================================

async function simulateNavigation(url: string, timeout: number = 60000): Promise<boolean> {
  // Simulate navigation with random success/failure
  await sleep(100);
  return Math.random() > 0.3; // 70% success rate
}

async function simulateProviderLookup(businessId: string): Promise<string | null> {
  // Simulate provider lookup with random success/failure
  await sleep(100);
  return Math.random() > 0.2 ? '0821234567' : null; // 80% success rate
}

async function simulateExtraction(url: string, field: string): Promise<boolean> {
  // Simulate extraction with random success/failure
  await sleep(100);
  return Math.random() > 0.4; // 60% success rate
}

async function retryNavigation(item: RetryItem): Promise<boolean> {
  return await simulateNavigation(item.data.url);
}

async function retryProviderLookup(item: RetryItem): Promise<boolean> {
  const phoneNumber = await simulateProviderLookup(item.data.businessId);
  return phoneNumber !== null;
}

async function retryExtraction(item: RetryItem): Promise<boolean> {
  return await simulateExtraction(item.data.url, item.data.field);
}

async function performScrapingOperations(retryQueue: RetryQueue): Promise<void> {
  // Simulate scraping operations
  console.log('Scraping businesses...');
  await sleep(1000);
}

async function checkScrapingComplete(): Promise<boolean> {
  // Simulate completion check
  return false;
}

async function sendAlert(alert: { level: string; message: string; details: any }): Promise<void> {
  // Simulate sending alert to monitoring system
  console.log(`📧 Alert sent: [${alert.level.toUpperCase()}] ${alert.message}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Run examples (uncomment to test)
// ============================================================================

// example1_basicRetryProcessing().catch(console.error);
// example2_processAllReady().catch(console.error);
// example3_scraperIntegration().catch(console.error);
// example4_handlingDifferentScenarios().catch(console.error);
// example5_monitoringAndAlerting().catch(console.error);
