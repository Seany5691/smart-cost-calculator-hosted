# Porting.co.za Site Change - Provider Lookup Update

## What Changed

**Date**: January 30, 2025

**Issue**: porting.co.za changed their website structure:
1. Direct URL access (`/PublicWebsite/crdb?msisdn=...`) no longer works
2. Captcha is now randomized (not predictable every 5th lookup)
3. Must use form interaction instead of direct API calls

## New Approach

### Form Interaction Method

**Old Method (No Longer Works)**:
```typescript
// Navigate directly to URL with phone number
const url = `https://www.porting.co.za/PublicWebsite/crdb?msisdn=${cleanPhone}`;
await page.goto(url);
await page.waitForSelector('span.p1');
```

**New Method (Current)**:
```typescript
// 1. Navigate to homepage
await page.goto('https://www.porting.co.za/');

// 2. Check for captcha BEFORE entering number
const hasCaptcha = await this.detectCaptchaOnPage(page);
if (hasCaptcha) {
  throw new Error('CAPTCHA_DETECTED'); // Triggers browser restart
}

// 3. Fill in the input field
await page.waitForSelector('#numberTextInput');
await page.type('#numberTextInput', cleanPhone);

// 4. Submit form
await page.keyboard.press('Enter');

// 5. Extract result
const provider = await this.extractProviderFromFormResult(page);
```

### Input Element

```html
<input 
  _ngcontent-ng-c2012635535="" 
  type="text" 
  id="numberTextInput" 
  formcontrolname="number" 
  class="form-control tn-input ng-pristine ng-valid ng-touched" 
  maxlength="10"
>
```

### Result Format

**Example Result Text**:
```
"has not been ported and is still serviced by TELKOM/TELKOM"
```

**Extraction Logic**:
- Look for pattern: `serviced by PROVIDER/PROVIDER`
- Extract the last word after the `/`
- In this example: `TELKOM`

## Captcha Handling

### Old Behavior (Predictable)
- Captcha appeared every 6th browser instance
- Solution: Close browser after 5 lookups, create new one

### New Behavior (Randomized)
- Captcha can appear at any time (randomized)
- Solution: Detect captcha, restart browser, continue

### Captcha Detection

**When**: BEFORE entering phone number into form

**How**: Check for:
1. reCAPTCHA iframes: `iframe[src*="recaptcha"]`
2. Captcha elements: `div[class*="captcha"]`, `.g-recaptcha`, etc.
3. Captcha keywords: "recaptcha", "verify you are human", etc.

**Action**: If detected:
1. Throw `CAPTCHA_DETECTED` error
2. Close current browser
3. Create new browser
4. Retry the lookup
5. Max 3 restarts per batch to prevent infinite loops

## Implementation Details

### Browser Restart Logic

```typescript
try {
  const provider = await this.lookupSingleProvider(browser, phoneNumber);
  return provider;
} catch (error) {
  if (error.message === 'CAPTCHA_DETECTED' && browserRestartCount < 3) {
    browserRestartCount++;
    
    // Close current browser
    await browser.close();
    
    // Create new browser
    browser = await this.createBrowser();
    
    // Wait before retry
    await this.sleep(2000);
    
    // Retry lookup
    const provider = await this.lookupSingleProvider(browser, phoneNumber);
    return provider;
  }
  
  throw error; // Other errors or max restarts reached
}
```

### Result Extraction

```typescript
private async extractProviderFromFormResult(page: Page): Promise<string> {
  const bodyText = await page.evaluate(() => document.body.textContent || '');
  
  // Pattern: "serviced by PROVIDER/PROVIDER"
  const pattern = /serviced by\s+([^\/\s]+)\/([^\/\s]+)/i;
  const match = bodyText.match(pattern);
  
  if (match) {
    // Extract last word after "/"
    return match[2].trim(); // e.g., "TELKOM"
  }
  
  return 'Unknown';
}
```

## Testing

### Test 1: Basic Lookup
```typescript
// Should navigate to site, fill form, extract result
const result = await providerLookup.lookupProviders(['0123456789']);
console.log(result); // Map { '0123456789' => 'TELKOM' }
```

### Test 2: Captcha Handling
```typescript
// Should detect captcha, restart browser, continue
// Watch console logs for:
// - "Captcha detected on page"
// - "Restarting browser"
// - "New browser created after captcha"
```

### Test 3: Multiple Lookups
```typescript
// Should handle batch processing with browser restarts
const result = await providerLookup.lookupProviders([
  '0123456789',
  '0123456790',
  '0123456791',
  // ... more numbers
]);
```

## Expected Console Output

### Successful Lookup
```
[ProviderLookup] Looking up phone: 0123456789 -> cleaned: 0123456789
[ProviderLookup] Entered phone number: 0123456789
[ProviderLookup] Page text (first 500 chars): has not been ported and is still serviced by TELKOM/TELKOM...
[ProviderLookup] Extracted provider: "TELKOM"
[ProviderLookup] Result for 0123456789: TELKOM
```

### Captcha Detected
```
[ProviderLookup] Looking up phone: 0123456789 -> cleaned: 0123456789
[ProviderLookup] Detected reCAPTCHA iframe
[ProviderLookup] Captcha detected on page for 0123456789, will restart browser
[ProviderLookup] [Batch 1] Captcha detected, restarting browser (attempt 1/3)
[ProviderLookup] [Batch 1] New browser created after captcha
[ProviderLookup] Looking up phone: 0123456789 -> cleaned: 0123456789
[ProviderLookup] Entered phone number: 0123456789
[ProviderLookup] Extracted provider: "TELKOM"
[ProviderLookup] Result for 0123456789: TELKOM
```

## Performance Impact

### Before (Direct URL)
- ~1-2 seconds per lookup
- Predictable captcha (every 6th browser)

### After (Form Interaction)
- ~2-3 seconds per lookup (slightly slower due to form interaction)
- Randomized captcha (unpredictable)
- Browser restarts add ~2 seconds when captcha detected

### Mitigation
- Cache still works (30 days)
- Subsequent lookups of same numbers are instant
- Browser restart only happens when captcha detected

## Troubleshooting

### Issue: "Element not found: #numberTextInput"
**Cause**: Page structure changed or not loaded
**Fix**: Increase timeout or check selector

### Issue: "No provider pattern found in page text"
**Cause**: Result format changed or page not loaded
**Fix**: Check page content, update regex pattern

### Issue: Infinite browser restarts
**Cause**: Captcha appearing on every attempt
**Fix**: Max 3 restarts per batch prevents this, but may need manual intervention

### Issue: All lookups failing
**Cause**: Site structure changed significantly
**Fix**: Inspect page manually, update selectors and extraction logic

## Deployment

### Files Changed
- `hosted-smart-cost-calculator/lib/scraper/provider-lookup-service.ts`

### Changes Made
1. Updated `lookupSingleProvider` to use form interaction
2. Added `detectCaptchaOnPage` method
3. Added `extractProviderFromFormResult` method
4. Updated `processLookupsWithBatchManager` to handle browser restarts
5. Updated header comments

### Testing Checklist
- [ ] Single lookup works
- [ ] Batch lookups work
- [ ] Captcha detection works
- [ ] Browser restart works
- [ ] Cache still works
- [ ] Result extraction works

### Deployment Steps
1. Test locally with real phone numbers
2. Verify captcha handling
3. Commit changes
4. Push to GitHub
5. Deploy to VPS
6. Monitor for issues

## Monitoring

### Key Metrics
- Success rate per batch
- Browser restart count
- Captcha detection frequency
- Lookup timing (should be 2-3s per lookup)

### Console Logs to Watch
- "Captcha detected on page"
- "Restarting browser"
- "Extracted provider"
- "No provider pattern found"

## Future Considerations

### If Site Changes Again
1. Inspect page structure manually
2. Update selectors (`#numberTextInput`, etc.)
3. Update result extraction regex
4. Update captcha detection logic
5. Test thoroughly before deploying

### Alternative Approaches
If form interaction becomes unreliable:
1. Consider using official API (if available)
2. Consider using third-party provider lookup service
3. Consider manual lookup with user intervention

## Summary

The provider lookup has been updated to handle porting.co.za's new website structure:
- ✅ Uses form interaction instead of direct URL
- ✅ Detects captcha before entering number
- ✅ Restarts browser when captcha detected
- ✅ Extracts provider from new result format
- ✅ Handles randomized captcha timing
- ✅ Maintains cache functionality
- ✅ Maintains batch processing

The new approach is more robust and handles the randomized captcha better than the old predictable approach.
