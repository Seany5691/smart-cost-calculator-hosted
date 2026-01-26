# Scraper UI Real-Time Updates & Auto-Export Fix

## Problem
The scraper backend was working correctly (scraping businesses and performing provider lookups), but:
1. The UI was not displaying real-time progress updates
2. The scraped businesses were not appearing in the results table
3. The Excel file was not auto-downloading when scraping completed

## Root Cause
The backend `ScrapingOrchestrator` emits events via Node.js `EventEmitter`, but these events were only available in the server-side context. The frontend had no mechanism to receive these events in real-time.

## Solution

### 1. Server-Sent Events (SSE) Endpoint
Created `/api/scraper/status/[sessionId]/stream/route.ts` that:
- Connects to the backend EventEmitter for a specific session
- Streams events to the frontend in real-time using SSE
- Handles `progress`, `complete`, `log`, and `error` events

### 2. Frontend SSE Hook
Created `hooks/useScraperSSE.ts` that:
- Establishes an EventSource connection to the SSE endpoint
- Listens for events and updates the Zustand store accordingly
- Handles connection errors and cleanup

### 3. Auto-Export Hook
Created `hooks/useAutoExport.ts` that:
- Monitors the scraping status
- Automatically triggers Excel export when scraping completes
- Downloads the file to the user's browser

### 4. Export API Endpoint
Created `/api/scraper/export/route.ts` that:
- Accepts scraped businesses data
- Generates an Excel file using the existing `ExcelExporter`
- Returns the file as a downloadable response

### 5. Updated Scraper Page
Modified `app/scraper/page.tsx` to:
- Use the `useScraperSSE` hook to receive real-time updates
- Use the `useAutoExport` hook to auto-download results
- Update the export handler to use the new endpoint

## How It Works

### Flow Diagram
```
Backend (Orchestrator)
  ↓ emits events
EventEmitter
  ↓ streamed via
SSE Endpoint (/api/scraper/status/[sessionId]/stream)
  ↓ consumed by
Frontend (useScraperSSE hook)
  ↓ updates
Zustand Store
  ↓ triggers
UI Updates + Auto-Export
```

### Event Types
1. **connected** - Initial connection established
2. **progress** - Progress updates (towns completed, businesses scraped)
3. **complete** - Scraping finished with all results
4. **log** - Log messages for the activity viewer
5. **error** - Error messages

### Auto-Export Trigger
When the status changes from `running` to `completed` or `stopped`, and businesses exist:
1. The `useAutoExport` hook detects the status change
2. It calls `/api/scraper/export` with the businesses data
3. The Excel file is generated and downloaded automatically

## Files Created
- `app/api/scraper/status/[sessionId]/stream/route.ts` - SSE endpoint
- `app/api/scraper/export/route.ts` - Export endpoint
- `hooks/useScraperSSE.ts` - SSE connection hook
- `hooks/useAutoExport.ts` - Auto-export hook

## Files Modified
- `app/scraper/page.tsx` - Added hooks and updated export handler
- `lib/store/scraper.ts` - Improved addBusinesses to avoid duplicates

## Testing
1. Start a scraping session with towns and industries
2. Observe real-time progress updates in the UI
3. See businesses appear in the results table as they're scraped
4. Verify Excel file auto-downloads when scraping completes
5. Check that the activity log shows all events

## Benefits
- ✅ Real-time UI updates without polling
- ✅ Efficient SSE connection (one-way server-to-client)
- ✅ Automatic Excel export on completion
- ✅ Better user experience with live feedback
- ✅ No duplicate businesses in results
