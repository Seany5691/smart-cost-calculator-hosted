# CRITICAL: Dev Server Must Be Restarted

## Issue
The UUID casting fixes have been applied to the code, but the dev server is still running the OLD code from before the fixes.

## Evidence
The terminal logs show:
```
[LEADS-GET] Query: SELECT * FROM leads WHERE user_id = $1::uuid
[LEADS-GET] Params: [ 'bc812912-c191-4dc4-ae5e-bde877035c3d' ]
Error fetching leads: error: operator does not exist: uuid = character varying
```

The query SHOWS `::uuid` in the console log, which means the fix is partially there, but the error is still happening. This indicates the server is running a mix of old and new code.

## Root Cause
Next.js dev server caches compiled modules. Even though the source files have been updated with UUID casts, the server is still executing the old compiled code.

## Solution
**YOU MUST COMPLETELY STOP AND RESTART THE DEV SERVER**

### Step 1: Stop the Server
1. Go to the terminal running `npm run dev`
2. Press `Ctrl+C` to stop it
3. Wait for it to fully stop (you should see the command prompt return)

### Step 2: Clear Next.js Cache (IMPORTANT!)
Run this command:
```bash
cd hosted-smart-cost-calculator
rmdir /s /q .next
```

### Step 3: Restart the Server
```bash
npm run dev
```

### Step 4: Hard Refresh Browser
1. Open the browser
2. Press `Ctrl+Shift+R` (or `Ctrl+F5`) to hard refresh
3. Clear browser cache if needed

## What Was Fixed
17 API route files were updated with UUID casts:
- `app/api/leads/route.ts` - Main leads query
- `app/api/leads/[id]/notes/route.ts` - Notes access checks
- `app/api/leads/[id]/reminders/route.ts` - Reminders access checks
- `app/api/leads/[id]/share/route.ts` - All sharing queries
- `app/api/leads/share-notifications/route.ts` - Notifications
- Plus 12 more import, route, list, bulk, and stats files

## Expected Result After Restart
1. ✅ Leads should load without errors
2. ✅ No more "operator does not exist: uuid = character varying" errors
3. ✅ Shared leads will appear for shared users
4. ✅ All lead functionality will work

## If Error Persists After Restart
If you still see the error after a complete restart:
1. Check that you're in the correct directory: `hosted-smart-cost-calculator`
2. Verify the `.next` folder was deleted
3. Check that no other terminal is running `npm run dev`
4. Try restarting your IDE/editor
5. Check the file `app/api/leads/route.ts` line 51 - it should show `WHERE user_id = $1::uuid`

## DO NOT PROCEED WITHOUT RESTARTING
The fixes are in the code, but they won't take effect until the server is restarted!
