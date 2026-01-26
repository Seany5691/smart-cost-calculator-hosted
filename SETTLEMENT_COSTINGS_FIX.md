# Settlement Costings Fix - Use Actual Settlement from Total Costs

## Issue
Settlement values in the All Deals costings modal need to be the exact same for both Rep Cost and Actual Cost, pulled directly from the Total Costs section of the calculator.

## Root Cause
The code was checking multiple fallback fields (`settlement`, `actualSettlement`, `representativeSettlement`) in the wrong order, potentially using different values.

## Solution
Updated the settlement calculation to prioritize `actualSettlement` from `totalsData`, which is the value the user entered or calculated in the Total Costs section of the calculator.

## Changes Made

### File: `app/api/deals/[id]/costings/route.ts`

**Before:**
```typescript
// Settlement - ALWAYS the same for both actual and rep (never changes)
const settlement = totalsData?.settlement || totalsData?.actualSettlement || totalsData?.representativeSettlement || 0;
const settlementActual = settlement;
const settlementRep = settlement;
```

**After:**
```typescript
// Settlement - ALWAYS the same for both actual and rep (never changes)
// Use actualSettlement from the Total Costs section (what the user entered/calculated)
const settlement = totalsData?.actualSettlement || totalsData?.settlement || 0;
const settlementActual = settlement;
const settlementRep = settlement;
```

## Data Structure

The calculator stores settlement in `totalsData` as:
- `actualSettlement`: The settlement amount from the Total Costs section (user entered or calculated)
- `representativeSettlement`: A calculated value (not used in costings modal)

## Expected Behavior

### Scenario 1: Settlement = R 40,801.20
```
Rep Cost Settlement:    R 40,801.20
Actual Cost Settlement: R 40,801.20
Difference:             R 0.00
```

### Scenario 2: Settlement = R 0.00
```
Rep Cost Settlement:    R 0.00
Actual Cost Settlement: R 0.00
Difference:             R 0.00
```

## Business Logic

Settlement is a **fixed cost** that:
- Never changes based on cost tier (admin/manager/user)
- Is the same for both actual and rep calculations
- Comes directly from what the user entered in the Total Costs section
- Always shows R 0.00 difference in the costings modal

## Testing
- ✅ TypeScript compilation successful
- ✅ No diagnostic errors
- ✅ Settlement now pulls from `actualSettlement` field first

## Status
**COMPLETE** - Settlement now correctly uses the same value from Total Costs for both actual and rep costs.
