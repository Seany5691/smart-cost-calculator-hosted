# Leads Management System Migration Guide

## Overview

This guide provides step-by-step instructions for migrating the Leads Management System from Supabase to PostgreSQL, ensuring complete data parity and integrity.

**Requirements Covered:** 14.1-14.24, 28.1-28.24

## Prerequisites

Before starting the migration, ensure you have:

1. **Access to both databases:**
   - Supabase URL and Service Key
   - PostgreSQL connection string

2. **Required Node.js packages:**
   ```bash
   npm install @supabase/supabase-js pg
   ```

3. **Environment variables set:**
   ```bash
   export SUPABASE_URL="your_supabase_url"
   export SUPABASE_SERVICE_KEY="your_service_key"
   export DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
   ```

4. **Database backup:**
   - Create a backup of your PostgreSQL database before migration
   - Export Supabase data as a backup

## Migration Process

### Step 1: Schema Update

Apply the schema migration to update the PostgreSQL database structure:

```bash
# Connect to PostgreSQL
psql $DATABASE_URL

# Run the migration
\i database/migrations/005_leads_complete_parity.sql
```

**What this does:**
- Updates the `leads` table schema to match requirements
- Adds/updates `notes`, `reminders`, `routes`, and `attachments` tables
- Creates the `import_sessions` table
- Adds proper indexes and constraints
- Creates helper functions for lead numbering and timestamp updates

**Expected output:**
```
NOTICE:  Migration validation:
NOTICE:    Leads: X records
NOTICE:    Notes: X records
NOTICE:    Reminders: X records
NOTICE:    Routes: X records
NOTICE:    Attachments: X records
```

### Step 2: Data Migration

Run the data migration script to transfer data from Supabase:

```bash
cd hosted-smart-cost-calculator
node scripts/migrate-leads-from-supabase.js
```

**What this does:**
- Connects to both Supabase and PostgreSQL
- Migrates data in the following order:
  1. Leads (786 records expected)
  2. Notes (64 records expected)
  3. Reminders (28 records expected)
  4. Routes (0 records expected)
  5. Attachments (0 records expected)
- Processes data in batches of 100 records
- Transforms field names from camelCase to snake_case
- Handles data type conversions
- Logs progress and errors

**Expected output:**
```
============================================================
SUPABASE TO POSTGRESQL MIGRATION
Leads Management System Complete Parity
============================================================

✓ Testing database connections...
✓ PostgreSQL connection successful
✓ Supabase connection successful
→ Starting leads migration...
✓ Found 786 leads in Supabase
→ Migrated 100/786 leads
→ Migrated 200/786 leads
...
✓ Leads migration completed: 786 migrated, 0 failed
...
============================================================
MIGRATION SUMMARY
============================================================
Total records: 878
Migrated: 878
Failed: 0
============================================================
```

**Migration report:**
A detailed JSON report will be saved to `scripts/migration-report-[timestamp].json` containing:
- Summary statistics
- Per-table migration counts
- Error details (if any)

### Step 3: Validation

Validate the migration integrity:

```bash
node scripts/validate-leads-migration.js
```

**What this validates:**
1. **Record Counts:** Verifies counts match between Supabase and PostgreSQL
2. **Foreign Key Integrity:** Checks for orphaned records
3. **Enum Values:** Validates status fields contain only valid values
4. **Required Fields:** Ensures no NULL values in required columns
5. **Data Types:** Validates data type consistency
6. **Unique Constraints:** Checks for duplicate user_id + number combinations
7. **Timestamp Preservation:** Verifies timestamps were preserved correctly
8. **Indexes:** Confirms all required indexes exist

**Expected output:**
```
======================================================================
LEADS MIGRATION VALIDATION
======================================================================

--- Validating Record Counts ---

✓ Record Count: leads: Counts match: 786 records
✓ Record Count: notes: Counts match: 64 records
✓ Record Count: reminders: Counts match: 28 records
✓ Record Count: routes: Counts match: 0 records
✓ Record Count: attachments: Counts match: 0 records

--- Validating Foreign Key Integrity ---

✓ Foreign Key: leads.user_id → users: No orphaned records
✓ Foreign Key: notes.lead_id → leads: No orphaned records
...

--- Validating Enum Values ---

✓ Enum Values: Lead Status: All status values are valid: new, leads, working, later, bad, signed
...

======================================================================
VALIDATION SUMMARY
======================================================================
Total Tests: 45
Passed: 45
Failed: 0
Warnings: 0
======================================================================
```

**Validation report:**
A detailed JSON report will be saved to `scripts/validation-report-[timestamp].json`

## Database Schema Details

### Leads Table

```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number INTEGER,
  maps_address TEXT,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  provider VARCHAR(50),
  address TEXT,
  town VARCHAR(255),
  contact_person VARCHAR(255),
  type_of_business VARCHAR(255),
  status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'leads', 'working', 'bad', 'later', 'signed')),
  notes TEXT,
  date_to_call_back DATE,
  date_signed DATE,
  coordinates JSONB,
  background_color VARCHAR(50),
  list_name VARCHAR(255),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, number)
);
```

**Key Features:**
- Auto-incrementing `number` per user (via helper function)
- Status enum constraint
- Unique constraint on (user_id, number)
- Indexes on user_id, status, list_name, date_to_call_back

### Notes Table

```sql
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Key Features:**
- Cascade delete when lead is deleted
- Indexed on lead_id and user_id

### Reminders Table

```sql
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reminder_type VARCHAR(50) CHECK (reminder_type IN ('call', 'email', 'meeting', 'follow_up', 'other')),
  priority VARCHAR(50) CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMP NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  message TEXT,
  reminder_date DATE,
  reminder_time TIME,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'snoozed')),
  recurrence_pattern VARCHAR(50),
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Key Features:**
- Supports both old (due_date, title, description) and new (reminder_date, reminder_time, message) formats
- Status enum constraint
- Indexed on lead_id, user_id, and reminder_date

### Routes Table

```sql
CREATE TABLE routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  google_maps_url TEXT NOT NULL,
  stop_count INTEGER NOT NULL,
  lead_ids UUID[] NOT NULL,
  starting_point VARCHAR(255),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Key Features:**
- Stores lead IDs as array
- Status enum constraint
- Indexed on user_id and status

### Attachments Table

```sql
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  description TEXT,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Key Features:**
- Cascade delete when lead is deleted
- Stores file metadata (size, type, path)
- Indexed on lead_id

### Import Sessions Table

```sql
CREATE TABLE import_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('scraper', 'excel')),
  list_name TEXT NOT NULL,
  imported_records INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Key Features:**
- Tracks import operations
- Source type enum constraint
- Status enum constraint
- Indexed on user_id and created_at

## Field Mapping

### Supabase → PostgreSQL Field Name Mapping

| Supabase Field | PostgreSQL Field | Notes |
|----------------|------------------|-------|
| `mapsAddress` | `maps_address` | Snake case conversion |
| `typeOfBusiness` | `type_of_business` | Snake case conversion |
| `dateToCallBack` | `date_to_call_back` | Snake case conversion |
| `dateSigned` | `date_signed` | Snake case conversion |
| `backgroundColor` | `background_color` | Snake case conversion |
| `listName` | `list_name` | Snake case conversion |
| `userId` | `user_id` | Snake case conversion |
| `createdAt` | `created_at` | Snake case conversion |
| `updatedAt` | `updated_at` | Snake case conversion |
| `contactPerson` | `contact_person` | Snake case conversion |

### Notes Table Mapping

| Supabase Field | PostgreSQL Field |
|----------------|------------------|
| `leadId` | `lead_id` |
| `userId` | `user_id` |
| `createdAt` | `created_at` |
| `updatedAt` | `updated_at` |

### Reminders Table Mapping

| Supabase Field | PostgreSQL Field | Transformation |
|----------------|------------------|----------------|
| `leadId` | `lead_id` | Direct mapping |
| `userId` | `user_id` | Direct mapping |
| `dueDate` | `due_date` | Direct mapping |
| `dueDate` | `reminder_date` | Extract date part |
| `dueDate` | `reminder_time` | Extract time part |
| `title` + `description` | `message` | Concatenated |
| `completed` | `status` | Boolean → enum ('pending'/'completed') |
| `reminderType` | `reminder_type` | Direct mapping |

### Routes Table Mapping

| Supabase Field | PostgreSQL Field |
|----------------|------------------|
| `userId` | `user_id` |
| `routeUrl` | `google_maps_url` |
| `stopCount` | `stop_count` |
| `leadIds` | `lead_ids` |
| `startingPoint` | `starting_point` |
| `createdAt` | `created_at` |

### Attachments Table Mapping

| Supabase Field | PostgreSQL Field |
|----------------|------------------|
| `leadId` | `lead_id` |
| `fileName` | `filename` |
| `fileType` | `mime_type` |
| `fileSize` | `file_size` |
| `storagePath` | `file_path` |
| `userId` | `user_id` |
| `createdAt` | `created_at` |

## Troubleshooting

### Common Issues

#### 1. Connection Errors

**Problem:** Cannot connect to Supabase or PostgreSQL

**Solution:**
- Verify environment variables are set correctly
- Check network connectivity
- Ensure service keys have proper permissions
- Test connections manually:
  ```bash
  psql $DATABASE_URL -c "SELECT 1"
  ```

#### 2. Record Count Mismatch

**Problem:** PostgreSQL has fewer records than Supabase

**Solution:**
- Check migration logs for errors
- Look for foreign key constraint violations
- Verify user_id values exist in users table
- Re-run migration for failed records

#### 3. Foreign Key Violations

**Problem:** Cannot insert records due to missing foreign keys

**Solution:**
- Ensure users table is populated first
- Check that referenced lead_id values exist
- Verify user_id values are valid UUIDs

#### 4. Enum Value Errors

**Problem:** Invalid status values

**Solution:**
- Check for typos in status values
- Verify status values match enum constraints
- Update invalid values before migration:
  ```sql
  UPDATE leads SET status = 'new' WHERE status NOT IN ('new', 'leads', 'working', 'later', 'bad', 'signed');
  ```

#### 5. Duplicate Key Violations

**Problem:** Duplicate user_id + number combinations

**Solution:**
- Run renumbering script to fix duplicates:
  ```sql
  -- Renumber leads for each user
  WITH numbered AS (
    SELECT id, user_id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as new_number
    FROM leads
  )
  UPDATE leads l
  SET number = n.new_number
  FROM numbered n
  WHERE l.id = n.id;
  ```

### Rollback Procedure

If migration fails and you need to rollback:

1. **Restore PostgreSQL backup:**
   ```bash
   pg_restore -d $DATABASE_URL backup.dump
   ```

2. **Or manually delete migrated data:**
   ```sql
   -- Delete in reverse order to respect foreign keys
   DELETE FROM attachments WHERE created_at > 'migration_start_time';
   DELETE FROM reminders WHERE created_at > 'migration_start_time';
   DELETE FROM notes WHERE created_at > 'migration_start_time';
   DELETE FROM routes WHERE created_at > 'migration_start_time';
   DELETE FROM leads WHERE created_at > 'migration_start_time';
   ```

3. **Re-run migration after fixing issues**

## Post-Migration Tasks

After successful migration:

1. **Update application configuration:**
   - Point application to PostgreSQL database
   - Remove Supabase dependencies (if no longer needed)
   - Update connection strings in environment variables

2. **Test application functionality:**
   - Verify all CRUD operations work
   - Test search and filtering
   - Test bulk operations
   - Test import/export functionality

3. **Monitor performance:**
   - Check query performance
   - Verify indexes are being used
   - Monitor database connections

4. **Archive Supabase data:**
   - Export final backup from Supabase
   - Store backup securely
   - Document retention policy

## Maintenance

### Regular Tasks

1. **Vacuum and analyze:**
   ```sql
   VACUUM ANALYZE leads;
   VACUUM ANALYZE notes;
   VACUUM ANALYZE reminders;
   ```

2. **Check index usage:**
   ```sql
   SELECT schemaname, tablename, indexname, idx_scan
   FROM pg_stat_user_indexes
   WHERE schemaname = 'public'
   ORDER BY idx_scan;
   ```

3. **Monitor table sizes:**
   ```sql
   SELECT 
     tablename,
     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
   FROM pg_tables
   WHERE schemaname = 'public'
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
   ```

## Support

For issues or questions:
1. Check migration logs in `scripts/migration-report-*.json`
2. Check validation logs in `scripts/validation-report-*.json`
3. Review error messages in console output
4. Consult this guide's troubleshooting section

## References

- Requirements Document: `.kiro/specs/leads-complete-parity/requirements.md`
- Design Document: `.kiro/specs/leads-complete-parity/design.md`
- Tasks Document: `.kiro/specs/leads-complete-parity/tasks.md`
- Migration SQL: `database/migrations/005_leads_complete_parity.sql`
- Migration Script: `scripts/migrate-leads-from-supabase.js`
- Validation Script: `scripts/validate-leads-migration.js`
