# Deal Costings Comprehensive Fix

## Issues Identified

Based on the Generate Costings.txt file, the following issues need to be fixed:

### 1. Currency Display (CRITICAL)
- **Issue**: All amounts showing in GBP (£) instead of ZAR (R)
- **Location**: All breakdown components
- **Fix**: Change currency from 'GBP' to 'ZAR' in formatCurrency functions

### 2. Hardware Items Not Pulling Through
- **Issue**: Hardware items from admin config showing with 0 quantity and 0 costs
- **Root Cause**: Only custom hardware items (added via "Add Custom Hardware") are pulling through
- **Expected**: Should pull hardware items from admin Hardware Config with their quantities and costs
- **Location**: `/api/deals/[id]/costings/route.ts`

### 3. Settlement Not Displaying
- **Issue**: Settlement showing £0.00 for both actual and rep
- **Expected**: Should pull settlement value from deal
- **Location**: Costings API route

### 4. Hardware Rental Calculation Wrong
- **Issue**: Hardware Rental showing £124,086.20 (ridiculous number)
- **Expected**: Hardware Rental should be the same as what comes from Total Costs section
- **Formula**: For rep = (Hardware Total + Installation + Settlement + Finance Fee) / Factor
- **Formula**: For actual = Same Hardware Rental / Cost Factor for that band
- **Location**: Costings API and TotalsComparison component

### 5. Total Gross Profit Calculation
- **Issue**: Total Gross Profit calculation may be including incorrect items
- **Expected**: Should follow the formula from design document
- **Location**: GrossProfitAnalysis component

## Files to Fix

1. `components/deals/costings/HardwareBreakdown.tsx` - Currency
2. `components/deals/costings/ConnectivityBreakdown.tsx` - Currency
3. `components/deals/costings/LicensingBreakdown.tsx` - Currency
4. `components/deals/costings/TotalsComparison.tsx` - Currency + Hardware Rental calculation
5. `components/deals/costings/GrossProfitAnalysis.tsx` - Currency
6. `components/deals/costings/TermAnalysis.tsx` - Currency
7. `app/api/deals/[id]/costings/route.ts` - Data pulling logic

## Fix Priority

1. **FIRST**: Fix currency from GBP to ZAR across all components
2. **SECOND**: Fix costings API to pull correct data from sectionsData
3. **THIRD**: Fix Hardware Rental calculation
4. **FOURTH**: Fix Settlement display
5. **FIFTH**: Verify Gross Profit calculation

## Implementation Notes

### Currency Fix
Replace all instances of:
```typescript
currency: 'GBP'
```

With:
```typescript
currency: 'ZAR'
```

### Hardware Rental Fix
The current calculation is wrong. It should be:
- Rep Hardware Rental = (Hardware Total + Installation + Settlement + Finance Fee) / Factor
- Actual Hardware Rental = Rep Hardware Rental (stays the same)
- Actual Total Payout = Actual Hardware Rental * Factor (reverse calculation)

The difference comes in Total Payout, not Hardware Rental.

### Settlement Fix
Ensure settlement value is being read from the correct location in the deal data structure.
