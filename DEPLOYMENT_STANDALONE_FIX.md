# Deployment Database Connection Fix

## Current Situation

Your app is running but cannot connect to the database. The environment variables are set correctly in Dockploy, but the container isn't seeing them properly.

## Root Cause

When you ran `npm run migrate` from inside the container, you got:
```
getaddrinfo EAI_AGAIN postgres
```

This means the migration script is trying to connect to hostname `postgres` instead of `smart-cost-calculator-postgres-rnfhko`. This happens when the DATABASE_URL environment variable is not being read by the container.

## Solution: Verify and Fix Environment Variables

### Step 1: Check if Environment Variables are Actually in the Container

Open Dockploy terminal for `smart-calculator-app` and run:

```bash
cd /app
echo $DATABASE_URL
```

**Expected output:**
```
postgresql://postgres:tbbbrb8rmrzaqab0@smart-cost-calculator-postgres-rnfhko:5432/smart_calculator
```

**If you see nothing or wrong value:** Environment variables are not being injected into the container.

### Step 2: Fix in Dockploy

The issue is that Dockploy needs to restart/redeploy for environment variables to take effect.

1. Go to your app in Dockploy
2. Find "Environment Variables" or "Settings" section
3. Verify these are set:

```
DATABASE_URL=postgresql://postgres:tbbbrb8rmrzaqab0@smart-cost-calculator-postgres-rnfhko:5432/smart_calculator
NODE_ENV=production
PORT=3456
JWT_SECRET=c70e42b247faa37aab0ee37e619441425fb1ba56d22c2d97221854745314e8d8
STORAGE_TYPE=local
STORAGE_PATH=./uploads
LOG_LEVEL=debug
SUPER_ADMIN_USERNAME=Camryn
SUPER_ADMIN_PASSWORD=Elliot6242!
SUPER_ADMIN_EMAIL=camryn@example.com
```

4. **CRITICAL:** After verifying/updating, click "Redeploy" or "Restart" button
5. Wait for deployment to complete (watch the logs)

### Step 3: Verify Environment Variables After Restart

After redeployment, open terminal again and check:

```bash
cd /app
echo $DATABASE_URL
```

If it now shows the correct value, proceed to Step 4.

### Step 4: Run Migrations

Now that environment variables are loaded, run migrations:

```bash
cd /app
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

### Step 5: Restart the App

After migrations complete, restart the app container in Dockploy to ensure it picks up the new database schema.

### Step 6: Test the Application

1. Open browser
2. Go to: `http://YOUR_VPS_IP:3456/login`
3. Login with:
   - Username: `Camryn`
   - Password: `Elliot6242!`

---

## Alternative: If Dockploy Doesn't Support Environment Variables Properly

If Dockploy isn't injecting environment variables into the container, you may need to:

### Option A: Use .env File in Container

1. Create a `.env.production` file in your repository with:

```env
DATABASE_URL=postgresql://postgres:tbbbrb8rmrzaqab0@smart-cost-calculator-postgres-rnfhko:5432/smart_calculator
NODE_ENV=production
PORT=3456
JWT_SECRET=c70e42b247faa37aab0ee37e619441425fb1ba56d22c2d97221854745314e8d8
STORAGE_TYPE=local
STORAGE_PATH=./uploads
LOG_LEVEL=debug
SUPER_ADMIN_USERNAME=Camryn
SUPER_ADMIN_PASSWORD=Elliot6242!
SUPER_ADMIN_EMAIL=camryn@example.com
```

2. Update `Dockerfile` to copy this file
3. Commit and push to GitHub
4. Redeploy in Dockploy

### Option B: Set Environment Variables in docker-compose.yml

If Dockploy uses docker-compose, ensure the `docker-compose.yml` has the environment variables in the `environment:` section.

---

## Troubleshooting

### Issue: `echo $DATABASE_URL` shows nothing

**Cause:** Environment variables not injected into container  
**Solution:** Redeploy the app in Dockploy after setting environment variables

### Issue: `echo $DATABASE_URL` shows wrong hostname

**Cause:** Old environment variable cached  
**Solution:** Update in Dockploy and redeploy

### Issue: Migrations fail with "permission denied"

**Cause:** Database user doesn't have permissions  
**Solution:** Connect to PostgreSQL container and grant permissions:

```sql
GRANT ALL PRIVILEGES ON DATABASE smart_calculator TO postgres;
```

### Issue: Migrations fail with "database does not exist"

**Cause:** Database `smart_calculator` not created  
**Solution:** Create it first (you already did this, so this shouldn't happen)

---

## Quick Diagnostic Commands

Run these in the app container terminal (`/app` directory):

```bash
# Check if DATABASE_URL is set
echo $DATABASE_URL

# Check if we can resolve the hostname
ping -c 1 smart-cost-calculator-postgres-rnfhko

# Check if PostgreSQL port is accessible
nc -zv smart-cost-calculator-postgres-rnfhko 5432

# Try to connect to database directly
psql $DATABASE_URL -c "SELECT 1"
```

---

## What's Happening Now

1. **App is running** ✓ (container is up)
2. **Environment variables set in Dockploy** ✓ (you confirmed this)
3. **Environment variables NOT in container** ✗ (causing the error)
4. **Migrations not run** ✗ (tables don't exist)
5. **Can't login** ✗ (no database tables)

## Next Steps

1. Verify environment variables are in container: `echo $DATABASE_URL`
2. If not, redeploy in Dockploy
3. Verify again after redeploy
4. Run migrations: `npm run migrate`
5. Restart app
6. Test login

**Estimated time:** 10 minutes
