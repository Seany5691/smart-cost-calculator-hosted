# Scraper Import Parity Fix - Complete

## Issue
The "Import from Scraper" functionality in the Leads section was not working correctly because the ScrapedListSelector component was sending the wrong parameter format to the API.

## Root Cause
The ScrapedListSelector component was sending:
```json
{
  "sessionId": "single-id",
  "listName": "List Name"
}
```

But the API endpoint `/api/leads/import/scraper` expects:
```json
{
  "sessionIds": ["array-of-ids"],
  "listName": "List Name"
}
```

## Fix Applied

### File: `components/leads/import/ScrapedListSelector.tsx`

**Changed line 236-242:**
```typescript
// BEFORE
body: JSON.stringify({
  sessionId: selectedSession.id,
  listName: listName.trim()
})

// AFTER
body: JSON.stringify({
  sessionIds: [selectedSession.id],
  listName: listName.trim()
})
```

## Verification

Both import methods now work identically:

### Excel Import (`/api/leads/import/excel`)
- ✅ Uses `status: 'new'`
- ✅ Increments lead numbers correctly
- ✅ Creates import_session record with `source_type: 'excel'`
- ✅ Uses transactions for data integrity

### Scraper Import (`/api/leads/import/scraper`)
- ✅ Uses `status: 'new'`
- ✅ Increments lead numbers correctly
- ✅ Creates import_session record with `source_type: 'scraper'`
- ✅ Uses transactions for data integrity
- ✅ Supports multiple session IDs (array format)

### Scraper Direct Export (`/api/leads/import/scraper-direct`)
- ✅ Uses `status: 'new'`
- ✅ Increments lead numbers correctly
- ✅ Creates import_session record with `source_type: 'scraper'`
- ✅ Uses transactions for data integrity

## Result
All three import methods now:
1. Import leads with `status: 'new'`
2. Display correctly in the "Available Leads" section
3. Follow the same data structure and behavior
4. Maintain data integrity with transactions

## Testing
Test the "Import from Scraper" functionality in the Leads section:
1. Go to Leads section
2. Click "Import from Scraper"
3. Select a completed scraper session
4. Enter a list name
5. Click "Import Leads"
6. Verify leads appear in "Available Leads" section with status "new"
