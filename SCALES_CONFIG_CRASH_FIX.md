# Scales Config Crash Fix

## Issue
The Scales Config component crashes with error: `TypeError: Cannot read properties of undefined (reading '0-4')`

## Root Cause
The scales data structure returned from the database doesn't match what the component expects:

**Database stores (simple format):**
```json
{
  "installation": {
    "0-4": 1000,
    "5-8": 1500
  },
  "finance_fee": { ... },
  "gross_profit": { ... },
  "additional_costs": {
    "cost_per_kilometer": 10,
    "cost_per_point": 5
  }
}
```

**Component expects (enhanced format):**
```json
{
  "installation": {
    "cost": { "0-4": 1000, "5-8": 1500 },
    "managerCost": { "0-4": 1000, "5-8": 1500 },
    "userCost": { "0-4": 1000, "5-8": 1500 }
  },
  "finance_fee": { ... },
  "gross_profit": { ... },
  "additional_costs": {
    "cost_per_kilometer": 10,
    "cost_per_point": 5,
    "manager_cost_per_kilometer": 10,
    "manager_cost_per_point": 5,
    "user_cost_per_kilometer": 10,
    "user_cost_per_point": 5
  }
}
```

## Solution
The component already has conversion logic in the `useEffect` that processes the scales data, but it's not being triggered properly because the data structure check is failing.

The fix is to ensure the API route returns data in a format that the component can process, or initialize the database with the enhanced format.

## Files Modified
- `hosted-smart-cost-calculator/app/api/config/scales/route.ts` - Added data transformation logic

## Changes Made

### 1. Enhanced GET Endpoint
- Added check for enhanced format vs simple format
- If data is already in enhanced format, return as-is
- If data is in simple format, transform it to enhanced format
- If no scales exist, return default empty structure with all bands initialized to 0

### 2. Data Transformation Logic
- Converts simple format (flat structure) to enhanced format (nested cost/managerCost/userCost)
- Handles all three sections: installation, finance_fee, gross_profit
- Properly initializes additional_costs with all 6 fields
- Ensures all bands are populated even if missing from database

## Testing
1. Navigate to Admin Console → Scales Config tab
2. Component should load without errors
3. All three tabs (Cost, Manager, User) should display properly
4. All input fields should show values (0 if not set)
5. Changes should save correctly
6. After saving, refresh and verify data persists

## VPS Deployment
After pulling the code on VPS:
```bash
cd /app
git pull
rm -rf .next
npm run build
pm2 restart all
```

## Commit
✅ Committed: "Fix scales config crash: transform data structure from simple to enhanced format"
✅ Pushed to GitHub
