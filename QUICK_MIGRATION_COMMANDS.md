# Quick Migration Commands - VPS

## 🚀 Quick Start (Copy & Paste)

### Connect to Database
```bash
# SSH into VPS
ssh user@your-vps-ip

# Navigate to app directory
cd /path/to/hosted-smart-cost-calculator

# Connect to PostgreSQL
psql -U your_db_user -d your_database_name
```

### Run All Migrations (One Command)
```bash
# From application directory
psql -U your_db_user -d your_database_name \
  -f database/migrations/017_scraper_checkpoints.sql \
  -f database/migrations/018_scraper_retry_queue.sql \
  -f database/migrations/019_scraper_metrics.sql
```

### Verify Migrations
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('scraper_checkpoints', 'scraper_retry_queue', 'scraper_metrics');

-- Should return 3 rows:
-- scraper_checkpoints
-- scraper_retry_queue
-- scraper_metrics
```

### Check Indexes
```sql
SELECT tablename, indexname FROM pg_indexes 
WHERE tablename IN ('scraper_checkpoints', 'scraper_retry_queue', 'scraper_metrics')
ORDER BY tablename, indexname;

-- Should return 10 indexes total
```

### Restart Application
```bash
# For PM2
pm2 restart your-app-name && pm2 logs your-app-name

# For systemd
sudo systemctl restart your-app-name && sudo journalctl -u your-app-name -f
```

## ✅ Success Checklist

- [ ] Dockploy deployment completed
- [ ] SSH connection to VPS established
- [ ] Database connection successful
- [ ] Migration 017 (scraper_checkpoints) completed
- [ ] Migration 018 (scraper_retry_queue) completed
- [ ] Migration 019 (scraper_metrics) completed
- [ ] All 3 tables verified
- [ ] All 10 indexes verified
- [ ] Application restarted successfully
- [ ] No errors in application logs

## 🔍 Quick Verification Queries

```sql
-- Count rows in new tables (should be 0 initially)
SELECT 
  (SELECT COUNT(*) FROM scraper_checkpoints) as checkpoints,
  (SELECT COUNT(*) FROM scraper_retry_queue) as retry_queue,
  (SELECT COUNT(*) FROM scraper_metrics) as metrics;

-- Check table structures
\d scraper_checkpoints
\d scraper_retry_queue
\d scraper_metrics
```

## 🆘 Quick Rollback (If Needed)

```sql
DROP TABLE IF EXISTS scraper_metrics CASCADE;
DROP TABLE IF EXISTS scraper_retry_queue CASCADE;
DROP TABLE IF EXISTS scraper_checkpoints CASCADE;
DROP FUNCTION IF EXISTS update_scraper_checkpoints_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_scraper_retry_queue_updated_at() CASCADE;
```

## 📊 Post-Migration Testing

```sql
-- After running a scraping session, check data:

-- View recent checkpoints
SELECT session_id, current_industry, current_town, processed_businesses, created_at 
FROM scraper_checkpoints 
ORDER BY created_at DESC LIMIT 5;

-- View retry queue items
SELECT session_id, item_type, attempts, next_retry_time 
FROM scraper_retry_queue 
ORDER BY created_at DESC LIMIT 10;

-- View metrics summary
SELECT metric_type, COUNT(*) as count, AVG(metric_value) as avg_value
FROM scraper_metrics 
GROUP BY metric_type;
```

## 📝 Notes

- **Database Location**: VPS only (not available locally)
- **Deployment Method**: GitHub → Dockploy → VPS
- **Commit Hash**: e4e3051
- **Migration Files**: 017, 018, 019
- **New Tables**: 3 (checkpoints, retry_queue, metrics)
- **New Indexes**: 10 total
- **Foreign Keys**: All reference scraping_sessions table
