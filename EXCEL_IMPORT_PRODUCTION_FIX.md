# Excel Import Production Fix - Stale Build Cache Issue

## Problem Identified

The Excel import is failing on production VPS with error: `relation "hardware" does not exist`

**Root Cause**: The production `.next` build directory contains stale/cached code from an older version. The error stack trace shows:
```
at async s (/app/.next/server/app/api/health/route.js:1:2037)
```

This indicates the bundled production code is outdated and needs to be rebuilt.

## Solution: Rebuild Production App

### Option 1: Quick Rebuild (Recommended)

Run this on your VPS:

```bash
cd /app
rm -rf .next
npm run build
pm2 restart all
```

### Option 2: Full Clean Rebuild (If Option 1 Doesn't Work)

```bash
cd /app
rm -rf .next
rm -rf node_modules
npm install
npm run build
pm2 restart all
```

## What This Does

1. **Removes stale build cache** - Deletes the `.next` directory containing old bundled code
2. **Rebuilds the app** - Creates fresh production bundles with latest code
3. **Restarts the server** - Applies the new build

## Expected Result

After rebuilding:
- Excel import will work correctly
- Hardware items will be created/updated successfully
- No more "relation does not exist" errors

## Verification Steps

1. After rebuild, test the import again
2. You should see items being created successfully
3. Check the hardware config page - imported items should appear

## Why This Happened

- The import route code was updated locally and pushed to GitHub
- The VPS pulled the latest code
- BUT the `.next` build directory wasn't rebuilt
- Next.js was still serving the old bundled code from cache

## Prevention

Always rebuild after pulling code changes on production:
```bash
git pull
rm -rf .next
npm run build
pm2 restart all
```

## Technical Details

The console logs show the database connection is correct:
- Database URL: `postgresql://postgres:tbbbrb8rmrzaqab0@smart-cost-calculator-postgres-rnfhko:5432/smart_calculator`
- All migrations have been run successfully
- Manual CRUD operations work fine

The issue is purely a stale build cache problem, not a database or migration issue.
