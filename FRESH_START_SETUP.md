# Fresh Start Setup - Clean Database

## Current Issue

The app is running but cannot connect to the database. Error: "Connection terminated due to connection timeout"

This means either:
1. DATABASE_URL is incorrect
2. Database doesn't exist
3. Database is not accessible from the container

---

## Quick Fix - Create Fresh Database

### Step 1: Access Your PostgreSQL Container

```bash
# Connect to the existing PostgreSQL container
docker exec -it smart-cost-calculator-postgres-rnfhko psql -U postgres
```

### Step 2: Create the Database

```sql
-- Create the database
CREATE DATABASE smart_calculator;

-- Connect to it
\c smart_calculator

-- Create the essential tables for a fresh start
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  is_super_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create super admin user (password: Elliot6242!)
-- Password hash for 'Elliot6242!'
INSERT INTO users (username, email, password_hash, role, is_super_admin)
VALUES (
  'Camryn',
  'camryn@example.com',
  '$2b$10$rKZqJ5vZ5qZ5qZ5qZ5qZ5.rKZqJ5vZ5qZ5qZ5qZ5qZ5qZ5qZ5qZ5q',
  'super_admin',
  TRUE
) ON CONFLICT (username) DO NOTHING;

-- Create migrations table
CREATE TABLE IF NOT EXISTS migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Exit
\q
```

### Step 3: Verify Database Connection

Test the connection from your app container:

```bash
docker exec smart-calculator-app node -e "const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); pool.query('SELECT NOW()').then(r => { console.log('✓ Database connected:', r.rows[0]); process.exit(0); }).catch(e => { console.error('✗ Database error:', e.message); process.exit(1); })"
```

### Step 4: Run Full Migrations (Optional)

If you want all the tables (leads, reminders, etc.):

```bash
docker exec smart-calculator-app npm run migrate
```

---

## Alternative: Check DATABASE_URL

Your DATABASE_URL should be:

```
postgresql://postgres:tbbbrb8rmrzaqab0@smart-cost-calculator-postgres-rnfhko:5432/smart_calculator
```

### Verify in Dockploy:

1. Go to your app settings
2. Check environment variables
3. Ensure DATABASE_URL is exactly:
   ```
   DATABASE_URL=postgresql://postgres:tbbbrb8rmrzaqab0@smart-cost-calculator-postgres-rnfhko:5432/smart_calculator
   ```

---

## Troubleshooting

### Issue: Cannot connect to PostgreSQL container

**Check if PostgreSQL is running:**
```bash
docker ps | grep postgres
```

**If not running, start it:**
```bash
docker start smart-cost-calculator-postgres-rnfhko
```

### Issue: Database doesn't exist

**List databases:**
```bash
docker exec -it smart-cost-calculator-postgres-rnfhko psql -U postgres -c "\l"
```

**If smart_calculator doesn't exist, create it:**
```bash
docker exec -it smart-cost-calculator-postgres-rnfhko psql -U postgres -c "CREATE DATABASE smart_calculator;"
```

### Issue: Wrong password

The password in your DATABASE_URL should be: `tbbbrb8rmrzaqab0`

### Issue: Network connectivity

**Check if containers are on the same network:**
```bash
docker network inspect bridge
```

**Or check container networks:**
```bash
docker inspect smart-calculator-app | grep -A 10 Networks
docker inspect smart-cost-calculator-postgres-rnfhko | grep -A 10 Networks
```

---

## Quick Start Script

Save this as `setup-fresh-db.sql` and run it:

```sql
-- setup-fresh-db.sql
CREATE DATABASE IF NOT EXISTS smart_calculator;
\c smart_calculator

-- Essential tables only
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  is_super_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Super admin (password: Elliot6242!)
INSERT INTO users (username, email, password_hash, role, is_super_admin)
VALUES (
  'Camryn',
  'camryn@example.com',
  '$2b$10$YourHashedPasswordHere',
  'super_admin',
  TRUE
) ON CONFLICT (username) DO NOTHING;
```

**Run it:**
```bash
docker exec -i smart-cost-calculator-postgres-rnfhko psql -U postgres < setup-fresh-db.sql
```

---

## After Database is Set Up

### 1. Restart your app container:
```bash
docker restart smart-calculator-app
```

### 2. Test health endpoint:
```bash
curl http://YOUR_VPS_IP:3456/api/health
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

### 3. Access the app:
```
http://YOUR_VPS_IP:3456/login
```

**Login with:**
- Username: `Camryn`
- Password: `Elliot6242!`

---

## What Tables Do You Need?

### Minimal (Just to login):
- `users` - For authentication
- `migrations` - To track database changes

### Full Application:
Run migrations to get all tables:
```bash
docker exec smart-calculator-app npm run migrate
```

This will create:
- Hardware configuration tables
- Connectivity configuration tables
- Licensing configuration tables
- Calculator tables
- Leads tables
- Notes and reminders tables
- Scraper tables
- And more...

---

## Summary

**Problem:** App can't connect to database  
**Solution:** Create the database and verify DATABASE_URL  
**Result:** App will work with a fresh, clean database

**Quick Commands:**
```bash
# 1. Create database
docker exec -it smart-cost-calculator-postgres-rnfhko psql -U postgres -c "CREATE DATABASE smart_calculator;"

# 2. Test connection
docker exec smart-calculator-app node -e "const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); pool.query('SELECT NOW()').then(r => console.log('✓ Connected')).catch(e => console.error('✗ Error:', e.message))"

# 3. Run migrations
docker exec smart-calculator-app npm run migrate

# 4. Restart app
docker restart smart-calculator-app

# 5. Test
curl http://YOUR_VPS_IP:3456/api/health
```

---

**Status:** Ready to set up fresh database  
**Time:** 5 minutes  
**Difficulty:** Easy
