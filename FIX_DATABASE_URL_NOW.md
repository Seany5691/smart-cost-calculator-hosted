# FIX DATABASE_URL NOW

## The Problem Found!

Your container has the WRONG DATABASE_URL:
```
postgresql://postgres:postgres@postgres:5432/smart_calculator
```

It should be:
```
postgresql://postgres:tbbbrb8rmrzaqab0@smart-cost-calculator-postgres-rnfhko:5432/smart_calculator
```

**Wrong parts:**
- ❌ Password: `postgres` (should be `tbbbrb8rmrzaqab0`)
- ❌ Hostname: `postgres` (should be `smart-cost-calculator-postgres-rnfhko`)

## Fix It in Dockploy

### Step 1: Exit the Terminal

Type `exit` in your current terminal.

### Step 2: Update Environment Variable in Dockploy

1. In Dockploy, find your app: `smart-calculator-app`
2. Go to "Settings" or "Environment" or "Configuration"
3. Find the `DATABASE_URL` variable
4. **Change it to:**
   ```
   postgresql://postgres:tbbbrb8rmrzaqab0@smart-cost-calculator-postgres-rnfhko:5432/smart_calculator
   ```
5. **IMPORTANT:** Make sure you:
   - Use the correct password: `tbbbrb8rmrzaqab0`
   - Use the full container name: `smart-cost-calculator-postgres-rnfhko`
   - NOT just `postgres`

### Step 3: Save and Redeploy

1. Click "Save" or "Update"
2. Click "Redeploy" or "Restart" button
3. Wait for deployment to complete (2-3 minutes)

### Step 4: Verify the Fix

After redeployment:

1. Open terminal for `smart-calculator-app`
2. Run:
   ```bash
   cd /app
   echo $DATABASE_URL
   ```

**You should now see:**
```
postgresql://postgres:tbbbrb8rmrzaqab0@smart-cost-calculator-postgres-rnfhko:5432/smart_calculator
```

### Step 5: Run Migrations

```bash
npm run migrate
```

**Expected output:**
```
Starting database migrations...

Running migration: 001_initial_schema.sql
✓ 001_initial_schema.sql completed successfully!
...
✓ All migrations completed successfully!
```

### Step 6: Test the App

Go to: `http://YOUR_VPS_IP:3456/login`

Login with:
- Username: `Camryn`
- Password: `Elliot6242!`

---

## Why This Happened

Dockploy likely has a default DATABASE_URL that it uses when you don't explicitly set one, or the one you set didn't save properly.

The fix is to explicitly set the correct DATABASE_URL and redeploy.

---

## Quick Checklist

- [ ] Update DATABASE_URL in Dockploy to use `tbbbrb8rmrzaqab0` password
- [ ] Update DATABASE_URL in Dockploy to use `smart-cost-calculator-postgres-rnfhko` hostname
- [ ] Save the changes
- [ ] Redeploy the app
- [ ] Verify `echo $DATABASE_URL` shows correct value
- [ ] Run `npm run migrate`
- [ ] Test login at `http://YOUR_VPS_IP:3456/login`
