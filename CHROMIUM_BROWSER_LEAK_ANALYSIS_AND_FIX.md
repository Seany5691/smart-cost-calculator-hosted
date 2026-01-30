# Chromium Browser Leak Analysis and Fix

## Issue Report
Server experiencing high CPU and memory usage due to numerous Chromium processes not being closed properly. This is causing server crashes and instability.

## Root Cause Analysis

### Current Browser Management

#### 1. Provider Lookup Service (`provider-lookup-service.ts`)
**Status: ✅ MOSTLY GOOD**
- Creates ONE browser per batch of 5 lookups
- Closes browser after batch completes (line 332-336)
- **POTENTIAL ISSUE**: Pages created in `lookupSingleProvider` might not close if error occurs before finally block

#### 2. Browser Worker (`browser-worker.ts`)
**Status: ✅ GOOD**
- Creates ONE browser per town
- Closes browser after town completes (line 85 cleanup in finally block)
- Tracks active pages in `activePages` Set
- Closes all pages before closing browser

#### 3. Industry Scraper (`industry-scraper.ts`)
**Status: ✅ GOOD**
- Creates pages for each industry scrape
- Closes pages after scrape completes

### Identified Issues

1. **Page Leak in Provider Lookup**: If `lookupSingleProvider` throws error before reaching finally block, page might not close
2. **No Global Browser Tracking**: No centralized tracking of all open browsers across the application
3. **No Timeout on Browser Operations**: Long-running operations might keep browsers open indefinitely
4. **No Maximum Browser Limit**: No hard limit on total number of browsers that can be open simultaneously

## Recommended Fixes

### Priority 1: Add Page Tracking to Provider Lookup Service

**File: `lib/scraper/provider-lookup-service.ts`**

Add page tracking similar to BrowserWorker:

```typescript
export class ProviderLookupService {
  private maxConcurrentBrowsers: number;
  private activeBrowsers: number = 0;
  private eventEmitter?: any;
  private batchManager: BatchManager;
  private retryStrategy: RetryStrategy;
  private activePages: Set<Page> = new Set(); // ADD THIS

  // ... existing code ...

  async lookupSingleProvider(browser: Browser, phoneNumber: string): Promise<string> {
    return this.retryStrategy.execute(async () => {
      const page = await browser.newPage();
      this.activePages.add(page); // ADD THIS

      try {
        // ... existing lookup logic ...
      } catch (error) {
        // ... existing error handling ...
      } finally {
        this.activePages.delete(page); // ADD THIS
        await page.close();
      }
    });
  }

  async cleanup(): Promise<void> {
    // Close all active pages
    for (const page of this.activePages) {
      try {
        await page.close();
      } catch (err) {
        // Ignore errors
      }
    }
    this.activePages.clear();
    
    console.log('[ProviderLookup] Cleanup complete - all pages closed');
  }
}
```

### Priority 2: Add Browser Timeout

**File: `lib/scraper/provider-lookup-service.ts`**

Add timeout to browser operations:

```typescript
async lookupSingleProvider(browser: Browser, phoneNumber: string): Promise<string> {
  return this.retryStrategy.execute(async () => {
    const page = await browser.newPage();
    this.activePages.add(page);

    try {
      // Set page timeout to 30 seconds
      page.setDefaultTimeout(30000); // ADD THIS
      page.setDefaultNavigationTimeout(30000); // ADD THIS

      // ... rest of lookup logic ...
    } catch (error) {
      // ... error handling ...
    } finally {
      this.activePages.delete(page);
      await page.close();
    }
  });
}
```

### Priority 3: Add Global Browser Registry

**File: `lib/scraper/browser-registry.ts` (NEW)**

Create a global registry to track all browsers:

```typescript
import { Browser } from 'puppeteer';

class BrowserRegistry {
  private static instance: BrowserRegistry;
  private browsers: Set<Browser> = new Set();
  private maxBrowsers: number = 10; // Hard limit

  private constructor() {}

  static getInstance(): BrowserRegistry {
    if (!BrowserRegistry.instance) {
      BrowserRegistry.instance = new BrowserRegistry();
    }
    return BrowserRegistry.instance;
  }

  async register(browser: Browser): Promise<void> {
    if (this.browsers.size >= this.maxBrowsers) {
      throw new Error(`Maximum browser limit reached (${this.maxBrowsers})`);
    }
    this.browsers.add(browser);
    console.log(`[BrowserRegistry] Registered browser. Total: ${this.browsers.size}`);
  }

  async unregister(browser: Browser): Promise<void> {
    this.browsers.delete(browser);
    console.log(`[BrowserRegistry] Unregistered browser. Total: ${this.browsers.size}`);
  }

  async closeAll(): Promise<void> {
    console.log(`[BrowserRegistry] Closing all ${this.browsers.size} browsers...`);
    
    for (const browser of this.browsers) {
      try {
        await browser.close();
      } catch (err) {
        console.error('[BrowserRegistry] Error closing browser:', err);
      }
    }
    
    this.browsers.clear();
    console.log('[BrowserRegistry] All browsers closed');
  }

  getActiveBrowserCount(): number {
    return this.browsers.size;
  }
}

export default BrowserRegistry.getInstance();
```

### Priority 4: Add Cleanup on Process Exit

**File: `app/api/scraper/start/route.ts`**

Add cleanup handlers:

```typescript
import BrowserRegistry from '@/lib/scraper/browser-registry';

// Add at top of file
process.on('SIGTERM', async () => {
  console.log('[Scraper] SIGTERM received, closing all browsers...');
  await BrowserRegistry.closeAll();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Scraper] SIGINT received, closing all browsers...');
  await BrowserRegistry.closeAll();
  process.exit(0);
});

process.on('uncaughtException', async (error) => {
  console.error('[Scraper] Uncaught exception, closing all browsers...', error);
  await BrowserRegistry.closeAll();
  process.exit(1);
});
```

## Immediate Actions (Quick Fix)

### 1. Add Page Tracking to Provider Lookup

This is the most critical fix. Modify `provider-lookup-service.ts`:

```typescript
// Add at class level
private activePages: Set<Page> = new Set();

// Modify lookupSingleProvider
async lookupSingleProvider(browser: Browser, phoneNumber: string): Promise<string> {
  return this.retryStrategy.execute(async () => {
    const page = await browser.newPage();
    this.activePages.add(page); // Track page

    try {
      // Set timeouts
      page.setDefaultTimeout(30000);
      page.setDefaultNavigationTimeout(30000);

      // ... existing logic ...

    } catch (error) {
      // ... existing error handling ...
    } finally {
      this.activePages.delete(page); // Untrack page
      try {
        await page.close();
      } catch (err) {
        console.error('[ProviderLookup] Error closing page:', err);
      }
    }
  });
}

// Modify cleanup
async cleanup(): Promise<void> {
  // Close all active pages first
  for (const page of this.activePages) {
    try {
      await page.close();
    } catch (err) {
      // Ignore errors
    }
  }
  this.activePages.clear();
  
  console.log('[ProviderLookup] Cleanup complete - all pages closed');
}
```

### 2. Add Timeout to All Page Operations

Ensure all page operations have timeouts to prevent hanging.

### 3. Monitor Browser Count

Add logging to track browser creation and closure:

```typescript
console.log(`[BROWSER] Created browser. Active: ${activeBrowserCount}`);
console.log(`[BROWSER] Closed browser. Active: ${activeBrowserCount}`);
```

## Testing Recommendations

1. **Monitor Browser Count**: Check `ps aux | grep chromium | wc -l` during scraping
2. **Monitor Memory**: Check memory usage during scraping
3. **Test Error Scenarios**: Trigger errors during scraping to ensure browsers close
4. **Test Stop Button**: Ensure stop button closes all browsers immediately
5. **Test Server Restart**: Ensure all browsers close on server restart

## Long-Term Recommendations

1. **Implement Browser Pool**: Reuse browsers instead of creating new ones
2. **Add Health Checks**: Monitor browser health and close unhealthy browsers
3. **Add Metrics**: Track browser creation/closure rates
4. **Add Alerts**: Alert when browser count exceeds threshold
5. **Consider Serverless**: Use serverless functions for scraping to avoid browser accumulation

## Deployment Checklist

- [ ] Apply Priority 1 fix (page tracking)
- [ ] Apply Priority 2 fix (timeouts)
- [ ] Test locally with multiple scraping sessions
- [ ] Monitor browser count during testing
- [ ] Deploy to VPS
- [ ] Monitor VPS browser count for 24 hours
- [ ] Check for memory leaks
- [ ] Verify all browsers close on stop/error

## Monitoring Commands

```bash
# Count chromium processes
ps aux | grep chromium | wc -l

# Show chromium processes with memory
ps aux | grep chromium | awk '{print $2, $4, $11}'

# Kill all chromium processes (emergency)
pkill -9 chromium

# Monitor in real-time
watch -n 5 'ps aux | grep chromium | wc -l'
```

## Expected Behavior After Fix

- **During Scraping**: 2-5 chromium processes (1-2 browsers + helper processes)
- **After Scraping**: 0 chromium processes
- **On Error**: All browsers close immediately
- **On Stop**: All browsers close immediately
- **Memory Usage**: Should not exceed 500MB per browser

---

**Status**: Ready to implement Priority 1 and 2 fixes immediately
**Risk Level**: HIGH - Server stability at risk
**Estimated Fix Time**: 30 minutes
**Testing Time**: 1 hour
