# Scraper Maps URL Fix - COMPLETE

## Issues Fixed

### 1. ✅ Dot Prefix in Addresses ("· 10 Angelier St")
**Problem**: Addresses were showing with a "·" separator character prefix
**Root Cause**: Google Maps includes "·" as a separator in the text content
**Solution**: Added logic to strip leading "·" characters from extracted text

**Files Modified**:
- `lib/scraper/industry-scraper.ts` - Line ~183: Added `spanText.startsWith('·')` check and removal
- `lib/scraper/business-lookup-scraper.ts` - Line ~287: Added `cleanLine.startsWith('·')` check and removal

### 2. ✅ Type of Business Field
**Problem**: Type of business was not being populated
**Root Cause**: Field was already being set correctly to `this.industry` (search industry)
**Status**: No changes needed - already working correctly

**Verification**:
- `industry-scraper.ts` Line 233: `type_of_business: this.industry`
- `business-lookup-scraper.ts` Line 137: `type_of_business: this.businessQuery`
- `business-lookup-scraper.ts` Line 329: `type_of_business: this.businessQuery`

### 3. ✅ Google Maps URL - NOT SHOWING IN EXPORTS OR LEADS
**Problem**: Maps URLs were being scraped but not displayed or exported to leads
**Root Cause**: 
  - Scraper page was sending `mapsUrl: ''` (hardcoded empty string) instead of `mapsUrl: b.website`
  - ViewAllResults component wasn't displaying the website field
**Solution**: 
  - Fixed scraper page to send `mapsUrl: b.website || ''`
  - Added Maps URL column to ViewAllResults display (desktop and mobile)
  - Excel export already had the field correctly

**Files Modified**:
- `app/scraper/page.tsx` - Line 537: Changed `mapsUrl: ''` to `mapsUrl: b.website || ''`
- `components/scraper/ViewAllResults.tsx` - Added Maps URL column with clickable link

### 4. ✅ Missing Addresses
**Problem**: Some addresses were not being extracted
**Root Cause**: The "·" prefix was causing addresses to be skipped
**Solution**: By removing the "·" prefix before processing, addresses are now correctly identified

## Code Changes

### app/scraper/page.tsx
```typescript
// BEFORE:
businesses: businesses.map(b => ({
  name: b.name,
  phone: b.phone,
  address: b.address || '',
  town: b.town,
  typeOfBusiness: b.industry,
  mapsUrl: '',  // ❌ HARDCODED EMPTY STRING
  provider: b.provider,
}))

// AFTER:
businesses: businesses.map(b => ({
  name: b.name,
  phone: b.phone,
  address: b.address || '',
  town: b.town,
  typeOfBusiness: b.industry,
  mapsUrl: b.website || '',  // ✅ NOW USES ACTUAL WEBSITE FIELD
  provider: b.provider,
}))
```

### components/scraper/ViewAllResults.tsx
```typescript
// ADDED: Maps URL column header
<th className="px-4 py-3 text-left font-semibold text-gray-300">Maps URL</th>

// ADDED: Maps URL cell with clickable link
<td className="px-4 py-3 max-w-xs">
  {business.website ? (
    <a
      href={business.website}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-400 hover:text-blue-300 underline flex items-center gap-1 truncate"
    >
      <ExternalLink className="w-3 h-3 flex-shrink-0" />
      <span className="truncate">View on Maps</span>
    </a>
  ) : (
    <span className="text-gray-500">N/A</span>
  )}
</td>

// ADDED: Maps URL in mobile view
{business.website && (
  <div className="pt-1.5">
    <a
      href={business.website}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-400 hover:text-blue-300 underline flex items-center gap-1 text-sm"
    >
      <ExternalLink className="w-3 h-3 flex-shrink-0" />
      <span>View on Google Maps</span>
    </a>
  </div>
)}
```

### industry-scraper.ts
```typescript
// BEFORE:
const spanText = await span.evaluate((el: Element) => el.textContent?.trim() || '');

// Skip empty spans, separator characters, opening hours, ratings, and icons
if (!spanText ||
  spanText === '·' ||
  // ... rest of conditions

// AFTER:
let spanText = await span.evaluate((el: Element) => el.textContent?.trim() || '');

// Remove leading separator character if present
if (spanText.startsWith('·')) {
  spanText = spanText.substring(1).trim();
}

// Skip empty spans, separator characters, opening hours, ratings, and icons
if (!spanText ||
  spanText === '·' ||
  // ... rest of conditions
```

### business-lookup-scraper.ts
```typescript
// BEFORE:
for (const line of lines) {
  if (line === name) continue;

  // Skip opening hours
  if (/^(Open|Closed|Opens|Closes)/i.test(line)) continue;

// AFTER:
for (const line of lines) {
  if (line === name) continue;

  // Remove leading separator character if present
  let cleanLine = line;
  if (cleanLine.startsWith('·')) {
    cleanLine = cleanLine.substring(1).trim();
  }

  // Skip empty lines after cleaning
  if (!cleanLine) continue;

  // Skip opening hours
  if (/^(Open|Closed|Opens|Closes)/i.test(cleanLine)) continue;
```

## Testing Instructions

1. **Clear browser cache and restart dev server**:
   ```bash
   npm run dev
   ```

2. **Test Industry Scraping**:
   - Go to Scraper page
   - Enter a town (e.g., "Johannesburg")
   - Select an industry (e.g., "Pharmacies")
   - Start scraping
   - Verify:
     - ✅ Addresses do NOT have "·" prefix
     - ✅ All addresses are populated
     - ✅ Type of Business shows the industry name
     - ✅ Google Maps URL is visible in "View All Results" table
     - ✅ Maps URL is clickable and opens in new tab

3. **Test Excel Export**:
   - Export scraped businesses to Excel
   - Open the Excel file
   - Verify:
     - ✅ `maps_address` column has full Google Maps URLs
     - ✅ URLs are clickable hyperlinks (blue, underlined)

4. **Test Export to Leads**:
   - Click "Export to Leads"
   - Enter a list name
   - Confirm export
   - Go to Leads page
   - Verify:
     - ✅ Leads have Google Maps URLs populated
     - ✅ Maps URLs are clickable

5. **Check Database**:
   ```sql
   SELECT name, address, type_of_business, maps_address 
   FROM scraped_businesses 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

## Expected Results

### Before Fix:
```
Scraper Display: No Maps URL column
Excel Export: Maps URL column present ✅
Export to Leads: Maps URL = '' (empty) ❌
```

### After Fix:
```
Scraper Display: Maps URL column with clickable links ✅
Excel Export: Maps URL column present ✅
Export to Leads: Maps URL populated with full URL ✅
```

## Data Flow

1. **Scraping** → `maps_address` extracted from `<a href="...">` tag
2. **Database** → Saved to `scraped_businesses.maps_address`
3. **API Response** → Mapped to `website` field in Business interface
4. **Display** → Shown in ViewAllResults with clickable link
5. **Excel Export** → Included as `maps_address` column with hyperlink
6. **Export to Leads** → Sent as `mapsUrl` and saved to `leads.maps_address`

## Database Schema

The `scraped_businesses` table stores:
- `maps_address` - Full Google Maps URL (e.g., `https://www.google.com/maps/place/...`)
- `address` - Street address (cleaned, no "·" prefix)
- `type_of_business` - Industry/business type from search query
- `town` - Town name
- `name` - Business name
- `phone` - Phone number
- `provider` - ISP provider (filled by lookup service)

The `leads` table stores:
- `maps_address` - Full Google Maps URL (imported from scraper)
- All other fields same as scraped_businesses

## Notes

- The scraping logic was already correct - it was extracting the full Google Maps URL
- The Excel export was already correct - it was including the maps_address field
- The bug was in the scraper page not passing the website field when exporting to leads
- The ViewAllResults component wasn't displaying the website field
- Now all three issues are fixed: display, export, and leads import

## Deployment

After testing locally:
1. Commit changes
2. Push to repository
3. Deploy to VPS
4. Test on production environment
5. Verify existing scraped data in database has maps_address populated

## Related Files

- `lib/scraper/industry-scraper.ts` - Main industry scraping logic
- `lib/scraper/business-lookup-scraper.ts` - Business lookup scraping logic
- `lib/scraper/types.ts` - Type definitions
- `lib/scraper/scraper-service.ts` - Database saving logic
- `lib/scraper/excel-export.ts` - Excel export with hyperlinks
- `app/api/scraper/sessions/[id]/businesses/route.ts` - API for retrieving businesses
- `app/api/leads/import/scraper-direct/route.ts` - API for importing to leads
- `app/scraper/page.tsx` - Scraper page with export to leads
- `components/scraper/ViewAllResults.tsx` - Display component

---

**Status**: ✅ COMPLETE - Ready for testing
**Date**: January 27, 2026
