# Scraper Export to Leads - Debug Guide

## Issue
The list name appears in the dropdown after scraper export, but when selecting the list, no leads are displayed.

## Root Cause Analysis

### What We Know
1. ✅ The export API is being called successfully
2. ✅ The list name appears in the dropdown (meaning leads ARE being inserted)
3. ❌ When filtering by list name, no leads are displayed

### Potential Issues

#### 1. SQL Parameter Bug (MOST LIKELY)
The `/api/leads` GET endpoint has a bug in the SQL query construction:

```typescript
// WRONG - Missing $ prefix for SQL parameter
query += ` AND list_name = ${paramIndex}`;

// CORRECT - Should be:
query += ` AND list_name = $${paramIndex}`;
```

This would cause the query to be:
```sql
-- WRONG
SELECT * FROM leads WHERE user_id = $1 AND list_name = 4

-- CORRECT
SELECT * FROM leads WHERE user_id = $1 AND list_name = $4
```

The wrong version would try to compare `list_name` to the number `4` instead of the 4th parameter value.

#### 2. List Name Mismatch
- Whitespace differences (leading/trailing spaces)
- Case sensitivity
- Special characters

#### 3. Data Not Being Inserted
- Transaction rollback
- Silent INSERT failure
- Wrong table being queried

## Debug Steps

### Step 1: Check Server Logs
After exporting from scraper, check the terminal running `npm run dev` for console logs:

```
[SCRAPER-DIRECT] Received request: { businessCount: X, listName: 'Your List Name', ... }
[SCRAPER-DIRECT] Starting lead import...
[SCRAPER-DIRECT] List name to use: 'Your List Name'
[SCRAPER-DIRECT] Inserting lead 1: { name: '...', list_name: '...', status: 'leads' }
[SCRAPER-DIRECT] Successfully inserted lead: { id: '...', name: '...', list_name: '...' }
[SCRAPER-DIRECT] Import complete: { imported: X, skipped: 0, errors: 0 }
```

Then when you select the list in the leads page:
```
[LEADS-GET] Filtering by list_name: 'Your List Name'
[LEADS-GET] Query: SELECT * FROM leads WHERE user_id = $1 AND list_name = $4
[LEADS-GET] Params: [ 'user-id', 'Your List Name' ]
```

### Step 2: Run SQL Diagnostics
Run the queries in `DIAGNOSE_SCRAPER_EXPORT.sql` to check:
1. If leads were actually inserted
2. What list names exist in the database
3. If there are whitespace or encoding issues

### Step 3: Test Direct SQL Query
In your PostgreSQL client, run:

```sql
-- Replace with your actual user_id and list_name
SELECT * FROM leads 
WHERE user_id = 'your-user-id' 
AND list_name = 'Your List Name';
```

If this returns results, the data is there and it's a query construction bug.
If this returns no results, the data wasn't inserted properly.

### Step 4: Check for SQL Injection in Query Construction
The bug is likely in how the SQL query is being built. Check if the parameter placeholders are correct:

```typescript
// Check all these lines in /api/leads/route.ts
query += ` AND status = ANY($${paramIndex})`;     // ✅ Correct
query += ` AND provider = ANY($${paramIndex})`;   // ✅ Correct
query += ` AND town = ANY($${paramIndex})`;       // ✅ Correct
query += ` AND list_name = $${paramIndex}`;       // ❌ Check this one!
```

## Fix

### Option 1: Fix the SQL Parameter Bug
In `hosted-smart-cost-calculator/app/api/leads/route.ts`, change:

```typescript
if (listName) {
  query += ` AND list_name = $${paramIndex}`;  // Add $ prefix
  params.push(listName);
  paramIndex++;
}
```

### Option 2: Use Parameterized Query Properly
Ensure all SQL parameters use the `$N` format where N is the parameter index.

## Testing
After applying the fix:

1. Export businesses from scraper with a new list name
2. Go to leads page
3. Open "Manage Lists" dropdown
4. Select the list
5. Verify leads are displayed

## Additional Logging
I've added extensive logging to both endpoints:
- `/api/leads/import/scraper-direct` - Logs each lead insertion
- `/api/leads` - Logs the query and parameters when filtering

Check your server console for these logs to diagnose the issue.
