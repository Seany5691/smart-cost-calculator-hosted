/**
 * RetryQueue Usage Examples
 * 
 * This file demonstrates how to use the RetryQueue class for managing
 * failed scraper operations with exponential backoff and database persistence.
 * 
 * Spec: scraper-robustness-enhancement
 * Phase: 1 - Core Resilience
 */

import { RetryQueue } from './RetryQueue';

/**
 * Example 1: Basic usage - Enqueue and dequeue retry items
 */
async function basicUsageExample() {
  const sessionId = 'scraping-session-123';
  const retryQueue = new RetryQueue(sessionId);

  // Enqueue a failed navigation
  await retryQueue.enqueue({
    type: 'navigation',
    data: { url: 'https://maps.google.com/maps?q=restaurants+in+Cape+Town' },
    attempts: 0,
  });

  // Enqueue a failed provider lookup
  await retryQueue.enqueue({
    type: 'lookup',
    data: { 
      businessId: 'business-456',
      businessName: 'Joe\'s Pizza',
      phone: '555-1234',
    },
    attempts: 0,
  });

  // Check queue size
  const size = await retryQueue.getQueueSize();
  console.log(`Queue size: ${size}`); // Output: Queue size: 2

  // Wait for retry time (in real usage, this would be handled by a scheduler)
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Dequeue the next ready item
  const item = await retryQueue.dequeue();
  if (item) {
    console.log(`Retrying ${item.type} operation:`, item.data);
    
    // Attempt the operation again
    const success = await retryOperation(item);
    
    if (!success && retryQueue.shouldRetry(item.attempts + 1)) {
      // Re-enqueue with incremented attempts
      await retryQueue.enqueue({
        type: item.type,
        data: item.data,
        attempts: item.attempts + 1,
      });
    }
  }
}

/**
 * Example 2: Custom configuration
 */
async function customConfigExample() {
  const sessionId = 'scraping-session-456';
  
  // Create queue with custom max retries and base delay
  const retryQueue = new RetryQueue(sessionId, {
    maxRetries: 5,      // Allow up to 5 retry attempts
    baseDelay: 2000,    // Start with 2 second delay
  });

  // Enqueue an item
  await retryQueue.enqueue({
    type: 'extraction',
    data: { selector: '.business-card', field: 'phone' },
    attempts: 0,
  });

  // With baseDelay=2000, delays will be:
  // Attempt 0: 2000ms (2s)
  // Attempt 1: 4000ms (4s)
  // Attempt 2: 8000ms (8s)
  // Attempt 3: 16000ms (16s)
  // Attempt 4: 32000ms (32s)
}

/**
 * Example 3: Monitoring queue statistics
 */
async function monitoringExample() {
  const sessionId = 'scraping-session-789';
  const retryQueue = new RetryQueue(sessionId);

  // Get queue statistics
  const stats = await retryQueue.getStats();
  console.log('Queue Statistics:');
  console.log(`  Total items: ${stats.totalItems}`);
  console.log(`  Ready items: ${stats.readyItems}`);
  console.log(`  By type:`, stats.itemsByType);
  console.log(`  By attempts:`, stats.itemsByAttempts);

  // Example output:
  // Queue Statistics:
  //   Total items: 10
  //   Ready items: 5
  //   By type: { navigation: 3, lookup: 5, extraction: 2 }
  //   By attempts: { 0: 4, 1: 3, 2: 3 }

  // Check if queue is getting too large
  if (stats.totalItems > 50) {
    console.warn('Retry queue is getting large - may indicate systemic issues');
  }
}

/**
 * Example 4: Integration with scraper components
 */
async function scraperIntegrationExample() {
  const sessionId = 'scraping-session-abc';
  const retryQueue = new RetryQueue(sessionId);

  // In NavigationManager - enqueue failed navigation
  try {
    await navigateToPage('https://maps.google.com/...');
  } catch (error) {
    console.error('Navigation failed:', error);
    await retryQueue.enqueue({
      type: 'navigation',
      data: { url: 'https://maps.google.com/...', error: error instanceof Error ? error.message : String(error) },
      attempts: 0,
    });
  }

  // In BatchManager - enqueue failed provider lookup
  try {
    const phone = await lookupProviderPhone('business-123');
  } catch (error) {
    console.error('Provider lookup failed:', error);
    await retryQueue.enqueue({
      type: 'lookup',
      data: { businessId: 'business-123', error: error instanceof Error ? error.message : String(error) },
      attempts: 0,
    });
  }

  // In IndustryScraper - enqueue failed extraction
  try {
    const mockElement = {}; // Mock element for example
    const businessData = await extractBusinessData(mockElement);
  } catch (error) {
    console.error('Extraction failed:', error);
    await retryQueue.enqueue({
      type: 'extraction',
      data: { elementId: 'element-456', error: error instanceof Error ? error.message : String(error) },
      attempts: 0,
    });
  }
}

/**
 * Example 5: Retry processing loop
 */
async function retryProcessingLoop() {
  const sessionId = 'scraping-session-def';
  const retryQueue = new RetryQueue(sessionId);

  // Process retry queue periodically
  setInterval(async () => {
    const readyCount = await retryQueue.getReadyCount();
    
    if (readyCount > 0) {
      console.log(`Processing ${readyCount} ready retry items...`);
      
      // Process all ready items
      let item = await retryQueue.dequeue();
      while (item) {
        try {
          // Retry the operation based on type
          switch (item.type) {
            case 'navigation':
              await retryNavigation(item.data);
              break;
            case 'lookup':
              await retryLookup(item.data);
              break;
            case 'extraction':
              await retryExtraction(item.data);
              break;
          }
          
          console.log(`Successfully retried ${item.type} operation`);
        } catch (error) {
          console.error(`Retry failed for ${item.type}:`, error);
          
          // Check if we should retry again
          const newAttempts = item.attempts + 1;
          if (retryQueue.shouldRetry(newAttempts)) {
            // Re-enqueue with incremented attempts
            await retryQueue.enqueue({
              type: item.type,
              data: item.data,
              attempts: newAttempts,
            });
            console.log(`Re-enqueued ${item.type} (attempt ${newAttempts})`);
          } else {
            console.error(`Max retries exceeded for ${item.type}, giving up`);
          }
        }
        
        // Get next item
        item = await retryQueue.dequeue();
      }
    }
  }, 5000); // Check every 5 seconds
}

/**
 * Example 6: Cleanup after session completion
 */
async function cleanupExample() {
  const sessionId = 'scraping-session-ghi';
  const retryQueue = new RetryQueue(sessionId);

  // When scraping session completes, clear the retry queue
  await retryQueue.clear();
  console.log('Retry queue cleared');

  // Verify queue is empty
  const size = await retryQueue.getQueueSize();
  console.log(`Queue size after cleanup: ${size}`); // Output: 0
}

/**
 * Example 7: Peek without removing
 */
async function peekExample() {
  const sessionId = 'scraping-session-jkl';
  const retryQueue = new RetryQueue(sessionId);

  // Peek at the next item without removing it
  const item = await retryQueue.peek();
  if (item) {
    console.log('Next retry item:', item);
    
    // Check if we want to process it
    if (shouldProcessNow(item)) {
      // Now actually dequeue and process
      await retryQueue.dequeue();
      await processItem(item);
    }
  }
}

// Helper functions (mock implementations)
async function retryOperation(item: any): Promise<boolean> {
  // Mock implementation
  return Math.random() > 0.5;
}

async function navigateToPage(url: string): Promise<void> {
  // Mock implementation
}

async function lookupProviderPhone(businessId: string): Promise<string> {
  // Mock implementation
  return '555-1234';
}

async function extractBusinessData(element: any): Promise<any> {
  // Mock implementation
  return {};
}

async function retryNavigation(data: any): Promise<void> {
  // Mock implementation
}

async function retryLookup(data: any): Promise<void> {
  // Mock implementation
}

async function retryExtraction(data: any): Promise<void> {
  // Mock implementation
}

function shouldProcessNow(item: any): boolean {
  // Mock implementation
  return true;
}

async function processItem(item: any): Promise<void> {
  // Mock implementation
}

/**
 * Key Points:
 * 
 * 1. Exponential Backoff: Delays increase exponentially (1s, 2s, 4s, 8s, ...)
 * 2. Max Retries: Default is 3 attempts, configurable
 * 3. Database Persistence: All operations are persisted to database automatically
 * 4. Time-based Ordering: Items are dequeued in order of nextRetryTime
 * 5. Type Safety: TypeScript types ensure correct usage
 * 6. Monitoring: Built-in statistics for queue health monitoring
 * 7. Session Isolation: Each scraping session has its own retry queue
 */
