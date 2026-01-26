# Admin Manager Pricing Fix - COMPLETE

## Issue
Admins were seeing **cost pricing** instead of **manager pricing** for hardware, connectivity, and licensing items in the calculator.

## Pricing Structure
The system has three pricing tiers:
1. **Cost Price** - Never displayed in calculator (internal cost)
2. **Manager Price** - Used by both Admin and Manager roles
3. **User Price** - Used by User role

## Root Cause
The `getRolePrice` and related pricing functions were returning `item.cost` for admin role instead of `item.managerCost`.

## Solution
Updated all role-based pricing functions to return **manager pricing** for admins:

### 1. `lib/pricing.ts` - Updated 3 functions:

#### getRolePrice (lines 17-30)
```typescript
case 'admin':
  return item.managerCost; // Admin uses manager pricing (was: item.cost)
```

#### getRoleScalePrice (lines 35-48)
```typescript
case 'admin':
  return band.managerCost; // Admin uses manager pricing (was: band.cost)
```

#### getRoleAdditionalCosts (lines 85-110)
```typescript
case 'admin':
  return {
    perKilometer: costs.manager_cost_per_kilometer, // Admin uses manager pricing
    perPoint: costs.manager_cost_per_point, // Admin uses manager pricing
  };
```

### 2. `lib/calculator.ts` - Updated 1 function:

#### getRolePrice (lines 38-61)
```typescript
case 'admin':
  return item.managerCost; // Admin uses manager pricing (was: item.cost)
```

## What This Affects

### Hardware, Connectivity, and Licensing
- Admins now see manager prices (same as managers)
- Users continue to see user prices
- Cost prices are never displayed in the calculator

### Factors and Scales
- Admins use manager pricing for:
  - Cost per kilometer (installation distance)
  - Cost per point (extension points)
  - All sliding scale bands
- These were already working correctly per user's note

## Impact on Calculator

All calculator steps now use manager pricing for admins:
- **Hardware Step** - Hardware items show manager prices
- **Connectivity Step** - Connectivity items show manager prices
- **Licensing Step** - Licensing items show manager prices
- **Total Costs Step** - All calculations use manager prices
- **Proposal Generation** - Proposals use manager prices

## Verification

To verify the fix:
1. Login as an admin user
2. Go to Calculator
3. Add hardware, connectivity, or licensing items
4. Prices shown should match manager prices (not cost prices)
5. Compare with manager user - prices should be identical
6. Compare with regular user - prices should be higher for user

## Files Modified
- `hosted-smart-cost-calculator/lib/pricing.ts` (3 functions updated)
- `hosted-smart-cost-calculator/lib/calculator.ts` (1 function updated)

## Status
✅ COMPLETE - Admins now use manager pricing for all calculator items
