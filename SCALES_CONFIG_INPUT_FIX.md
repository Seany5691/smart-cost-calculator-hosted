# Scales Config Input Fix - Complete

## Issue
The Scales Config inputs were not editable - users couldn't type in the fields or use the up/down arrows to change values.

## Root Cause
The component had band arrays (`installationBands`, `financeFeeRanges`, `grossProfitBands`) defined inside the component function. These arrays were recreated on every render and were included in the useEffect dependencies array. This caused an infinite loop where:

1. Component renders
2. Arrays are recreated (new references)
3. useEffect detects dependency change
4. useEffect runs and updates state
5. State update triggers re-render
6. Back to step 1

This constant re-rendering was resetting the input values immediately after any change, making them appear non-editable.

## Solution
Moved the band arrays outside the component as constants:
- `INSTALLATION_BANDS`
- `FINANCE_FEE_RANGES`
- `GROSS_PROFIT_BANDS`

This ensures they have stable references across renders and prevents the useEffect loop.

## Changes Made

### File: `components/admin/ScalesConfig.tsx`

1. **Moved arrays outside component** (lines 20-22):
```typescript
const INSTALLATION_BANDS = ['0-4', '5-8', '9-16', '17-32', '33+'];
const FINANCE_FEE_RANGES = ['0-20000', '20001-50000', '50001-100000', '100001+'];
const GROSS_PROFIT_BANDS = ['0-4', '5-8', '9-16', '17-32', '33+'];
```

2. **Updated useEffect dependencies**:
   - Removed: `installationBands`, `financeFeeRanges`, `grossProfitBands`
   - Kept: `scales`, `lastSaveTime`

3. **Updated all references** to use the new constants:
   - `createEmptyScalesData()` function
   - `useEffect` for processing scales
   - `getChangedFieldsCount()` function
   - Render sections for all three input groups

## Testing
1. Navigate to Admin Console → Scales Config
2. Try typing in any input field - should work now
3. Try using up/down arrows on number inputs - should work
4. Make changes and verify "Unsaved changes" indicator appears
5. Click "Save All Changes" - should save successfully
6. Refresh page - changes should persist

## VPS Deployment
```bash
cd /app
git pull
rm -rf .next
npm run build
pm2 restart all
```

## Commits
1. ✅ "Fix scales config crash: transform data structure from simple to enhanced format"
2. ✅ "Fix scales update: accept enhanced format in POST/PUT endpoints"
3. ✅ "Fix scales input editing: move band arrays outside component to prevent useEffect loop"

## Status
✅ **COMPLETE** - Scales Config is now fully functional with editable inputs and working save functionality.
