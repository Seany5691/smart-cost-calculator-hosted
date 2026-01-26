# Factors and Scales Update Functions Added

## Issue
The FactorsConfig and ScalesConfig components were calling `updateFactors()` and `updateScales()` functions that didn't exist in the config store, causing errors when trying to save changes:

```
TypeError: updateFactors is not a function
TypeError: updateScales is not a function
```

## Root Cause
The config store (`lib/store/config.ts`) only had fetch functions (`fetchFactors`, `fetchScales`) but was missing the update functions that the admin components needed to save changes.

## Solution
Added two new functions to the config store:

### 1. `updateFactors(factorsData: any, token: string)`
- Makes a PUT request to `/api/config/factors` with the updated factor data
- Includes Authorization header with the JWT token
- Updates the store cache with the new data on success
- Throws error on failure for proper error handling

### 2. `updateScales(scalesData: any, token: string)`
- Makes a PUT request to `/api/config/scales` with the updated scales data
- Includes Authorization header with the JWT token
- Updates the store cache with the new data on success
- Throws error on failure for proper error handling

## Files Modified
- `hosted-smart-cost-calculator/lib/store/config.ts`
  - Added `updateFactors` function
  - Added `updateScales` function
  - Updated TypeScript interface to include these functions

## Security
Both functions:
- Require authentication token (passed as parameter)
- Send token in Authorization header
- API endpoints verify admin role before allowing updates
- Only admins can modify factors and scales (enforced at API level)

## Testing
After this fix:
1. Log in as superadmin
2. Go to Admin Console → Factors Config
3. Make changes to any factor values
4. Click "Save All Changes"
5. Should see success message: "All factor changes saved successfully!"
6. Repeat for Scales Config

## Status
✅ **COMPLETE** - Both update functions added and ready to use
