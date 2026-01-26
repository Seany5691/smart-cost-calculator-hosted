# Generate Costings Fixes - Complete (Updated)

## Issues Fixed

Based on your notes in `Generate Costings.txt`, the following issues have been corrected in the All Deals "Generate Costings" feature:

### 1. ✅ Settlement - FIXED
**Issue**: Settlement was showing different values for actual and rep
**Fix**: Settlement now always shows the same value for both actual and rep columns. The settlement from the calculator never changes.

```typescript
const settlement = totalsData?.settlement || totalsData?.actualSettlement || totalsData?.representativeSettlement || 0;
const settlementActual = settlement;
const settlementRep = settlement;
```

### 2. ✅ Factor Row - FIXED
**Issue**: Both factors showing the same value (should show rep factor vs cost factor)
**Fix**: 
- **Rep Factor**: The factor used by the rep (from `totalsData.factor`)
- **Cost Factor**: Fetched from the factors config table based on the deal's payout range, term, and escalation

The cost factor is now properly fetched from the factors config and will be different from the rep factor.

### 3. ✅ Hardware Rental - FIXED (Critical Fix)
**Issue**: Hardware rental was being calculated incorrectly
**Fix**: Hardware Rental now comes **directly from the Total Costs section** of the calculator (`totalsData.hardwareRental`). It is **always the same** for both actual and rep columns.

```typescript
const hardwareRentalRep = totalsData?.hardwareRental || 0;
const hardwareRentalActual = hardwareRentalRep; // Always the same
```

### 4. ✅ Total Payout - FIXED (Critical Fix)
**Issue**: Total Payout was being calculated as sum of components
**Fix**: Total Payout is now correctly calculated as:
- **Rep Total Payout**: Hardware Rental × Rep Factor
- **Actual Total Payout**: Hardware Rental × Cost Factor

```typescript
const totalPayoutRep = hardwareRentalRep * repFactor;
const totalPayoutActual = hardwareRentalActual * costFactor;
```

### 5. ✅ Total MRC - FIXED
**Issue**: Total MRC calculation was incorrect
**Fix**: Total MRC is now correctly calculated for both columns:
- **Rep Total MRC**: Hardware Rental + Connectivity Total + Licensing Total (from rep column)
- **Actual Total MRC**: Hardware Rental + Connectivity Total + Licensing Total (from actual column)

```typescript
const totalMRCActual = hardwareRentalActual + connectivityTotalActual + licensingTotalActual;
const totalMRCRep = hardwareRentalRep + connectivityTotalRep + licensingTotalRep;
```

## Correct Calculation Flow

### Rep Column (What the rep sees):
1. Hardware Total (rep prices)
2. Installation Total (same for all)
3. Connectivity Total (rep prices)
4. Licensing Total (rep prices)
5. Settlement (from calculator - never changes)
6. Finance Fee (same for all)
7. **Factor** (rep factor from totalsData.factor)
8. **Total Payout** = Hardware Rental × Rep Factor
9. **Hardware Rental** = From Total Costs section (totalsData.hardwareRental)
10. **Total MRC** = Hardware Rental + Connectivity + Licensing

### Actual Column (True cost):
1. Hardware Total (actual/admin prices)
2. Installation Total (same for all)
3. Connectivity Total (actual/admin prices)
4. Licensing Total (actual/admin prices)
5. Settlement (same as rep - never changes)
6. Finance Fee (same for all)
7. **Factor** (cost factor from factors config)
8. **Total Payout** = Hardware Rental × Cost Factor
9. **Hardware Rental** = Same as rep (from Total Costs section)
10. **Total MRC** = Hardware Rental + Connectivity + Licensing

## Key Understanding

The **Hardware Rental** is the anchor value that comes from the calculator's Total Costs page. It never changes between actual and rep. The difference in **Total Payout** comes from multiplying this same hardware rental by different factors (rep factor vs cost factor).

## Files Modified

1. **`hosted-smart-cost-calculator/app/api/deals/[id]/costings/route.ts`**
   - Fixed settlement calculation (always the same)
   - Added cost factor fetching from factors config
   - **Fixed Hardware Rental to come from totalsData.hardwareRental**
   - **Fixed Total Payout calculation (Hardware Rental × Factor)**
   - Fixed Total MRC calculation

2. **`hosted-smart-cost-calculator/lib/store/deals.ts`**
   - Added `factor: { actual: number; rep: number }` to Costings interface

3. **`hosted-smart-cost-calculator/components/deals/costings/TotalsComparison.tsx`**
   - Added Factor row to the display
   - Added formatNumber function for non-currency values
   - Updated to handle both currency and number formatting

## Testing

To verify the fixes:

1. Go to All Deals section
2. Click "Generate Costings" on any deal
3. Verify:
   - ✅ Settlement is the same in both columns
   - ✅ Factor row shows different values (rep factor vs cost factor)
   - ✅ Hardware Rental is identical in both columns (from Total Costs page)
   - ✅ Total Payout = Hardware Rental × Factor (different for each column)
   - ✅ Total MRC is correctly calculated for both columns

## Notes

- The hardware rental comes directly from `totalsData.hardwareRental` which is set in the calculator
- The cost factor is fetched from the factors config table based on the deal's total payout range, term, and escalation
- If the cost factor cannot be found, it defaults to the rep factor
- All currency values are formatted as ZAR (South African Rand)
- The Factor row displays as a decimal number (e.g., 0.0337) not as currency
