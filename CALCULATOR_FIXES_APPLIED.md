# Calculator Total Costs Fixes Applied

## Summary
Fixed all calculation issues in the Total Costs step to properly pull data from admin console scales and factors configurations.

## Issues Fixed

### 1. Installation Base - FIXED ✅
**Problem**: Was showing R 0.00 instead of pulling from sliding scale
**Solution**: 
- Updated `getSlidingScaleBand()` function in `lib/calculator.ts` to handle nested structure from ScalesConfig
- Structure: `{ cost: {...}, managerCost: {...}, userCost: {...} }`
- Admin and Manager roles now use `managerCost` bands
- User role uses `userCost` bands
- Added comprehensive logging for debugging

### 2. Extension Cost - FIXED ✅
**Problem**: Was incorrect, not using cost_per_point from scales config
**Solution**:
- Updated `calculateExtensionCost()` in `lib/calculator.ts`
- Admin and Manager roles use `manager_cost_per_point`
- User role uses `user_cost_per_point`
- Formula: `extensionCount × cost_per_point`
- Added logging for debugging

### 3. Fuel Cost - FIXED ✅
**Problem**: Was calculating but needed verification
**Solution**:
- Updated `calculateFuelCost()` in `lib/calculator.ts`
- Admin and Manager roles use `manager_cost_per_kilometer`
- User role uses `user_cost_per_kilometer`
- Formula: `distance × cost_per_kilometer`
- Added logging for debugging

### 4. Total Installation - FIXED ✅
**Problem**: Formula was incorrect
**Solution**:
- Corrected formula: `Installation Base + Extension Cost + Fuel Cost`
- Does NOT include Hardware Total (that's separate)
- Updated in `TotalCostsStep.tsx`

### 5. Finance Fee - FIXED ✅
**Problem**: Was showing R 0.00 instead of pulling from sliding scale
**Solution**:
- Updated `getFinanceFeeBand()` function in `lib/calculator.ts` to handle nested structure
- Iterative calculation until fee stabilizes (max 10 iterations)
- Bands: 0-20000, 20001-50000, 50001-100000, 100001+
- Admin and Manager roles use `managerCost` bands
- User role uses `userCost` bands
- Added comprehensive logging for debugging

### 6. Total Payout - FIXED ✅
**Problem**: Formula was incorrect
**Solution**:
- Corrected formula: `Hardware Total + Total Installation + Gross Profit + Settlement + Finance Fee`
- Updated in `TotalCostsStep.tsx`
- Added detailed logging showing each component

### 7. Finance Amount - FIXED ✅
**Problem**: Was not equal to Total Payout
**Solution**:
- Set `Finance Amount = Total Payout` (exact same value)
- Updated in `TotalCostsStep.tsx`

### 8. Factor Lookup - FIXED ✅
**Problem**: Was not pulling from factors config correctly
**Solution**:
- Updated `lookupFactor()` function in `lib/calculator.ts`
- Handles nested structure: `{ cost: {...}, managerFactors: {...}, userFactors: {...} }`
- Admin and Manager roles use `managerFactors`
- User role uses `userFactors`
- Term format: `36_months`, `48_months`, `60_months`
- Escalation format: `0%`, `10%`, `15%`
- Finance amount bands: `0-20000`, `20001-50000`, `50001-100000`, `100000+`
- Added comprehensive logging for debugging

### 9. Hardware Rental - FIXED ✅
**Problem**: Was not calculating correctly
**Solution**:
- Formula: `Total Payout × Factor`
- Uses the factor looked up from factors config
- Updated in `TotalCostsStep.tsx`

### 10. Factor Display - FIXED ✅
**Problem**: Factor not displayed under Hardware Rental
**Solution**:
- Added "Factor Used" display showing exact factor value (5 decimal places)
- Shows in both the pricing banner and under Hardware Rental
- Updated in `TotalCostsStep.tsx`

### 11. Installation Base Display - FIXED ✅
**Problem**: Was calculating from subtraction instead of storing directly
**Solution**:
- Added `installationBase` field to `TotalsData` interface
- Store the value separately during calculation
- Display directly instead of calculating from other values
- Updated in `lib/store/calculator.ts` and `TotalCostsStep.tsx`

## Calculation Flow (Correct Order)

1. ✅ Calculate Hardware Total (sum of hardware items)
2. ✅ Calculate Extension Count (sum of hardware quantities)
3. ✅ Calculate Installation Base (from sliding scale based on extension count)
4. ✅ Calculate Extension Cost (cost_per_point × extension count)
5. ✅ Calculate Fuel Cost (cost_per_kilometer × distance)
6. ✅ Calculate Total Installation (Installation Base + Extension Cost + Fuel Cost)
7. ✅ Calculate Gross Profit (from sliding scale or custom value)
8. ✅ Get Settlement Amount (from settlement step)
9. ✅ Calculate Finance Fee (iterative based on total payout):
   - Start with: Base = Hardware Total + Total Installation + Gross Profit + Settlement
   - Loop: Calculate finance fee based on (Base + previous finance fee)
   - Continue until finance fee stabilizes (max 10 iterations)
10. ✅ Calculate Total Payout = Hardware Total + Total Installation + Gross Profit + Settlement + Finance Fee
11. ✅ Finance Amount = Total Payout (SAME VALUE)
12. ✅ Look up Factor (based on term, escalation, and Finance Amount)
13. ✅ Calculate Hardware Rental = Finance Amount × Factor
14. ✅ Calculate Connectivity Total (sum of connectivity items)
15. ✅ Calculate Licensing Total (sum of licensing items)
16. ✅ Calculate Total MRC = Hardware Rental + Connectivity + Licensing
17. ✅ Calculate VAT = Total MRC × 0.15
18. ✅ Calculate Total with VAT = Total MRC + VAT

## Files Modified

1. `hosted-smart-cost-calculator/lib/calculator.ts`
   - Updated `getSlidingScaleBand()` to handle nested structure
   - Updated `getFinanceFeeBand()` to handle nested structure
   - Updated `calculateExtensionCost()` with role-based pricing and logging
   - Updated `calculateFuelCost()` with role-based pricing and logging
   - Updated `lookupFactor()` with nested structure support and comprehensive logging

2. `hosted-smart-cost-calculator/components/calculator/TotalCostsStep.tsx`
   - Fixed Total Installation calculation (removed Hardware Total from formula)
   - Fixed Total Payout calculation
   - Fixed Finance Amount to equal Total Payout
   - Added installationBase to stored data
   - Updated Installation Base display to use stored value
   - Added comprehensive logging throughout calculation process

3. `hosted-smart-cost-calculator/lib/store/calculator.ts`
   - Added `installationBase?: number` to `TotalsData` interface

## Data Structure Compatibility

The fixes handle both data structures:

### Nested Structure (from ScalesConfig/FactorsConfig)
```typescript
{
  installation: {
    cost: { "0-4": 1000, "5-8": 2000, ... },
    managerCost: { "0-4": 1100, "5-8": 2200, ... },
    userCost: { "0-4": 1200, "5-8": 2400, ... }
  },
  finance_fee: {
    cost: { "0-20000": 500, ... },
    managerCost: { "0-20000": 550, ... },
    userCost: { "0-20000": 600, ... }
  },
  additional_costs: {
    cost_per_kilometer: 5.5,
    manager_cost_per_kilometer: 6.0,
    user_cost_per_kilometer: 6.5,
    cost_per_point: 750,
    manager_cost_per_point: 825,
    user_cost_per_point: 900
  }
}
```

### Flat Structure (legacy/fallback)
```typescript
{
  installation: {
    "0-4": { cost: 1000, managerCost: 1100, userCost: 1200 },
    ...
  }
}
```

## Role-Based Pricing

- **Admin**: Uses `managerCost` / `manager_*` fields (same as Manager)
- **Manager**: Uses `managerCost` / `manager_*` fields
- **User**: Uses `userCost` / `user_*` fields

## Testing Recommendations

1. Open admin console and verify scales/factors are populated
2. Create a new deal with:
   - 7 extensions (should use "5-8" band)
   - Some distance (e.g., 15 km)
   - Settlement amount (e.g., R 40,000)
3. Check console logs for detailed calculation breakdown
4. Verify all values match expected calculations
5. Test with different roles (admin, manager, user) to verify role-based pricing

## Console Logging

All calculation functions now include comprehensive logging:
- Input parameters
- Data structure inspection
- Band selection logic
- Calculated values
- Error conditions

Look for logs prefixed with:
- `[TOTAL COSTS]` - Main calculation flow
- `[getSlidingScaleBand]` - Installation/Gross Profit band selection
- `[getFinanceFeeBand]` - Finance fee band selection
- `[calculateExtensionCost]` - Extension cost calculation
- `[calculateFuelCost]` - Fuel cost calculation
- `[lookupFactor]` - Factor lookup process

## Next Steps

1. Test the calculator with real data from admin console
2. Verify all calculations match expected values
3. Check that role-based pricing works correctly
4. Ensure factor lookup works for all term/escalation combinations
5. Verify finance fee iterates correctly until stabilization
