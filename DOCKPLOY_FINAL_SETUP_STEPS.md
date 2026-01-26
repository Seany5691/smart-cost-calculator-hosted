# Dockploy Final Setup Steps

## ✅ Database Confirmed: `smart_calculator` exists!

Now complete these final steps:

---

## Step 1: Exit PostgreSQL

You're currently in the PostgreSQL prompt. Exit it:

```bash
# Press 'q' to exit the database list view
q

# Then exit PostgreSQL
\q
```

---

## Step 2: Find Your App Container Name

Dockploy may have named your container differently. Find the exact name:

```bash
docker ps
```

Look for your app container. It might be named:
- `smart-calculator-app`
- `smart-cost-calculator-app`
- Or something with your project name from Dockploy

**Copy the exact container name** for the next step.

---

## Step 3: Run Migrations

Replace `YOUR_CONTAINER_NAME` with the actual container name from Step 2:

```bash
docker exec YOUR_CONTAINER_NAME npm run migrate
```

**Example:**
```bash
docker exec smart-calculator-app npm run migrate
```

You should see output like:
```
Running migrations...
✓ Migration 001_initial_schema.sql completed
✓ Migration 002_... completed
...
All migrations completed successfully
```

---

## Step 4: Restart the App

```bash
docker restart YOUR_CONTAINER_NAME
```

**Example:**
```bash
docker restart smart-calculator-app
```

---

## Step 5: Wait and Test

Wait 10-15 seconds for the app to fully start, then test:

```bash
curl http://localhost:3456/api/health
```

**Expected response:**
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-01-19T...",
  "uptime": 123
}
```

---

## Step 6: Access Your App

Open in browser:
```
http://YOUR_VPS_IP:3456/login
```

**Login credentials:**
- Username: `Camryn`
- Password: `Elliot6242!`

---

## Quick Command Summary

```bash
# 1. Exit PostgreSQL (if still in it)
\q

# 2. Find container name
docker ps

# 3. Run migrations (replace YOUR_CONTAINER_NAME)
docker exec YOUR_CONTAINER_NAME npm run migrate

# 4. Restart app
docker restart YOUR_CONTAINER_NAME

# 5. Test (wait 10 seconds first)
curl http://localhost:3456/api/health

# 6. Access app
# http://YOUR_VPS_IP:3456/login
```

---

## Troubleshooting

### Issue: Container name not found

**Solution:** List all containers and find yours:
```bash
docker ps -a | grep calculator
```

### Issue: npm command not found

**Solution:** The container might not have npm in PATH. Try:
```bash
docker exec YOUR_CONTAINER_NAME node node_modules/.bin/migrate
```

Or enter the container and run manually:
```bash
docker exec -it YOUR_CONTAINER_NAME sh
cd /app
npm run migrate
exit
```

### Issue: Migration fails

**Check the error message.** Common issues:
- Database connection: Verify DATABASE_URL in Dockploy environment variables
- Permissions: Ensure postgres user has CREATE TABLE permissions

### Issue: Health check still fails

**Check logs:**
```bash
docker logs YOUR_CONTAINER_NAME --tail 50
```

Look for database connection errors.

---

## What Happens After Migrations?

The migrations will create all necessary tables:
- `users` (with your super admin account)
- `hardware_config`
- `connectivity_config`
- `licensing_config`
- `deals`
- `leads`
- `notes`
- `reminders`
- `routes`
- `scraping_sessions`
- And more...

Your super admin account will be automatically created:
- Username: `Camryn`
- Password: `Elliot6242!`
- Role: `super_admin`

---

## Next Steps After Login

1. **Test the calculator** - Go to Calculator page
2. **Create a test lead** - Go to Leads page
3. **Check admin config** - Go to Admin page
4. **Try the scraper** - Go to Scraper page

---

**Status:** Database exists, ready for migrations!  
**Time to complete:** 2-3 minutes  
**Difficulty:** Easy
