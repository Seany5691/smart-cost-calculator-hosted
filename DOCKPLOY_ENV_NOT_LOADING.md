# Dockploy Environment Variables Not Loading

## The Problem

You have set the correct environment variables in Dockploy UI:
```
DATABASE_URL=postgresql://postgres:tbbbrb8rmrzaqab0@smart-cost-calculator-postgres-rnfhko:5432/smart_calculator
```

But the container is seeing:
```
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/smart_calculator
```

**This means Dockploy is NOT passing your environment variables to the container.**

## Why This Happens

Dockploy might be:
1. Using a docker-compose.yml file that has hardcoded environment variables
2. Not properly injecting UI-configured environment variables into the container
3. Using a default DATABASE_URL from somewhere else

## Solution Options

### Option 1: Check Docker Compose Configuration

Dockploy might be using a `docker-compose.yml` file. Check if there's one in your repository that has environment variables defined.

If your `docker-compose.yml` has:
```yaml
environment:
  - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/smart_calculator
```

This will OVERRIDE what you set in the Dockploy UI.

**Fix:** Remove the `environment` section from `docker-compose.yml` or update it with the correct values.

### Option 2: Use Dockploy's Docker Compose Override

In Dockploy, look for:
- "Docker Compose Override" section
- "Advanced Settings"
- "Compose File" tab

Add this override:
```yaml
version: '3.8'
services:
  app:
    environment:
      - DATABASE_URL=postgresql://postgres:tbbbrb8rmrzaqab0@smart-cost-calculator-postgres-rnfhko:5432/smart_calculator
      - NODE_ENV=production
      - PORT=3456
      - JWT_SECRET=c70e42b247faa37aab0ee37e619441425fb1ba56d22c2d97221854745314e8d8
      - STORAGE_TYPE=local
      - STORAGE_PATH=./uploads
      - LOG_LEVEL=debug
      - SUPER_ADMIN_USERNAME=Camryn
      - SUPER_ADMIN_PASSWORD=Elliot6242!
      - SUPER_ADMIN_EMAIL=camryn@example.com
```

### Option 3: Set Environment Variables at Build Time

In Dockploy, look for "Build Arguments" or "Build Environment Variables" and add them there as well.

### Option 4: Use .env File in Repository (NOT RECOMMENDED for secrets)

Create a `.env.production` file in your repository:
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

**Note:** This is not recommended for production secrets, but it will work.

### Option 5: Check Dockploy Documentation

Look for Dockploy's documentation on how to properly set environment variables. Different versions might have different ways of handling this.

## Immediate Workaround

Since you can't easily fix Dockploy's configuration right now, let's try a different approach:

### Create a Network Alias for PostgreSQL

The container is looking for hostname `postgres`. We can make that work by:

1. In Dockploy, find your PostgreSQL container settings
2. Look for "Network Aliases" or "Hostname" setting
3. Add `postgres` as an alias for `smart-cost-calculator-postgres-rnfhko`

OR

### Update docker-compose.yml to Use Correct Hostname

Check if there's a `docker-compose.yml` in your repository. If so, update it:

```yaml
version: '3.8'
services:
  app:
    environment:
      DATABASE_URL: postgresql://postgres:tbbbrb8rmrzaqab0@smart-cost-calculator-postgres-rnfhko:5432/smart_calculator
    external_links:
      - smart-cost-calculator-postgres-rnfhko:postgres
```

## What to Do Now

1. Check if your repository has a `docker-compose.yml` file
2. If yes, share its contents so I can help you fix it
3. If no, try Option 2 (Docker Compose Override in Dockploy)
4. After making changes, redeploy and check: `echo $DATABASE_URL`

## Testing After Fix

After any fix, verify in the container:
```bash
cd /app
echo $DATABASE_URL
# Should show: postgresql://postgres:tbbbrb8rmrzaqab0@smart-cost-calculator-postgres-rnfhko:5432/smart_calculator

npm run migrate
# Should run successfully
```

---

**Current Status:** Environment variables set in Dockploy UI are not reaching the container  
**Root Cause:** Dockploy configuration issue or docker-compose override  
**Next Step:** Check for docker-compose.yml file or use Dockploy's compose override feature
