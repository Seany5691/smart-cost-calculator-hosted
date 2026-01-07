/**
 * Browser Configuration for Server-Side Puppeteer
 * 
 * Provides optimized browser launch options for serverless environments (Vercel).
 * These settings ensure Puppeteer works reliably in containerized/serverless contexts.
 * Uses @sparticuz/chromium for Vercel compatibility.
 */

import type { LaunchOptions } from 'puppeteer-core';

/**
 * Environment detection
 */
export const isProduction = process.env.NODE_ENV === 'production';
export const isVercel = process.env.VERCEL === '1';
export const isDocker = process.env.PUPPETEER_EXECUTABLE_PATH === '/usr/bin/chromium';
export const isServerless = isVercel || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;

/**
 * Get the Chromium executable path for the current environment
 */
export async function getChromiumPath(): Promise<string> {
  // If we're in Docker with system Chromium, use that
  if (isDocker) {
    return '/usr/bin/chromium';
  }
  
  if (isServerless) {
    // Use @sparticuz/chromium for Vercel/serverless
    const chromium = await import('@sparticuz/chromium');
    return await chromium.default.executablePath();
  }
  
  // Use system Chromium for local development
  // Puppeteer will use its bundled Chromium
  return '';
}

/**
 * Get optimized browser launch options for the current environment
 */
export function getBrowserLaunchOptions(headless: boolean = true): LaunchOptions {
  const baseOptions: LaunchOptions = {
    // Always use headless in production/serverless/docker
    headless: (isServerless || isDocker) ? true : headless,
    
    // Chromium args optimized for serverless
    args: [
      // Required for Docker/serverless environments
      '--no-sandbox',
      '--disable-setuid-sandbox',
      
      // Prevent crashes in containerized environments
      '--disable-dev-shm-usage',
      
      // Disable GPU (not needed for scraping)
      '--disable-gpu',
      '--disable-software-rasterizer',
      
      // Disable automation detection
      '--disable-blink-features=AutomationControlled',
      
      // Memory optimizations
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-breakpad',
      '--disable-component-extensions-with-background-pages',
      '--disable-features=TranslateUI,BlinkGenPropertyTrees',
      '--disable-ipc-flooding-protection',
      '--disable-renderer-backgrounding',
      
      // Performance optimizations
      '--enable-features=NetworkService,NetworkServiceInProcess',
      '--force-color-profile=srgb',
      '--hide-scrollbars',
      '--metrics-recording-only',
      '--mute-audio',
      
      // Window size
      '--window-size=1920,1080',
      
      // Disable unnecessary features
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-default-apps',
      '--disable-popup-blocking',
      '--disable-prompt-on-repost',
      '--disable-sync',
      '--disable-translate',
      
      // Security (relaxed for scraping)
      '--disable-web-security',
      '--allow-running-insecure-content',
    ],
  };

  // Add serverless-specific options
  if (isServerless) {
    baseOptions.args?.push(
      // Additional memory optimizations for serverless
      '--single-process',
      '--no-zygote',
      
      // Disable crash reporting
      '--disable-crash-reporter',
      '--disable-in-process-stack-traces',
    );
  }

  return baseOptions;
}

/**
 * Get optimized browser context options
 */
export function getBrowserContextOptions() {
  return {
    viewport: { width: 1920, height: 1080 },
    
    // User agent to avoid detection
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    
    // Locale and timezone
    locale: 'en-US',
    timezoneId: 'America/New_York',
    
    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,
    
    // Extra HTTP headers
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
    
    // Permissions
    permissions: [],
    
    // Disable images for faster loading (optional)
    // Can be enabled if scraping is too slow
    // javaScriptEnabled: true,
    // bypassCSP: true,
  };
}

/**
 * Verify Puppeteer installation
 * Useful for debugging deployment issues
 */
export async function verifyPuppeteerInstallation(): Promise<{
  installed: boolean;
  error?: string;
}> {
  try {
    const puppeteer = await import('puppeteer-core');
    const chromiumPath = await getChromiumPath();
    
    // Try to launch browser
    const browser = await puppeteer.default.launch({
      ...getBrowserLaunchOptions(true),
      executablePath: chromiumPath || undefined,
    });
    
    await browser.close();
    
    return { installed: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      installed: false,
      error: errorMessage,
    };
  }
}

/**
 * Get recommended memory allocation for Puppeteer
 * Used for Vercel function configuration
 */
export function getRecommendedMemoryMB(): number {
  // Minimum 1024MB for Puppeteer
  // Recommended 2048MB for concurrent scraping
  return isServerless ? 2048 : 1024;
}

/**
 * Get recommended timeout for scraping operations
 * Used for Vercel function timeout configuration
 */
export function getRecommendedTimeoutSeconds(): number {
  // Maximum timeout for Vercel Pro plan
  return 300; // 5 minutes
}

/**
 * Get Puppeteer instance configured for the current environment
 */
export async function getPuppeteer() {
  if (isServerless || isDocker) {
    // Use puppeteer-core for serverless and Docker (smaller bundle)
    return await import('puppeteer-core');
  } else {
    // Use full puppeteer for local development
    return await import('puppeteer');
  }
}
