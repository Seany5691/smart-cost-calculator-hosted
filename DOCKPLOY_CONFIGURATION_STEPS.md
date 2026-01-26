# Dockploy Configuration Steps - Visual Guide

## 🎯 Exact Steps to Configure Dockploy

Follow these steps **exactly** to configure your deployment with the new port.

---

## Step 1: Access Your Application in Dockploy

1. Log into your Dockploy dashboard
2. Find your application: **smart-cost-calculator-dealcostcalc-jldws1**
3. Click on the application name to open settings

---

## Step 2: Update Environment Variables

### Location: Settings → Environment Variables

Click **"Add Environment Variable"** or **"Edit"** and ensure you have ALL of these:

```env
# ===== DATABASE CONFIGURATION =====
DATABASE_URL=postgresql://postgres:tbbbrb8rmrzaqab0@smart-cost-calculator-postgres-rnfhko:5432/smart_calculator

# ===== PORT CONFIGURATION (NEW - ADD THESE THREE) =====
PORT=3456
APP_PORT=3456
APP_INTERNAL_PORT=3456

# ===== APPLICATION CONFIGURATION =====
NODE_ENV=production

# ===== JWT CONFIGURATION =====
JWT_SECRET=c70e42b247faa37aab0ee37e619441425fb1ba56d2c2d97221854745314e8d8

# ===== STORAGE CONFIGURATION =====
STORAGE_TYPE=local
STORAGE_PATH=./uploads

# ===== LOGGING =====
LOG_LEVEL=debug

# ===== SUPER ADMIN =====
SUPER_ADMIN_USERNAME=Camryn
SUPER_ADMIN_PASSWORD=Elliot6242!
SUPER_ADMIN_EMAIL=camryn@example.com
```

### Visual Checklist:
- [ ] DATABASE_URL is correct (points to smart-cost-calculator-postgres-rnfhko)
- [ ] PORT=3456 is added
- [ ] APP_PORT=3456 is added
- [ ] APP_INTERNAL_PORT=3456 is added
- [ ] All other variables are present
- [ ] No typos in variable names
- [ ] Click **Save** or **Apply**

---

## Step 3: Update Port Mapping

### Location: Settings → Ports (or Network)

You should see a port mapping configuration. Update it to:

```
Container Port: 3456
Host Port: 3456
Protocol: TCP
```

### Visual Representation:
```
┌─────────────────────────────────────────┐
│  Port Mapping Configuration             │
├─────────────────────────────────────────┤
│  Container Port:  [3456]                │
│  Host Port:       [3456]                │
│  Protocol:        [TCP ▼]               │
│                                         │
│  [ Save ]  [ Cancel ]                   │
└─────────────────────────────────────────┘
```

### Checklist:
- [ ] Container Port is 3456
- [ ] Host Port is 3456
- [ ] Protocol is TCP
- [ ] Click **Save**

---

## Step 4: Verify Build Configuration

### Location: Settings → Build

Ensure these settings are correct:

```
Build Method: Docker Compose
Dockerfile: Dockerfile
Docker Compose File: docker-compose.yml
Branch: main
```

### Checklist:
- [ ] Build method is set correctly
- [ ] Branch is "main"
- [ ] Auto-deploy is enabled (optional)

---

## Step 5: Deploy

### Location: Main application page

1. Click the **"Redeploy"** or **"Deploy"** button
2. Wait for the deployment to start
3. Monitor the logs in real-time

### What to Look For in Logs:

✅ **Good Signs:**
```
Cloning Repo github.com/Seany5691/smart-cost-calculator-hosted.git
✓ Compiled successfully
✓ Generating static pages (55/55)
Image smart-cost-calculator-dealcostcalc-jldws1-app Building
Container started successfully
```

❌ **Bad Signs:**
```
Error: Port already in use
Error: failed to calculate checksum
Build failed
```

---

## Step 6: Wait for Deployment

### Timeline:
- **Cloning repo:** 30 seconds
- **Building image:** 5-8 minutes
- **Starting container:** 30 seconds
- **Total:** ~10 minutes

### Progress Indicators:
1. ⏳ Cloning repository
2. ⏳ Building Docker image
3. ⏳ Creating container
4. ✅ Container running

---

## Step 7: Verify Deployment

### Test 1: Check Container Status

In Dockploy, you should see:
```
Status: ● Running
Uptime: X minutes
```

### Test 2: Health Check from VPS

SSH into your VPS and run:
```bash
curl http://localhost:3456/api/health
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

### Test 3: External Access

From your computer:
```bash
curl http://YOUR_VPS_IP:3456/api/health
```

If this fails, you may need to open the firewall (see Step 9).

---

## Step 8: Run Database Migrations

### Via Dockploy Terminal (if available):
```bash
npm run migrate
```

### Via SSH:
```bash
# Find container name
docker ps | grep smart-calculator

# Run migrations
docker exec -it smart-calculator-app npm run migrate
```

**Expected Output:**
```
Running migrations...
✓ Migration 001_initial_schema.sql completed
✓ Migration 002_... completed
...
All migrations completed successfully
```

---

## Step 9: Open Firewall (If Needed)

If you can't access the application from your browser:

```bash
# Check if port is open
sudo ufw status | grep 3456

# Open the port
sudo ufw allow 3456/tcp

# Verify
sudo ufw status
```

**Expected Output:**
```
3456/tcp                   ALLOW       Anywhere
```

---

## Step 10: Test Application

### Open in Browser:

1. **Login Page:** `http://YOUR_VPS_IP:3456/login`
2. **Login with:**
   - Username: `Camryn`
   - Password: `Elliot6242!`

3. **Test Pages:**
   - Dashboard: `http://YOUR_VPS_IP:3456/`
   - Calculator: `http://YOUR_VPS_IP:3456/calculator`
   - Leads: `http://YOUR_VPS_IP:3456/leads`
   - Admin: `http://YOUR_VPS_IP:3456/admin`

### Checklist:
- [ ] Login page loads
- [ ] Can login successfully
- [ ] Dashboard displays correctly
- [ ] Calculator page works
- [ ] Leads page works
- [ ] Admin page accessible
- [ ] No console errors

---

## 🎉 Success!

If all steps completed successfully, your application is now running on port 3456!

---

## 🔧 Troubleshooting

### Issue: "Port already in use"

**Solution:**
1. Choose a different port (e.g., 4500)
2. Update all three PORT variables in Dockploy
3. Update port mapping to 4500
4. Redeploy

### Issue: "Cannot access from browser"

**Solution:**
1. Check firewall: `sudo ufw status`
2. Open port: `sudo ufw allow 3456/tcp`
3. Verify container is running: `docker ps`
4. Check logs: `docker logs smart-calculator-app`

### Issue: "Health check failing"

**Solution:**
1. Check logs: `docker logs smart-calculator-app`
2. Verify PORT environment variable: `docker exec smart-calculator-app env | grep PORT`
3. Test from inside container: `docker exec smart-calculator-app wget -O- http://localhost:3456/api/health`

### Issue: "Database connection error"

**Solution:**
1. Verify DATABASE_URL is correct
2. Check PostgreSQL container: `docker ps | grep postgres`
3. Test database connection from app container

### Issue: "Build fails"

**Solution:**
1. Check Dockploy logs for specific error
2. Verify GitHub repository is accessible
3. Ensure branch is "main"
4. Check if there are any TypeScript errors

---

## 📊 Configuration Summary

| Setting | Value | Location |
|---------|-------|----------|
| Port | 3456 | Environment Variables |
| Container Port | 3456 | Port Mapping |
| Host Port | 3456 | Port Mapping |
| Database | smart_calculator | DATABASE_URL |
| Database Host | smart-cost-calculator-postgres-rnfhko | DATABASE_URL |
| Branch | main | Build Settings |

---

## 🔍 Verification Commands

```bash
# Check if container is running
docker ps | grep smart-calculator

# View logs
docker logs -f smart-calculator-app

# Check environment variables
docker exec smart-calculator-app env | grep PORT

# Test health endpoint
curl http://localhost:3456/api/health

# Check port is listening
sudo netstat -tulpn | grep 3456

# View resource usage
docker stats smart-calculator-app
```

---

## 📞 Need More Help?

1. Check **PORT_CHANGE_COMPLETE_GUIDE.md** for detailed troubleshooting
2. Review Dockploy deployment logs
3. Check Docker container logs
4. Verify all environment variables are set correctly

---

**Last Updated:** January 19, 2026
**Commit:** 9c5602d
**Default Port:** 3456
**Status:** Ready for deployment
