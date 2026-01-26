# Extension Count Fix - Hardware Items

## Issue

The calculator is counting ALL hardware items as extensions instead of only counting items marked as `isExtension = true`.

## Root Cause

The code logic is **100% CORRECT**. The issue is that the hardware items in the database don't have the `is_extension` field set to `true` for items that should be counted as extensions.

### Code Analysis

1. **`countExtensionItems` function** (lib/calculator.ts, lines 594-602):
   ```typescript
   export function countExtensionItems(
     hardwareItems: Array<{ isExtension: boolean; selectedQuantity: number }>
   ): number {
     return hardwareItems.reduce((count, item) => {
       if (item.isExtension) {  // ✅ Only counts if isExtension === true
         return count + item.selectedQuantity;
       }
       return count;
     }, 0);
   }
   ```

2. **Database schema** (database/schema.sql, line 38):
   ```sql
   is_extension BOOLEAN DEFAULT false,  -- ✅ Column exists
   ```

3. **API mapping** (app/api/config/hardware/route.ts, line 29):
   ```sql
   is_extension as "isExtension"  -- ✅ Correctly mapped
   ```

4. **TypeScript interface** (lib/store/config.ts, line 13):
   ```typescript
   isExtension: boolean;  -- ✅ Type defined
   ```

## Solution

You need to update the `is_extension` field in the database for hardware items that should be counted as extensions.

### Which Items Should Be Extensions?

Based on typical phone system hardware, these items should have `is_extension = true`:
- Desk Phone B&W
- Desk Phone Colour
- Switchboard Colour
- Cordless Phone

These items should have `is_extension = false`:
- Bluetooth Headset Mono
- Bluetooth Headset Dual
- Corded Headset Dual
- Cellphone
- PoE Switches (4/8/16 Port)
- Managed PoE Switches
- Access Points
- Routers
- PCs
- Copiers
- Server Cabinets


## Fix Steps

### Option 1: Update via Admin Panel (Recommended)

1. Log in as admin
2. Go to **Admin → Hardware Config**
3. For each hardware item:
   - Click "Edit"
   - Check the "Is Extension" checkbox for phone/extension items
   - Uncheck it for non-extension items (headsets, switches, etc.)
   - Click "Save"

### Option 2: Update via SQL (Faster for bulk updates)

Run this SQL script on your database:

```sql
-- Update extension items (phones that count as extensions)
UPDATE hardware_items 
SET is_extension = true 
WHERE name IN (
  'Desk Phone B&W',
  'Desk Phone Colour',
  'Switchboard Colour',
  'Cordless Phone'
);

-- Ensure non-extension items are marked correctly
UPDATE hardware_items 
SET is_extension = false 
WHERE name NOT IN (
  'Desk Phone B&W',
  'Desk Phone Colour',
  'Switchboard Colour',
  'Cordless Phone'
);

-- Verify the changes
SELECT name, is_extension 
FROM hardware_items 
ORDER BY display_order;
```

## Testing After Fix

1. Go to Calculator
2. Add some hardware items:
   - Add 2x "Desk Phone B&W" (should count as 2 extensions)
   - Add 1x "Bluetooth Headset" (should NOT count as extension)
   - Add 3x "Desk Phone Colour" (should count as 3 extensions)
3. Go to "Total Costs" step
4. Check the "Extension Count" - should show 5 (2 + 3)
5. The installation cost should be calculated based on 5 extensions

## Expected Behavior After Fix

✅ Only hardware items marked as `isExtension = true` are counted
✅ Extension count = sum of quantities for extension items only
✅ Installation cost is calculated correctly based on extension count
✅ Non-extension items (headsets, switches, etc.) are NOT counted

## Files Involved (No Code Changes Needed)

- `lib/calculator.ts` - countExtensionItems function (already correct)
- `app/api/config/hardware/route.ts` - API mapping (already correct)
- `lib/store/config.ts` - TypeScript types (already correct)
- `database/schema.sql` - Database schema (already correct)

## Status

✅ Code is correct
⚠️ Database needs updating - set `is_extension = true` for phone items
