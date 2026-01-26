/**
 * Browser Configuration - Optimal Puppeteer settings for scraping
 * 
 * This module provides browser configuration for Puppeteer that works
 * in both local development and serverless environments. It includes
 * optimal args for headless operation and resource management.
 * 
 * Requirements: 23.1, 23.2, 23.3, 23.4, 23.5
 */

import type { PuppeteerLaunchOptions } from 'puppeteer';

/**
 * Get browser launch options optimized for serverless environments
 * 
 * These options ensure the browser works reliably in containerized
 * and serverless environments where resources are limited.
 * 
 * @param headless - Whether to run in headless mode (default: true)
 * @returns Puppeteer launch options
 */
export function getBrowserLaunchOptions(headless: boolean = true): PuppeteerLaunchOptions {
  return {
    headless: headless,
    args: [
      // Essential for serverless/containerized environments
      '--no-sandbox',
      '--disable-setuid-sandbox',
      
      // Reduce memory usage
      '--disable-dev-shm-usage',
      
      // Performance optimizations
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      
      // Stability improvements
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      
      // Resource management
      '--disable-extensions',
      '--disable-default-apps',
      '--disable-sync',
      
      // Window size for consistent rendering
      '--window-size=1920,1080',
    ],
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
    // Increase timeout for slow networks
    timeout: 60000,
  };
}

/**
 * Get Chromium executable path for serverless environment
 * 
 * In serverless environments (like AWS Lambda), Chromium may be
 * installed in a different location. This function detects the
 * environment and returns the appropriate path.
 * 
 * @returns Path to Chromium executable or undefined for default
 */
export function getChromiumPath(): string | undefined {
  // Check if running in AWS Lambda
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    // chromium-min package installs to /opt/chromium
    return '/opt/chromium';
  }
  
  // Check if running in Vercel
  if (process.env.VERCEL) {
    // Vercel uses chrome-aws-lambda
    return undefined; // Let puppeteer-core find it
  }
  
  // Check for custom chromium path
  if (process.env.CHROMIUM_PATH) {
    return process.env.CHROMIUM_PATH;
  }
  
  // Use default Puppeteer bundled Chromium
  return undefined;
}

/**
 * Get Puppeteer instance (supports both puppeteer and puppeteer-core)
 * 
 * This function dynamically imports the appropriate Puppeteer package
 * based on the environment. Use puppeteer-core in serverless environments
 * to reduce bundle size.
 * 
 * @returns Puppeteer instance
 */
export async function getPuppeteer(): Promise<any> {
  // Try puppeteer-core first (smaller bundle, requires external Chromium)
  try {
    const puppeteerCore = await import('puppeteer-core');
    return puppeteerCore.default || puppeteerCore;
  } catch (error) {
    // Fall back to puppeteer (includes bundled Chromium)
    try {
      const puppeteer = await import('puppeteer');
      return puppeteer.default || puppeteer;
    } catch (fallbackError) {
      throw new Error(
        'Neither puppeteer nor puppeteer-core could be loaded. ' +
        'Please install one of them: npm install puppeteer OR npm install puppeteer-core'
      );
    }
  }
}

/**
 * Create a browser instance with optimal configuration
 * 
 * This is a convenience function that combines all the configuration
 * functions to create a ready-to-use browser instance.
 * 
 * @param headless - Whether to run in headless mode (default: true)
 * @returns Promise that resolves to a Puppeteer browser instance
 */
export async function createBrowser(headless: boolean = true): Promise<any> {
  const puppeteer = await getPuppeteer();
  const options = getBrowserLaunchOptions(headless);
  const executablePath = getChromiumPath();
  
  if (executablePath) {
    options.executablePath = executablePath;
  }
  
  try {
    const browser = await puppeteer.launch(options);
    return browser;
  } catch (error) {
    throw new Error(
      `Failed to launch browser: ${error instanceof Error ? error.message : String(error)}\n` +
      `Options: ${JSON.stringify(options, null, 2)}`
    );
  }
}

/**
 * Check if running in serverless environment
 * @returns true if running in serverless environment
 */
export function isServerlessEnvironment(): boolean {
  return !!(
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.VERCEL ||
    process.env.NETLIFY ||
    process.env.SERVERLESS
  );
}

/**
 * Get recommended concurrency settings based on environment
 * 
 * Serverless environments have limited resources, so we reduce
 * concurrency to avoid memory issues.
 * 
 * @returns Recommended concurrency settings
 */
export function getRecommendedConcurrency(): {
  simultaneousTowns: number;
  simultaneousIndustries: number;
  simultaneousLookups: number;
} {
  if (isServerlessEnvironment()) {
    return {
      simultaneousTowns: 1,
      simultaneousIndustries: 1,
      simultaneousLookups: 1,
    };
  }
  
  return {
    simultaneousTowns: 3,
    simultaneousIndustries: 2,
    simultaneousLookups: 2,
  };
}
