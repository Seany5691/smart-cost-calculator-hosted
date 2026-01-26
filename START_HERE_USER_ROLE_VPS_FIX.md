# 🚀 VPS Deployment - User Role Total Costs Fix

## ⚠️ THE PROBLEM
When logged in as **User role**, the Total Costs section shows all zeros because the database is missing role-based pricing fields.

## ✅ THE SOLUTION
Run a SQL script on your VPS to add the missing fields to the database.

---

## 📋 DEPLOYMENT STEPS (VPS with Docker)

### Step 1: SSH into Your VPS
```bash
ssh your-user@your-vps-ip
```

### Step 2: Navigate to Your App Directory
```bash
cd /path/to/your/app
# Example: cd /app or cd /home/user/smart-cost-calculator
```

### Step 3: Pull Latest Code from GitHub
```bash
git pull origin main
```

### Step 4: Run the SQL Fix Script
```bash
psql $DATABASE_URL -f scripts/fix-user-role-scales.sql
```

**Expected Output:**
```
=== Checking current scales data ===
(Shows current data with missing fields)

=== Updating scales data to add missing fields ===
UPDATE 1

=== Verifying the update ===
(Shows updated data with all 6 fields)

=== Fix complete! ===
```

### Step 5: Restart Docker Container
```bash
docker-compose restart
```

### Step 6: Test the Fix
1. Open your calculator in a browser
2. Log in as a **User role** account
3. Go to Calculator
4. **IMPORTANT**: Add items to the calculator:
   - Step 1: Fill in deal details
   - Step 2: Add hardware items (check "Extension" on some)
   - Step 3: Add connectivity items
   - Step 4: Add licensing items
   - Step 5: Enter settlement amount
   - Step 6: Check Total Costs - should now show values!

---

## 🔍 VERIFICATION

To verify the fix worked, run this on VPS:
```bash
psql $DATABASE_URL -c "SELECT scales_data->'additional_costs' FROM scales ORDER BY created_at DESC LIMIT 1;"
```

You should see all 6 fields:
- `cost_per_kilometer`
- `cost_per_point`
- `manager_cost_per_kilometer`
- `manager_cost_per_point`
- `user_cost_per_kilometer` ✅ (NEW)
- `user_cost_per_point` ✅ (NEW)

---

## 🆘 TROUBLESHOOTING

### If SQL script fails:
```bash
# Check if DATABASE_URL is set
echo $DATABASE_URL

# If not set, check your .env file or docker-compose.yml
```

### If still showing zeros after fix:
1. **Did you add items to the calculator?** Total Costs calculates based on what you added in previous steps
2. Clear browser cache (Ctrl+Shift+Delete)
3. Hard refresh (Ctrl+Shift+R)
4. Check browser console (F12) for errors
5. Verify you're logged in as User role

### If Docker restart fails:
```bash
# Check container status
docker ps -a

# View logs
docker logs <container-name>

# Force restart
docker-compose down
docker-compose up -d
```

---

## 📝 WHAT THE FIX DOES

The SQL script:
1. Finds your scales configuration in the database
2. Adds `user_cost_per_kilometer` field (copies from base `cost_per_kilometer` = 1.5)
3. Adds `user_cost_per_point` field (copies from base `cost_per_point` = 750)
4. Adds `manager_cost_per_kilometer` field (copies from base)
5. Adds `manager_cost_per_point` field (copies from base)
6. Updates the `updated_at` timestamp

**No data is deleted** - only new fields are added.

---

## 🎯 NEXT STEPS

After the fix is deployed:
1. Test with User role account
2. Test with Manager role account (should still work)
3. Test with Admin role account (should still work)
4. Update pricing in Admin Config if needed (the UI already has the fields)

---

## 📞 SUPPORT

If you encounter issues:
1. Check the console logs in browser (F12)
2. Check Docker logs: `docker logs <container-name>`
3. Check database connection: `psql $DATABASE_URL -c "SELECT 1;"`
4. Verify latest code is pulled: `git log -1`
