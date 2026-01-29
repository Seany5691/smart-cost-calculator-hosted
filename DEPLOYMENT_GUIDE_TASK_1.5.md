# Deployment Guide: Task 1.5 - Deploy Scraper Robustness Migrations

## Overview
This guide walks you through deploying the scraper robustness enhancement database migrations to your VPS. The database runs on the VPS only, so we need to:
1. Commit all changes to GitHub
2. Push to trigger Dockploy deployment
3. Run migrations on the VPS

## What's Being Deployed

### New Database Tables (3 migrations)
1. **017_scraper_checkpoints.sql** - Checkpoint system for progress persistence
2. **018_scraper_retry_queue.sql** - Retry queue for failed operations
3. **019_scraper_metrics.sql** - Metrics collection for monitoring

### New Code Components
- **NavigationManager** - Navigation with retry logic and adaptive timeouts
- **BatchManager** - Batch-of-5 provider lookups with adaptive sizing
- **CaptchaDetector** - Captcha detection and response
- **RetryQueue** - Persistent retry queue with exponential backoff

### Modified Files
- `lib/scraper/browser-worker.ts`
- `lib/scraper/business-lookup-scraper.ts`
- `lib/scraper/industry-scraper.ts`
- `lib/scraper/provider-lookup-service.ts`
- `lib/scraper/scraping-orchestrator.ts`
- `package.json` (added fast-check for property-based testing)

---

## Step 1: Review Changes

Before committing, let's verify what we're deploying:

```bash
# Review modified files
git diff lib/scraper/

# Review new migration files
cat database/migrations/017_scraper_checkpoints.sql
cat database/migrations/018_scraper_retry_queue.sql
cat database/migrations/019_scraper_metrics.sql
```

---

## Step 2: Stage and Commit Changes

### Stage All Changes
```bash
# Stage migration files
git add database/migrations/017_scraper_checkpoints.sql
git add database/migrations/018_scraper_retry_queue.sql
git add database/migrations/019_scraper_metrics.sql

# Stage new scraper components
git add lib/scraper/NavigationManager.ts
git add lib/scraper/BatchManager.ts
git add lib/scraper/CaptchaDetector.ts
git add lib/scraper/RetryQueue.ts

# Stage modified scraper files
git add lib/scraper/browser-worker.ts
git add lib/scraper/business-lookup-scraper.ts
git add lib/scraper/industry-scraper.ts
git add lib/scraper/provider-lookup-service.ts
git add lib/scraper/scraping-orchestrator.ts

# Stage test files
git add __tests__/lib/scraper/NavigationManager.test.ts
git add __tests__/lib/scraper/NavigationManager.property.test.ts
git add lib/scraper/BatchManager.test.ts
git add lib/scraper/CaptchaDetector.test.ts
git add lib/scraper/RetryQueue.test.ts
git add lib/scraper/RetryQueue.integration.test.ts
git add lib/scraper/RetryQueue.persistence.test.ts

# Stage package.json changes (fast-check dependency)
git add package.json
git add package-lock.json
git add jest.setup.js
```

### Commit with Descriptive Message
```bash
git commit -m "feat(scraper): Add robustness enhancements - Phase 1 Core Resilience

- Add database migrations for checkpoints, retry queue, and metrics
- Implement NavigationManager with exponential backoff and adaptive timeouts
- Implement BatchManager with batch-of-5 constraint for provider lookups
- Implement CaptchaDetector for captcha detection and response
- Implement RetryQueue with persistent storage and exponential backoff
- Add property-based tests using fast-check
- Integrate new components with existing scraper services

Migrations:
- 017_scraper_checkpoints.sql: Progress persistence and resume capability
- 018_scraper_retry_queue.sql: Failed operation retry with exponential backoff
- 019_scraper_metrics.sql: Performance monitoring and health tracking

Spec: scraper-robustness-enhancement
Tasks: 1.1-1.4, 2.1-2.6, 3.1-3.7, 4.1-4.5, 5.1-5.6"
```

---

## Step 3: Push to GitHub

```bash
# Push to main branch (triggers Dockploy deployment)
git push origin main
```

**Expected Output:**
```
Enumerating objects: X, done.
Counting objects: 100% (X/X), done.
Delta compression using up to Y threads
Compressing objects: 100% (X/X), done.
Writing objects: 100% (X/X), Z KiB | Z MiB/s, done.
Total X (delta Y), reused 0 (delta 0), pack-reused 0
To github.com:your-repo/hosted-smart-cost-calculator.git
   abc1234..def5678  main -> main
```

---

## Step 4: Monitor Dockploy Deployment

1. **Open Dockploy Dashboard**
   - Navigate to your Dockploy URL
   - Find the "hosted-smart-cost-calculator" project

2. **Watch Deployment Logs**
   - Click on the deployment in progress
   - Monitor the build and deployment logs
   - Wait for "Deployment successful" message

3. **Verify Deployment**
   - Check that the application is running
   - Verify no errors in the deployment logs

**Typical Deployment Time:** 2-5 minutes

---

## Step 5: Connect to VPS and Run Migrations

### Option A: SSH into VPS

```bash
# SSH into your VPS
ssh your-username@your-vps-ip

# Navigate to the application directory
cd /path/to/hosted-smart-cost-calculator

# Run migrations
npm run migrate
```

### Option B: Use Dockploy Terminal

1. Open Dockploy dashboard
2. Navigate to your project
3. Click "Terminal" or "Console"
4. Run migration command:
   ```bash
   npm run migrate
   ```

### Expected Migration Output

```
Running migrations...
✓ Migration 017_scraper_checkpoints.sql applied successfully
✓ Migration 018_scraper_retry_queue.sql applied successfully
✓ Migration 019_scraper_metrics.sql applied successfully

All migrations completed successfully!
```

---

## Step 6: Verify Migrations

### Check Tables Were Created

```bash
# Connect to PostgreSQL
psql -U your_db_user -d your_database_name

# List tables
\dt

# You should see:
# - scraper_checkpoints
# - scraper_retry_queue
# - scraper_metrics

# Check table structure
\d scraper_checkpoints
\d scraper_retry_queue
\d scraper_metrics

# Exit psql
\q
```

### Verify Indexes

```sql
-- Check indexes on scraper_checkpoints
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'scraper_checkpoints';

-- Check indexes on scraper_retry_queue
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'scraper_retry_queue';

-- Check indexes on scraper_metrics
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'scraper_metrics';
```

---

## Step 7: Test the Deployment

### Test 1: Verify Application Starts
```bash
# Check application logs
pm2 logs hosted-smart-cost-calculator

# Or if using Docker
docker logs <container-name>
```

### Test 2: Test Scraper Functionality
1. Navigate to the scraper UI in your browser
2. Start a small test scraping session (1 industry, 1 town)
3. Monitor the logs for:
   - NavigationManager activity
   - BatchManager batch processing
   - No errors related to missing tables

### Test 3: Verify Database Writes
```sql
-- Check if checkpoints are being created
SELECT * FROM scraper_checkpoints ORDER BY created_at DESC LIMIT 5;

-- Check if retry queue is working
SELECT * FROM scraper_retry_queue ORDER BY created_at DESC LIMIT 5;

-- Check if metrics are being recorded
SELECT * FROM scraper_metrics ORDER BY created_at DESC LIMIT 10;
```

---

## Troubleshooting

### Issue: Migration Fails - Table Already Exists

**Solution:**
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('scraper_checkpoints', 'scraper_retry_queue', 'scraper_metrics');

-- If they exist, the migrations may have already run
-- Verify the structure matches the migration files
```

### Issue: Foreign Key Constraint Fails

**Error:** `relation "scraping_sessions" does not exist`

**Solution:**
```sql
-- Verify scraping_sessions table exists
SELECT * FROM information_schema.tables WHERE table_name = 'scraping_sessions';

-- If missing, run earlier migrations first
-- Check migration 008_scraping_sessions_complete.sql
```

### Issue: Deployment Succeeds but Application Won't Start

**Check:**
1. Review application logs for errors
2. Verify all dependencies installed (`npm install`)
3. Check environment variables are set correctly
4. Verify database connection string is correct

### Issue: Migrations Run but Tables Are Empty

**This is normal!** The tables will only be populated when:
- Scraper runs and creates checkpoints
- Operations fail and are added to retry queue
- Metrics are recorded during scraping

---

## Rollback Plan (If Needed)

If something goes wrong, you can rollback:

### Rollback Code
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Wait for Dockploy to redeploy
```

### Rollback Database (Optional)
```sql
-- Only if you need to remove the tables
DROP TABLE IF EXISTS scraper_metrics CASCADE;
DROP TABLE IF EXISTS scraper_retry_queue CASCADE;
DROP TABLE IF EXISTS scraper_checkpoints CASCADE;

-- Drop the trigger functions
DROP FUNCTION IF EXISTS update_scraper_checkpoints_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_scraper_retry_queue_updated_at() CASCADE;
```

---

## Post-Deployment Checklist

- [ ] Code committed and pushed to GitHub
- [ ] Dockploy deployment completed successfully
- [ ] Migrations run on VPS without errors
- [ ] All three tables created (checkpoints, retry_queue, metrics)
- [ ] Indexes created successfully
- [ ] Application starts without errors
- [ ] Test scraping session runs successfully
- [ ] Database tables are being populated during scraping
- [ ] No errors in application logs

---

## Next Steps

After successful deployment:

1. **Monitor Initial Scraping Sessions**
   - Watch for any errors in logs
   - Verify checkpoints are being saved
   - Check retry queue is working
   - Confirm metrics are being recorded

2. **Review Metrics**
   ```sql
   -- Check scraper performance
   SELECT 
     metric_type,
     metric_name,
     AVG(metric_value) as avg_value,
     COUNT(*) as count,
     SUM(CASE WHEN success THEN 1 ELSE 0 END)::float / COUNT(*) as success_rate
   FROM scraper_metrics
   GROUP BY metric_type, metric_name
   ORDER BY metric_type, metric_name;
   ```

3. **Test Checkpoint Resume**
   - Start a scraping session
   - Stop it mid-way (Ctrl+C or kill process)
   - Restart and verify it resumes from checkpoint

4. **Continue with Phase 2 Tasks**
   - Task 6: URLExtractor Implementation
   - Task 7: SelectorManager Implementation
   - Task 8: ScrollManager Implementation
   - Task 9: Phone Number Normalization

---

## Support

If you encounter issues:
1. Check application logs
2. Check database logs
3. Review migration files for syntax errors
4. Verify database user has necessary permissions
5. Check network connectivity between app and database

---

## Summary

This deployment adds the foundation for scraper robustness:
- ✅ Checkpoint system for progress persistence
- ✅ Retry queue for failed operations
- ✅ Metrics collection for monitoring
- ✅ Navigation resilience with adaptive timeouts
- ✅ Batch-of-5 provider lookups
- ✅ Captcha detection and response

The scraper is now more resilient and can recover from failures automatically!
