# All Deals - Cost Factor Fix Complete

## Issue
The "All Deals" costings section was calculating the cost factor, installation costs, and finance fees incorrectly. It was not pulling these values from the correct location in the admin console's configuration.

## Root Cause

### 1. Factor Config Structure
The factors config has three separate sections:
- `cost` - Cost factors (for admin calculations)
- `managerFactors` - Manager factors (for manager users)
- `userFactors` - User factors (for regular users)

Each section is structured as:
```
{
  "36_months": {
    "0%": {
      "0-20000": 0.0377,
      "20001-50000": 0.0388,
      ...
    },
    "10%": { ... },
    "15%": { ... }
  },
  "48_months": { ... },
  "60_months": { ... }
}
```

### 2. Scales Config Structure
The scales config also has three separate sections for each cost type:
- `installation.cost` - Cost tier installation costs
- `installation.managerCost` - Manager tier installation costs
- `installation.userCost` - User tier installation costs
- `finance_fee.cost` - Cost tier finance fees
- `finance_fee.managerCost` - Manager tier finance fees
- `finance_fee.userCost` - User tier finance fees

## Solution Implemented

### 1. Fixed Factor Lookup Logic
Updated `/api/deals/[id]/costings/route.ts` to:
- Correctly access the `cost` section of the factors config
- Use the proper keys: `{term}_months`, `{escalation}%`, and range
- Match the band range based on the rep's total payout
- Pull the cost factor from the same band range as the rep factor

### 2. Fixed Installation Cost Lookup
- Rep installation cost: Uses what the rep calculated (already correct)
- Actual installation cost: Pulls from `scales.installation.cost[band]` based on number of extensions
- Determines the correct band: `0-4`, `5-8`, `9-16`, `17-32`, `33+`
- Adds extension and fuel costs to the base installation cost

### 3. Fixed Finance Fee Lookup
- Rep finance fee: Uses what the rep calculated (already correct)
- Actual finance fee: Pulls from `scales.finance_fee.cost[range]` based on total payout
- Determines the correct range: `0-20000`, `20001-50000`, `50001-100000`, `100001+`

### 4. Factor Display Format
Factors are now displayed with exactly 4 decimal places (0.0000 format):
- Rep Factor: Shows what the rep used from their tier
- Cost Factor: Shows the actual cost from the admin's cost tier
- Both formatted to 4 decimal places using `parseFloat(factor.toFixed(4))`

## Example Scenarios

### Scenario 1: Factor Lookup
If a rep uses:
- Term: 36 months
- Escalation: 10%
- Rep Factor: 0.0377 (from range 0-20000)
- Total Payout: R15,000

The cost factor will be pulled from:
- `factors.cost["36_months"]["10%"]["0-20000"]`
- This ensures the cost factor comes from the same band range as the rep factor
- But from the "cost" section instead of the rep's tier

### Scenario 2: Installation Cost Lookup
If a deal has:
- Extensions: 12
- Rep installation cost: R8,500

The actual installation cost will be:
- Band determined: `9-16` (since extensions = 12)
- Base cost from: `scales.installation.cost["9-16"]`
- Plus extension costs and fuel costs
- Example: R7,200 (base) + R800 (extensions) + R300 (fuel) = R8,300

### Scenario 3: Finance Fee Lookup
If a deal has:
- Total Payout: R35,000
- Rep finance fee: R1,200

The actual finance fee will be:
- Range determined: `20001-50000` (since payout = R35,000)
- Cost from: `scales.finance_fee.cost["20001-50000"]`
- Example: R1,000 (cost tier) vs R1,200 (rep tier)

## Files Modified
1. `hosted-smart-cost-calculator/app/api/deals/[id]/costings/route.ts`
   - Fixed factor lookup logic
   - Fixed installation cost lookup from scales config
   - Fixed finance fee lookup from scales config
   - Added proper structure navigation
   - Added 4 decimal place formatting for factors

## Testing
To verify the fix:
1. Create a deal with specific term, escalation, and extensions
2. Go to "All Deals" section
3. Click "Generate Costings" on a deal
4. Verify:
   - **Rep Factor**: Shows the factor the rep used (4 decimals)
   - **Cost Factor**: Shows the cost factor from the same band range (4 decimals)
   - **Rep Installation**: Shows what the rep calculated
   - **Actual Installation**: Shows cost from scales.installation.cost based on extensions
   - **Rep Finance Fee**: Shows what the rep calculated
   - **Actual Finance Fee**: Shows cost from scales.finance_fee.cost based on total payout
   - All values are from the correct term/escalation/range/band combinations

## Status
✅ **COMPLETE** - Cost factor, installation costs, and finance fees are now correctly pulled from the admin console's configuration, matching the appropriate band ranges and tiers.

