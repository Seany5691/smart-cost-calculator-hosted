# Scraper Queue Deployment Checklist

Use this checklist to ensure a smooth deployment of the queue system.

## Pre-Deployment

- [ ] Read `SCRAPER_QUEUE_READY_TO_DEPLOY.md`
- [ ] Backup database (optional but recommended)
- [ ] Ensure no active scraping sessions
- [ ] Have rollback plan ready

## Deployment

### Step 1: Run Migration
- [ ] Navigate to project directory
- [ ] Run: `node run-queue-migration.js`
- [ ] Verify success message appears
- [ ] Check for any error messages

### Step 2: Verify Database
```sql
-- Run these queries to verify
SELECT * FROM scraper_queue LIMIT 1;
SELECT proname FROM pg_proc WHERE proname = 'get_next_queue_position';
```
- [ ] scraper_queue table exists
- [ ] Functions created successfully
- [ ] No errors in database

### Step 3: Restart Application
- [ ] Stop current process (Ctrl+C)
- [ ] Run: `npm run dev` (or production command)
- [ ] Wait for "Ready" message
- [ ] Check for startup errors

## Testing

### Basic Functionality
- [ ] Open scraper page - loads without errors
- [ ] Start first scrape - starts immediately
- [ ] Check console - no errors
- [ ] Verify scraping works normally

### Queue Functionality
- [ ] Keep first scrape running
- [ ] Open new browser/incognito window
- [ ] Start second scrape
- [ ] Verify queue status appears
- [ ] Check queue position shows "#1"
- [ ] Verify estimated wait time displays
- [ ] Check console - no errors

### Automatic Processing
- [ ] Wait for first scrape to complete
- [ ] Verify second scrape starts automatically
- [ ] Check queue status disappears
- [ ] Verify normal progress display appears
- [ ] Check console - no errors

### Cancellation
- [ ] Queue a third scrape
- [ ] Click cancel button
- [ ] Verify scrape is cancelled
- [ ] Check database - item marked cancelled
- [ ] Verify no errors

### Multiple Users
- [ ] User A starts scraping
- [ ] User B starts scraping (should queue as #1)
- [ ] User C starts scraping (should queue as #2)
- [ ] Verify positions are correct
- [ ] Wait for A to complete
- [ ] Verify B starts automatically
- [ ] Wait for B to complete
- [ ] Verify C starts automatically

## Verification

### Database Checks
```sql
-- Check queue table
SELECT * FROM scraper_queue ORDER BY created_at DESC LIMIT 10;

-- Check active sessions
SELECT * FROM scraping_sessions WHERE status = 'running';

-- Check queue statistics
SELECT status, COUNT(*) FROM scraper_queue GROUP BY status;
```
- [ ] Queue table has data
- [ ] Statuses are correct
- [ ] No orphaned items

### Log Checks
Look for these messages in server logs:
- [ ] "Another session is active, adding to queue"
- [ ] "No active session, starting immediately"
- [ ] "Starting next queued session"
- [ ] "Processing next in queue"

### UI Checks
- [ ] Queue status displays correctly
- [ ] Position updates in real-time
- [ ] Estimated time formats correctly
- [ ] Cancel button works
- [ ] No console errors
- [ ] Mobile view works
- [ ] Desktop view works

## Post-Deployment

### Monitor for 1 Hour
- [ ] Check server logs every 15 minutes
- [ ] Monitor database queue table
- [ ] Watch for any errors
- [ ] Verify automatic processing works

### Monitor for 24 Hours
- [ ] Check queue statistics daily
- [ ] Monitor average wait times
- [ ] Watch for any issues
- [ ] Verify cleanup works (old items removed)

## Rollback (If Needed)

If anything goes wrong:

### Database Rollback
```sql
DROP TABLE IF EXISTS scraper_queue CASCADE;
DROP FUNCTION IF EXISTS reorder_queue_positions() CASCADE;
DROP FUNCTION IF EXISTS get_next_queue_position() CASCADE;
```
- [ ] Run rollback SQL
- [ ] Verify tables dropped

### Code Rollback
```bash
git checkout HEAD~1 -- app/api/scraper/start/route.ts
git checkout HEAD~1 -- app/api/scraper/stop/route.ts
git checkout HEAD~1 -- lib/store/scraper.ts
git checkout HEAD~1 -- app/scraper/page.tsx
```
- [ ] Revert code changes
- [ ] Restart application
- [ ] Verify normal operation

## Success Criteria

Deployment is successful if:
- ✅ Migration completed without errors
- ✅ Application starts without errors
- ✅ First scrape starts immediately
- ✅ Second scrape queues correctly
- ✅ Queue status displays properly
- ✅ Automatic processing works
- ✅ Cancel functionality works
- ✅ No console errors
- ✅ No server errors
- ✅ Database queries work

## Troubleshooting

### Migration Fails
- Check DATABASE_URL in .env.local
- Verify database connection
- Check for syntax errors in SQL
- Try running SQL manually in psql

### Queue Not Working
- Check server logs for errors
- Verify migration ran successfully
- Check database for scraper_queue table
- Verify functions exist in database

### UI Not Showing Queue
- Check browser console for errors
- Verify QueueStatus component imported
- Check network tab for API calls
- Verify authentication working

### Sessions Not Starting
- Check server logs for queue processing
- Verify processNextInQueue is called
- Check database for queued items
- Verify no errors in completion handler

## Support

If you need help:
1. Check `SCRAPER_QUEUE_IMPLEMENTATION_COMPLETE.md`
2. Review server logs
3. Check database state
4. Verify all files were created/modified
5. Test with single user first

## Notes

- Queue persists across server restarts
- Old items (24+ hours) are auto-cleaned
- Queue position updates every 5 seconds
- Users can close browser while queued
- Failed sessions still process next in queue

---

**Date Deployed:** _______________
**Deployed By:** _______________
**Issues Found:** _______________
**Resolution:** _______________
