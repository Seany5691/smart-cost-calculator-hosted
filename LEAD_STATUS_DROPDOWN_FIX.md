# Lead Status Dropdown Fix

## Issue
When trying to move leads between status tabs using the dropdown in the table view, users received a "Failed to move" error. The dropdown would not update the lead status.

## Root Cause
The `LeadsTable.tsx` component was using `localStorage.getItem('token')` directly instead of reading from the `auth-storage` key where the authentication token is actually stored. This caused all API calls to fail with 401 Unauthorized errors.

## Files Fixed

### `components/leads/LeadsTable.tsx`

**Changes Made:**

1. **Added `getAuthToken()` helper function** (lines 13-24)
   - Reads from `auth-storage` localStorage key
   - Handles both `data.state.token` and `data.token` formats
   - Includes error handling

2. **Updated `handleDelete()` function** (line 42)
   - Changed from `localStorage.getItem('token')` to `getAuthToken()`
   - Added authentication check

3. **Updated `handleStatusChange()` function** (line 68)
   - Changed from `localStorage.getItem('token')` to `getAuthToken()`
   - Added authentication check
   - Improved error messages to show specific error from API

4. **Updated `handleLaterStageConfirm()` function** (line 95)
   - Changed from `localStorage.getItem('token')` to `getAuthToken()`
   - Added authentication check
   - Fixed field name: `date_to_call_back` (matches API expectation)
   - Improved error handling

5. **Updated `handleSignedConfirm()` function** (line 124)
   - Changed from `localStorage.getItem('token')` to `getAuthToken()`
   - Added authentication check
   - Fixed field name: `date_signed` (matches API expectation)
   - Improved error handling

## How It Works Now

1. **Direct Status Changes** (Leads, Working On, Bad Leads):
   - User selects new status from dropdown
   - `handleStatusChange()` is called
   - Lead status is updated immediately via API
   - Page refreshes to show updated lead in new tab

2. **Status Changes with Modals** (Later Stage, Signed):
   - User selects "Later Stage" or "Signed" from dropdown
   - Modal opens to collect additional required information
   - User enters callback date (Later Stage) or signed date (Signed)
   - `handleLaterStageConfirm()` or `handleSignedConfirm()` is called
   - Lead status and additional fields are updated via API
   - Page refreshes to show updated lead in new tab

## Testing
1. Navigate to any status tab (Leads, Working On, Later Stage, Bad Leads, Signed)
2. Find a lead in the table view
3. Click the status dropdown on that lead
4. Select a different status
5. Verify:
   - For direct statuses: Lead moves immediately
   - For Later Stage: Modal opens, enter callback date, lead moves
   - For Signed: Modal opens, enter signed date, lead moves
6. Navigate to the target status tab to confirm lead appears there

## Status
✅ **COMPLETE** - All status dropdown functionality now works correctly with proper authentication
