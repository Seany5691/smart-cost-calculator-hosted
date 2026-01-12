# UUID Fix Instructions

## Problem
Your app is using `"admin-1"` as a userId instead of proper UUIDs, causing Supabase errors:
```
invalid input syntax for type uuid: "admin-1"
```

## Solution Options

### Option 1: Quick Fix (Recommended)
1. Open your browser's developer console (F12)
2. Copy and paste the contents of `fix-user-id.js` into the console
3. Press Enter to run the script
4. Refresh the page and log in again

### Option 2: Manual Fix
1. Open browser developer console (F12)
2. Run this command:
```javascript
localStorage.clear();
location.reload();
```
3. Log in again with your credentials

### Option 3: Complete Reset
If the above doesn't work, run this in the console:
```javascript
// Clear everything
localStorage.clear();
sessionStorage.clear();
// Clear IndexedDB
indexedDB.deleteDatabase('supabase-db');
// Reload
location.reload();
```

## What Was Fixed
1. **Enhanced validation** in auth store to reject non-UUID user IDs
2. **Login protection** to prevent authentication with invalid IDs
3. **Storage validation** to ensure only valid UUIDs are stored
4. **Auto-cleanup** of corrupted authentication data

## Default Users
- **Admin**: `Camryn` / `Elliot6242!` (UUID: `550e8400-e29b-41d4-a716-446655440000`)
- **Manager**: `john` / `password123` (UUID: `550e8400-e29b-41d4-a716-446655440001`)
- **User**: `jane` / `password123` (UUID: `550e8400-e29b-41d4-a716-446655440002`)

## Verification
After logging in, check the console for:
```
✅ User authenticated successfully with UUID: 550e8400-e29b-41d4-a716-446655440000
```

## Prevention
The app now automatically validates user IDs and will prevent this issue from happening again.
