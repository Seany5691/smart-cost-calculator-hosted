# Migration Database Connection Fix

## Issue

Migration script is trying to connect to hostname `postgres` instead of `smart-cost-calculator-postgres-rnfhko`.

Error: `getaddrinfo EAI_AGAIN postgres`

## Root Cause

The DATABASE_URL environment variable is not being passed correctly to the migration script inside the container.

## Solution

You need to exit the container and run migrations from outside using `docker exec` with the `-e` flag to pass environment variables, OR verify the DATABASE_URL is set correctly in Dockploy.

## Steps to Fix

### Option 1: Exit and Run from Outside (Recommended)

1. **Exit the container:**
   ```bash
   exit
   ```

2. **Run migrations from outside with explicit DATABASE_URL:**
   ```bash
   docker exec -e DATABASE_URL="postgresql://postgres:tbbbrb8rmrzaqab0@smart-cost-calculator-postgres-rnfhko:5432/smart_calculator" smart-calculator-app npm run migrate
   ```

3. **Restart the app:**
   ```bash
   docker restart smart-calculator-app
   ```

4. **Test:**
   ```bash
   curl http://localhost:3456/api/health
   ```

### Option 2: Check Environment Variables in Dockploy

The DATABASE_URL might not be set correctly in Dockploy. Verify it's:

```
DATABASE_URL=postgresql://postgres:tbbbrb8rmrzaqab0@smart-cost-calculator-postgres-rnfhko:5432/smart_calculator
```

If it's wrong, update it in Dockploy, then redeploy the container.

### Option 3: Verify Environment Inside Container

While inside the container, check if DATABASE_URL is set:

```bash
echo $DATABASE_URL
```

If it shows the wrong value or nothing, the environment variable isn't being passed to the container.

## Expected Result

After running migrations successfully, you should see:

```
Starting database migrations...
✓ Migration 001_initial_schema.sql completed
✓ Migration 002_... completed
...
All migrations completed successfully
```

## Next Steps After Successful Migration

1. Exit container (if inside)
2. Restart app: `docker restart smart-calculator-app`
3. Wait 10 seconds
4. Test: `curl http://localhost:3456/api/health`
5. Access app: `http://YOUR_VPS_IP:3456/login`

---

**Current Status:** Need to run migrations with correct DATABASE_URL  
**Recommended Action:** Exit container and run migrations from outside with explicit DATABASE_URL
