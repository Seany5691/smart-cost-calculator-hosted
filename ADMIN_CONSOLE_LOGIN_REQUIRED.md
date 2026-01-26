# Admin Console - Login Required

## Issue
You're getting 401 Unauthorized errors when trying to add items in the admin console because your current browser session has an old authentication token that doesn't have admin privileges.

## Solution
You need to **log out and log back in as Camryn** to get a fresh auth token with admin role.

### Steps:

1. **Log Out**
   - Click your username in the top right corner
   - Click "Logout" or navigate to `/login`
   - This will clear your old auth token

2. **Log In as Camryn**
   - Username: `Camryn`
   - Password: `Elliot6242!`
   - This will give you a fresh token with admin role

3. **Navigate to Admin Console**
   - Go to `/admin` page
   - You should now be able to add/edit/delete hardware, licensing, and connectivity items

## Why This Happens
When we updated your user role to admin in the database, your browser still had the old JWT token cached. JWT tokens contain the user's role at the time of login, so you need to log in again to get a new token with the updated admin role.

## Verification
After logging in as Camryn, you should see:
- No more 401 errors in the browser console
- Ability to add new hardware items
- Ability to add new licensing items
- Ability to add new connectivity items
- Ability to edit/delete existing items

## Current Status
- ✅ Camryn is set as super admin in database
- ✅ Camryn cannot be edited or deleted (protected)
- ✅ API routes require admin role for POST/PUT/DELETE operations
- ❌ Your browser has old auth token (needs fresh login)
