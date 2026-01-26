# Navigation Fix Instructions

## Issue
When navigating to `/leads` (or other pages), the browser redirects back to the home page.

## Root Cause
The issue is likely one of the following:
1. **Browser Cache**: The browser is caching the old version of the page
2. **Dev Server**: The Next.js dev server needs to be restarted
3. **Auth Store Hydration**: The Zustand persist middleware needs time to hydrate from localStorage

## Solution Steps

### Step 1: Clear Browser Cache
1. Open your browser's Developer Tools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload" (or "Hard Refresh")
4. Alternatively, use Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

### Step 2: Restart the Development Server
1. Stop the current dev server (Ctrl+C in terminal)
2. Clear the Next.js cache:
   ```bash
   rm -rf .next
   # or on Windows:
   rmdir /s /q .next
   ```
3. Restart the dev server:
   ```bash
   npm run dev
   ```

### Step 3: Check Browser Console
1. Open Developer Tools (F12)
2. Go to the Console tab
3. Navigate to `http://localhost:3000/leads`
4. Look for console logs that show:
   ```
   Leads Page - Auth State: { mounted: true, isLoading: false, isAuthenticated: true, ... }
   Authenticated, staying on leads page
   ```

### Step 4: Verify Authentication
1. Make sure you're logged in
2. Check localStorage in Developer Tools:
   - Go to Application tab → Local Storage → http://localhost:3000
   - Look for `auth-storage` key
   - It should contain `token`, `user`, and `isAuthenticated: true`

### Step 5: Use the New Navigation Menu
The home page now has navigation buttons:
1. Go to `http://localhost:3000/`
2. You'll see buttons for:
   - **Calculator** (Purple) → `/calculator`
   - **Scraper** (Teal) → `/scraper`
   - **Leads** (Green) → `/leads`
   - **Reminders** (Blue) → `/reminders`
3. Click the "Leads" button to navigate

## Debugging

### Check Auth State
The leads page now logs authentication state to the console. Look for:
```javascript
Leads Page - Auth State: {
  mounted: true,
  isLoading: false,
  isAuthenticated: true,
  hasToken: true,
  hasUser: true,
  userRole: "admin"
}
```

### If Still Redirecting
If you see:
```javascript
Not authenticated, redirecting to login...
```

Then the auth store isn't properly hydrated. Try:
1. Log out and log back in
2. Clear localStorage and log in again
3. Check if the `/api/auth/login` endpoint is working

### Network Tab
Check the Network tab in Developer Tools:
1. Navigate to `/leads`
2. Look for any failed API requests
3. Check if there are any 401 Unauthorized responses

## Changes Made

### 1. Updated `app/leads/page.tsx`
- Added hydration check with `mounted` state
- Added detailed console logging for debugging
- Improved authentication check logic
- Only redirects after component is mounted and auth is loaded

### 2. Updated `app/page.tsx`
- Added navigation buttons to easily access all sections
- Color-coded buttons matching each section's theme:
  - Calculator: Purple gradient
  - Scraper: Teal gradient
  - Leads: Emerald/Green gradient
  - Reminders: Sky/Blue gradient

## Testing

### Test Navigation Flow
1. Start at home page (`/`)
2. Click "Leads" button
3. Verify you stay on the leads page
4. Check console for "Authenticated, staying on leads page"
5. Verify the dashboard displays with stats

### Test Direct URL
1. Type `http://localhost:3000/leads` in the address bar
2. Press Enter
3. Verify you stay on the leads page (don't get redirected to home)

### Test After Logout
1. Click logout on any page
2. Try to access `/leads`
3. Verify you get redirected to `/login`
4. Log back in
5. Navigate to `/leads` again
6. Verify it works

## Common Issues

### Issue: "Loading..." screen forever
**Solution**: The auth store isn't hydrating. Clear localStorage and log in again.

### Issue: Redirects to login even when logged in
**Solution**: Check if the token is expired. Log out and log back in.

### Issue: Page flashes then redirects
**Solution**: This is the hydration check working. The `mounted` state prevents premature redirects.

### Issue: Console shows "Not authenticated"
**Solution**: 
1. Check localStorage for `auth-storage`
2. Verify `isAuthenticated: true` in the stored data
3. If missing, log in again

## Next Steps

If the issue persists after following all steps:
1. Check the browser console for errors
2. Check the terminal/server logs for errors
3. Verify the database is running
4. Verify the auth API endpoints are working
5. Try a different browser to rule out browser-specific issues

## Additional Notes

- The leads page uses the same authentication pattern as calculator and scraper
- All pages now have consistent authentication checks
- The home page serves as a navigation hub
- Each section has its own unique color scheme while maintaining consistent design
