# Check Environment Variables in Container

## Run This Command Now

You're in the right place (`/app $`). Now run this command to see what the container actually sees:

```bash
echo $DATABASE_URL
```

## What You'll See

### If you see nothing (blank line):
**Problem:** Environment variables are NOT loaded in the container  
**Solution:** You need to redeploy in Dockploy

### If you see the full connection string:
```
postgresql://postgres:tbbbrb8rmrzaqab0@smart-cost-calculator-postgres-rnfhko:5432/smart_calculator
```
**Problem:** Something else is wrong (but this is unlikely based on your error)

---

## Most Likely: Environment Variables Not Loaded

The error `getaddrinfo EAI_AGAIN postgres` means the script is trying to connect to hostname `postgres` instead of `smart-cost-calculator-postgres-rnfhko`.

This happens when `DATABASE_URL` is not set, so the connection string defaults to something wrong.

## Fix: Redeploy in Dockploy

1. Exit the terminal (type `exit`)
2. In Dockploy, find your app: `smart-calculator-app`
3. Look for a button that says:
   - "Redeploy" or
   - "Restart" or
   - "Rebuild" or
   - "Deploy"
4. Click it
5. Wait 2-3 minutes for deployment to complete
6. Open terminal again
7. Run: `cd /app && echo $DATABASE_URL`
8. If you now see the connection string, run: `npm run migrate`

---

## Why This Happens

Dockploy sets environment variables at deployment time. If you:
- Added environment variables AFTER the container was already running
- The container won't see them until you redeploy

The redeploy will:
1. Stop the old container
2. Create a new container with the environment variables
3. Start the new container

---

## After Redeployment

Once you redeploy and the environment variables are loaded:

```bash
cd /app
echo $DATABASE_URL
# Should show: postgresql://postgres:tbbbrb8rmrzaqab0@smart-cost-calculator-postgres-rnfhko:5432/smart_calculator

npm run migrate
# Should run successfully and create all tables
```

Then test the app at: `http://YOUR_VPS_IP:3456/login`
