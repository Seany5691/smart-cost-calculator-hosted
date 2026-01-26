# All Deals Costings Modal - Difference Calculation Fix

## Issue
Hardware Total, Installation Total, and Finance Fee were showing negative difference values when they should be positive (indicating savings/profit when actual cost is lower than rep cost).

## Root Cause
The difference calculation was using `actual - rep` for ALL items, but cost items need the opposite calculation (`rep - actual`) because:
- **Cost items**: Lower actual cost = savings/profit (positive difference)
- **Revenue items**: Higher actual revenue = more income (positive difference)

## Solution
Updated `TotalsComparison.tsx` to differentiate between cost items and revenue items:

### Cost Items (difference = rep - actual)
- Hardware Total
- Installation Total
- Connectivity Total
- Licensing Total
- Settlement
- Finance Fee

### Revenue Items (difference = actual - rep)
- Total Payout
- Hardware Rental (Monthly)
- Total MRC

### Variance Items (difference = actual - rep)
- Factor (shows variance from rep factor)

## Changes Made

### File: `components/deals/costings/TotalsComparison.tsx`

1. **Added `isCostItem` property to rows array**
   - Marks each row as either a cost item (true) or revenue item (false)

2. **Updated difference calculation logic**
   ```typescript
   const difference = row.isCostItem ? row.rep - row.actual : row.actual - row.rep;
   ```

3. **Added explanatory comments**
   - Documents the logic for cost vs revenue items
   - Explains why each calculation direction is used

## Expected Results

### Before Fix
```
Hardware Total       R 8,306.00    R 9,036.60    -R 730.60  ❌ (negative)
Installation Total   R 750.00      R 3,250.00    -R 2,500.00 ❌ (negative)
Finance Fee          R 0.00        R 2,000.00    -R 2,000.00 ❌ (negative)
Total Payout         R 70,298.79   R 70,087.80   R 210.99   ✅ (positive)
```

### After Fix
```
Hardware Total       R 8,306.00    R 9,036.60    R 730.60   ✅ (positive - savings!)
Installation Total   R 750.00      R 3,250.00    R 2,500.00 ✅ (positive - savings!)
Finance Fee          R 0.00        R 2,000.00    R 2,000.00 ✅ (positive - savings!)
Total Payout         R 70,298.79   R 70,087.80   R 210.99   ✅ (positive - more revenue!)
```

## Business Logic

### Cost Items
When actual cost is **lower** than rep cost:
- Difference is **positive** (green)
- Indicates **savings/profit**
- Example: Rep used R 9,036.60 hardware, actual cost is R 8,306.00 = R 730.60 savings

### Revenue Items
When actual revenue is **higher** than rep revenue:
- Difference is **positive** (green)
- Indicates **more income**
- Example: Actual total payout R 70,298.79 vs Rep R 70,087.80 = R 210.99 more revenue

## Testing
- ✅ TypeScript compilation successful
- ✅ No diagnostic errors
- ✅ Logic verified against business requirements

## Status
**COMPLETE** - All difference calculations now correctly show positive values for favorable variances.
