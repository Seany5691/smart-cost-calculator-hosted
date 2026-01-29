/**
 * NavigationManager Usage Examples
 * 
 * This file demonstrates how to use the NavigationManager class
 * for robust page navigation with retry logic and adaptive timeouts.
 */

import { NavigationManager } from './NavigationManager';
import type { Page } from 'puppeteer';

/**
 * Example 1: Basic usage with default settings
 */
async function basicUsage(page: Page) {
  const navigationManager = new NavigationManager();
  
  try {
    // Navigate with default settings:
    // - Max 5 retries per strategy
    // - Base delay of 3 seconds with exponential backoff
    // - Adaptive timeout starting at 60 seconds
    await navigationManager.navigateWithRetry(page, 'https://maps.google.com');
    
    console.log('Navigation successful!');
  } catch (error) {
    console.error('Navigation failed after all retries:', error);
  }
}

/**
 * Example 2: Custom retry configuration
 */
async function customRetryConfig(page: Page) {
  const navigationManager = new NavigationManager();
  
  try {
    // Navigate with custom settings
    await navigationManager.navigateWithRetry(page, 'https://maps.google.com', {
      maxRetries: 3,           // Try 3 times per strategy
      baseDelay: 5000,         // Start with 5 second delay
      minTimeout: 30000,       // Minimum 30 seconds timeout
      maxTimeout: 180000,      // Maximum 3 minutes timeout
      initialTimeout: 90000,   // Start with 90 seconds timeout
    });
    
    console.log('Navigation successful with custom config!');
  } catch (error) {
    console.error('Navigation failed:', error);
  }
}

/**
 * Example 3: Using navigation statistics
 */
async function monitoringNavigation(page: Page) {
  const navigationManager = new NavigationManager();
  
  // Perform several navigations
  for (let i = 0; i < 5; i++) {
    try {
      await navigationManager.navigateWithRetry(
        page,
        `https://maps.google.com/maps?q=restaurant+${i}`
      );
      
      // Get statistics after each navigation
      const stats = navigationManager.getStatistics();
      console.log(`Navigation ${i + 1}:`, {
        currentTimeout: stats.currentTimeout,
        averageTime: stats.averageNavigationTime,
        navigationCount: stats.navigationCount,
      });
    } catch (error) {
      console.error(`Navigation ${i + 1} failed:`, error);
    }
  }
  
  // Get final statistics
  const finalStats = navigationManager.getStatistics();
  console.log('Final statistics:', finalStats);
}

/**
 * Example 4: Resetting statistics between sessions
 */
async function multipleSessionsWithReset(page: Page) {
  const navigationManager = new NavigationManager();
  
  // Session 1: Navigate to several pages
  console.log('Session 1: Starting...');
  for (let i = 0; i < 3; i++) {
    await navigationManager.navigateWithRetry(page, `https://example.com/${i}`);
  }
  console.log('Session 1 stats:', navigationManager.getStatistics());
  
  // Reset statistics before new session
  navigationManager.reset();
  console.log('Statistics reset');
  
  // Session 2: Navigate to different pages
  console.log('Session 2: Starting...');
  for (let i = 0; i < 3; i++) {
    await navigationManager.navigateWithRetry(page, `https://example.org/${i}`);
  }
  console.log('Session 2 stats:', navigationManager.getStatistics());
}

/**
 * Example 5: Integration with existing scraper
 */
async function scraperIntegration(page: Page, urls: string[]) {
  const navigationManager = new NavigationManager();
  const results: any[] = [];
  
  for (const url of urls) {
    try {
      // Navigate with retry logic
      await navigationManager.navigateWithRetry(page, url, {
        maxRetries: 5,
        baseDelay: 3000,
      });
      
      // Extract data after successful navigation
      const data = await page.evaluate(() => {
        return {
          title: document.title,
          url: window.location.href,
        };
      });
      
      results.push({ url, success: true, data });
      
    } catch (error) {
      // Log failure and continue with next URL
      console.error(`Failed to scrape ${url}:`, error);
      results.push({ url, success: false, error: (error as Error).message });
    }
  }
  
  // Log summary
  const stats = navigationManager.getStatistics();
  console.log('Scraping complete:', {
    totalUrls: urls.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    averageNavigationTime: stats.averageNavigationTime,
    currentTimeout: stats.currentTimeout,
  });
  
  return results;
}

/**
 * Example 6: Handling specific error types
 */
async function errorHandling(page: Page) {
  const navigationManager = new NavigationManager();
  
  try {
    await navigationManager.navigateWithRetry(page, 'https://maps.google.com');
  } catch (error) {
    const err = error as Error;
    
    if (err.message.includes('Navigation failed after trying all strategies')) {
      // All retry attempts exhausted
      console.error('Complete navigation failure - all strategies failed');
      
      // Get statistics to understand what happened
      const stats = navigationManager.getStatistics();
      console.log('Navigation stats at failure:', stats);
      
      // Decide on next action:
      // - Restart browser
      // - Skip this URL
      // - Alert operator
      // - etc.
    } else {
      // Other error type
      console.error('Unexpected error:', err);
    }
  }
}

/**
 * Example 7: Adaptive timeout in action
 */
async function adaptiveTimeoutDemo(page: Page) {
  const navigationManager = new NavigationManager();
  
  console.log('Initial timeout:', navigationManager.getAdaptiveTimeout());
  
  // Simulate fast navigations
  for (let i = 0; i < 5; i++) {
    await navigationManager.navigateWithRetry(page, 'https://example.com');
    console.log(`After navigation ${i + 1}:`, navigationManager.getAdaptiveTimeout());
  }
  
  // Manually adjust timeout for slow operation
  navigationManager.adjustTimeout(100000); // Simulate 100 second operation
  console.log('After slow operation:', navigationManager.getAdaptiveTimeout());
  
  // Manually adjust timeout for fast operation
  navigationManager.adjustTimeout(5000); // Simulate 5 second operation
  console.log('After fast operation:', navigationManager.getAdaptiveTimeout());
}

/**
 * Example 8: Using with IndustryScraper
 */
async function industryScraperIntegration(page: Page, town: string, industry: string) {
  const navigationManager = new NavigationManager();
  
  // Build Google Maps search URL
  const searchQuery = `${industry} in ${town}`;
  const url = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;
  
  try {
    // Navigate to search results with retry logic
    await navigationManager.navigateWithRetry(page, url, {
      maxRetries: 5,
      baseDelay: 3000,
      minTimeout: 30000,
      maxTimeout: 120000,
    });
    
    console.log(`Successfully navigated to ${industry} in ${town}`);
    
    // Wait for results to load
    await page.waitForSelector('div[role="article"]', { timeout: 30000 });
    
    // Continue with scraping logic...
    
  } catch (error) {
    console.error(`Failed to navigate to ${industry} in ${town}:`, error);
    throw error;
  }
}

// Export examples for documentation
export {
  basicUsage,
  customRetryConfig,
  monitoringNavigation,
  multipleSessionsWithReset,
  scraperIntegration,
  errorHandling,
  adaptiveTimeoutDemo,
  industryScraperIntegration,
};
