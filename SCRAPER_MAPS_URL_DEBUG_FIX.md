# Scraper Maps URL Debug Fix

## Problem
Maps URLs are not being extracted during scraping. All businesses show `Maps URL: N/A` in the results.

## Root Cause Analysis

The issue is in how we're extracting the Google Maps URL from the business card element.

### Current Code (NOT WORKING):
```typescript
mapsUrl = await cardElement.$eval(
  'a[href*="/maps/place/"]',
  (el: Element) => el.getAttribute('href') || ''
);
```

### Issues:
1. The selector `a[href*="/maps/place/"]` might not match the actual href format
2. Google Maps might be using a different URL structure
3. The anchor tag might not have the full URL in the href attribute initially

## Fix Applied

Changed to a more robust approach:

```typescript
// Try to find the anchor tag within the card
const anchorElement = await cardElement.$('a[href*="/maps/place/"]');
if (anchorElement) {
  mapsUrl = await anchorElement.evaluate((el: HTMLAnchorElement) => el.href || '');
  console.log(`[IndustryScraper] Found maps URL for ${name}: ${mapsUrl}`);
} else {
  // Try alternative: get the first anchor tag
  const firstAnchor = await cardElement.$('a');
  if (firstAnchor) {
    const href = await firstAnchor.evaluate((el: HTMLAnchorElement) => el.href || '');
    console.log(`[IndustryScraper] First anchor href for ${name}: ${href}`);
    if (href && href.includes('/maps/')) {
      mapsUrl = href;
    }
  } else {
    console.log(`[IndustryScraper] No anchor tag found for ${name}`);
  }
}
```

### Key Changes:
1. First try to find anchor with `/maps/place/` in href
2. If not found, get the first anchor tag and check if it contains `/maps/`
3. Use `el.href` instead of `el.getAttribute('href')` to get the full resolved URL
4. Added debug logging to see what's happening

## Testing

1. Restart dev server
2. Run a scrape
3. Check console logs for:
   - `[IndustryScraper] Found maps URL for...`
   - `[IndustryScraper] First anchor href for...`
   - `[IndustryScraper] No anchor tag found for...`

4. Check if maps URLs are now populated

## Alternative Approaches to Try

If the above doesn't work, we can try:

### Approach 1: Extract from parent element
```typescript
const parentLink = await cardElement.evaluateHandle((el: Element) => {
  return el.closest('a') || el.querySelector('a');
});
if (parentLink) {
  mapsUrl = await parentLink.evaluate((el: HTMLAnchorElement) => el.href);
}
```

### Approach 2: Use evaluate to get href in browser context
```typescript
mapsUrl = await cardElement.evaluate((el: Element) => {
  const anchor = el.querySelector('a');
  return anchor ? (anchor as HTMLAnchorElement).href : '';
});
```

### Approach 3: Look for data attributes
```typescript
mapsUrl = await cardElement.evaluate((el: Element) => {
  const anchor = el.querySelector('a');
  if (anchor) {
    // Try href first
    const href = (anchor as HTMLAnchorElement).href;
    if (href) return href;
    
    // Try data attributes
    const dataUrl = anchor.getAttribute('data-url') || 
                    anchor.getAttribute('data-href') ||
                    anchor.getAttribute('data-link');
    if (dataUrl) return dataUrl;
  }
  return '';
});
```

## Files Modified
- `hosted-smart-cost-calculator/lib/scraper/industry-scraper.ts`

## Next Steps
1. Test with debug logging
2. If still not working, try alternative approaches
3. May need to inspect actual Google Maps HTML structure to see exact selectors

---

**Status**: 🔍 DEBUGGING - Added logging to identify issue
**Date**: January 27, 2026
