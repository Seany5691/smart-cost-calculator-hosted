# CRITICAL SCRAPER BUG ANALYSIS

## Problem Statement
The scraper is hitting captcha on EVERY 6th lookup because it's creating a new browser for EACH lookup instead of doing 5 lookups per browser.

## Root Cause Analysis

### OLD WORKING SCRAPER (smart-cost-calculator)
```typescript
// Creates batches of 5
private createBatchesOfFive(phoneNumbers: string[]): string[][] {
  const batches: string[][] = [];
  for (let i = 0; i < phoneNumbers.length; i += MAX_LOOKUPS_PER_BROWSER) {
    batches.push(phoneNumbers.slice(i, i + MAX_LOOKUPS_PER_BROWSER));
  }
  return batches;
}

// Processes ONE batch of 5 with ONE browser
private async processBatchWithNewBrowser(
  batch: string[],  // Array of 5 phone numbers
  results: Map<string, string>,
  batchNumber: number
): Promise<void> {
  let browser: Browser | null = null;
  try {
    browser = await this.createBrowser(); // ONE browser
    
    // Process each phone number in this batch (max 5)
    for (let i = 0; i < batch.length; i++) {
      const phone = batch[i];
      const provider = await this.lookupSingleProvider(browser, phone); // REUSE browser
      results.set(phone, provider);
      await this.sleep(500);
    }
  } finally {
    if (browser) {
      await browser.close(); // Close after 5 lookups
    }
  }
}
```

**KEY**: ONE browser does 5 lookups, then closes.

### NEW BROKEN SCRAPER (hosted-smart-cost-calculator)
```typescript
// BatchManager calls this for EACH lookup
private async lookupSingleProviderWithBrowser(phoneNumber: string): Promise<string | null> {
  let browser: Browser | null = null;
  try {
    browser = await this.createBrowser(); // NEW browser for EACH lookup ❌
    const provider = await this.lookupSingleProvider(browser, phoneNumber);
    return provider === 'Unknown' ? null : provider;
  } finally {
    if (browser) {
      await browser.close(); // Close after 1 lookup ❌
    }
  }
}

// BatchManager processes batch
const batchResult = await this.batchManager.processBatch(async (lookup) => {
  return await this.lookupSingleProviderWithBrowser(lookup.phoneNumber); // NEW browser each time ❌
});
```

**PROBLEM**: Each lookup gets its OWN browser, so:
- Lookup 1: Browser 1 (1 lookup) → close
- Lookup 2: Browser 2 (1 lookup) → close
- Lookup 3: Browser 3 (1 lookup) → close
- Lookup 4: Browser 4 (1 lookup) → close
- Lookup 5: Browser 5 (1 lookup) → close
- Lookup 6: Browser 6 (1 lookup) → **CAPTCHA!** ❌

## The Fix

We need to:
1. Create ONE browser per batch of 5
2. Reuse that browser for all 5 lookups
3. Close the browser after the 5th lookup

## Solution

Modify `processLookupsWithBatchManager` to:
1. Create a browser BEFORE processing the batch
2. Pass that browser to all lookups in the batch
3. Close the browser AFTER the batch completes

This matches the OLD working scraper's behavior.

## Impact

**Current Behavior**: Captcha on 6th lookup (every time)
**After Fix**: Captcha avoided (5 lookups per browser, then new browser)

## Files to Modify

1. `hosted-smart-cost-calculator/lib/scraper/provider-lookup-service.ts`
   - Modify `processLookupsWithBatchManager` to create ONE browser per batch
   - Modify `lookupSingleProviderWithBrowser` to accept browser parameter
   - Ensure browser is closed after batch completes

## Testing

After fix:
1. Run scraper with 20+ phone numbers
2. Verify NO captcha appears
3. Verify 5 lookups per browser instance
4. Verify browser closes after each batch of 5

