# Dockploy Environment Variable Fix

## Problem

The DATABASE_URL environment variable is not correctly set in your Dockploy deployment, causing migrations to fail with error: `getaddrinfo EAI_AGAIN postgres`

## Solution: Update Environment Variables in Dockploy

### Step 1: Go to Your App Settings in Dockploy

1. Open Dockploy web interface
2. Find your `smart-calculator-app` project
3. Click on it to open settings

### Step 2: Update Environment Variables

Look for the "Environment Variables" section and verify/update:

```
DATABASE_URL=postgresql://postgres:tbbbrb8rmrzaqab0@smart-cost-calculator-postgres-rnfhko:5432/smart_calculator
```

**CRITICAL:** Make sure it says `smart-cost-calculator-postgres-rnfhko` (the full container name), NOT just `postgres`

### Step 3: Redeploy

After updating the environment variable:

1. Click "Save" or "Update"
2. Click "Redeploy" or "Restart" the application
3. Wait for the deployment to complete

### Step 4: Check if Migrations Ran

After redeployment, check the logs in Dockploy to see if migrations ran automatically. Look for:

```
Starting database migrations...
✓ Migration 001_initial_schema.sql completed
```

### Step 5: Test the Application

1. Open your browser
2. Go to: `http://YOUR_VPS_IP:3456/login`
3. Try to login with:
   - Username: `Camryn`
   - Password: `Elliot6242!`

---

## Alternative: Manual Migration Through Dockploy Terminal

If migrations didn't run automatically, you can run them manually:

### Option A: Through App Container Terminal

1. In Dockploy, open terminal for `smart-calculator-app`
2. Make sure you see `/app $` prompt (not `/ $`)
3. Run:
   ```bash
   npm run migrate
   ```

### Option B: If You're in Wrong Directory

If you see `/ $` instead of `/app $`:

```bash
cd /app
npm run migrate
```

---

## What Should Happen After Fix

1. **Migrations complete successfully** - All database tables created
2. **Super admin account created** automatically:
   - Username: `Camryn`
   - Password: `Elliot6242!`
   - Role: `super_admin`
3. **Health check passes** - App shows as healthy in Dockploy
4. **Login works** - You can access the app at `http://YOUR_VPS_IP:3456/login`

---

## Troubleshooting

### Issue: Still getting "postgres" hostname error

**Solution:** The DATABASE_URL is still wrong. Double-check in Dockploy that it says:
```
smart-cost-calculator-postgres-rnfhko
```
NOT just `postgres`

### Issue: Can't find Environment Variables section

**Solution:** Look for:
- "Settings" tab
- "Environment" tab
- "Configuration" section
- "Env Variables" button

### Issue: Migrations still fail after redeployment

**Solution:** Run migrations manually through the terminal (see Alternative section above)

---

## Quick Checklist

- [ ] DATABASE_URL contains full hostname: `smart-cost-calculator-postgres-rnfhko`
- [ ] DATABASE_URL contains correct database name: `smart_calculator`
- [ ] DATABASE_URL contains correct password: `tbbbrb8rmrzaqab0`
- [ ] App has been redeployed after environment variable change
- [ ] Migrations have run successfully (check logs)
- [ ] Can access login page at `http://YOUR_VPS_IP:3456/login`
- [ ] Can login with Camryn / Elliot6242!

---

**Current Status:** Need to update DATABASE_URL in Dockploy  
**Next Step:** Update environment variable and redeploy  
**Time to complete:** 5 minutes
