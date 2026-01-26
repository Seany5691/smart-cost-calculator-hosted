# Factors Import/Export Fix - Column Name Correction

## Problem

Factors import and export were not working due to incorrect database column name.

## Root Cause

The database schema uses `factors_data` (plural) as the column name, but the import and export routes were using `factor_data` (singular).

**Database Schema:**
```sql
CREATE TABLE IF NOT EXISTS factors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factors_data JSONB NOT NULL,  -- ✅ Correct: plural
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Import/Export Routes (Before Fix):**
```typescript
// ❌ Wrong: singular
SELECT factor_data FROM factors WHERE id = 1
UPDATE factors SET factor_data = $1
INSERT INTO factors (id, factor_data, ...)
```

**Main Factors Route (Correct):**
```typescript
// ✅ Correct: plural
SELECT factors_data FROM factors
UPDATE factors SET factors_data = $1
```

## The Fix

### Import Route (`app/api/config/factors/import/route.ts`)

**Before:**
```typescript
// Update factors in database
await query(
  `UPDATE factors 
   SET factor_data = $1, updated_at = NOW()
   WHERE id = 1`,
  [JSON.stringify(factorData)]
);

// If no factors exist, insert them
const checkResult = await query('SELECT id FROM factors WHERE id = 1');
if (checkResult.rows.length === 0) {
  await query(
    `INSERT INTO factors (id, factor_data, created_at, updated_at)
     VALUES (1, $1, NOW(), NOW())`,
    [JSON.stringify(factorData)]
  );
}
```

**After:**
```typescript
// Get the most recent factor sheet ID or create if none exists
const checkResult = await query('SELECT id FROM factors ORDER BY created_at DESC LIMIT 1');

if (checkResult.rows.length === 0) {
  // No factors exist, insert new
  await query(
    `INSERT INTO factors (factors_data, created_at, updated_at)
     VALUES ($1, NOW(), NOW())`,
    [JSON.stringify(factorData)]
  );
} else {
  // Update existing factors
  const currentId = checkResult.rows[0].id;
  await query(
    `UPDATE factors 
     SET factors_data = $1, updated_at = NOW()
     WHERE id = $2`,
    [JSON.stringify(factorData), currentId]
  );
}
```

### Export Route (`app/api/config/factors/export/route.ts`)

**Before:**
```typescript
// Fetch factors
const result = await query('SELECT factor_data FROM factors WHERE id = 1');
const factorData = result.rows[0].factor_data;
```

**After:**
```typescript
// Fetch factors (get most recent)
const result = await query('SELECT factors_data FROM factors ORDER BY created_at DESC LIMIT 1');
const factorData = result.rows[0].factors_data;
```

## Additional Improvements

1. **Removed hardcoded ID**: Changed from `WHERE id = 1` to `ORDER BY created_at DESC LIMIT 1` to get the most recent factor sheet
2. **Better logic flow**: Check first, then insert or update based on existence
3. **Consistent with main route**: Now matches the pattern used in the main factors route

## Testing

After pulling and rebuilding on VPS:

1. **Export Test:**
   - Go to Admin Config → Factors
   - Click "Export"
   - Should download `factors-config-YYYY-MM-DD.xlsx` with all factor data

2. **Import Test:**
   - Export factors first (to get a template)
   - Modify some values in the Excel file
   - Click "Import"
   - Select the modified file
   - Should see "Import Successful" with row count
   - Verify changes appear in the factor grid

## Files Changed

1. `app/api/config/factors/import/route.ts` - Fixed column name and logic
2. `app/api/config/factors/export/route.ts` - Fixed column name and query

## Commit

- **Commit**: eff91fc - "Fix factors import/export: correct column name from factor_data to factors_data"
- **Date**: 2026-01-21

## On VPS

Run these commands to apply the fix:

```bash
cd /app
git pull
rm -rf .next
npm run build
pm2 restart all
```

Then test the import/export functionality!

---

**Status**: FIXED ✅  
**Same Issue as Hardware**: Column name mismatch (factor_data vs factors_data)
