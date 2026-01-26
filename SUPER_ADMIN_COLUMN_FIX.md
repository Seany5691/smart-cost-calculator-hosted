# Super Admin Column Fix

## Root Cause Identified

The authentication issues are caused by a **database schema inconsistency**:

- The initial schema (`001_initial_schema.sql`) created column: `is_super_admin`
- The migration (`004_add_super_admin.sql`) tried to add column: `super_admin` (without `is_`)
- The code in `lib/auth.ts` was looking for: `is_super_admin`
- The check script was looking for: `super_admin`

This mismatch caused:
1. ❌ Login failures for Camryn (couldn't find super admin flag)
2. ❌ 401 errors in admin console (role not being read correctly)
3. ❌ Total costs not calculating (user role not available)

## The Fix

### 1. Run the Fix Script

This script will:
- Check which columns exist in your database
- Consolidate to use `is_super_admin` as the standard column name
- Ensure Camryn is properly marked as super admin
- Create proper indexes

```bash
cd hosted-smart-cost-calculator
node scripts/fix-super-admin-column.js
```

### 2. Updated Code

The `lib/auth.ts` file has been updated to handle both column names for compatibility:

```typescript
// Now checks for both column names
SELECT id, username, role, name, email, is_active, requires_password_change, 
       COALESCE(is_super_admin, super_admin, false) as is_super_admin, 
       created_at, updated_at 
FROM users 
WHERE username = $1 AND (is_super_admin = true OR super_admin = true)
```

### 3. Verify the Fix

After running the fix script, check users:

```bash
node scripts/check-users.js
```

Expected output:
```
Using column: is_super_admin

=== User Status ===
Camryn:
  Role: admin
  Super Admin: YES

Nick:
  Role: manager
  Super Admin: NO
```

## What This Fixes

### ✅ Authentication Issues
- Camryn can now log in successfully
- JWT token will contain correct role
- Super admin flag is properly read

### ✅ Admin Console 401 Errors
- After logging in as Camryn, admin console will work
- Can add/edit/delete hardware, licensing, connectivity items
- No more 401 Unauthorized errors

### ✅ Total Costs Calculation
- User role is properly available in calculator
- Role-based pricing works correctly
- Factors and scales are applied based on correct role

## Testing Steps

### 1. Run the Fix Script
```bash
cd hosted-smart-cost-calculator
node scripts/fix-super-admin-column.js
```

### 2. Verify Database
```bash
node scripts/check-users.js
```

### 3. Clear Browser Storage
- Open browser DevTools (F12)
- Go to Application tab
- Clear all localStorage and sessionStorage
- Or just clear site data for localhost:3000

### 4. Restart Dev Server
```bash
# Stop server (Ctrl+C)
# Start fresh
npm run dev
```

### 5. Test Login
1. Navigate to `http://localhost:3000/login`
2. Log in as Camryn:
   - Username: `Camryn`
   - Password: `Elliot6242!`
3. Should redirect to dashboard successfully

### 6. Test Admin Console
1. Navigate to `/admin`
2. Try adding a hardware item
3. Should work without 401 errors

### 7. Test Calculator
1. Navigate to `/calculator`
2. Fill in all steps
3. Total Costs should calculate properly
4. Check browser console - should see role being used

## Files Modified

### Scripts:
- `hosted-smart-cost-calculator/scripts/fix-super-admin-column.js` (NEW) - Fixes database schema
- `hosted-smart-cost-calculator/scripts/check-users.js` (UPDATED) - Now checks for both column names

### Code:
- `hosted-smart-cost-calculator/lib/auth.ts` (UPDATED) - Handles both column names for compatibility

### Documentation:
- `hosted-smart-cost-calculator/SUPER_ADMIN_COLUMN_FIX.md` (this file)

## Why This Happened

The migration file `004_add_super_admin.sql` was created to add the super admin feature, but it used a different column name (`super_admin`) than what was already in the initial schema (`is_super_admin`). This created a conflict where:

1. Some parts of the code looked for `is_super_admin`
2. The migration tried to create `super_admin`
3. Depending on which migration ran, the database might have one or both columns
4. The authentication code couldn't find the right column

## Prevention

Going forward:
1. Always check existing schema before creating migrations
2. Use consistent naming conventions (snake_case with `is_` prefix for booleans)
3. Test migrations on a clean database before deploying
4. Use the check-users script to verify user roles after any user-related changes

## Rollback (If Needed)

If something goes wrong, you can rollback by:

```sql
-- If you need to restore the super_admin column
ALTER TABLE users ADD COLUMN IF NOT EXISTS super_admin BOOLEAN DEFAULT FALSE;
UPDATE users SET super_admin = is_super_admin;

-- Or if you need to remove is_super_admin
ALTER TABLE users DROP COLUMN IF EXISTS is_super_admin;
ALTER TABLE users RENAME COLUMN super_admin TO is_super_admin;
```

But the fix script should handle all cases automatically.
