/**
 * Centralized Browser Manager
 * 
 * Manages both Playwright browser contexts (for scraper) and Puppeteer browsers (for non-scraper code)
 * to prevent conflicts between different parts of the application.
 * 
 * IMPORTANT: This manager supports TWO APIs:
 * 1. Playwright API (getContext/releaseContext) - Used by lib/scraper/ files
 * 2. Puppeteer API (getBrowser/releaseBrowser) - Used by non-scraper files (PDF generation, business lookup, etc.)
 */

import type { Browser, BrowserContext } from 'playwright';
import type { Browser as PuppeteerBrowser } from 'puppeteer';

interface ContextInstance {
  context: BrowserContext;
  inUse: boolean;
  lastUsed: number;
  purpose: string;
}

interface PuppeteerBrowserInstance {
  browser: PuppeteerBrowser;
  inUse: boolean;
  lastUsed: number;
  purpose: string;
}

class BrowserManager {
  private static instance: BrowserManager;
  private browser: Browser | null = null;
  private contexts: Map<string, ContextInstance> = new Map();
  private puppeteerBrowsers: Map<string, PuppeteerBrowserInstance> = new Map();
  private maxContexts = 10; // Limit concurrent contexts
  private maxPuppeteerBrowsers = 3; // Limit concurrent Puppeteer browsers
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleContexts();
      this.cleanupIdlePuppeteerBrowsers();
    }, 30000); // Clean up every 30 seconds
  }

  static getInstance(): BrowserManager {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager();
    }
    return BrowserManager.instance;
  }

  /**
   * Get or create a browser context for a specific purpose
   */
  async getContext(purpose: string = 'default'): Promise<BrowserContext> {
    // Initialize browser if not already initialized
    if (!this.browser) {
      await this.initBrowser();
    }

    // Check if we have an available context for this purpose
    const existingKey = Array.from(this.contexts.keys()).find(key => 
      key.startsWith(purpose) && !this.contexts.get(key)?.inUse
    );

    if (existingKey) {
      const instance = this.contexts.get(existingKey)!;
      instance.inUse = true;
      instance.lastUsed = Date.now();
      console.log(`[BrowserManager] Reusing context for ${purpose}`);
      return instance.context;
    }

    // Check context limit
    const activeContexts = Array.from(this.contexts.values()).filter(c => c.inUse).length;
    if (activeContexts >= this.maxContexts) {
      throw new Error(`Context limit reached (${this.maxContexts}). Please wait for other operations to complete.`);
    }

    // Create new context
    console.log(`[BrowserManager] Creating new context for ${purpose}`);
    const context = await this.browser!.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ignoreHTTPSErrors: true,
      locale: 'en-US',
      timezoneId: 'America/New_York',
    });
    
    const key = `${purpose}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    this.contexts.set(key, {
      context,
      inUse: true,
      lastUsed: Date.now(),
      purpose
    });

    return context;
  }

  /**
   * Release a browser context
   */
  async releaseContext(context: BrowserContext): Promise<void> {
    const entry = Array.from(this.contexts.entries()).find(([_, instance]) => 
      instance.context === context
    );

    if (entry) {
      const [key, instance] = entry;
      instance.inUse = false;
      instance.lastUsed = Date.now();
      console.log(`[BrowserManager] Released context ${key}`);
    }
  }

  /**
   * Force close a context and remove from pool
   */
  async closeContext(context: BrowserContext): Promise<void> {
    const entry = Array.from(this.contexts.entries()).find(([_, instance]) => 
      instance.context === context
    );

    if (entry) {
      const [key, instance] = entry;
      try {
        await instance.context.close();
      } catch (error) {
        console.warn(`[BrowserManager] Error closing context ${key}:`, error);
      }
      this.contexts.delete(key);
      console.log(`[BrowserManager] Closed and removed context ${key}`);
    }
  }

  /**
   * Initialize the single browser instance
   */
  private async initBrowser(): Promise<void> {
    if (this.browser) return;

    try {
      console.log('[BrowserManager] Importing Playwright...');
      const playwright = await import('playwright');
      console.log('[BrowserManager] Playwright imported successfully');

      const { getBrowserLaunchOptions, getChromiumPath } = await import('./browserConfig');
      const launchOptions = getBrowserLaunchOptions(true);
      
      // CRITICAL: Use system Chromium if available (Docker/Alpine Linux)
      const executablePath = getChromiumPath();
      if (executablePath) {
        console.log(`[BrowserManager] Using system Chromium at: ${executablePath}`);
        launchOptions.executablePath = executablePath;
      }

      console.log('[BrowserManager] Launch options:', JSON.stringify(launchOptions, null, 2));
      console.log('[BrowserManager] Launching browser...');
      
      // Add timeout and retry logic for container environments
      this.browser = await Promise.race([
        playwright.chromium.launch(launchOptions),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Browser launch timeout after 30 seconds')), 30000)
        )
      ]);
      
      console.log('[BrowserManager] Browser launched successfully');
      
      // Test the browser connection
      console.log('[BrowserManager] Testing browser connection...');
      const testContext = await this.browser.newContext();
      const testPage = await testContext.newPage();
      await testPage.goto('data:text/html,<h1>Test</h1>', { waitUntil: 'domcontentloaded', timeout: 10000 });
      await testPage.close();
      await testContext.close();
      console.log('[BrowserManager] Browser connection test successful');
      
    } catch (error) {
      console.error('[BrowserManager] Failed to initialize browser:', error);
      
      // Enhanced error logging
      if (error instanceof Error) {
        console.error('[BrowserManager] Error name:', error.name);
        console.error('[BrowserManager] Error message:', error.message);
        console.error('[BrowserManager] Error stack:', error.stack);
      }
      
      // Log additional error properties
      const errorProps = Object.getOwnPropertyNames(error);
      console.error('[BrowserManager] Error properties:', errorProps);
      
      for (const prop of errorProps) {
        try {
          console.error(`[BrowserManager] Error.${prop}:`, (error as any)[prop]);
        } catch (e) {
          console.error(`[BrowserManager] Could not log Error.${prop}:`, e instanceof Error ? e.message : String(e));
        }
      }
      
      throw error;
    }
  }

  /**
   * Clean up idle contexts
   */
  private async cleanupIdleContexts(): Promise<void> {
    const now = Date.now();
    const maxIdleTime = 5 * 60 * 1000; // 5 minutes

    for (const [key, instance] of this.contexts.entries()) {
      if (!instance.inUse && (now - instance.lastUsed) > maxIdleTime) {
        console.log(`[BrowserManager] Cleaning up idle context ${key}`);
        try {
          await instance.context.close();
        } catch (error) {
          console.warn(`[BrowserManager] Error closing idle context ${key}:`, error);
        }
        this.contexts.delete(key);
      }
    }
  }

  // ============================================================================
  // PUPPETEER API (for non-scraper code: PDF generation, business lookup, etc.)
  // ============================================================================

  /**
   * Get or create a Puppeteer browser instance for non-scraper purposes
   * @deprecated for scraper code - use getContext() instead
   */
  async getBrowser(purpose: string = 'default'): Promise<PuppeteerBrowser> {
    // Check if we have an available browser for this purpose
    const existingKey = Array.from(this.puppeteerBrowsers.keys()).find(key => 
      key.startsWith(purpose) && !this.puppeteerBrowsers.get(key)?.inUse
    );

    if (existingKey) {
      const instance = this.puppeteerBrowsers.get(existingKey)!;
      instance.inUse = true;
      instance.lastUsed = Date.now();
      console.log(`[BrowserManager] Reusing Puppeteer browser for ${purpose}`);
      return instance.browser;
    }

    // Check browser limit
    const activeBrowsers = Array.from(this.puppeteerBrowsers.values()).filter(b => b.inUse).length;
    if (activeBrowsers >= this.maxPuppeteerBrowsers) {
      throw new Error(`Puppeteer browser limit reached (${this.maxPuppeteerBrowsers}). Please wait for other operations to complete.`);
    }

    // Create new Puppeteer browser
    console.log(`[BrowserManager] Creating new Puppeteer browser for ${purpose}`);
    const browser = await this.createPuppeteerBrowser();
    
    const key = `${purpose}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    this.puppeteerBrowsers.set(key, {
      browser,
      inUse: true,
      lastUsed: Date.now(),
      purpose
    });

    return browser;
  }

  /**
   * Release a Puppeteer browser instance
   * @deprecated for scraper code - use releaseContext() instead
   */
  async releaseBrowser(browser: PuppeteerBrowser): Promise<void> {
    const entry = Array.from(this.puppeteerBrowsers.entries()).find(([_, instance]) => 
      instance.browser === browser
    );

    if (entry) {
      const [key, instance] = entry;
      instance.inUse = false;
      instance.lastUsed = Date.now();
      console.log(`[BrowserManager] Released Puppeteer browser ${key}`);
    }
  }

  /**
   * Force close a Puppeteer browser and remove from pool
   * @deprecated for scraper code - use closeContext() instead
   */
  async closeBrowser(browser: PuppeteerBrowser): Promise<void> {
    const entry = Array.from(this.puppeteerBrowsers.entries()).find(([_, instance]) => 
      instance.browser === browser
    );

    if (entry) {
      const [key, instance] = entry;
      try {
        await instance.browser.close();
      } catch (error) {
        console.warn(`[BrowserManager] Error closing Puppeteer browser ${key}:`, error);
      }
      this.puppeteerBrowsers.delete(key);
      console.log(`[BrowserManager] Closed and removed Puppeteer browser ${key}`);
    }
  }

  /**
   * Create a new Puppeteer browser instance
   */
  private async createPuppeteerBrowser(): Promise<PuppeteerBrowser> {
    try {
      console.log('[BrowserManager] Importing Puppeteer...');
      const puppeteer = await import('puppeteer');
      console.log('[BrowserManager] Puppeteer imported successfully');

      const launchOptions = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      };

      console.log('[BrowserManager] Launching Puppeteer browser...');
      const browser = await puppeteer.default.launch(launchOptions);
      console.log('[BrowserManager] Puppeteer browser launched successfully');
      
      return browser;
    } catch (error) {
      console.error('[BrowserManager] Failed to create Puppeteer browser:', error);
      throw error;
    }
  }

  /**
   * Clean up idle Puppeteer browsers
   */
  private async cleanupIdlePuppeteerBrowsers(): Promise<void> {
    const now = Date.now();
    const maxIdleTime = 5 * 60 * 1000; // 5 minutes

    for (const [key, instance] of this.puppeteerBrowsers.entries()) {
      if (!instance.inUse && (now - instance.lastUsed) > maxIdleTime) {
        console.log(`[BrowserManager] Cleaning up idle Puppeteer browser ${key}`);
        try {
          await instance.browser.close();
        } catch (error) {
          console.warn(`[BrowserManager] Error closing idle Puppeteer browser ${key}:`, error);
        }
        this.puppeteerBrowsers.delete(key);
      }
    }
  }

  /**
   * Get context pool status
   */
  getStatus(): { total: number; inUse: number; idle: number } {
    const total = this.contexts.size;
    const inUse = Array.from(this.contexts.values()).filter(c => c.inUse).length;
    const idle = total - inUse;

    return { total, inUse, idle };
  }

  /**
   * Cleanup all contexts, browsers, and resources (for shutdown)
   */
  async cleanup(): Promise<void> {
    console.log('[BrowserManager] Cleaning up all resources...');
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Close all Playwright contexts first
    const closeContextPromises = Array.from(this.contexts.values()).map(async (instance) => {
      try {
        await instance.context.close();
      } catch (error) {
        console.warn('[BrowserManager] Error closing context during cleanup:', error);
      }
    });

    await Promise.all(closeContextPromises);
    this.contexts.clear();
    console.log('[BrowserManager] All Playwright contexts closed');

    // Close Playwright browser after all contexts are closed
    if (this.browser) {
      try {
        await this.browser.close();
        this.browser = null;
        console.log('[BrowserManager] Playwright browser closed');
      } catch (error) {
        console.warn('[BrowserManager] Error closing Playwright browser during cleanup:', error);
      }
    }

    // Close all Puppeteer browsers
    const closePuppeteerPromises = Array.from(this.puppeteerBrowsers.values()).map(async (instance) => {
      try {
        await instance.browser.close();
      } catch (error) {
        console.warn('[BrowserManager] Error closing Puppeteer browser during cleanup:', error);
      }
    });

    await Promise.all(closePuppeteerPromises);
    this.puppeteerBrowsers.clear();
    console.log('[BrowserManager] All Puppeteer browsers closed');

    console.log('[BrowserManager] Cleanup complete');
  }
}

// Export singleton instance
export const browserManager = BrowserManager.getInstance();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await browserManager.cleanup();
});

process.on('SIGINT', async () => {
  await browserManager.cleanup();
});