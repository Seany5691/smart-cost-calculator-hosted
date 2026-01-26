# Calculator 401 Errors - Debug Steps

## Current Status

Dashboard works ✅  
Calculator getting 401 errors ❌

## Debug Logging Added

I've added console logging to help diagnose the issue:

### 1. Calculator Page (`app/calculator/page.tsx`)
After hydration, logs:
```
[CALCULATOR] After hydrate: {
  isAuthenticated: true/false,
  hasToken: true/false,
  hasUser: true/false,
  token: 'first 20 chars...'
}
```

### 2. Config Store (`lib/store/config.ts`)
When fetching hardware, logs:
```
[CONFIG] fetchHardware - token: 'first 20 chars...' or 'NULL'
```

## What to Check

### Step 1: Refresh Calculator Page
1. Open browser to `http://localhost:3000/calculator`
2. Open DevTools (F12) → Console tab
3. Look for the `[CALCULATOR]` log message
4. Check if it shows:
   - `isAuthenticated: true` ✅
   - `hasToken: true` ✅
   - `token: 'eyJ...'` ✅

### Step 2: Check Config Fetch
1. Look for `[CONFIG] fetchHardware - token:` message
2. Check if it shows:
   - `token: 'eyJ...'` ✅ (Good - token is being sent)
   - `token: 'NULL'` ❌ (Bad - token is not found)

## Possible Issues

### Issue A: Token is NULL in Calculator
**Symptom:** `[CALCULATOR]` log shows `hasToken: false`  
**Cause:** localStorage doesn't have auth data  
**Solution:** Logout and login again

### Issue B: Token is NULL in Config Store
**Symptom:** `[CALCULATOR]` shows token, but `[CONFIG]` shows NULL  
**Cause:** Timing issue - config fetching before auth hydration completes  
**Solution:** Already added 50ms delay, may need to increase

### Issue C: Token Exists But Still 401
**Symptom:** Both logs show token exists  
**Cause:** Token might be expired or invalid  
**Solution:** Logout and login again to get fresh token

## Quick Fix to Try

### Option 1: Logout and Login
1. Go to dashboard
2. Click Logout
3. Login again
4. Try calculator page

### Option 2: Clear Storage
1. F12 → Application → Local Storage
2. Find `localhost:3000`
3. Look for `auth-storage` key
4. Check if it has `token` and `user` data
5. If missing or looks wrong, clear all and login again

### Option 3: Check Token Format
In console, run:
```javascript
JSON.parse(localStorage.getItem('auth-storage'))
```

Should show:
```json
{
  "user": { "id": "...", "username": "...", "role": "...", ... },
  "token": "eyJ...",
  "isAuthenticated": true
}
```

## Next Steps

After you refresh the calculator page, please:
1. Copy the `[CALCULATOR]` log message
2. Copy the `[CONFIG]` log message (if it appears)
3. Let me know what they say

This will help me understand exactly where the token is being lost.
