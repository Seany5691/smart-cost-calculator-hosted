# Scraper Queue - Quick Start Guide

## What Was Done

Added a queueing system to prevent multiple users from scraping simultaneously, which was causing server crashes.

## How to Deploy

### 1. Run the Database Migration

```bash
node run-queue-migration.js
```

This will:
- Create the `scraper_queue` table
- Add queue management functions
- Set up automatic queue reordering
- Verify everything was created correctly

### 2. Restart Your Application

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### 3. Test It

1. Start a scraping session (should start immediately)
2. While it's running, start another session
3. You should see: "Your scrape is in the queue (Position #1)"
4. When the first session completes, the second should start automatically

## What Changed

### For Users
- If someone else is scraping, new requests are queued
- Users see their position in queue and estimated wait time
- Users can cancel their queued request
- Scraping starts automatically when it's their turn

### For You
- No more server crashes from concurrent scraping
- Queue persists in database (survives server restarts)
- Automatic processing of queued items
- Clean, minimal code changes

## Files Changed

### New Files (Safe - No Risk)
- `database/migrations/020_scraper_queue.sql`
- `lib/scraper/queueManager.ts`
- `app/api/scraper/queue-status/route.ts`
- `app/api/scraper/cancel-queue/route.ts`
- `components/scraper/QueueStatus.tsx`

### Modified Files (Minimal Changes)
- `app/api/scraper/start/route.ts` - Added queue check
- `app/api/scraper/stop/route.ts` - Process next in queue
- `lib/store/scraper.ts` - Handle queue response
- `app/scraper/page.tsx` - Show queue status

## Verification

After deployment, check:

```sql
-- Verify table exists
SELECT * FROM scraper_queue;

-- Check if queue is working
SELECT * FROM scraper_queue WHERE status = 'queued';
```

## Rollback (If Needed)

If something goes wrong:

```sql
DROP TABLE IF EXISTS scraper_queue CASCADE;
```

Then restart the app with the old code.

## Support

Everything is documented in:
- `SCRAPER_QUEUE_IMPLEMENTATION_COMPLETE.md` - Full details
- `RUN_QUEUE_MIGRATION.md` - Migration guide

The implementation was done with extreme care to avoid breaking anything. All existing functionality remains unchanged.
