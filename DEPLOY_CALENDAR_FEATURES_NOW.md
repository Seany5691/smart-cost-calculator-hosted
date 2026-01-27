# 🚀 Deploy Calendar Features to Production

## Issue
The migration ran successfully and tables are created, but the production server is still running old code without the new calendar API routes.

## Current Status
- ✅ Code pushed to GitHub (commit: 82a2d30)
- ✅ Migration ran on VPS database
- ✅ Tables created: `calendar_events`, `calendar_shares`
- ❌ Production server needs to pull new code and restart

## Solution: Deploy to Production

### Option 1: Using Dockploy (Recommended)
If you're using Dockploy for deployment:

1. **Go to Dockploy Dashboard**
   - Navigate to your Dockploy panel
   - Find your "smart-cost-calculator" application

2. **Trigger Redeploy**
   - Click "Redeploy" or "Rebuild" button
   - This will pull latest code from GitHub
   - Build the new version
   - Restart the application

3. **Wait for Deployment**
   - Monitor the deployment logs
   - Wait for "Deployment successful" message
   - Usually takes 2-5 minutes

### Option 2: Manual Deployment via SSH
If you're deploying manually:

```bash
# SSH into your VPS
ssh your-user@your-vps-ip

# Navigate to app directory
cd /app

# Pull latest code from GitHub
git pull origin main

# Install any new dependencies (if needed)
npm install

# Build the application
npm run build

# Restart the application
pm2 restart smart-cost-calculator
# OR if using docker:
docker-compose down && docker-compose up -d --build
```

### Option 3: Using Docker Compose
If you're using Docker Compose:

```bash
# SSH into VPS
ssh your-user@your-vps-ip

# Navigate to app directory
cd /app

# Pull latest code
git pull origin main

# Rebuild and restart containers
docker-compose down
docker-compose up -d --build
```

## Verification Steps

After deployment, verify the calendar features work:

1. **Clear Browser Cache**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Or clear browser cache completely

2. **Check Console**
   - Open DevTools (F12)
   - Go to Console tab
   - Should see NO 500 errors for calendar API routes

3. **Test Add Event**
   - Go to Leads Dashboard
   - Click "Add Event" button
   - Fill in event details
   - Click "Create Event"
   - Should succeed without errors

4. **Test Share Calendar**
   - Click "Share Calendar" button
   - Select a user
   - Set permissions
   - Click "Share Calendar"
   - Should succeed without errors

## Expected API Routes (After Deployment)

These routes should work without 500 errors:
- ✅ GET `/api/calendar/events`
- ✅ POST `/api/calendar/events`
- ✅ GET `/api/calendar/shares`
- ✅ POST `/api/calendar/shares`
- ✅ PATCH `/api/calendar/shares/[shareId]`
- ✅ DELETE `/api/calendar/shares/[shareId]`

## Troubleshooting

### If Still Getting 500 Errors After Deployment:

1. **Check Server Logs**
   ```bash
   # If using PM2:
   pm2 logs smart-cost-calculator
   
   # If using Docker:
   docker logs smart-cost-calculator
   ```

2. **Verify Files Exist on Server**
   ```bash
   ls -la /app/app/api/calendar/events/
   ls -la /app/app/api/calendar/shares/
   ```

3. **Check Environment Variables**
   - Ensure `DATABASE_URL` is set correctly
   - Verify it points to the same database where migration ran

4. **Restart Database Connection**
   - Sometimes the app needs a full restart to reconnect to database
   - Try: `pm2 restart smart-cost-calculator --update-env`

## Summary

The calendar features are ready, but production needs to be updated:

1. ✅ Code is on GitHub
2. ✅ Database tables exist
3. ⏳ Need to deploy/redeploy application
4. ⏳ Need to restart production server

Once deployed, all calendar features will work perfectly! 🎉
