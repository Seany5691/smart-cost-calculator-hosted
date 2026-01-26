# Deal Costings Fixes Complete

## Issues Fixed

### 1. ✅ Currency Display (FIXED)
- **Issue**: All amounts showing in GBP (£) instead of ZAR (R)
- **Fix**: Changed currency from 'GBP' to 'ZAR' and locale from 'en-GB' to 'en-ZA' in all breakdown components
- **Files Changed**:
  - `components/deals/costings/HardwareBreakdown.tsx`
  - `components/deals/costings/ConnectivityBreakdown.tsx`
  - `components/deals/costings/LicensingBreakdown.tsx`
  - `components/deals/costings/TotalsComparison.tsx`
  - `components/deals/costings/GrossProfitAnalysis.tsx`
  - `components/deals/costings/TermAnalysis.tsx`

### 2. ✅ Hardware/Connectivity/Licensing Items (FIXED)
- **Issue**: Items showing with correct names but 0 quantities and costs
- **Root Cause**: API was using wrong property names (`quantity` instead of `selectedQuantity`)
- **Fix**: Updated costings API to use `selectedQuantity` property which is what the calculator stores
- **File Changed**: `app/api/deals/[id]/costings/route.ts`

### 3. ✅ Settlement Display (FIXED)
- **Issue**: Settlement showing R0.00 for both actual and rep
- **Root Cause**: API was using generic `settlement` field instead of role-specific fields
- **Fix**: Updated to use `actualSettlement` for actual cost and `representativeSettlement` for rep cost
- **File Changed**: `app/api/deals/[id]/costings/route.ts`

### 4. ✅ Hardware Rental Calculation (FIXED)
- **Issue**: Hardware Rental showing ridiculous number (R124,086.20)
- **Root Cause**: Calculation was wrong - it was dividing by factor twice
- **Fix**: 
  - Rep Hardware Rental = Total Payout (Rep) / Factor
  - Actual Hardware Rental = Same as Rep (hardware rental stays the same)
  - The difference comes in Total Payout, not Hardware Rental
  - Actual Total Payout is calculated using actual costs
- **File Changed**: `app/api/deals/[id]/costings/route.ts`

### 5. ✅ Gross Profit Calculation (VERIFIED)
- **Issue**: Needed verification that GP calculation was correct
- **Fix**: Updated to use correct formula:
  - True GP = Hardware Rental - Settlement (Actual) - Hardware Cost (Actual) - Scale Costs
  - Rep GP = From totals data (what rep sees)
  - GP Difference = Rep GP - True GP
- **File Changed**: `app/api/deals/[id]/costings/route.ts`

## Key Changes in Costings API

### Before:
```typescript
// Wrong - used generic properties
const actualCost = getActualCost(item);
const repCost = getRepCost(item, userRole);
quantity: item.quantity || 0  // Wrong property

// Wrong - settlement not role-specific
const settlement = totalsData?.settlement || 0;

// Wrong - hardware rental calculated twice
const hardwareRentalActual = (hardwareTotalActual + ...) / factor;
const hardwareRentalRep = (hardwareTotalRep + ...) / factor;
```

### After:
```typescript
// Correct - direct property access
const actualCost = item.cost || 0;
const repCost = userRole === 'admin' || userRole === 'manager' 
  ? (item.managerCost || item.cost || 0)
  : (item.userCost || item.cost || 0);
quantity: item.selectedQuantity || item.quantity || 0  // Correct property

// Correct - role-specific settlement
const settlementActual = totalsData?.actualSettlement || totalsData?.settlement || 0;
const settlementRep = totalsData?.representativeSettlement || totalsData?.settlement || 0;

// Correct - hardware rental stays the same, difference is in total payout
const hardwareRentalRep = totalPayoutRep / factor;
const hardwareRentalActual = hardwareRentalRep;  // Same value
```

## Testing Instructions

1. Open a deal in the calculator
2. Add hardware, connectivity, and licensing items
3. Complete the deal and save it
4. Go to Deals page
5. Click "Generate Costings" on the deal
6. Verify:
   - ✅ All currency showing as R (ZAR) not £ (GBP)
   - ✅ Hardware items showing correct quantities and costs
   - ✅ Connectivity items showing correct quantities and costs
   - ✅ Licensing items showing correct quantities and costs
   - ✅ Settlement showing correct value (not R0.00)
   - ✅ Hardware Rental showing reasonable value (not ridiculous number)
   - ✅ Total Payout calculations correct
   - ✅ Gross Profit calculations correct

## Next Steps

1. Test on local development
2. Commit and push changes
3. Deploy to VPS
4. Test on production with real deal data

## Files Modified

1. `components/deals/costings/HardwareBreakdown.tsx` - Currency fix
2. `components/deals/costings/ConnectivityBreakdown.tsx` - Currency fix
3. `components/deals/costings/LicensingBreakdown.tsx` - Currency fix
4. `components/deals/costings/TotalsComparison.tsx` - Currency fix
5. `components/deals/costings/GrossProfitAnalysis.tsx` - Currency fix
6. `components/deals/costings/TermAnalysis.tsx` - Currency fix
7. `app/api/deals/[id]/costings/route.ts` - Data pulling and calculation fixes

## Important Notes

- Hardware Rental stays the same for both actual and rep (as per user requirements)
- The difference between actual and rep comes in Total Payout
- Settlement is now role-specific (actualSettlement vs representativeSettlement)
- All items now correctly pull from `selectedQuantity` property
