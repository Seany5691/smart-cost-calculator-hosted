/**
 * Centralized Browser Manager
 * 
 * Manages Puppeteer browser instances to prevent conflicts between
 * different parts of the application (scraper, business lookup, etc.)
 */

import type { Browser, PuppeteerLaunchOptions } from 'puppeteer';

interface BrowserInstance {
  browser: Browser;
  inUse: boolean;
  lastUsed: number;
  purpose: string;
}

class BrowserManager {
  private static instance: BrowserManager;
  private browsers: Map<string, BrowserInstance> = new Map();
  private maxBrowsers = 3; // Limit concurrent browsers
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleBrowsers();
    }, 30000); // Clean up every 30 seconds
  }

  static getInstance(): BrowserManager {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager();
    }
    return BrowserManager.instance;
  }

  /**
   * Get or create a browser instance for a specific purpose
   */
  async getBrowser(purpose: string = 'default'): Promise<Browser> {
    // Check if we have an available browser for this purpose
    const existingKey = Array.from(this.browsers.keys()).find(key => 
      key.startsWith(purpose) && !this.browsers.get(key)?.inUse
    );

    if (existingKey) {
      const instance = this.browsers.get(existingKey)!;
      instance.inUse = true;
      instance.lastUsed = Date.now();
      console.log(`[BrowserManager] Reusing browser for ${purpose}`);
      return instance.browser;
    }

    // Check browser limit
    const activeBrowsers = Array.from(this.browsers.values()).filter(b => b.inUse).length;
    if (activeBrowsers >= this.maxBrowsers) {
      throw new Error(`Browser limit reached (${this.maxBrowsers}). Please wait for other operations to complete.`);
    }

    // Create new browser
    console.log(`[BrowserManager] Creating new browser for ${purpose}`);
    const browser = await this.createBrowser();
    
    const key = `${purpose}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    this.browsers.set(key, {
      browser,
      inUse: true,
      lastUsed: Date.now(),
      purpose
    });

    return browser;
  }

  /**
   * Release a browser instance
   */
  async releaseBrowser(browser: Browser): Promise<void> {
    const entry = Array.from(this.browsers.entries()).find(([_, instance]) => 
      instance.browser === browser
    );

    if (entry) {
      const [key, instance] = entry;
      instance.inUse = false;
      instance.lastUsed = Date.now();
      console.log(`[BrowserManager] Released browser ${key}`);
    }
  }

  /**
   * Force close a browser and remove from pool
   */
  async closeBrowser(browser: Browser): Promise<void> {
    const entry = Array.from(this.browsers.entries()).find(([_, instance]) => 
      instance.browser === browser
    );

    if (entry) {
      const [key, instance] = entry;
      try {
        await instance.browser.close();
      } catch (error) {
        console.warn(`[BrowserManager] Error closing browser ${key}:`, error);
      }
      this.browsers.delete(key);
      console.log(`[BrowserManager] Closed and removed browser ${key}`);
    }
  }

  /**
   * Create a new browser instance with optimal settings
   */
  private async createBrowser(): Promise<Browser> {
    try {
      console.log('[BrowserManager] Importing Puppeteer...');
      const puppeteer = await import('puppeteer');
      console.log('[BrowserManager] Puppeteer imported successfully');

      const launchOptions: PuppeteerLaunchOptions = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
          '--memory-pressure-off',
          '--max_old_space_size=4096'
        ],
      };

      // Use environment-specific executable if available
      if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        console.log('[BrowserManager] Using custom executable path:', process.env.PUPPETEER_EXECUTABLE_PATH);
      }

      console.log('[BrowserManager] Launch options:', JSON.stringify(launchOptions, null, 2));
      console.log('[BrowserManager] Launching browser...');
      
      const browser = await puppeteer.default.launch(launchOptions);
      console.log('[BrowserManager] Browser launched successfully');
      
      return browser;
    } catch (error) {
      console.error('[BrowserManager] Failed to create browser:', error);
      
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
   * Clean up idle browsers
   */
  private async cleanupIdleBrowsers(): Promise<void> {
    const now = Date.now();
    const maxIdleTime = 5 * 60 * 1000; // 5 minutes

    for (const [key, instance] of this.browsers.entries()) {
      if (!instance.inUse && (now - instance.lastUsed) > maxIdleTime) {
        console.log(`[BrowserManager] Cleaning up idle browser ${key}`);
        try {
          await instance.browser.close();
        } catch (error) {
          console.warn(`[BrowserManager] Error closing idle browser ${key}:`, error);
        }
        this.browsers.delete(key);
      }
    }
  }

  /**
   * Get browser pool status
   */
  getStatus(): { total: number; inUse: number; idle: number } {
    const total = this.browsers.size;
    const inUse = Array.from(this.browsers.values()).filter(b => b.inUse).length;
    const idle = total - inUse;

    return { total, inUse, idle };
  }

  /**
   * Cleanup all browsers (for shutdown)
   */
  async cleanup(): Promise<void> {
    console.log('[BrowserManager] Cleaning up all browsers...');
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    const closePromises = Array.from(this.browsers.values()).map(async (instance) => {
      try {
        await instance.browser.close();
      } catch (error) {
        console.warn('[BrowserManager] Error closing browser during cleanup:', error);
      }
    });

    await Promise.all(closePromises);
    this.browsers.clear();
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