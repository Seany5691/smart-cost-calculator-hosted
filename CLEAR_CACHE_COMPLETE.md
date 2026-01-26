# Complete Cache Clearing Guide

## Issue
The "Later Stage" tab is showing leads with "Bad" status in the dropdown. This is a browser cache issue - you're seeing old data that hasn't been refreshed.

## Solution: Complete Cache Clear

### Step 1: Clear Browser Cache (CRITICAL)
1. Press `Ctrl + Shift + Delete` (or `Cmd + Shift + Delete` on Mac)
2. Select **"All time"** or **"Everything"**
3. Make sure these are checked:
   - ✅ Cached images and files
   - ✅ Cookies and other site data
   - ✅ Browsing history (optional but recommended)
4. Click **"Clear data"**

### Step 2: Hard Refresh the Page
After clearing cache:
1. Press `Ctrl + Shift + R` (or `Cmd + Shift + R` on Mac)
2. Or press `Ctrl + F5`
3. This forces a complete page reload without cache

### Step 3: Verify Database (Optional)
If the issue persists, check what's actually in the database:

1. Open your PostgreSQL client (pgAdmin, DBeaver, or psql)
2. Run the queries in `CHECK_LEAD_STATUS.sql`
3. This will show you the actual status of leads in the database

## Why This Happens

### Browser Caching
- Browsers cache API responses to improve performance
- When you change a lead's status, the browser may still show old cached data
- The dropdown shows the cached status, not the current database status

### Service Workers
- Next.js may use service workers that cache data
- These need to be cleared along with browser cache

### Local Storage
- The app stores some data in localStorage
- This can become stale if not properly updated

## Prevention

### For Development:
1. **Disable Cache in DevTools**:
   - Open DevTools (F12)
   - Go to Network tab
   - Check "Disable cache"
   - Keep DevTools open while developing

2. **Use Incognito/Private Mode**:
   - No cache or cookies
   - Fresh session every time
   - Good for testing

### For Production:
The app should handle cache invalidation automatically, but if you see stale data:
1. Hard refresh (Ctrl + Shift + R)
2. Clear browser cache
3. Close and reopen the browser

## Troubleshooting

### If Leads Still Show Wrong Status:

#### Check 1: Verify Database
```sql
-- Run this in PostgreSQL
SELECT id, name, status FROM leads WHERE status = 'later';
```

If this returns leads, but they show as "bad" in the UI, it's definitely a cache issue.

#### Check 2: Check Network Tab
1. Open DevTools (F12)
2. Go to Network tab
3. Refresh the page
4. Look for the `/api/leads?status=later` request
5. Click on it and check the Response
6. Verify the leads have `status: "later"` in the response

If the API returns correct data but UI shows wrong data, it's a frontend cache issue.

#### Check 3: Clear All Storage
1. Open DevTools (F12)
2. Go to Application tab (Chrome) or Storage tab (Firefox)
3. Click "Clear site data" or "Clear storage"
4. Refresh the page

## Quick Fix Commands

### Clear Next.js Cache
```bash
cd hosted-smart-cost-calculator
rmdir /s /q .next
npm run dev
```

### Clear Browser Cache (Windows)
```
Ctrl + Shift + Delete
```

### Hard Refresh (Windows)
```
Ctrl + Shift + R
or
Ctrl + F5
```

## Expected Behavior After Cache Clear

### Later Stage Tab Should Show:
- Leads with `status = 'later'`
- Dropdown showing "Later" (orange badge)
- Callback dates displayed
- Only leads scheduled for future follow-up

### Bad Leads Tab Should Show:
- Leads with `status = 'bad'`
- Dropdown showing "Bad" (red badge)
- No callback dates
- Only leads marked as bad

## If Problem Persists

If after clearing all caches the issue still occurs:

1. **Check the database directly** using `CHECK_LEAD_STATUS.sql`
2. **Verify the API response** in Network tab
3. **Check for JavaScript errors** in Console tab
4. **Try a different browser** to rule out browser-specific issues

## Contact

If none of these steps work, there may be a deeper issue with:
- Database query logic
- API filtering
- Frontend state management

In that case, we'll need to investigate the specific leads that are showing incorrectly.
