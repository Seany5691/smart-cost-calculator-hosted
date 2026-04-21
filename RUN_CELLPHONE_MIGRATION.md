# Run Cellphone Migration on VPS

## Migration Command

Copy and paste this command into your VPS terminal:

```bash
node -e "const { Pool } = require('pg'); const fs = require('fs'); async function runMigration() { const pool = new Pool({ connectionString: process.env.DATABASE_URL }); try { const sql = fs.readFileSync('database/migrations/026_add_user_cellphone.sql', 'utf8'); console.log('🚀 Running migration 026_add_user_cellphone.sql...'); await pool.query(sql); console.log('✅ Migration completed successfully!'); const result = await pool.query(\"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'cellphone_number';\"); console.log('\\n📋 New column added:'); result.rows.forEach(row => console.log('  ✓', row.column_name, '(' + row.data_type + ')')); } catch (error) { console.error('❌ Migration failed:', error.message); process.exit(1); } finally { await pool.end(); }} runMigration();"
```

## What This Does

- Adds `cellphone_number` column to `users` table
- Creates an index on the new column
- Adds a comment describing the column's purpose
- Verifies the column was created successfully

## Expected Output

```
🚀 Running migration 026_add_user_cellphone.sql...
✅ Migration completed successfully!

📋 New column added:
  ✓ cellphone_number (character varying)
```

## After Running Migration

1. Rebuild the application: `npm run build`
2. Restart the application: `pm2 restart smart-cost-calculator`
3. Test the new features in the UI

## Features Added

1. **Month-To-Month Checkbox** - In Generate Proposal modal for Normal/Comparative proposals
2. **Auto-fill Specialist Email** - From current user's email
3. **Cellphone Number Field** - In Admin Console → User Management
4. **Auto-fill Specialist Phone** - From current user's cellphone number

---

**Date**: April 21, 2026  
**Migration File**: `database/migrations/026_add_user_cellphone.sql`
