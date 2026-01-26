# Import Sessions Table Fix - COMPLETE

## Issue
When trying to import leads from Excel, the system returned an error:
```
Validation Errors
• relation "import_sessions" does not exist
```

## Root Cause
The `import_sessions` table was defined in migration `005_leads_complete_parity.sql`, but the migration had not been run yet. Additionally, the migration script (`scripts/migrate.js`) was only running migration 001 instead of all pending migrations.

## Fixes Applied

### 1. Updated Migration Script (`scripts/migrate.js`)
Changed from running only migration 001 to running all pending migrations:
- Creates a `migrations` table to track executed migrations
- Reads all migration files from `database/migrations/`
- Skips already-executed migrations
- Runs pending migrations in order
- Uses transactions for safety (BEGIN/COMMIT/ROLLBACK)

### 2. Fixed Migration 005 (`database/migrations/005_leads_complete_parity.sql`)
Fixed the unique constraint issue that was preventing the migration from completing:
- Added logic to handle NULL numbers in leads table
- Added logic to fix duplicate numbers for the same user
- Ensures the unique constraint `(user_id, number)` can be created successfully

### 3. Ran All Migrations
Successfully executed all 5 migrations:
- ✓ 001_initial_schema.sql
- ✓ 002_add_attachments.sql
- ✓ 003_critical_errors.sql
- ✓ 004_add_super_admin.sql
- ✓ 005_leads_complete_parity.sql

## Tables Created by Migration 005
- `import_sessions` - Tracks Excel and scraper import sessions
- Updated `leads` table with proper constraints and indexes
- Updated `notes`, `reminders`, `routes`, and `attachments` tables
- Added helper functions for lead number generation

## Testing
The Excel import should now work correctly:
1. Navigate to Leads > Main Sheet
2. Click "Import Leads"
3. Select "Import from Excel"
4. Upload an Excel file
5. Map fields and import

The import will now create a record in the `import_sessions` table tracking the import.

## Future Migrations
To add new migrations:
1. Create a new file in `database/migrations/` with format `00X_description.sql`
2. Run `node scripts/migrate.js` from the `hosted-smart-cost-calculator` directory
3. The script will automatically detect and run only new migrations
