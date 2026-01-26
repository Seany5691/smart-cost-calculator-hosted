# 502 Bad Gateway Error - Fix Guide

## Current Status

✅ App is running - logs show:
```
▲ Next.js 14.2.18
- Local:        http://localhost:3456
- Network:      http://0.0.0.0:3456
✓ Ready in 121ms
```

❌ Getting 502 error when accessing the page

## What 502 Means

A 502 Bad Gateway error means:
- The app container is running
- But requests to it are failing
- Usually because the app is crashing when it tries to handle requests

## Most Likely Cause

**The migrations haven't run yet**, so when the app tries to query the database, it fails because the tables don't exist.

## Fix: Run Migrations

### Step 1: Open Terminal in Dockploy

1. In Dockploy, find your app: `smart-calculator-app`
2. Click "Terminal" or "Console"
3. Select "Bash" or "/bin/sh"

### Step 2: Navigate and Check Environment

```bash
cd /app
echo $DATABASE_URL
```

**You should see:**
```
postgresql://postgres:tbbbrb8rmrzaqab0@smart-cost-calculator-postgres-rnfhko:5432/smart_calculator
```

If you see the OLD value (with `postgres:postgres@postgres`), the docker-compose fix didn't take effect. You'll need to redeploy again.

### Step 3: Run Migrations

```bash
npm run migrate
```

**Expected output:**
```
Starting database migrations...

Running migration: 001_initial_schema.sql
✓ 001_initial_schema.sql completed successfully!
Running migration: 002_user_management.sql
✓ 002_user_management.sql completed successfully!
...
✓ All migrations completed successfully!
```

### Step 4: Check the Logs

After migrations complete, check the app logs in Dockploy. You should see the database connection is now working.

### Step 5: Test the Application

Go to: `http://YOUR_VPS_IP:3456/login`

**You should now see the login page!**

Login with:
- Username: `Camryn`
- Password: `Elliot6242!`

---

## Alternative Causes of 502 Error

If migrations run successfully but you still get 502:

### 1. Port Mismatch

Check that Dockploy is forwarding to the correct port (3456).

In Dockploy settings, verify:
- External Port: 3456
- Internal Port: 3456

### 2. Network Issues

The app container might not be on the same Docker network as the PostgreSQL container.

Check in Dockploy if both containers are on the same network.

### 3. Database Connection Failing

Check the app logs for database connection errors:
```
Connection terminated due to connection timeout
```

If you see this, the DATABASE_URL is still wrong or the PostgreSQL container isn't accessible.

### 4. App Crashing on Startup

Check the full logs in Dockploy for any error messages that show why the app is crashing.

---

## Quick Diagnostic Commands

Run these in the app container terminal:

```bash
# Check if DATABASE_URL is correct
echo $DATABASE_URL

# Check if we can reach PostgreSQL
nc -zv smart-cost-calculator-postgres-rnfhko 5432

# Check if migrations table exists
psql $DATABASE_URL -c "SELECT * FROM migrations LIMIT 1;"

# Check app logs
tail -f /app/.next/standalone/server.log
```

---

## What to Do Now

1. Open terminal in Dockploy for `smart-calculator-app`
2. Run: `cd /app && echo $DATABASE_URL`
3. If DATABASE_URL is correct, run: `npm run migrate`
4. Wait for migrations to complete
5. Refresh your browser and try accessing the app again

**The 502 error should be gone after migrations run successfully.**
