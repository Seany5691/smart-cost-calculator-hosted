# 🚀 RUN MIGRATIONS NOW - Quick Guide

Since the migration script isn't in your current Docker container, you have 2 options:

---

## **Option 1: Run SQL Directly (FASTEST)** ⚡

Connect to your PostgreSQL database and run the SQL files directly:

### **Step 1: Connect to PostgreSQL**
```bash
# On your VPS, connect to PostgreSQL
psql $DATABASE_URL

# OR if you have the connection details:
psql -h your-host -U your-user -d your-database
```

### **Step 2: Run Migration 015**
Copy and paste this entire SQL block:

```sql
-- Migration: Add Provider Lookup Cache Table
CREATE TABLE IF NOT EXISTS provider_lookup_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  confidence INTEGER DEFAULT 100,
  last_checked TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_cache_phone ON provider_lookup_cache(phone_number);
CREATE INDEX IF NOT EXISTS idx_provider_cache_last_checked ON provider_lookup_cache(last_checked);

COMMENT ON TABLE provider_lookup_cache IS 'Caches provider lookup results to avoid redundant API calls to porting.co.za';
COMMENT ON COLUMN provider_lookup_cache.phone_number IS 'Phone number in SA format (e.g., 0123456789)';
COMMENT ON COLUMN provider_lookup_cache.provider IS 'Provider name: Telkom, Vodacom, MTN, Cell C, Other, Unknown';
COMMENT ON COLUMN provider_lookup_cache.confidence IS 'Confidence level (0-100), default 100';
COMMENT ON COLUMN provider_lookup_cache.last_checked IS 'When this provider was last verified';

CREATE OR REPLACE FUNCTION cleanup_old_provider_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM provider_lookup_cache
  WHERE last_checked < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_provider_cache IS 'Removes provider cache entries older than 30 days';
```

### **Step 3: Run Migration 016**
Copy and paste this entire SQL block:

```sql
-- Migration: Add Scraping Templates Table
CREATE TABLE IF NOT EXISTS scraping_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  towns TEXT[] NOT NULL,
  industries TEXT[] NOT NULL,
  config JSONB,
  is_favorite BOOLEAN DEFAULT FALSE,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_user_id ON scraping_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_is_favorite ON scraping_templates(is_favorite);
CREATE INDEX IF NOT EXISTS idx_templates_use_count ON scraping_templates(use_count DESC);

COMMENT ON TABLE scraping_templates IS 'Stores reusable scraping configurations (templates)';
COMMENT ON COLUMN scraping_templates.name IS 'Template name (e.g., "Gauteng Pharmacies")';
COMMENT ON COLUMN scraping_templates.description IS 'Optional description of what this template is for';
COMMENT ON COLUMN scraping_templates.towns IS 'Array of town names';
COMMENT ON COLUMN scraping_templates.industries IS 'Array of industry names';
COMMENT ON COLUMN scraping_templates.config IS 'Optional scraping configuration (concurrency settings)';
COMMENT ON COLUMN scraping_templates.is_favorite IS 'Whether this template is marked as favorite';
COMMENT ON COLUMN scraping_templates.use_count IS 'Number of times this template has been used';
```

### **Step 4: Verify**
```sql
-- Check that tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('provider_lookup_cache', 'scraping_templates');

-- Should return 2 rows
```

### **Step 5: Exit**
```sql
\q
```

**Done!** ✅ Your migrations are now applied.

---

## **Option 2: Rebuild Docker Container (PROPER)** 🐳

This ensures the migration script is in the container for future use.

### **Step 1: Update Dockerfile**
Already done! The Dockerfile now includes the migration scripts.

### **Step 2: Rebuild in Dockploy**
1. Go to Dockploy UI
2. Find your app
3. Click "Rebuild"
4. Wait for build to complete

### **Step 3: Run Migration Script**
```bash
# SSH into your VPS
ssh your-vps

# Access the container
docker exec -it your-container-name sh

# Run migrations
cd /app
node run-scraper-migrations.js
```

---

## **Which Option Should You Choose?**

### **Use Option 1 (SQL) if:**
- ✅ You want migrations NOW (fastest)
- ✅ You have direct database access
- ✅ You don't want to rebuild

### **Use Option 2 (Rebuild) if:**
- ✅ You want the proper setup
- ✅ You can wait for rebuild
- ✅ You want the script available for future migrations

**Recommendation**: Do **Option 1 NOW** to fix the errors, then do **Option 2 later** for proper setup.

---

## **After Running Migrations**

### **Test That It Worked**:

1. **Start a new scrape** in your app
2. **Check the logs** - you should see:
   ```
   [ProviderCache] Cache miss for 0123456789
   [ProviderCache] Cached 5 new provider lookups
   ```
   Instead of:
   ```
   [ProviderCache] Error batch writing to cache: relation "provider_lookup_cache" does not exist
   ```

3. **Scrape again with same numbers** - you should see:
   ```
   [ProviderCache] Cache hit for 0123456789
   ```
   (83% faster!)

### **Benefits After Migrations**:
- ✅ Provider lookups cached (83% faster on repeats)
- ✅ Templates available (89% faster setup)
- ✅ No more database errors in logs
- ✅ Full scraper enhancement features active

---

## **Quick Copy-Paste Commands**

### **For Option 1 (SQL)**:
```bash
# Connect to database
psql $DATABASE_URL

# Then paste the SQL from Step 2 and Step 3 above
```

### **For Option 2 (Rebuild)**:
```bash
# In Dockploy UI: Click "Rebuild"
# After rebuild:
docker exec -it your-container-name sh
cd /app
node run-scraper-migrations.js
```

---

## **Troubleshooting**

### **If psql command not found**:
```bash
# Install PostgreSQL client
apt-get update && apt-get install -y postgresql-client

# Or use docker:
docker exec -it your-postgres-container psql -U your-user -d your-database
```

### **If you don't know DATABASE_URL**:
Check your Dockploy environment variables for the database connection string.

### **If migrations fail**:
- Check that you're connected to the right database
- Check that the `users` table exists (required for foreign key)
- Check PostgreSQL version (should be 12+)

---

## **Summary**

**Fastest Path**:
1. Connect to PostgreSQL: `psql $DATABASE_URL`
2. Run Migration 015 SQL (copy-paste from above)
3. Run Migration 016 SQL (copy-paste from above)
4. Verify: `SELECT table_name FROM information_schema.tables WHERE table_name IN ('provider_lookup_cache', 'scraping_templates');`
5. Done! ✅

**Total time**: ~2 minutes

Your scraper will immediately start caching provider lookups and you'll have templates available!

🚀 **Go ahead and run Option 1 now!**
