# Scraper Excel Export Fix - Complete

## Issue Summary
The scraper Excel export was not matching the old app's structure:
1. **Column Order**: New app had different column order than old app
2. **Maps URL Display**: New app showed "View on Maps" text instead of the actual URL
3. **Missing Export Route**: The `/api/export/excel` route didn't exist

## Changes Made

### 1. Fixed Excel Export Structure (`lib/scraper/excel-export.ts`)

#### Column Order
Changed from:
```
Name, Phone, Address, Town, Type of Business, Maps Link
```

To match old app:
```
maps_address, Name, Phone, Provider, Address, Type of Business, Town
```

#### Maps URL Display
**Before:**
- Displayed "View on Maps" as text
- URL was only in the hyperlink

**After:**
- Displays the actual Google Maps URL in the cell
- URL is also clickable as a hyperlink
- This matches the old app behavior and allows the URL to be used for:
  - Route generation
  - "Open in Maps" buttons on leads
  - Direct copying/pasting

#### Code Changes
```typescript
// Header row - now matches old app column order
worksheet.columns = [
  { header: 'maps_address', key: 'maps_address', width: 50 },
  { header: 'Name', key: 'name', width: 30 },
  { header: 'Phone', key: 'phone', width: 15 },
  { header: 'Provider', key: 'provider', width: 20 },
  { header: 'Address', key: 'address', width: 40 },
  { header: 'Type of Business', key: 'type_of_business', width: 25 },
  { header: 'Town', key: 'town', width: 20 },
];

// Data rows - now show actual URL
const row = worksheet.addRow({
  maps_address: business.maps_address || '',
  name: business.name,
  phone: business.phone || 'N/A',
  provider: business.provider || 'Unknown',
  address: business.address,
  type_of_business: business.type_of_business,
  town: business.town,
});

// Make URL clickable while showing the actual URL
if (business.maps_address) {
  const cell = row.getCell('maps_address');
  cell.value = {
    text: business.maps_address,  // Shows actual URL
    hyperlink: business.maps_address,  // Makes it clickable
  };
  cell.font = { color: { argb: 'FF0000FF' }, underline: true };
}
```

### 2. Created Missing Export Route (`app/api/export/excel/route.ts`)

Created the `/api/export/excel` route that was being called by the `ProviderExport` component but didn't exist.

**Features:**
- Accepts businesses array and filename
- Uses the same `exportToExcel` function for consistency
- Returns Excel file as downloadable attachment
- Includes authentication via `withAuth` middleware

### 3. Export Functionality

The scraper now supports two export methods:

#### A. Main Export (All Businesses)
- Exports all scraped businesses from a session
- Groups by provider in separate worksheets
- Includes summary worksheet with provider counts
- Route: `/api/scraper/export`

#### B. Provider-Filtered Export
- Allows selecting specific providers to export
- Used by the `ProviderExport` component
- Route: `/api/export/excel`

## Excel File Structure

### Worksheets
1. **Summary** (first sheet)
   - Lists all providers with business counts
   - Shows total count

2. **Provider Sheets** (one per provider)
   - Sorted by provider priority (Telkom, Vodacom, MTN, Cell C, Other)
   - Each sheet contains businesses for that provider

### Columns (in order)
1. **maps_address** - Full Google Maps URL (clickable)
2. **Name** - Business name
3. **Phone** - Phone number
4. **Provider** - Telecom provider
5. **Address** - Physical address
6. **Type of Business** - Industry/category
7. **Town** - Town/city

### Features
- Auto-filter enabled on all columns
- Header row frozen for scrolling
- Alternating row colors for readability
- Blue underlined hyperlinks for maps URLs
- Provider-based organization

## Testing

To verify the fix:

1. **Run a scrape session**
   ```
   - Go to /scraper
   - Enter towns and industries
   - Start scraping
   ```

2. **Export all businesses**
   ```
   - Click "Export to Excel" button
   - Check that Excel file has correct column order
   - Verify maps_address shows actual URL (not "View on Maps")
   - Click the URL to verify it's clickable
   ```

3. **Export by provider**
   ```
   - Select one or more providers
   - Click "Export to Excel"
   - Verify filtered export works correctly
   ```

4. **Verify URL usage**
   ```
   - Import scraped businesses to leads
   - Check that "Open in Maps" button works
   - Generate routes and verify maps URLs are used correctly
   ```

## Benefits

1. **Consistency**: Matches old app's Excel structure exactly
2. **Usability**: URLs are visible and can be copied/pasted
3. **Functionality**: URLs work correctly for routes and map buttons
4. **Organization**: Provider-based worksheets for easy filtering
5. **Professional**: Clean formatting with hyperlinks and styling

## Files Modified

1. `hosted-smart-cost-calculator/lib/scraper/excel-export.ts`
   - Fixed column order
   - Changed maps URL display from "View on Maps" to actual URL
   - Updated auto-filter range

2. `hosted-smart-cost-calculator/app/api/export/excel/route.ts` (NEW)
   - Created missing export route
   - Handles provider-filtered exports

## Notes

- The scraper correctly extracts Google Maps URLs during scraping
- The URLs are stored in the database with the `maps_address` field
- The Excel export now properly displays these URLs
- All existing functionality (routes, map buttons, imports) will work correctly
