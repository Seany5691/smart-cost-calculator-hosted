# Complete Port Change Guide for Dockploy Deployment

## Overview
This guide explains how to change the application port from 3000 to a custom port (default: 3456) to avoid conflicts with other services on your VPS.

---

## Files Changed

### 1. `docker-compose.yml`
**Changes Made:**
- Updated `PORT` environment variable to use `${APP_INTERNAL_PORT:-3456}`
- Updated port mapping to `"${APP_PORT:-3456}:${APP_INTERNAL_PORT:-3456}"`

**What This Does:**
- `APP_INTERNAL_PORT`: The port the app runs on inside the container
- `APP_PORT`: The port exposed to the host machine (your VPS)
- Both default to 3456 if not specified in environment variables

### 2. `Dockerfile`
**Changes Made:**
- Updated `EXPOSE` directive to use `${APP_INTERNAL_PORT:-3456}`
- Updated `ENV PORT` to use `${APP_INTERNAL_PORT:-3456}`
- Updated health check to dynamically use the PORT environment variable

**What This Does:**
- Makes the Docker image flexible to run on any port
- Health checks will work regardless of the port chosen

### 3. `.env.example`
**Changes Made:**
- Updated default `PORT` to 3456
- Updated default `APP_PORT` to 3456
- Added `APP_INTERNAL_PORT=3456`

**What This Does:**
- Documents the new default port for future reference

---

## Step-by-Step Deployment Instructions

### Step 1: Update Environment Variables in Dockploy

In your Dockploy application settings, update/add these environment variables:

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:tbbbrb8rmrzaqab0@smart-cost-calculator-postgres-rnfhko:5432/smart_calculator

# Application Configuration
NODE_ENV=production
PORT=3456
APP_PORT=3456
APP_INTERNAL_PORT=3456

# JWT Configuration
JWT_SECRET=c70e42b247faa37aab0ee37e619441425fb1ba56d2c2d97221854745314e8d8

# Storage Configuration
STORAGE_TYPE=local
STORAGE_PATH=./uploads

# Logging
LOG_LEVEL=debug

# Super Admin
SUPER_ADMIN_USERNAME=Camryn
SUPER_ADMIN_PASSWORD=Elliot6242!
SUPER_ADMIN_EMAIL=camryn@example.com
```

### Step 2: Choose Your Port

**Option A: Use Default Port 3456 (Recommended)**
- No additional changes needed
- Just use the environment variables above

**Option B: Use a Different Port**
If you want to use a different port (e.g., 4500), update these variables:
```env
PORT=4500
APP_PORT=4500
APP_INTERNAL_PORT=4500
```

**Common Available Ports:**
- 3456 (default in this setup)
- 4000-4999 (usually available)
- 5000-5999 (usually available)
- 8080-8099 (common alternative HTTP ports)

**Avoid These Port Ranges:**
- 3000-3010 (already in use by your other app)
- 80, 443 (reserved for HTTP/HTTPS)
- 5432 (PostgreSQL)
- 22 (SSH)

### Step 3: Update Dockploy Port Mapping

In Dockploy's application settings:

1. Go to your application → **Settings** → **Ports**
2. Update the port mapping:
   - **Container Port**: 3456 (or your chosen port)
   - **Host Port**: 3456 (or your chosen port)
3. Save the changes

### Step 4: Commit and Push Changes

```bash
cd hosted-smart-cost-calculator
git add docker-compose.yml Dockerfile .env.example
git commit -m "Change default port from 3000 to 3456 to avoid conflicts"
git push
```

### Step 5: Redeploy on Dockploy

1. Go to your Dockploy dashboard
2. Find your application: `smart-cost-calculator-dealcostcalc-jldws1`
3. Click **Redeploy** or **Deploy**
4. Wait for the build to complete

### Step 6: Verify Deployment

After deployment completes, test the health endpoint:

**If using port 3456:**
```bash
curl http://your-vps-ip:3456/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-19T...",
  "database": "connected",
  "uptime": 123
}
```

### Step 7: Run Database Migrations

SSH into your VPS or use Dockploy's terminal:

```bash
# Find the container name
docker ps | grep smart-calculator

# Run migrations
docker exec -it smart-calculator-app npm run migrate
```

### Step 8: Access Your Application

Your application will now be available at:
- **Health Check**: `http://your-vps-ip:3456/api/health`
- **Login Page**: `http://your-vps-ip:3456/login`
- **Dashboard**: `http://your-vps-ip:3456/`

---

## Troubleshooting

### Issue: Port Already in Use

**Error Message:**
```
Error starting userland proxy: listen tcp4 0.0.0.0:3456: bind: address already in use
```

**Solution:**
1. Check what's using the port:
   ```bash
   sudo lsof -i :3456
   # or
   sudo netstat -tulpn | grep 3456
   ```

2. Choose a different port and update environment variables:
   ```env
   PORT=4500
   APP_PORT=4500
   APP_INTERNAL_PORT=4500
   ```

3. Redeploy

### Issue: Health Check Failing

**Symptoms:**
- Container keeps restarting
- Health check shows as unhealthy

**Solution:**
1. Check container logs:
   ```bash
   docker logs smart-calculator-app
   ```

2. Verify the PORT environment variable is set correctly:
   ```bash
   docker exec smart-calculator-app env | grep PORT
   ```

3. Manually test the health endpoint from inside the container:
   ```bash
   docker exec smart-calculator-app wget -O- http://localhost:3456/api/health
   ```

### Issue: Cannot Access Application from Browser

**Symptoms:**
- Health check works from VPS
- Cannot access from your computer

**Solution:**
1. Check firewall rules:
   ```bash
   sudo ufw status
   ```

2. Open the port if needed:
   ```bash
   sudo ufw allow 3456/tcp
   ```

3. Verify Dockploy port mapping is correct

### Issue: Database Connection Failed

**Error Message:**
```
Error: connect ECONNREFUSED
```

**Solution:**
1. Verify DATABASE_URL is correct:
   ```env
   DATABASE_URL=postgresql://postgres:tbbbrb8rmrzaqab0@smart-cost-calculator-postgres-rnfhko:5432/smart_calculator
   ```

2. Check if PostgreSQL container is running:
   ```bash
   docker ps | grep postgres
   ```

3. Test database connection:
   ```bash
   docker exec smart-calculator-app node -e "const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); pool.query('SELECT NOW()').then(r => console.log('DB OK:', r.rows[0])).catch(e => console.error('DB Error:', e.message))"
   ```

---

## Configuration Reference

### Environment Variables Summary

| Variable | Purpose | Default | Required |
|----------|---------|---------|----------|
| `PORT` | Port the app listens on | 3456 | Yes |
| `APP_PORT` | Host port mapping | 3456 | Yes |
| `APP_INTERNAL_PORT` | Container internal port | 3456 | Yes |
| `DATABASE_URL` | PostgreSQL connection string | - | Yes |
| `JWT_SECRET` | JWT signing secret | - | Yes |
| `NODE_ENV` | Environment mode | production | Yes |
| `STORAGE_TYPE` | File storage type | local | No |
| `STORAGE_PATH` | Local storage path | ./uploads | No |
| `LOG_LEVEL` | Logging verbosity | info | No |

### Port Configuration Matrix

| Scenario | PORT | APP_PORT | APP_INTERNAL_PORT | Result |
|----------|------|----------|-------------------|--------|
| Default | 3456 | 3456 | 3456 | App runs on 3456, accessible at VPS:3456 |
| Custom Port | 4500 | 4500 | 4500 | App runs on 4500, accessible at VPS:4500 |
| Port Forwarding | 3456 | 8080 | 3456 | App runs on 3456, accessible at VPS:8080 |

---

## Next Steps After Successful Deployment

1. **Test All Features:**
   - Login with super admin credentials
   - Create a test user
   - Test calculator functionality
   - Test leads management
   - Test scraper functionality

2. **Set Up Domain (Optional):**
   - Point your domain to VPS IP
   - Configure reverse proxy (Nginx/Traefik)
   - Set up SSL certificate (Let's Encrypt)

3. **Configure Backups:**
   - Set up automated database backups
   - Configure file storage backups

4. **Monitor Application:**
   - Check logs regularly: `docker logs smart-calculator-app`
   - Monitor resource usage: `docker stats smart-calculator-app`
   - Set up uptime monitoring

---

## Quick Reference Commands

```bash
# View application logs
docker logs -f smart-calculator-app

# Restart application
docker restart smart-calculator-app

# Check application status
docker ps | grep smart-calculator

# Run migrations
docker exec smart-calculator-app npm run migrate

# Access container shell
docker exec -it smart-calculator-app sh

# Check environment variables
docker exec smart-calculator-app env

# Test health endpoint
curl http://localhost:3456/api/health

# View resource usage
docker stats smart-calculator-app
```

---

## Commit Information

**Files Modified:**
- `docker-compose.yml` - Updated port configuration
- `Dockerfile` - Made port configurable via environment variable
- `.env.example` - Updated default port to 3456

**Commit Message:**
```
Change default port from 3000 to 3456 to avoid conflicts

- Updated docker-compose.yml to use APP_INTERNAL_PORT variable
- Made Dockerfile port configurable
- Updated .env.example with new default port
- Added comprehensive port change guide
```

---

## Support

If you encounter issues not covered in this guide:

1. Check Docker logs: `docker logs smart-calculator-app`
2. Verify environment variables are set correctly
3. Ensure the port is not blocked by firewall
4. Confirm database connectivity
5. Review Dockploy deployment logs

---

**Last Updated:** January 19, 2026
**Default Port:** 3456
**Status:** Ready for deployment
