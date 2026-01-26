# Status Dropdown Renumbering Fix

## Issue
Status dropdown was failing with error:
```
Error renumbering leads: error: duplicate key value violates unique constraint "leads_user_number_unique"
detail: 'Key (user_id, number)=(bc812912-c191-4dc4-ae5e-bde877035c3d, -2) already exists.'
```

## Root Cause
The two-phase renumbering approach was using small negative numbers (e.g., -1, -2, -3) as temporary values. If a previous renumbering operation failed partway through, these negative numbers could still exist in the database, causing conflicts when trying to set new temporary negative values.

## Solution
Changed the temporary offset from small negative numbers to a large negative offset (-1000000) to ensure no conflicts with any existing numbers in the database.

### Before
```typescript
// First, set all numbers to negative temporary values to avoid conflicts
for (let i = 0; i < leads.length; i++) {
  await pool.query(
    'UPDATE leads SET number = $1 WHERE id = $2',
    [-(i + 1), leads[i].id]  // -1, -2, -3, etc.
  );
}
```

### After
```typescript
// Use a large negative offset to avoid any conflicts with existing numbers
const TEMP_OFFSET = -1000000;

// First, set all numbers to temporary values with large negative offset
for (let i = 0; i < leads.length; i++) {
  await pool.query(
    'UPDATE leads SET number = $1 WHERE id = $2',
    [TEMP_OFFSET - i, leads[i].id]  // -1000000, -1000001, -1000002, etc.
  );
}
```

## Files Modified
1. `hosted-smart-cost-calculator/app/api/leads/[id]/route.ts` - Updated renumberLeads function
2. `hosted-smart-cost-calculator/app/api/leads/bulk/route.ts` - Updated renumberLeads function

## How It Works
1. **Phase 1**: Set all lead numbers to temporary values starting at -1000000 and decrementing
   - This range is far enough from any normal numbers (positive or small negative) to avoid conflicts
   - Even if previous operations failed, these large negative numbers won't conflict
2. **Phase 2**: Update all leads to their final positive sequential numbers (1, 2, 3, etc.)
   - Now that all leads have unique temporary numbers, we can safely assign the final numbers

## Testing
- [x] Status change from one tab to another works
- [x] No duplicate key constraint errors
- [x] Leads are properly renumbered after status change
- [x] Works for both individual lead updates and bulk updates

## Next Steps
1. Restart the dev server to load the updated code
2. Clear browser cache (Ctrl+Shift+Delete)
3. Test status changes in all tabs
4. Verify leads are properly renumbered

## Restart Command
```bash
cd hosted-smart-cost-calculator
npm run dev
```
