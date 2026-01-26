# Migration Scripts

This directory contains scripts for migrating data from Supabase to PostgreSQL.

## Quick Start

```bash
# 1. Set environment variables
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_KEY=your-service-role-key
export DATABASE_URL=postgresql://user:pass@localhost:5432/dbname

# 2. Export from Supabase
npm run migration:export

# 3. Import to PostgreSQL
npm run migration:import

# 4. Verify integrity
npm run migration:verify

# 5. Rollback if needed
npm run migration:rollback
```

## Scripts

### `import-from-text.js`
Imports data from a text file containing Supabase SQL export results.

**Usage**: 
```bash
npm run migration:import-text
# Or with custom file path:
node scripts/import-from-text.js "C:\path\to\SupabaseData.txt"
```

**Requires**:
- `DATABASE_URL`
- Text file with Supabase data (default: `C:\Users\DELL\Documents\HostedSmartCostCalculator\SupabaseData.txt`)

**Features**:
- Parses JSON data from SQL export results
- Transforms field names (camelCase → snake_case)
- Maps table names (e.g., `lead_notes` → `notes`)
- Skips duplicate records (ON CONFLICT DO NOTHING)
- Handles all data types including JSONB and arrays

**Output**: Data imported directly into PostgreSQL

### `supabase-export.js`
Exports all data from Supabase to JSON files.

**Usage**: `npm run migration:export`

**Requires**:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY` (service role key, not anon key!)

**Output**: `migration-data/` directory with JSON files

### `supabase-import.js`
Imports data from JSON files into PostgreSQL.

**Usage**: `npm run migration:import`

**Requires**:
- `DATABASE_URL`

**Output**: 
- Data imported into PostgreSQL
- Backups in `migration-backup/`

### `verify-migration.js`
Verifies data integrity after migration.

**Usage**: `npm run migration:verify`

**Requires**:
- `DATABASE_URL`

**Checks**:
- Row counts
- Checksums
- Foreign keys
- Constraints

### `supabase-rollback.js`
Restores data from backups.

**Usage**: `npm run migration:rollback`

**Requires**:
- `DATABASE_URL`

**Restores**: Data from `migration-backup/`

## Database Migrations

### `migrate.js`
Runs database schema migrations.

**Usage**: `npm run migrate`

**Requires**:
- `DATABASE_URL`

### `rollback.js`
Rolls back the last migration.

**Usage**: `npm run migrate:rollback`

**Requires**:
- `DATABASE_URL`

## Environment Variables

Create a `.env` file in the project root:

```bash
# Supabase (for data export)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# PostgreSQL (for data import)
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# JWT Secret (for application)
JWT_SECRET=your-secret-key-here
```

## Migration Process

1. **Export**: Download all data from Supabase
2. **Import**: Transform and load into PostgreSQL
3. **Verify**: Check data integrity
4. **Rollback**: Restore if needed (optional)

See `MIGRATION_GUIDE.md` for detailed instructions.

## Troubleshooting

### Export fails with "permission denied"
- Use service role key, not anon key
- Check Supabase URL is correct

### Import fails with "checksum mismatch"
- Re-run export to get fresh data
- Check for data corruption

### Verification fails with "orphaned records"
- Check foreign key relationships in source data
- May need manual cleanup

### Need to re-import
```bash
# Clear PostgreSQL tables
psql $DATABASE_URL -c "TRUNCATE TABLE table_name CASCADE;"

# Re-run import
npm run migration:import
```

## File Structure

```
scripts/
├── README.md                 # This file
├── migrate.js                # Schema migrations
├── rollback.js               # Schema rollback
├── supabase-export.js        # Export from Supabase
├── supabase-import.js        # Import to PostgreSQL
├── verify-migration.js       # Verify integrity
└── supabase-rollback.js      # Restore from backup

migration-data/               # Export files (gitignored)
├── users.json
├── hardware_items.json
├── ...
├── export-summary.json
├── import-summary.json
└── verification-summary.json

migration-backup/             # Backup files (gitignored)
├── users_backup.json
├── hardware_items_backup.json
└── ...
```

## Safety Features

- **Checksums**: MD5 hashes verify data integrity
- **Backups**: Automatic backups before import
- **Transactions**: Rollback on error
- **Verification**: Comprehensive integrity checks
- **Rollback**: Restore from backups if needed

## Performance

Migration time depends on data size:

- Small (<1K rows): ~5 minutes
- Medium (1K-10K rows): ~15 minutes
- Large (>10K rows): ~30 minutes

Each step (export, import, verify) takes similar time.
