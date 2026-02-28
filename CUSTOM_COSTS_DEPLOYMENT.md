# Custom Actual Costs Feature - Deployment Instructions

## Overview
This feature allows admins to edit actual cost prices for individual items (hardware, connectivity, licensing) in the costings breakdown modal. Custom costs are stored per-deal and don't affect the global admin console configuration.

## Deployment Steps

### Step 1: Run Database Migration

**On your Dockploy server**, run the following command:

```bash
node run-scraper-migrations.js 022_custom_actual_costs.sql
```

This will:
- Add the `custom_actual_costs` column to `deal_calculations` table
- Create the necessary index
- Verify the migration was successful

### Step 2: Verify Migration

The migration script will output verification results. You should see:
```
✅ Migration: 022 custom actual costs completed successfully
🎉 Migration completed successfully!
```

### Step 3: Deploy Application

After the migration is successful:
1. The application should automatically redeploy (if auto-deploy is enabled)
2. Or manually trigger a deployment in Dockploy

### Step 4: Test the Feature

1. Login as an admin user
2. Go to "All Deals" section
3. Click "Costings" button on any deal
4. In the costings modal, you should see:
   - "Edit" link next to each item's Actual Cost
   - Click "Edit" to modify the cost
   - Save, Cancel, or Reset buttons appear
   - Changes save automatically and recalculate all totals

## How It Works

### For Admins:
1. Open costings modal for any deal
2. Click "Edit" next to any item's actual cost
3. Enter new cost value
4. Click "Save" to apply (auto-saves to database)
5. Click "Reset" to restore original config cost
6. All totals, profits, and GP recalculate automatically

### Data Flow:
1. Custom costs are stored in `deal_calculations.custom_actual_costs` column
2. When costings are generated, API checks for custom costs first
3. If custom cost exists, use it; otherwise use config cost
4. Custom costs only affect that specific deal
5. Global admin console config remains unchanged

## Rollback Plan

If you need to rollback:

```sql
-- Remove the column (this will delete all custom cost data)
ALTER TABLE deal_calculations DROP COLUMN IF EXISTS custom_actual_costs;

-- Remove the index
DROP INDEX IF EXISTS idx_deals_custom_costs;
```

Then redeploy the previous version of the application.

## Notes

- Custom costs are optional - if not set, original config costs are used
- Only admin users can see/use the edit functionality
- Custom costs persist when reopening the costings modal
- Reset button restores the original cost from admin console config
- All calculations (totals, profits, GP, term analysis) update in real-time

## Troubleshooting

### Migration fails with "column already exists"
The column may have been added in a previous attempt. You can safely ignore this error or manually verify the column exists:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'deal_calculations' 
AND column_name = 'custom_actual_costs';
```

### Edit buttons don't appear
- Verify you're logged in as an admin user
- Check browser console for errors
- Verify the API endpoint `/api/deals/[id]/custom-costs` is accessible

### Changes don't save
- Check browser console for API errors
- Verify database migration was successful
- Check server logs for error messages

## Files Changed

### Backend:
- `database/migrations/022_custom_actual_costs.sql` (new)
- `run-custom-costs-migration.js` (new)
- `app/api/deals/[id]/custom-costs/route.ts` (new)
- `app/api/deals/[id]/costings/route.ts` (modified)
- `lib/store/deals.ts` (modified - added hasCustomCost flag)

### Frontend:
- `components/deals/CostingsModal.tsx` (modified)
- `components/deals/costings/HardwareBreakdown.tsx` (modified)
- `components/deals/costings/ConnectivityBreakdown.tsx` (modified)
- `components/deals/costings/LicensingBreakdown.tsx` (modified)

## Commit Hash
`acde8f0` - "Add editable actual costs feature for costings modal"
