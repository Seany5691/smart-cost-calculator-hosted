/**
 * Browser Pool for Puppeteer
 * Manages a pool of browser instances for concurrent scraping
 */

import puppeteer, { Browser, Page, type PuppeteerLaunchOptions } from 'puppeteer';

interface BrowserPoolConfig {
  maxBrowsers: number;
  maxPagesPerBrowser: number;
  launchOptions?: PuppeteerLaunchOptions;
}

class BrowserPool {
  private browsers: Browser[] = [];
  private availableBrowsers: Browser[] = [];
  private config: BrowserPoolConfig;
  private isInitialized = false;

  constructor(config: BrowserPoolConfig) {
    this.config = {
      maxBrowsers: config.maxBrowsers || 2,
      maxPagesPerBrowser: config.maxPagesPerBrowser || 5,
      launchOptions: config.launchOptions || {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      },
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log(`Initializing browser pool with ${this.config.maxBrowsers} browsers...`);
    
    for (let i = 0; i < this.config.maxBrowsers; i++) {
      const browser = await puppeteer.launch(this.config.launchOptions);
      this.browsers.push(browser);
      this.availableBrowsers.push(browser);
    }

    this.isInitialized = true;
    console.log('Browser pool initialized successfully');
  }

  async acquirePage(): Promise<{ browser: Browser; page: Page }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Get an available browser or wait for one
    let browser: Browser;
    if (this.availableBrowsers.length > 0) {
      browser = this.availableBrowsers[0];
    } else {
      // If no browsers available, use the first one (round-robin)
      browser = this.browsers[0];
    }

    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    return { browser, page };
  }

  async releasePage(page: Page): Promise<void> {
    try {
      await page.close();
    } catch (error) {
      console.error('Error closing page:', error);
    }
  }

  async destroy(): Promise<void> {
    console.log('Destroying browser pool...');
    
    for (const browser of this.browsers) {
      try {
        await browser.close();
      } catch (error) {
        console.error('Error closing browser:', error);
      }
    }

    this.browsers = [];
    this.availableBrowsers = [];
    this.isInitialized = false;
    
    console.log('Browser pool destroyed');
  }

  async restart(): Promise<void> {
    await this.destroy();
    await this.initialize();
  }

  getStats() {
    return {
      totalBrowsers: this.browsers.length,
      availableBrowsers: this.availableBrowsers.length,
      isInitialized: this.isInitialized,
    };
  }
}

// Singleton instance
let browserPoolInstance: BrowserPool | null = null;

export function getBrowserPool(config?: BrowserPoolConfig): BrowserPool {
  if (!browserPoolInstance) {
    browserPoolInstance = new BrowserPool(
      config || {
        maxBrowsers: 2,
        maxPagesPerBrowser: 5,
      }
    );
  }
  return browserPoolInstance;
}

export async function destroyBrowserPool(): Promise<void> {
  if (browserPoolInstance) {
    await browserPoolInstance.destroy();
    browserPoolInstance = null;
  }
}

export { BrowserPool };
