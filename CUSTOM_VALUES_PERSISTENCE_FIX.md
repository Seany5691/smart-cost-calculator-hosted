# Custom Installation Base and Finance Fee Persistence Fix

## Problem Solved
When Admins edited Installation Base or Finance Fee and saved the deal, the custom values were not persisting - they would revert back to the calculated values from scales when the deal was reloaded.

## Solution Implemented

### What Was Changed:
Modified the calculation logic in `TotalCostsStep.tsx` to:
1. Check if custom values exist in `totalsData` before calculating
2. Use custom values when they exist instead of recalculating from scales
3. Preserve custom values when saving to database
4. Restore custom values when loading deals

### Technical Details:

#### 1. Installation Base Calculation (Lines 150-175)
```typescript
// Check if there's a custom installation base (set by admin)
const hasCustomInstallationBase = totalsData?.customInstallationBase !== undefined;

if (hasCustomInstallationBase) {
  // Use custom installation base set by admin
  installationBase = totalsData.customInstallationBase!;
} else {
  // Calculate installation base from scales
  installationBase = calculateInstallation(extensionCount, activeScales, effectiveRole);
}
```

#### 2. Finance Fee Calculation (Lines 290-330)
```typescript
// Check if there's a custom finance fee (set by admin)
const hasCustomFinanceFee = totalsData?.customFinanceFee !== undefined;

if (hasCustomFinanceFee) {
  // Use custom finance fee set by admin
  financeFee = totalsData.customFinanceFee!;
} else {
  // Iteratively calculate finance fee until it stabilizes
  // ... existing calculation logic
}
```

#### 3. Saving Custom Values (Lines 430-450)
```typescript
setTotalsData({
  // ... other fields
  financeFee,
  customFinanceFee: hasCustomFinanceFee ? totalsData.customFinanceFee : undefined,
  customInstallationBase: hasCustomInstallationBase ? totalsData.customInstallationBase : undefined,
  // ... other fields
});
```

### How It Works:

1. **When Admin Edits Values:**
   - Admin clicks "Edit" on Installation Base or Finance Fee
   - Enters custom value and clicks "Save"
   - Custom value is stored in `totalsData.customInstallationBase` or `totalsData.customFinanceFee`
   - Calculations use the custom value instead of recalculating

2. **When Deal Is Saved:**
   - `totalsData` (including custom values) is saved to database as JSONB
   - Deal metadata (ID, creator, role, date) remains unchanged
   - Original creator's role-based pricing is preserved

3. **When Deal Is Loaded:**
   - `totalsData` is loaded from database (including custom values)
   - Calculation logic checks for custom values first
   - If custom values exist, they are used instead of recalculating
   - All other calculations proceed normally with custom values

### What Is Preserved:

✅ **Deal Identity:**
- Deal ID (same deal, not new)
- Created By (original creator)
- Created Date (original timestamp)
- Original User Role (for pricing)

✅ **Role-Based Pricing:**
- Hardware items use original creator's role pricing
- Licensing items use original creator's role pricing
- Connectivity items use original creator's role pricing
- Admin's own pricing is never affected

✅ **Custom Overrides:**
- Installation Base (if Admin set it)
- Finance Fee (if Admin set it)
- Gross Profit (existing functionality)

### Testing:

1. **Create a deal as User/Manager:**
   - Fill in all sections
   - Save the deal
   - Note the Installation Base and Finance Fee values

2. **Open deal as Admin:**
   - Go to All Deals
   - Open the User/Manager's deal
   - Edit Installation Base - change value and save
   - Edit Finance Fee - change value and save
   - Click "Save Deal"

3. **Reload the deal:**
   - Close and reopen the deal
   - Verify Installation Base shows the custom value
   - Verify Finance Fee shows the custom value
   - Verify all other values are correct
   - Verify deal still shows original creator

4. **Reset custom values:**
   - Click "Edit" on Installation Base
   - Click "Reset"
   - Verify it returns to calculated value
   - Save the deal
   - Reload and verify it uses calculated value

## Files Modified:

1. **hosted-smart-cost-calculator/components/calculator/TotalCostsStep.tsx**
   - Added custom value checks before calculations
   - Modified Installation Base calculation to use custom value if exists
   - Modified Finance Fee calculation to use custom value if exists
   - Updated setTotalsData to preserve custom values

## Database Schema:

No database changes required! Custom values are stored in the existing `totals_data` JSONB column in the `deal_calculations` table.

## Commit History:

- `5b8d021` - feat: Persist custom Installation Base and Finance Fee values
- `40cf840` - fix: Move Installation Base editing to Hardware & Installation section
- `2bcdf56` - feat: Add admin-editable Finance Fee and Installation Base, fix PDF generation

## Notes:

- Custom values are optional - if not set, calculations use scales
- Reset button removes custom value and reverts to calculated value
- All existing deals continue to work without custom values
- Admin can edit any deal without affecting the original creator
- Role-based pricing system remains intact
