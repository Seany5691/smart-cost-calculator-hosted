# Troubleshooting: Date Signed Showing Today's Date

## Issue
The date signed is showing today's date instead of the date selected in the modal.

## Root Cause
The `dateSigned` column likely hasn't been added to the database yet, so the value isn't being saved.

## Solution Steps

### Step 1: Verify Column Exists
Run this query in Supabase SQL Editor:

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'leads' AND column_name = 'dateSigned';
```

**Expected Result:**
- If column exists: You'll see one row with `dateSigned`, `date`, `YES`
- If column doesn't exist: No rows returned

### Step 2: Add the Column (if it doesn't exist)
Run the migration file `add-date-signed-column.sql` in Supabase SQL Editor:

```sql
-- Add dateSigned column
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS "dateSigned" DATE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_leads_date_signed 
ON leads("dateSigned") 
WHERE "dateSigned" IS NOT NULL;

-- Add comment
COMMENT ON COLUMN leads."dateSigned" 
IS 'Date when the lead was successfully signed (converted)';
```

### Step 3: Verify the Column Was Added
Run this query:

```sql
SELECT 
    id,
    name,
    status,
    "dateSigned",
    "updatedAt"
FROM leads
WHERE status = 'signed'
LIMIT 5;
```

You should now see the `dateSigned` column in the results.

### Step 4: Test the Feature
1. Open the app and go to any lead
2. Change its status to "Signed"
3. The modal should appear
4. Select a date (e.g., 3 days ago)
5. Click "Mark as Signed"
6. The lead card should now show the selected date

### Step 5: Check Browser Console
Open browser DevTools (F12) and check the Console tab for these logs:

```
[SignedModal] Confirming with dateSigned: 2024-01-15
[changeLeadStatus] Setting dateSigned to: 2024-01-15
[changeLeadStatus] Updates to apply: { status: 'signed', number: 1, updatedAt: '...', dateSigned: '2024-01-15' }
[changeLeadStatus] Lead updated successfully
[transformLeadFromDb] Signed lead: { name: 'Test Lead', dateSigned: '2024-01-15', ... }
```

## Common Issues

### Issue 1: Column Doesn't Exist
**Symptom:** No error, but date isn't saved
**Solution:** Run the migration (Step 2)

### Issue 2: Permission Error
**Symptom:** Error in console about permissions
**Solution:** Check RLS policies allow updates to the dateSigned column

### Issue 3: Date Format Error
**Symptom:** Error about invalid date format
**Solution:** The date should be in YYYY-MM-DD format (ISO date string)

### Issue 4: Caching Issue
**Symptom:** Old data still showing
**Solution:** 
1. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Check if the database actually has the new value

## Verification Queries

### Check if a specific lead has dateSigned
```sql
SELECT 
    id,
    name,
    status,
    "dateSigned",
    "updatedAt"
FROM leads
WHERE id = 'YOUR_LEAD_ID_HERE';
```

### Update an existing signed lead manually (for testing)
```sql
UPDATE leads
SET "dateSigned" = '2024-01-15'
WHERE id = 'YOUR_LEAD_ID_HERE'
AND status = 'signed';
```

### Check all signed leads with dates
```sql
SELECT 
    name,
    status,
    "dateSigned",
    "updatedAt"
FROM leads
WHERE status = 'signed'
ORDER BY "dateSigned" DESC NULLS LAST;
```

## Debug Mode

The code now includes console logging. To see what's happening:

1. Open browser DevTools (F12)
2. Go to Console tab
3. Filter by "SignedModal" or "changeLeadStatus"
4. Try marking a lead as signed
5. Watch the logs to see what values are being passed

## Expected Behavior

1. **When marking a lead as signed:**
   - Modal appears
   - User selects date (e.g., 10/01/2024)
   - Date is saved to database as '2024-01-10'
   - Lead card shows "Signed: 10/01/2024"

2. **For existing signed leads (before feature):**
   - Shows updated_at date with note "(using last updated date)"
   - Can be updated by moving to another status and back to signed

3. **When moving away from signed:**
   - dateSigned is cleared (set to null)
   - Note remains in lead history
