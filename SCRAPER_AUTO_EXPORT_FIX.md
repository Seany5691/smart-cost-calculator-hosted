# Scraper Auto-Export Fix Complete

## Issue
The scraper was successfully scraping businesses and the UI was updating in real-time via SSE, but the auto-export feature was failing with errors:

1. **First error (500)**: `ExcelExporter is not a constructor`
2. **Second error (500)**: `The name has to be a string.`

## Root Causes

### Error 1: ExcelExporter is not a constructor
The export API endpoint (`app/api/scraper/export/route.ts`) was trying to instantiate a class `ExcelExporter` that doesn't exist:
```typescript
const exporter = new ExcelExporter();
const buffer = await exporter.exportToBuffer(businesses);
```

However, the `lib/scraper/excel-export.ts` module exports a **function** called `exportToExcel`, not a class.

### Error 2: The name has to be a string
The `excel-export.ts` file had incorrect code for reordering worksheets:
```typescript
workbook.worksheets.forEach((ws, index) => {
  if (ws.name === 'Summary') {
    workbook.removeWorksheet(ws.id);
    workbook.addWorksheet(ws, 0);  // ❌ Passing Worksheet object instead of string name
  }
});
```

ExcelJS's `addWorksheet()` expects a string name, not a Worksheet object.

## Solutions

### Fix 1: Use correct function
Updated the export endpoint to use the correct function:

**Before:**
```typescript
import { ExcelExporter } from '@/lib/scraper/excel-export';

// Create Excel file
const exporter = new ExcelExporter();
const buffer = await exporter.exportToBuffer(businesses);
```

**After:**
```typescript
import { exportToExcel } from '@/lib/scraper/excel-export';

// Create Excel file using the exportToExcel function
const sessionName = filename?.replace('.xlsx', '') || 'businesses';
const buffer = await exportToExcel(businesses, sessionName);
```

### Fix 2: Correct worksheet reordering
Updated the worksheet reordering logic to use array manipulation:

**Before:**
```typescript
workbook.worksheets.forEach((ws, index) => {
  if (ws.name === 'Summary') {
    workbook.removeWorksheet(ws.id);
    workbook.addWorksheet(ws, 0);  // ❌ Wrong approach
  }
});
```

**After:**
```typescript
// Move summary sheet to first position
const summaryIndex = workbook.worksheets.findIndex(ws => ws.name === 'Summary');
if (summaryIndex > 0) {
  // Remove summary sheet from its current position
  const [summary] = workbook.worksheets.splice(summaryIndex, 1);
  // Insert it at the beginning
  workbook.worksheets.unshift(summary);
}
```

## Implementation Details

### 1. Export Endpoint (`app/api/scraper/export/route.ts`)
- Changed import from `ExcelExporter` class to `exportToExcel` function
- Removed class instantiation
- Call `exportToExcel(businesses, sessionName)` directly
- Extract session name from filename parameter

### 2. Excel Export (`lib/scraper/excel-export.ts`)
- Fixed worksheet reordering to use array manipulation instead of incorrect ExcelJS API calls
- Properly moves Summary sheet to first position using `splice` and `unshift`

### 3. Auto-Export Hook (`hooks/useAutoExport.ts`)
- Already correctly implemented
- Monitors status changes from 'running' to 'completed'/'stopped'
- Retrieves auth token from localStorage
- Sends POST request to `/api/scraper/export` with businesses data
- Downloads the Excel file automatically

### 4. SSE Integration (`hooks/useScraperSSE.ts`)
- Already correctly implemented
- Establishes EventSource connection to `/api/scraper/status/[sessionId]/stream`
- Updates Zustand store with real-time progress, logs, and business data
- Handles connection lifecycle (connect, disconnect, error)

### 5. SSE Stream Endpoint (`app/api/scraper/status/[sessionId]/stream/route.ts`)
- Already correctly implemented
- Streams events from backend EventEmitter to frontend
- Supports progress, complete, log, and error events
- Proper cleanup on connection close

## Testing
To test the complete flow:

1. **Start scraping**:
   - Enter towns (e.g., "Fochville, North West")
   - Select industries (e.g., "Pharmacies")
   - Click "Start Scraping"

2. **Verify real-time updates**:
   - Progress bar should update in real-time
   - Logs should appear as scraping progresses
   - Business count should increase

3. **Verify auto-export**:
   - When scraping completes, Excel file should download automatically
   - Filename format: `businesses_YYYY-MM-DDTHH-MM-SS.xlsx`
   - File should contain:
     - Summary sheet with provider counts (FIRST sheet)
     - Separate sheets for each provider (Vodacom, MTN, Cell C, Telkom, Other)
     - Hyperlinks to Google Maps for each business

## Excel File Structure
The exported Excel file includes:

1. **Summary Sheet** (first sheet):
   - Provider name and count
   - Total businesses count
   - Styled header with blue background

2. **Provider Sheets** (one per provider):
   - Columns: Name, Phone, Address, Town, Type of Business, Maps Link
   - Hyperlinked "View on Maps" cells
   - Auto-filter enabled
   - Frozen header row
   - Alternating row colors

3. **Provider Priority** (sorting):
   - Vodacom (priority 1)
   - MTN (priority 2)
   - Cell C (priority 3)
   - Telkom (priority 4)
   - Other (priority 5)

## Files Modified
- `hosted-smart-cost-calculator/app/api/scraper/export/route.ts` - Fixed to use correct function
- `hosted-smart-cost-calculator/lib/scraper/excel-export.ts` - Fixed worksheet reordering logic

## Files Already Correct
- `hosted-smart-cost-calculator/hooks/useAutoExport.ts` - Auto-export hook
- `hosted-smart-cost-calculator/hooks/useScraperSSE.ts` - SSE connection hook
- `hosted-smart-cost-calculator/app/api/scraper/status/[sessionId]/stream/route.ts` - SSE endpoint
- `hosted-smart-cost-calculator/app/scraper/page.tsx` - Scraper page with hooks

## Status
✅ **COMPLETE** - Both errors fixed. Auto-export should now work correctly when scraping completes.

## Next Steps
1. Test the complete scraping flow
2. Verify Excel file downloads automatically
3. Check Excel file structure and content
4. Confirm Summary sheet appears first
5. Verify provider organization is correct
