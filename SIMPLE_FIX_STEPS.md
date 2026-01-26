# Simple Fix - Step by Step

## The Problem

Your environment variables are set in Dockploy, but the container can't see them. That's why you got the `getaddrinfo EAI_AGAIN postgres` error.

## The Fix (5 Simple Steps)

### Step 1: Open App Container Terminal in Dockploy

1. In Dockploy, find your app: `smart-calculator-app`
2. Click on "Terminal" or "Console"
3. Select "Bash" or "/bin/sh"
4. You should see a prompt like: `/ $` or `/app $`

### Step 2: Check if Environment Variables Exist

Type this command:

```bash
echo $DATABASE_URL
```

**If you see the full connection string** (starting with `postgresql://postgres:tbbbrb8rmrzaqab0@smart-cost-calculator-postgres-rnfhko...`):
- ✓ Good! Go to Step 4

**If you see nothing or just a blank line**:
- ✗ Environment variables are not loaded
- Go to Step 3

### Step 3: Redeploy to Load Environment Variables

1. Exit the terminal
2. In Dockploy, find the "Redeploy" or "Restart" button for your app
3. Click it and wait for deployment to complete (2-3 minutes)
4. After deployment completes, go back to Step 1 and check again

### Step 4: Navigate to App Directory and Run Migrations

```bash
cd /app
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

**If you see errors:** Copy the error message and share it.

### Step 5: Test the Application

1. Open your browser
2. Go to: `http://YOUR_VPS_IP:3456/login`
3. Login with:
   - Username: `Camryn`
   - Password: `Elliot6242!`

**You should now be able to login!**

---

## Quick Reference

### Where am I?

- `/ $` = Root directory (wrong place)
- `/app $` = App directory (correct place)

### How to get to the right place?

```bash
cd /app
```

### How to check environment variables?

```bash
echo $DATABASE_URL
```

### How to run migrations?

```bash
npm run migrate
```

---

## If It Still Doesn't Work

Share the output of these commands:

```bash
cd /app
echo "DATABASE_URL: $DATABASE_URL"
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $PORT"
```

This will help us see what the container actually sees.
