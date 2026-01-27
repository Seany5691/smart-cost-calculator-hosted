# Current Issues and Solutions

## Issue 1: Calendar Events Edit/Delete Still Failing ❌

### Problem:
- PATCH `/api/calendar/events/[eventId]` returns 500 error
- DELETE `/api/calendar/events/[eventId]` returns 500 error
- This is happening on the VPS (deals.smartintegrate.co.za)

### Root Cause:
**The VPS hasn't pulled the latest code from GitHub yet!**

The fix was committed in:
- Commit `075da08` - "fix: Calendar events edit/delete API bug"
- This fixed the missing `$` in SQL parameter placeholders

### Solution:
**You need to update the VPS:**

```bash
# SSH into VPS
ssh your-user@your-vps-ip

# Navigate to project
cd /path/to/hosted-smart-cost-calculator

# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Rebuild
npm run build

# Restart application
pm2 restart all  # or your restart command
```

### Verification:
After updating VPS:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+F5)
3. Try editing a calendar event → Should work ✅
4. Try deleting a calendar event → Should work ✅

---

## Issue 2: Scraper Import Failing ❌

### Problem:
- POST `/api/leads/import/scraper` returns 500 error
- Happens when trying to import leads from scraper sessions

### Root Cause:
Unknown - need to check VPS server logs to see the actual error message.

### What I Did:
Added detailed logging to the scraper import route to help debug:
- Logs when request is received
- Logs each session being fetched
- Logs total results count
- Logs import completion
- Logs full error stack trace

### Solution Steps:

**Step 1: Update VPS (same as Issue 1)**
```bash
git pull origin main
npm install
npm run build
pm2 restart all
```

**Step 2: Check Server Logs**
```bash
# If using PM2
pm2 logs

# If using Docker
docker-compose logs -f

# If using systemd
sudo journalctl -u smart-cost-calculator -f
```

**Step 3: Try Import Again**
- Go to leads page
- Click import from scraper
- Select a session
- Enter list name
- Click import
- Check the server logs for detailed error messages

### Possible Causes:
1. **Database connection issue** - Check DATABASE_URL env var
2. **API URL issue** - Check NEXT_PUBLIC_API_URL env var
3. **Session data format mismatch** - Check scraper session structure
4. **Database schema issue** - Verify leads table has all required columns
5. **Transaction issue** - Database might not support transactions properly

### Debug Information to Look For:
When you check the logs, look for:
```
[SCRAPER IMPORT] Request received: { sessionIds: [...], listName: '...', userId: '...' }
[SCRAPER IMPORT] Fetching session: ...
[SCRAPER IMPORT] Session data received: { sessionId: '...', businessCount: X }
[SCRAPER IMPORT] Total results to import: X
[SCRAPER IMPORT] Starting from lead number: X
[SCRAPER IMPORT] Error importing from scraper: ...
[SCRAPER IMPORT] Error stack: ...
```

The error message and stack trace will tell us exactly what's wrong.

---

## Summary

### Local Development: ✅ Working
- Calendar events edit/delete works
- Scraper import should work (needs testing)
- All code is up to date

### VPS Production: ❌ Not Working
- **Needs to pull latest code from GitHub**
- **Needs to rebuild and restart**
- Then both issues should be resolved

### Next Steps:
1. ✅ Added detailed logging to scraper import
2. ⏳ **YOU NEED TO:** Update VPS with latest code
3. ⏳ **YOU NEED TO:** Check server logs for scraper import error
4. ⏳ **YOU NEED TO:** Test both features after VPS update

---

## Files Modified (Ready to Commit)

1. `app/api/leads/import/scraper/route.ts`
   - Added detailed console logging
   - Better error messages
   - Stack trace logging

2. `VPS_UPDATE_REQUIRED.md`
   - Complete guide for updating VPS
   - Troubleshooting steps
   - Verification checklist

3. `ISSUES_AND_SOLUTIONS.md` (this file)
   - Summary of both issues
   - Root causes
   - Solutions

---

**Status:** ⚠️ Waiting for VPS update
**Date:** January 27, 2026
**Action Required:** Update VPS with latest GitHub code
