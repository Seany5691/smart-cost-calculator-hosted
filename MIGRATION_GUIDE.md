# Supabase to PostgreSQL Migration Guide

This guide walks you through migrating data from Supabase to a self-hosted PostgreSQL database.

## Overview

The migration process consists of three main steps:

1. **Export**: Extract all data from Supabase using their JavaScript client
2. **Import**: Transform and load data into PostgreSQL with proper field mappings
3. **Verify**: Validate data integrity with checksums and relationship checks

## Prerequisites

- Node.js 18+ installed
- Access to your Supabase project (URL and service role key)
- PostgreSQL database set up and running
- Database schema already created (run migrations first)

## Environment Variables

Create a `.env` file in the `hosted-smart-cost-calculator` directory:

```bash
# Supabase credentials (for export)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here

# PostgreSQL credentials (for import)
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
```

**Important**: Use the **service role key**, not the anon key! The service role key bypasses Row Level Security (RLS) and can read all data.

## Step 1: Install Dependencies

```bash
cd hosted-smart-cost-calculator
npm install @supabase/supabase-js pg
```

## Step 2: Run Database Migrations

Before importing data, ensure your PostgreSQL schema is set up:

```bash
npm run migrate
```

This creates all tables, indexes, and constraints.

## Migration Methods

There are two ways to migrate your data:

### Method A: Direct Import from Text File (Recommended for Simple Migrations)

If you've already exported your Supabase data to a text file using SQL queries:

1. **Export data from Supabase** using the SQL Editor:
   ```sql
   -- Run this query for each table to get JSON data
   SELECT json_agg(row_to_json(t)) FROM users t;
   SELECT json_agg(row_to_json(t)) FROM hardware_items t;
   -- ... repeat for all tables
   ```

2. **Save the results** to a text file (e.g., `SupabaseData.txt`)

3. **Run the import script**:
   ```bash
   npm run migration:import-text
   ```
   
   Or specify a custom file path:
   ```bash
   node scripts/import-from-text.js "C:\path\to\your\SupabaseData.txt"
   ```

This method:
- ✅ Simple and straightforward
- ✅ No need for Supabase API keys
- ✅ Works with manual SQL exports
- ✅ Handles field name transformations automatically
- ✅ Skips duplicate records (ON CONFLICT DO NOTHING)

### Method B: Automated Export/Import (Recommended for Large Datasets)

For automated migration using Supabase JavaScript client:

## Step 3: Export Data from Supabase

Run the export script to download all data from Supabase:

```bash
node scripts/supabase-export.js
```

This will:
- Connect to your Supabase project
- Export all tables to JSON files in `migration-data/`
- Calculate checksums for data integrity
- Generate an export summary report

**Output**: `migration-data/` directory containing:
- `users.json`
- `hardware_items.json`
- `connectivity_items.json`
- `licensing_items.json`
- `factors.json`
- `scales.json`
- `deal_calculations.json`
- `leads.json`
- `notes.json`
- `reminders.json`
- `routes.json`
- `attachments.json`
- `interactions.json`
- `scraping_sessions.json`
- `scraped_businesses.json`
- `activity_log.json`
- `export-summary.json`

## Step 4: Import Data into PostgreSQL

Run the import script to load data into PostgreSQL:

```bash
node scripts/supabase-import.js
```

This will:
- Read exported JSON files
- Transform field names (camelCase → snake_case)
- Create backups of existing data
- Import data in correct dependency order
- Verify checksums match
- Generate an import summary report

**Output**: 
- Data imported into PostgreSQL
- Backups saved to `migration-backup/`
- `migration-data/import-summary.json`

### Field Name Transformations

The import script automatically transforms Supabase field names to PostgreSQL conventions:

| Supabase (camelCase) | PostgreSQL (snake_case) |
|---------------------|------------------------|
| `isActive` | `is_active` |
| `createdAt` | `created_at` |
| `updatedAt` | `updated_at` |
| `userId` | `user_id` |
| `managerCost` | `manager_cost` |
| `userCost` | `user_cost` |
| `mapsAddress` | `maps_address` |
| `dateToCallBack` | `date_to_call_back` |
| etc. | etc. |

## Step 5: Verify Migration Integrity

Run the verification script to ensure data was migrated correctly:

```bash
node scripts/verify-migration.js
```

This will:
- Compare row counts between export and PostgreSQL
- Verify checksums for data integrity
- Check foreign key relationships (no orphaned records)
- Validate data constraints (enum values, NOT NULL, etc.)
- Generate a verification report

**Output**: `migration-data/verification-summary.json`

## Rollback (If Needed)

If something goes wrong during import, you can restore from backups:

```bash
node scripts/supabase-rollback.js
```

This will:
- Read backup files from `migration-backup/`
- Restore data to previous state
- Maintain referential integrity

## Migration Scripts Reference

### `supabase-export.js`

Exports all data from Supabase to JSON files.

**Features**:
- Paginated queries for large tables (1000 rows per page)
- MD5 checksums for integrity verification
- Handles all table types (users, config, deals, leads, etc.)
- Generates export summary with row counts

**Environment Variables**:
- `SUPABASE_URL` (required)
- `SUPABASE_SERVICE_KEY` (required)

### `supabase-import.js`

Imports data from JSON files into PostgreSQL.

**Features**:
- Automatic field name transformation (camelCase → snake_case)
- Creates backups before import
- Transactional imports (rollback on error)
- Maintains foreign key relationships
- Verifies checksums during import

**Environment Variables**:
- `DATABASE_URL` (required)

### `verify-migration.js`

Verifies data integrity after migration.

**Checks**:
- Row count comparison (export vs PostgreSQL)
- Checksum verification
- Foreign key integrity (no orphaned records)
- Data constraint validation (enum values, NOT NULL)

**Environment Variables**:
- `DATABASE_URL` (required)

### `supabase-rollback.js`

Restores data from backups.

**Features**:
- Reads backups from `migration-backup/`
- Restores in reverse dependency order
- Transactional restore (rollback on error)

**Environment Variables**:
- `DATABASE_URL` (required)

## Troubleshooting

### Export Issues

**Problem**: "Failed to fetch table: permission denied"
- **Solution**: Ensure you're using the **service role key**, not the anon key

**Problem**: "Connection timeout"
- **Solution**: Check your Supabase URL and network connection

### Import Issues

**Problem**: "Checksum mismatch"
- **Solution**: Re-run the export script to get fresh data

**Problem**: "Foreign key constraint violation"
- **Solution**: Check that parent tables were imported before child tables

**Problem**: "Duplicate key violation"
- **Solution**: Clear the PostgreSQL table before re-importing:
  ```sql
  TRUNCATE TABLE table_name CASCADE;
  ```

### Verification Issues

**Problem**: "Row count mismatch"
- **Solution**: Check import logs for errors, re-run import if needed

**Problem**: "Orphaned records found"
- **Solution**: Check foreign key relationships in Supabase data, may need manual cleanup

## Post-Migration Checklist

After successful migration:

- [ ] Verify all row counts match
- [ ] Test application login with existing users
- [ ] Check that deals load correctly
- [ ] Verify leads display properly
- [ ] Test calculator with existing configurations
- [ ] Check scraper sessions and results
- [ ] Verify notes, reminders, and routes
- [ ] Test file attachments (may need separate migration)
- [ ] Update application to use PostgreSQL connection
- [ ] Remove Supabase dependencies from code
- [ ] Archive migration data and backups

## File Attachments

If your application has file attachments stored in Supabase Storage, you'll need to migrate them separately:

1. Download files from Supabase Storage
2. Upload to your local storage or S3-compatible service
3. Update `storage_path` in the `attachments` table

## Security Notes

- **Never commit** `.env` files with credentials
- **Keep backups** of migration data for at least 30 days
- **Test thoroughly** before decommissioning Supabase
- **Rotate credentials** after migration is complete

## Support

If you encounter issues:

1. Check the logs in each script's output
2. Review the summary JSON files for details
3. Consult the verification report for specific failures
4. Use rollback if needed to restore previous state

## Migration Timeline

Estimated time for migration (depends on data size):

- Small dataset (<1000 rows): 5-10 minutes
- Medium dataset (1000-10000 rows): 15-30 minutes
- Large dataset (>10000 rows): 30-60 minutes

Each step (export, import, verify) typically takes similar amounts of time.
