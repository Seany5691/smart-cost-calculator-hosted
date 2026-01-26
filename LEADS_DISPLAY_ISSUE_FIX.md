# Leads Table Display Issue - FIXED

## Issue
After modal standardization changes, leads were not displaying in table view on the Working, Later Stage, Bad Leads, and Signed tabs. Leads were visible in card view but not in table view.

## Root Cause
The `LeadsTable.tsx` component had a `hidden lg:block` class on its wrapper div (line 437):
```tsx
<div className="hidden lg:block bg-white/10 border border-white/20 rounded-lg overflow-hidden">
```

This class was hiding the table on screens smaller than the `lg` breakpoint (1024px). While this shouldn't affect desktop users, it was causing rendering issues because:

1. The `LeadsManager` component already handles view mode switching and mobile detection
2. The redundant `hidden lg:block` class was interfering with the table rendering
3. The modal changes didn't cause this - the issue was pre-existing but became apparent after the modal updates

## Solution
Removed the `hidden lg:block` class from the LeadsTable wrapper div:
```tsx
<div className="bg-white/10 border border-white/20 rounded-lg overflow-hidden">
```

The `LeadsManager` component already handles:
- View mode switching (grid vs table)
- Mobile detection with `isMobile` state
- Conditional rendering based on screen size

## Files Modified
- `hosted-smart-cost-calculator/components/leads/LeadsTable.tsx`

## Testing
1. Navigate to Leads section
2. Switch to table view using the view toggle buttons
3. Verify leads display correctly in table view
4. Test on Working, Later Stage, Bad Leads, and Signed tabs
5. Verify card view still works correctly
6. Test responsive behavior on mobile devices

## Notes
- The modal changes (BulkActions, UserManagement) did not cause this issue
- The issue was a pre-existing CSS class conflict
- The fix maintains all existing functionality while removing the redundant hiding class
