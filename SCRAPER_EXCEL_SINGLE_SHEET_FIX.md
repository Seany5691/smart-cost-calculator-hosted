# Scraper Excel Export - Single Sheet Fix ✅

## Issue
The main scraper export was creating multiple sheets (one per provider) plus a summary sheet. This was confusing because:
- Users expected a single sheet with all scraped businesses
- The "Export by Provider" feature exists specifically for provider-based exports
- Having multiple sheets by default made it harder to import to leads

## Solution

### 1. Main Export - Single Sheet
The default scraper export now creates **ONE sheet** with all businesses:
- Sheet name: "All Businesses"
- Contains all scraped businesses sorted by provider priority
- No summary sheet
- No provider-based sheets

### 2. Export by Provider - Multiple Sheets
The "Export by Provider" feature creates provider-based sheets:
- Summary sheet (first) with provider counts
- One sheet per selected provider
- Each sheet contains only businesses from that provider

## Changes Made

### File: `lib/scraper/excel-export.ts`

**1. Updated `exportToExcel()` function:**
- Removed provider grouping logic
- Creates single "All Businesses" worksheet
- Adds all businesses to one sheet
- Sorted by provider priority (Telkom, Vodacom, MTN, Cell C, Other)

**2. Created new `exportToExcelByProvider()` function:**
- Handles provider-based exports
- Groups businesses by provider
- Creates one sheet per provider
- Includes summary sheet
- Used only by "Export by Provider" feature

### File: `components/scraper/ProviderExport.tsx`
- Added `byProvider: true` flag to API request
- Signals that provider-based export should be used

### File: `app/api/export/excel/route.ts`
- Checks `byProvider` flag in request
- Uses `exportToExcelByProvider()` when flag is true
- Uses `exportToExcel()` (single sheet) when flag is false

## Excel File Structure

### Main Export (Default)
```
📄 All Businesses
   ├─ maps_address (Google Maps URLs)
   ├─ Name
   ├─ Phone
   ├─ Provider (Telkom, Vodacom, MTN, etc.)
   ├─ Address
   ├─ Type of Business
   └─ Town
```

**Features:**
- Single sheet with all businesses
- Sorted by provider priority
- Auto-filter enabled
- Frozen header row
- Alternating row colors
- Clickable maps URLs

### Export by Provider
```
📄 Summary
   ├─ Provider counts
   └─ Total count

📄 Telkom
   └─ Telkom businesses only

📄 Vodacom
   └─ Vodacom businesses only

📄 MTN
   └─ MTN businesses only

📄 Cell C
   └─ Cell C businesses only

📄 Other
   └─ Other businesses
```

## Usage

### Main Export (Single Sheet)
1. Complete a scraping session
2. Click "Export to Excel" button
3. Excel file downloads with ONE sheet containing all businesses
4. Perfect for importing to leads

### Export by Provider (Multiple Sheets)
1. Complete a scraping session
2. Scroll to "Export by Provider" section
3. Select one or more providers
4. Click "Export to Excel"
5. Excel file downloads with separate sheets per provider
6. Includes summary sheet

## Benefits

1. **Clearer Purpose**: Main export is simple and straightforward
2. **Easy Import**: Single sheet makes importing to leads seamless
3. **Provider Filtering**: Dedicated feature for provider-based exports
4. **Matches Old App**: Single sheet export matches old app behavior
5. **Flexibility**: Both export types available when needed

## Testing

### Test Main Export
1. Run a scraping session
2. Click main "Export to Excel" button
3. Verify:
   - ✅ Only ONE sheet named "All Businesses"
   - ✅ All scraped businesses are present
   - ✅ Sorted by provider (Telkom first, then Vodacom, etc.)
   - ✅ Maps URLs are visible and clickable
   - ✅ Can import directly to leads

### Test Provider Export
1. Complete a scraping session
2. Go to "Export by Provider" section
3. Select 2-3 providers
4. Click "Export to Excel"
5. Verify:
   - ✅ Summary sheet is first
   - ✅ One sheet per selected provider
   - ✅ Each sheet has only that provider's businesses
   - ✅ Maps URLs are visible and clickable

## Files Modified

1. **`lib/scraper/excel-export.ts`**
   - Modified `exportToExcel()` to create single sheet
   - Added `exportToExcelByProvider()` for provider-based exports

2. **`components/scraper/ProviderExport.tsx`**
   - Added `byProvider: true` flag to request

3. **`app/api/export/excel/route.ts`**
   - Added logic to choose export function based on `byProvider` flag

## Migration Notes

- Existing code that calls `exportToExcel()` will now get single sheet
- Provider-based exports require using `exportToExcelByProvider()`
- The API route handles both cases automatically based on the flag
- No breaking changes to existing functionality
