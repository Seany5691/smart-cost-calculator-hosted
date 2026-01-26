# Dockploy VPS Deployment Guide

Complete step-by-step guide for deploying Smart Cost Calculator to your VPS using Dockploy.

## Prerequisites

✅ VPS with Dockploy installed
✅ GitHub repository connected to Dockploy
✅ PostgreSQL database available on Dockploy

---

## Step 1: Create PostgreSQL Database in Dockploy

1. **Log into your Dockploy dashboard**

2. **Create a new PostgreSQL database:**
   - Click "Create Database" or "Add Database"
   - Select "PostgreSQL"
   - Database Name: `smart_calculator`
   - Username: `postgres` (or your preferred username)
   - Password: Generate a strong password (save this!)
   - Version: PostgreSQL 15 or higher
   - Click "Create"

3. **Note your database connection details:**
   - Host: Usually `postgres` or the internal service name
   - Port: `5432` (default)
   - Database: `smart_calculator`
   - Username: `postgres`
   - Password: (the one you just created)

---

## Step 2: Create Application in Dockploy

1. **Create new application:**
   - Click "Create Application" or "Add Application"
   - Select "GitHub" as source
   - Choose repository: `Seany5691/smart-cost-calculator-hosted`
   - Branch: `main`
   - Build Type: `Dockerfile` or `Node.js`

2. **Configure build settings:**
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Port: `3000`

---

## Step 3: Configure Environment Variables

In Dockploy, add these environment variables to your application:

### Required Variables:

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@postgres:5432/smart_calculator

# JWT Secret (CRITICAL - Generate a strong secret)
JWT_SECRET=YOUR_STRONG_RANDOM_SECRET_HERE

# Application Configuration
NODE_ENV=production
PORT=3000

# Super Admin Configuration
SUPER_ADMIN_USERNAME=Camryn
SUPER_ADMIN_PASSWORD=Elliot6242!
SUPER_ADMIN_EMAIL=admin@yourdomain.com
```

### How to generate JWT_SECRET:

**Option 1 - Online:**
- Visit: https://generate-secret.vercel.app/32
- Copy the generated secret

**Option 2 - Command line (if you have Node.js locally):**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Option 3 - Use a password generator:**
- Generate a 64-character random string
- Use letters, numbers, and special characters

### Important Notes:
- Replace `YOUR_PASSWORD` with your PostgreSQL password from Step 1
- Replace `YOUR_STRONG_RANDOM_SECRET_HERE` with your generated JWT secret
- The database host is usually `postgres` (internal Docker network name)
- If Dockploy uses a different internal hostname, check your database connection details

---

## Step 4: Deploy the Application

1. **Save all environment variables**

2. **Deploy the application:**
   - Click "Deploy" or "Build & Deploy"
   - Wait for the build to complete (this may take 5-10 minutes)
   - Monitor the build logs for any errors

3. **Check deployment status:**
   - Status should show "Running" or "Healthy"
   - Note the application URL provided by Dockploy

---

## Step 5: Run Database Migrations

This is the **CRITICAL STEP** - you must run migrations to create all database tables.

### Option A: Using Dockploy Console (Recommended)

1. **Open application console in Dockploy:**
   - Go to your application
   - Click "Console" or "Terminal" or "Shell"

2. **Run the migration command:**
   ```bash
   npm run migrate
   ```

3. **Verify success:**
   - You should see messages about tables being created
   - Look for "Migration completed successfully" or similar

### Option B: Using SSH (if console not available)

1. **SSH into your VPS:**
   ```bash
   ssh your-username@your-vps-ip
   ```

2. **Find your container:**
   ```bash
   docker ps | grep smart-cost-calculator
   ```

3. **Execute migration:**
   ```bash
   docker exec -it <container-name> npm run migrate
   ```

### What the migration does:
- Creates all database tables (users, leads, hardware_items, etc.)
- Sets up indexes for performance
- Creates the super admin user
- Initializes the database schema

---

## Step 6: Verify Deployment

### 1. Check Health Endpoint

Visit: `https://your-app-url.com/api/health`

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-19T..."
}
```

### 2. Test Login

1. Visit: `https://your-app-url.com/login`
2. Login with:
   - Username: `Camryn`
   - Password: `Elliot6242!`
3. You should be redirected to the dashboard

### 3. Check Database Tables

**Option 1 - Dockploy Database Console:**
- Open your PostgreSQL database in Dockploy
- Click "Console" or "Query"
- Run: `\dt` to list all tables

**Option 2 - Application Console:**
```bash
# In your app console
node -e "const db = require('./lib/db'); db.query('SELECT tablename FROM pg_tables WHERE schemaname = \\'public\\';').then(r => console.log(r.rows))"
```

Expected tables:
- users
- hardware_items
- connectivity_items
- licensing_items
- factors
- scales
- deal_calculations
- leads
- notes
- reminders
- routes
- attachments
- interactions
- scraping_sessions
- scraped_businesses
- activity_log
- migrations

---

## Step 7: Configure Domain (Optional)

If you want to use a custom domain:

1. **In Dockploy:**
   - Go to your application settings
   - Add your custom domain
   - Dockploy will automatically handle SSL/HTTPS

2. **Update DNS:**
   - Add an A record pointing to your VPS IP
   - Or add a CNAME record pointing to your Dockploy subdomain

3. **Wait for DNS propagation** (5-30 minutes)

---

## Step 8: Create Additional Users

1. **Login as super admin** (Camryn)

2. **Navigate to Admin → User Management**

3. **Create users for your team:**
   - Click "Add User"
   - Fill in details
   - Assign roles:
     - `admin` - Full access
     - `manager` - Can manage leads and use calculator
     - `user` - Basic access
     - `telesales` - Limited to leads dashboard

---

## Troubleshooting

### Issue: Application won't start

**Check logs in Dockploy:**
- Go to application → Logs
- Look for error messages

**Common causes:**
- Missing environment variables
- Wrong DATABASE_URL format
- Database not accessible

**Solution:**
- Verify all environment variables are set
- Check DATABASE_URL format: `postgresql://username:password@host:port/database`
- Ensure database is running

---

### Issue: Database connection failed

**Error:** `ECONNREFUSED` or `Connection refused`

**Solution:**
1. Check database is running in Dockploy
2. Verify DATABASE_URL uses correct internal hostname
3. Try using the database's internal IP instead of hostname
4. Check if database and app are in the same network

**Get database internal hostname:**
- In Dockploy, check your database connection details
- Common values: `postgres`, `postgresql`, or the service name

---

### Issue: Migrations fail

**Error:** `relation "users" already exists`

**This is OK!** It means tables already exist. The migration system is idempotent.

**Error:** `permission denied` or `access denied`

**Solution:**
1. Check DATABASE_URL has correct credentials
2. Ensure database user has CREATE TABLE permissions
3. Try connecting to database manually to verify credentials

---

### Issue: Login fails with 401

**Possible causes:**
1. Migrations didn't run (no users table)
2. Super admin user not created
3. Wrong password

**Solution:**
1. Run migrations again: `npm run migrate`
2. Check if users table exists
3. Verify super admin credentials in environment variables

---

### Issue: "Cannot find module" errors

**Solution:**
1. Rebuild the application in Dockploy
2. Ensure `npm install` ran successfully
3. Check build logs for npm errors

---

## Database Backup (Important!)

### Manual Backup

**Using Dockploy:**
- Go to your PostgreSQL database
- Click "Backup" or "Export"
- Download the backup file

**Using command line:**
```bash
# SSH into VPS
docker exec <postgres-container> pg_dump -U postgres smart_calculator > backup.sql
```

### Automated Backups

Configure in Dockploy:
- Go to database settings
- Enable automatic backups
- Set schedule (recommended: daily)
- Set retention period (recommended: 7-30 days)

---

## Performance Optimization

### 1. Enable Connection Pooling

Already configured in the application (min: 2, max: 10 connections)

### 2. Monitor Resource Usage

In Dockploy:
- Check CPU and Memory usage
- Adjust container resources if needed
- Recommended: 1GB RAM minimum, 2GB+ for production

### 3. Database Maintenance

Run periodically (monthly):
```bash
# In database console
VACUUM ANALYZE;
```

---

## Security Checklist

- [x] Strong JWT_SECRET set
- [x] Strong database password
- [x] HTTPS enabled (automatic with Dockploy)
- [ ] Change super admin password after first login
- [ ] Create individual user accounts (don't share admin account)
- [ ] Enable automatic backups
- [ ] Monitor application logs regularly
- [ ] Keep application updated (git pull + redeploy)

---

## Updating the Application

When you push changes to GitHub:

1. **Automatic deployment (if enabled):**
   - Dockploy will automatically detect changes
   - Build and deploy new version

2. **Manual deployment:**
   - Go to application in Dockploy
   - Click "Redeploy" or "Deploy"

3. **After deployment:**
   - Run migrations if database schema changed: `npm run migrate`
   - Check health endpoint
   - Test critical functionality

---

## Quick Reference

### Important URLs
- Application: `https://your-app-url.com`
- Health Check: `https://your-app-url.com/api/health`
- Login: `https://your-app-url.com/login`

### Default Credentials
- Username: `Camryn`
- Password: `Elliot6242!`
- **CHANGE THESE AFTER FIRST LOGIN!**

### Key Commands
```bash
# Run migrations
npm run migrate

# Check database connection
node -e "require('./lib/db').healthCheck().then(console.log)"

# View logs
# (Use Dockploy interface)
```

### Environment Variables Template
```env
DATABASE_URL=postgresql://postgres:PASSWORD@postgres:5432/smart_calculator
JWT_SECRET=YOUR_64_CHARACTER_RANDOM_STRING
NODE_ENV=production
PORT=3000
SUPER_ADMIN_USERNAME=Camryn
SUPER_ADMIN_PASSWORD=Elliot6242!
SUPER_ADMIN_EMAIL=admin@yourdomain.com
```

---

## Support

If you encounter issues:

1. **Check Dockploy logs** (most common issues show here)
2. **Verify environment variables** (missing vars cause 90% of issues)
3. **Ensure migrations ran** (check database tables exist)
4. **Test database connection** (use health endpoint)
5. **Review this guide** (follow steps in order)

---

## Success Indicators

Your deployment is successful when:

✅ Health endpoint returns `{"status":"healthy","database":"connected"}`
✅ You can login with super admin credentials
✅ Dashboard loads without errors
✅ You can create a test lead
✅ Calculator page loads and functions
✅ All database tables exist (run `\dt` in database console)

---

## Next Steps After Deployment

1. **Change super admin password**
2. **Create user accounts for your team**
3. **Configure admin settings** (hardware, connectivity, licensing items)
4. **Import existing leads** (if migrating from old system)
5. **Test all functionality** (calculator, leads, scraper)
6. **Set up automated backups**
7. **Monitor application performance**

---

**You're all set! Your Smart Cost Calculator is now live on your VPS! 🚀**
