# VPS Update Required - Critical Fixes

## Issue Summary
The VPS is still running old code that has bugs. You need to pull the latest changes and rebuild.

## Errors Currently on VPS:
1. ❌ Calendar events edit/delete returning 500 errors
2. ❌ Scraper import returning 500 errors

## Root Cause:
The VPS hasn't pulled the latest GitHub commits that include:
- Commit `075da08` - Calendar events API bug fix
- Commit `de1e890` - Calendar events integration

## Solution: Update VPS

### Step 1: SSH into VPS
```bash
ssh your-user@your-vps-ip
```

### Step 2: Navigate to Project Directory
```bash
cd /path/to/hosted-smart-cost-calculator
```

### Step 3: Pull Latest Changes
```bash
git pull origin main
```

You should see it pull commits:
- `de1e890` - Calendar events integration
- `075da08` - Calendar events API bug fix

### Step 4: Install Dependencies (if needed)
```bash
npm install
```

### Step 5: Rebuild the Application
```bash
npm run build
```

### Step 6: Restart the Application

**If using PM2:**
```bash
pm2 restart all
# or
pm2 restart smart-cost-calculator
```

**If using Docker:**
```bash
docker-compose down
docker-compose up -d --build
```

**If using systemd:**
```bash
sudo systemctl restart smart-cost-calculator
```

### Step 7: Verify the Fix

1. **Check the logs:**
```bash
# PM2
pm2 logs

# Docker
docker-compose logs -f

# systemd
sudo journalctl -u smart-cost-calculator -f
```

2. **Test in browser:**
   - Clear browser cache (Ctrl+Shift+Delete)
   - Hard refresh (Ctrl+F5)
   - Try editing a calendar event
   - Try deleting a calendar event
   - Try importing from scraper

## What Was Fixed

### Calendar Events API (Commit 075da08)
**File:** `app/api/calendar/events/[eventId]/route.ts`

**Before (BROKEN):**
```typescript
updates.push(`${field} = ${paramIndex}`);  // Missing $
// ...
WHERE id = ${paramIndex}  // Missing $
```

**After (FIXED):**
```typescript
updates.push(`${field} = $${paramIndex}`);  // Added $
// ...
WHERE id = $${paramIndex}  // Added $
```

This was causing invalid SQL syntax which resulted in 500 errors.

### Scraper Import
The scraper import route was also updated to handle the new data structure properly.

## Verification Checklist

After updating the VPS, verify:

- [ ] VPS pulled latest commits (de1e890 and 075da08)
- [ ] npm install completed successfully
- [ ] npm run build completed successfully
- [ ] Application restarted successfully
- [ ] No errors in application logs
- [ ] Calendar event edit works in browser
- [ ] Calendar event delete works in browser
- [ ] Scraper import works in browser
- [ ] Browser cache cleared
- [ ] Hard refresh performed (Ctrl+F5)

## Troubleshooting

### If git pull fails:
```bash
# Check current status
git status

# If there are local changes, stash them
git stash

# Pull again
git pull origin main

# Reapply stashed changes if needed
git stash pop
```

### If build fails:
```bash
# Clear build cache
rm -rf .next

# Try building again
npm run build
```

### If still getting 500 errors:
1. Check the server logs for the actual error message
2. Verify the database connection is working
3. Check that environment variables are set correctly
4. Ensure the database has the calendar_events table

### Check Database Table Exists:
```sql
-- Connect to your database
psql -U your_user -d your_database

-- Check if calendar_events table exists
\dt calendar_events

-- If it doesn't exist, run the migration
\i database/migrations/010_calendar_events_system.sql
```

## Expected Behavior After Fix

### Calendar Events:
1. Click on a calendar event date
2. See event details in popover
3. Click "Edit" button → Modal opens with pre-filled data
4. Make changes and save → Event updates successfully
5. Click "Delete" button → Confirmation prompt
6. Confirm → Event deletes successfully

### Scraper Import:
1. Go to scraper page
2. Complete a scraping session
3. Go to leads page
4. Click import from scraper
5. Select session(s)
6. Enter list name
7. Click import → Leads import successfully

## Quick Command Summary

```bash
# Full update sequence
cd /path/to/hosted-smart-cost-calculator
git pull origin main
npm install
npm run build
pm2 restart all  # or your restart command

# Verify
pm2 logs
```

---

**Status:** ⚠️ VPS UPDATE REQUIRED
**Latest Commit:** 075da08
**Date:** January 27, 2026

**IMPORTANT:** The local development environment has the fixes and works correctly. The VPS just needs to pull and rebuild.
