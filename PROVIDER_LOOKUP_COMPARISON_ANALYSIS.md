# Provider Lookup Comparison Analysis

## Problem
All provider lookups are returning null because they're timing out waiting for `span.p1` selector.

## Root Cause
The NEW scraper is missing the **RetryStrategy** that the OLD scraper uses to automatically retry failed lookups.

## OLD Scraper (WORKING) ✅

### Key Components

1. **RetryStrategy Class**
   - Wraps operations with automatic retry logic
   - 3 retry attempts by default
   - Exponential backoff: 2s, 4s, 8s delays
   - Located: `smart-cost-calculator/src/lib/scraper/RetryStrategy.ts`

2. **ProviderLookupService**
   ```typescript
   export class ProviderLookupService {
     private retryStrategy: RetryStrategy;
     
     constructor(config) {
       this.retryStrategy = new RetryStrategy(3, 2000); // 3 attempts, 2s base delay
     }
     
     private async lookupSingleProvider(browser: Browser, phoneNumber: string): Promise<string> {
       return this.retryStrategy.execute(async () => {  // ← WRAPPED IN RETRY LOGIC
         const page = await browser.newPage();
         try {
           const cleanPhone = this.cleanPhoneNumber(phoneNumber);
           const url = `https://www.porting.co.za/PublicWebsite/crdb?msisdn=${cleanPhone}`;
           await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
           await page.waitForSelector('span.p1', { timeout: 5000 });
           const provider = await this.extractProviderFromPage(page);
           return provider;
         } catch (error) {
           console.warn(`[ProviderLookup] Lookup failed for ${phoneNumber}:`, error);
           return 'Unknown';
         } finally {
           await page.close();
         }
       });
     }
   }
   ```

### How It Works
1. First attempt fails (timeout waiting for span.p1)
2. RetryStrategy catches error
3. Waits 2 seconds
4. Second attempt (might succeed)
5. If fails, waits 4 seconds
6. Third attempt
7. If all fail, returns 'Unknown'

## NEW Scraper (BROKEN) ❌

### Missing Component
- **NO RetryStrategy!**
- Lookups fail on first timeout
- No automatic retry
- Returns 'Unknown' immediately

### Current Implementation
```typescript
async lookupSingleProvider(browser: Browser, phoneNumber: string): Promise<string> {
  const page = await browser.newPage();
  try {
    const cleanPhone = this.cleanPhoneNumber(phoneNumber);
    const url = `https://www.porting.co.za/PublicWebsite/crdb?msisdn=${cleanPhone}`;
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
    await page.waitForSelector('span.p1', { timeout: 5000 }); // ← FAILS HERE
    const provider = await this.extractProviderFromPage(page);
    return provider;
  } catch (error) {
    console.warn(`[ProviderLookup] Lookup failed for ${phoneNumber}:`, error);
    return 'Unknown'; // ← RETURNS IMMEDIATELY, NO RETRY
  } finally {
    await page.close();
  }
}
```

### Why It Fails
1. First attempt times out waiting for span.p1
2. Catch block returns 'Unknown' immediately
3. No retry logic
4. All lookups fail

## The Fix

### Option 1: Add RetryStrategy (Recommended)
Copy the RetryStrategy class from OLD scraper and wrap lookupSingleProvider:

```typescript
export class ProviderLookupService {
  private retryStrategy: RetryStrategy;
  
  constructor(config) {
    this.retryStrategy = new RetryStrategy(3, 2000);
  }
  
  async lookupSingleProvider(browser: Browser, phoneNumber: string): Promise<string> {
    return this.retryStrategy.execute(async () => {
      const page = await browser.newPage();
      try {
        // ... existing lookup logic ...
      } finally {
        await page.close();
      }
    });
  }
}
```

### Option 2: Manual Retry Loop
Add retry logic directly in lookupSingleProvider:

```typescript
async lookupSingleProvider(browser: Browser, phoneNumber: string): Promise<string> {
  const maxAttempts = 3;
  const baseDelay = 2000;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const page = await browser.newPage();
    try {
      // ... existing lookup logic ...
      return provider;
    } catch (error) {
      await page.close();
      
      if (attempt < maxAttempts - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Retry ${attempt + 1}/${maxAttempts} after ${delay}ms`);
        await this.sleep(delay);
      } else {
        console.warn(`All retries exhausted for ${phoneNumber}`);
        return 'Unknown';
      }
    }
  }
  return 'Unknown';
}
```

## Recommendation

**Use Option 1** - Copy RetryStrategy class from OLD scraper because:
1. ✅ Matches OLD scraper exactly
2. ✅ Reusable for other operations
3. ✅ Clean separation of concerns
4. ✅ Already tested and proven to work
5. ✅ Maintains consistency with OLD scraper architecture

## Implementation Steps

1. Copy `RetryStrategy.ts` from OLD scraper to NEW scraper
2. Import RetryStrategy in ProviderLookupService
3. Add `private retryStrategy: RetryStrategy` property
4. Initialize in constructor: `this.retryStrategy = new RetryStrategy(3, 2000)`
5. Wrap `lookupSingleProvider` logic in `this.retryStrategy.execute()`
6. Test with real phone numbers

## Expected Behavior After Fix

### Console Logs
```
[ProviderLookup] Looking up phone: 018 771 3377 -> cleaned: 0187713377
[ProviderLookup] Lookup failed for 018 771 3377: TimeoutError...
Retry attempt 1/3 failed. Retrying in 2000ms...
[ProviderLookup] Looking up phone: 018 771 3377 -> cleaned: 0187713377
[ProviderLookup] Result for 018 771 3377: Vodacom
```

### Success Rate
- OLD scraper: ~90% success rate (with retries)
- NEW scraper (current): 0% success rate (no retries)
- NEW scraper (after fix): ~90% success rate (with retries)

## Files to Modify

1. **Copy**: `smart-cost-calculator/src/lib/scraper/RetryStrategy.ts`
   - **To**: `hosted-smart-cost-calculator/lib/scraper/RetryStrategy.ts`

2. **Modify**: `hosted-smart-cost-calculator/lib/scraper/provider-lookup-service.ts`
   - Import RetryStrategy
   - Add retryStrategy property
   - Initialize in constructor
   - Wrap lookupSingleProvider in retryStrategy.execute()

## Testing Checklist

- [ ] Copy RetryStrategy.ts
- [ ] Import in provider-lookup-service.ts
- [ ] Add retryStrategy property
- [ ] Initialize in constructor
- [ ] Wrap lookupSingleProvider
- [ ] Build passes
- [ ] Deploy to VPS
- [ ] Test with 10+ phone numbers
- [ ] Verify retries in logs
- [ ] Verify success rate >80%

