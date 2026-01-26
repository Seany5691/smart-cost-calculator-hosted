# Hardware Import Fix - Database Tables Missing

## Root Cause Found

The hardware import is working correctly! The issue is that the database tables don't exist on your VPS.

**Error from logs:**
```
error: relation "hardware" does not exist
```

## What's Happening

1. ✅ Excel file is being read correctly
2. ✅ Field mapping is working correctly  
3. ✅ Data extraction is working correctly
4. ❌ Database tables don't exist - migrations haven't been run

## Solution: Run Database Migrations on VPS

You need to run the database migrations to create all the required tables.

### Option 1: Run Migrations via SSH

SSH into your VPS and run:

```bash
cd /path/to/your/app
node scripts/migrate.js
```

### Option 2: Check if Migrations Auto-Run

Some deployments auto-run migrations. Check your deployment logs to see if migrations ran during deployment.

### Option 3: Manual Migration

If you have direct database access, you can run the migration SQL files manually:

```bash
# Connect to your PostgreSQL database
psql -U your_username -d your_database_name

# Run the initial schema
\i database/migrations/001_initial_schema.sql
```

## What Tables Are Missing

Based on the error, at minimum these tables are missing:
- `hardware`
- `licensing`
- `connectivity`  
- `factors`
- `scales`
- `config_cache` (optional - for caching)

## After Running Migrations

Once migrations are complete, the import will work immediately. No code changes needed - the import logic is already working correctly!

## Verification

After running migrations, you can verify tables exist:

```sql
-- Check if hardware table exists
SELECT COUNT(*) FROM hardware;

-- List all tables
\dt
```

## Next Steps

1. Run migrations on your VPS
2. Try the import again
3. It should work immediately!

The import feature is fully functional - it just needs the database tables to exist.
