# Calculator Changes - Quick Guide

## What Changed?

### 1. Finance Fee and Installation Base are Now Editable (Admin Only)

**Before:**
- Only Gross Profit could be edited
- Finance Fee and Installation Base were fixed values from scales

**After:**
- Admins can now edit Finance Fee and Installation Base
- Works exactly like Gross Profit editing
- Other roles (Manager, User) cannot edit these fields

**How to Use:**
1. Log in as Admin
2. Go to Calculator → Total Costs section
3. Look for "Finance & Settlement" section
4. You'll see "Edit" buttons next to:
   - Installation Base
   - Finance Fee
5. Click "Edit" to modify the value
6. Click "Save" to apply, "Cancel" to discard, or "Reset" to restore default

### 2. PDF Generation Fixed for All Proposal Types

**Before:**
- Comparative proposals worked ✓
- Normal proposals showed "file is corrupt" error ✗
- Cash proposals showed "file is corrupt" error ✗

**After:**
- All three proposal types now work correctly ✓
- PDFs open without corruption
- All fields are properly filled

**What Was Fixed:**
- Added better error handling for missing form fields
- Added form flattening to prevent corruption
- Different proposal types have different fields - this is now handled correctly

## Quick Test

### Test Editable Fields:
```
1. Login as Admin
2. Calculator → Total Costs
3. Find "Finance & Settlement" section
4. Click "Edit" next to Finance Fee
5. Enter a custom value (e.g., 5000)
6. Click "Save"
7. Verify the value updates
8. Click "Edit" again, then "Reset"
9. Verify it returns to the calculated default
```

### Test PDF Generation:
```
1. Create a deal with all sections filled
2. Go to Total Costs
3. Click "Generate Proposal"
4. Try each type:
   - Normal Proposal
   - Comparative Proposal  
   - Cash Proposal
5. Verify each PDF:
   - Downloads successfully
   - Opens without "corrupt file" error
   - Shows all the deal information
```

## Important Notes

- **Only Admins** can edit Finance Fee and Installation Base
- Managers and Users will NOT see the Edit buttons
- Custom values are saved with the deal
- All three proposal types now work correctly
- No other functionality was changed

## Need Help?

If you encounter any issues:
1. Check that you're logged in as Admin (for editing fields)
2. Clear browser cache and try again
3. Check browser console for any error messages
4. Verify the PDF templates exist in `/public/` folder:
   - Proposal.pdf (Normal)
   - Proposal1.pdf (Comparative)
   - Proposal2.pdf (Cash)
