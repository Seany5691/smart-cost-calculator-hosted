# Scraper Crash and Stop Button Fixes

## Issues Fixed

### 1. Navigation Timeout Crashes
**Problem:** The scraper was crashing with "Navigation timeout of 30000 ms exceeded" errors when trying to load Google Maps pages.

**Root Cause:**
- Timeout was set to 30 seconds which is too short for slow connections or when Google Maps is slow to respond
- Using `waitUntil: 'networkidle2'` which waits for network to be idle (no more than 2 connections for 500ms) - this is too strict for modern web apps with persistent connections
- No retry logic for transient network issues

**Fixes Applied:**
1. **Increased timeout from 30s to 60s** in:
   - `lib/scraper/industry-scraper.ts`
   - `lib/scraper/business-lookup-scraper.ts`

2. **Changed wait strategy from `networkidle2` to `domcontentloaded`**:
   - `domcontentloaded` waits only for the HTML to be parsed, not for all resources
   - Much more reliable for dynamic sites like Google Maps
   - Faster and less prone to timeouts

3. **Added retry logic** in `industry-scraper.ts`:
   - Automatically retries up to 2 times on navigation timeout
   - Waits 3 seconds between retries
   - Logs each attempt for debugging
   - Only retries on timeout errors, not other errors

### 2. Stop Button Not Stopping Backend
**Problem:** When clicking the stop button, the frontend would stop but the backend scraping would continue running, consuming resources and potentially causing issues.

**Root Cause:**
- The stop mechanism only set a flag (`isStopped = true`) but didn't forcefully close browser instances
- Active page.goto() calls would continue until they completed or timed out
- Workers would only check the flag between towns, not during active scraping

**Fixes Applied:**
1. **Added `forceStop()` method to BrowserWorker**:
   - Immediately sets `isStopped = true`
   - Closes all active pages to abort ongoing requests
   - Closes the browser instance
   - Cleans up all resources

2. **Track active pages** in BrowserWorker:
   - Added `activePages: Set<Page>` to track all open pages
   - Pages are added to the set when created
   - Pages are removed when closed
   - All pages are forcefully closed on stop

3. **Updated orchestrator stop method**:
   - Calls `forceStop()` on all workers immediately
   - Waits for all workers to stop using `Promise.allSettled()`
   - Logs when all workers are stopped

4. **Added stop checks during processing**:
   - Workers check `isStopped` before starting a town
   - Workers check `isStopped` between industry batches
   - Workers check `isStopped` before scraping each industry
   - Prevents new work from starting after stop is requested

## Testing the Fixes

### Test Navigation Timeout Fix:
1. Start a scraping session with multiple towns and industries
2. Monitor the console logs - you should see:
   - "Attempt 1/2 - Navigating to: [query]"
   - If timeout occurs: "Waiting 3 seconds before retry..."
   - "Attempt 2/2 - Navigating to: [query]"
   - "Successfully scraped X businesses for [query]"

### Test Stop Button Fix:
1. Start a scraping session
2. Wait for it to start processing (you'll see progress updates)
3. Click the "Stop" button
4. Check the console logs - you should see:
   - "[Orchestrator] Stop requested"
   - "[Orchestrator] Stopping scraping (force closing all workers)..."
   - "[Worker X] Force stopping..."
   - "[Worker X] Closing browser..."
   - "[Orchestrator] All workers stopped"
5. Verify no more scraping activity in the logs after stop

## Additional Improvements

### Better Error Handling:
- Errors during stop are now ignored (expected when forcefully closing)
- Page close errors are caught and ignored (page might already be closed)
- Workers don't log errors if they're stopped (expected behavior)

### Resource Cleanup:
- All active pages are tracked and closed
- Browser instances are properly closed
- Memory is freed immediately on stop

## Files Modified

1. `lib/scraper/browser-worker.ts`
   - Added `isStopped` flag
   - Added `activePages` set to track open pages
   - Added stop checks in `processTown()` and `scrapeIndustry()`
   - Added `forceStop()` method
   - Updated `cleanup()` to close all active pages

2. `lib/scraper/scraping-orchestrator.ts`
   - Updated `stop()` to call `forceStop()` on all workers
   - Added proper waiting for all workers to stop

3. `lib/scraper/industry-scraper.ts`
   - Increased timeout from 30s to 60s
   - Changed from `networkidle2` to `domcontentloaded`
   - Added retry logic with 2 attempts
   - Added better logging

4. `lib/scraper/business-lookup-scraper.ts`
   - Increased timeout from 30s to 60s
   - Changed from `networkidle2` to `domcontentloaded`

## Next Steps

1. **Test thoroughly** with various scenarios:
   - Slow network connections
   - Multiple towns and industries
   - Stop button at different stages
   - Network interruptions

2. **Monitor production** for:
   - Reduced timeout errors
   - Proper stop behavior
   - Resource cleanup

3. **Consider future enhancements**:
   - Configurable timeout values
   - Configurable retry attempts
   - Better progress indication during retries
   - Pause/resume functionality improvements
