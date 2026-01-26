# Scraper waitForTimeout Fix

## Issue
The scraper was failing with the error:
```
TypeError: this.page.waitForTimeout is not a function
```

This occurred in the IndustryScraper when trying to wait for content to load after scrolling.

## Root Cause
The `page.waitForTimeout()` method is deprecated in newer versions of Puppeteer and has been removed. The new app was using this deprecated method while the old app correctly used `new Promise(resolve => setTimeout(resolve, ms))`.

## Changes Made

### 1. Fixed waitForTimeout Usage
**File**: `hosted-smart-cost-calculator/lib/scraper/industry-scraper.ts`

**Before**:
```typescript
await this.page.waitForTimeout(1000);
```

**After**:
```typescript
await new Promise(resolve => setTimeout(resolve, 1000));
```

### 2. Fixed Business Card Selector
Changed from generic selector to the correct `.Nv2PK` class that Google Maps uses for business cards:

**Before**:
```typescript
const cards = await this.page.$$('div[role="feed"] > div > div');
```

**After**:
```typescript
const cards = await this.page.$$('div[role="feed"] .Nv2PK');
```

### 3. Improved Scrolling Logic
Changed from incremental scrolling to scrolling to the bottom of the feed:

**Before**:
```typescript
feed.scrollBy(0, 500);
```

**After**:
```typescript
feed.scrollTop = feed.scrollHeight;
```

### 4. Updated parseBusinessCard Method
Completely rewrote the parsing logic to match the old app's proven approach:
- Uses `.qBF1Pd` selector for business name
- Uses `a[href*="/maps/place/"]` for Google Maps URL
- Uses `.W4Efsd` containers for info elements
- Uses `.UsdlK` class for phone numbers
- Properly filters out opening hours, ratings, and other non-address text
- Uses address indicators to identify address fields

## Testing
After these changes, the scraper should:
1. Successfully navigate to Google Maps
2. Scroll through the results feed
3. Extract business cards using the correct selectors
4. Parse business name, phone, address, and maps URL
5. Return scraped businesses without errors

## Next Steps
1. Restart the dev server to apply changes
2. Test the scraper with a simple query (e.g., "Pharmacies in Fochville")
3. Verify that businesses are being scraped and returned
4. Check that all fields (name, phone, address, maps_address) are populated correctly
