# Scraper Export Status Fix - COMPLETE

## Issue
Scraped leads were being inserted into the database successfully, but they weren't showing up in the "Available Leads" section of the leads page.

## Root Cause
The scraper export was using `status: 'leads'` when inserting leads, but the Excel import (and the leads UI) uses `status: 'new'`. 

When viewing the leads page, it filters by `status = 'new'` by default, so leads with `status = 'leads'` were being filtered out.

### Evidence from Logs
```
[SCRAPER-DIRECT] Inserting lead 1: { name: 'PharmaCity', list_name: 'Scraped Leads3', status: 'leads' }
[SCRAPER-DIRECT] Successfully inserted lead: { id: '...', name: 'PharmaCity', list_name: 'Scraped Leads3' }
```

But when querying:
```
[LEADS-GET] Query: SELECT * FROM leads WHERE user_id = $1 AND status = ANY($2) AND list_name = $3
[LEADS-GET] Params: [ 'user-id', [ 'new' ], 'Scraped Leads3' ]
```

The query was looking for `status = 'new'` but the leads had `status = 'leads'`.

## Solution
Changed the scraper export to use `status: 'new'` to match the Excel import behavior.

### Before:
```typescript
const leadData: any = {
  userId: decoded.userId,
  number: currentNumber,
  status: 'leads',  // ❌ Wrong status
  listName: listName.trim(),
  // ...
};
```

### After:
```typescript
const leadData: any = {
  userId: decoded.userId,
  number: currentNumber,
  status: 'new',  // ✅ Correct status
  listName: listName.trim(),
  // ...
};
```

## Files Changed
- `hosted-smart-cost-calculator/app/api/leads/import/scraper-direct/route.ts`
  - Changed `status: 'leads'` to `status: 'new'`

## Testing
1. Export businesses from scraper
2. Go to leads page
3. Leads should now appear in the "Available Leads" section
4. Selecting the list from "Manage Lists" should show all the scraped leads

## Status Values in the System
The leads system uses these status values:
- `'new'` - Newly imported leads (default for imports)
- `'working'` - Leads being actively worked on
- `'later'` - Leads to follow up with later
- `'signed'` - Leads that have been converted to customers
- `'bad'` - Leads that are not viable

The scraper export now correctly uses `'new'` status, matching the Excel import behavior.
