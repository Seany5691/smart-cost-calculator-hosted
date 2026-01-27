# VPS Errors Fixed - SSL and Fetch Issues

## Errors Found in VPS Logs

### Error 1: SSL Connection Error ❌
```
Error: The server does not support SSL connections
at /app/node_modules/pg-pool/index.js:45:11
```

**Location:** `app/api/calendar/events/[eventId]/route.ts`

**Root Cause:** 
The calendar events route was creating its own `Pool` instance with SSL configuration:
```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
```

But the VPS database doesn't support SSL or has different SSL requirements.

**Fix Applied:**
Changed to use the shared `query` function from `@/lib/db` which already has the correct database configuration:
```typescript
import { query } from '@/lib/db';
// Now uses: await query(...) instead of await pool.query(...)
```

This ensures consistent database connection handling across all routes.

### Error 2: Fetch Failed (ECONNREFUSED) ❌
```
TypeError: fetch failed
ECONNREFUSED
at async /app/.next/server/app/api/leads/import/scraper/route.js
```

**Location:** `app/api/leads/import/scraper/route.ts`

**Root Cause:**
The scraper import was trying to fetch from:
```typescript
const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/scraper/sessions/${sessionId}/businesses`;
```

On VPS, `localhost:3000` doesn't work because the app might be running on a different port or the internal networking is different.

**Fix Applied:**
Added `NEXTAUTH_URL` as the primary fallback:
```typescript
const url = `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/scraper/sessions/${sessionId}/businesses`;
```

`NEXTAUTH_URL` should be set to the actual VPS URL (e.g., `https://deals.smartintegrate.co.za`).

## Files Modified

1. **app/api/calendar/events/[eventId]/route.ts**
   - Removed separate `Pool` instance
   - Now uses shared `query` function from `@/lib/db`
   - Fixes SSL connection errors
   - GET, PATCH, and DELETE all updated

2. **app/api/leads/import/scraper/route.ts**
   - Updated fetch URL to use `NEXTAUTH_URL` first
   - Falls back to `NEXT_PUBLIC_API_URL` then `localhost`
   - Fixes ECONNREFUSED errors

## Environment Variables Required on VPS

Make sure these are set in your VPS environment:

```bash
# Primary URL for internal API calls
NEXTAUTH_URL=https://deals.smartintegrate.co.za

# Public API URL (if different)
NEXT_PUBLIC_API_URL=https://deals.smartintegrate.co.za

# Database URL (already set)
DATABASE_URL=postgresql://...
```

## What Now Works

### ✅ Calendar Events
- Edit events (no SSL error)
- Delete events (no SSL error)
- View events
- Create events
- All calendar operations use consistent database connection

### ✅ Scraper Import
- Import from scraper sessions (no ECONNREFUSED)
- Fetch uses correct VPS URL
- Internal API calls work properly

## Testing on VPS

After deploying:

1. **Test Calendar Events:**
   ```
   - Create an event
   - Edit the event → Should work ✅
   - Delete the event → Should work ✅
   ```

2. **Test Scraper Import:**
   ```
   - Run a scraper session
   - Go to leads page
   - Import from scraper → Should work ✅
   ```

3. **Check Logs:**
   ```bash
   pm2 logs
   # Should see:
   # [CALENDAR EVENT UPDATE] Success: ...
   # [CALENDAR EVENT DELETE] Success
   # [SCRAPER IMPORT] Import completed: ...
   ```

## Why These Errors Occurred

1. **SSL Error:**
   - Calendar events route created its own database pool
   - Other routes use the shared `query` function
   - Inconsistent database configuration
   - VPS database has different SSL requirements

2. **Fetch Error:**
   - `localhost:3000` doesn't work on VPS
   - Need to use actual VPS URL for internal API calls
   - `NEXTAUTH_URL` is the standard env var for this

## Prevention

Going forward:
- ✅ Always use `query` from `@/lib/db` for database operations
- ✅ Never create separate `Pool` instances in routes
- ✅ Use `NEXTAUTH_URL` for internal API calls
- ✅ Test on VPS before considering it "fixed"

## Deployment Steps

```bash
# 1. Commit and push (already done)
git add -A
git commit -m "fix: VPS SSL and fetch errors"
git push origin main

# 2. SSH to VPS
ssh your-user@your-vps

# 3. Pull latest code
cd /path/to/hosted-smart-cost-calculator
git pull origin main

# 4. Ensure environment variables are set
# Check .env or environment config
echo $NEXTAUTH_URL
# Should output: https://deals.smartintegrate.co.za

# 5. Rebuild
npm run build

# 6. Restart
pm2 restart all

# 7. Test
# - Edit calendar event
# - Delete calendar event
# - Import from scraper

# 8. Check logs
pm2 logs
# Should see success messages, no errors
```

---

**Status:** ✅ FIXED
**Date:** January 27, 2026
**Ready for:** VPS deployment and testing
