# 404 Error Troubleshooting

## Issue: Getting 404 Page Not Found

When accessing your domain, you're getting a 404 error. This typically means the proxy is working but can't reach your application.

---

## Quick Diagnostics

### 1. Check if Container is Running

In Dockploy or via SSH:
```bash
docker ps | grep smart-cost-calculator
```

**Expected**: Should show container as "Up"  
**If not running**: Container failed to start

### 2. Check Container Logs

```bash
docker logs smart-cost-calculator --tail 50
```

**Look for**:
- ✅ "Ready in X seconds" - App started successfully
- ❌ Error messages - App failed to start
- ❌ No output - Container not running

### 3. Test Direct Access

Try accessing the app directly on port 8547:
```bash
curl http://localhost:8547
```

Or in browser:
```
http://your-vps-ip:8547
```

**If this works**: Proxy configuration issue  
**If this fails**: Application issue

### 4. Check Health Endpoint

```bash
curl http://localhost:8547/api/health
```

**Expected**:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "uptime": 123.45
}
```

---

## Common Causes & Solutions

### Cause 1: Container Not Running

**Check**:
```bash
docker ps -a | grep smart-cost-calculator
```

**If status is "Exited"**:
```bash
# Check why it exited
docker logs smart-cost-calculator

# Common reasons:
# - Missing environment variables
# - Port conflict (even on 8547)
# - Application crash on startup
```

**Solution**:
1. Check Dockploy environment variables are set
2. Verify port 8547 is available
3. Check container logs for specific error

---

### Cause 2: Missing Environment Variables

**Symptoms**:
- Container starts but crashes immediately
- Logs show "Missing Supabase environment variables"

**Solution**:

In Dockploy, ensure these are set:

```bash
# REQUIRED
NEXT_PUBLIC_SUPABASE_URL=https://gcggzmzlegxldvupufmu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Application
NODE_ENV=production
PORT=3000
NEXT_TELEMETRY_DISABLED=1

# Puppeteer
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
CHROME_BIN=/usr/bin/chromium
```

After adding, **restart the container** in Dockploy.

---

### Cause 3: Wrong Proxy Configuration

**Check Dockploy Domain Settings**:

1. Go to your application in Dockploy
2. Click "Domains" tab
3. Verify:
   - Domain is added correctly
   - Port is set to **8547**
   - SSL is enabled
   - Proxy is configured

**Correct Configuration**:
```
Domain: yourdomain.com
Port: 8547
SSL: Enabled (Auto)
Proxy: Enabled
```

---

### Cause 4: DNS Not Propagated

**Check DNS**:
```bash
nslookup yourdomain.com
```

**Should return**: Your VPS IP address

**If not**:
- DNS hasn't propagated yet (wait 5-60 minutes)
- DNS records not set correctly
- Check your domain registrar settings

---

### Cause 5: Firewall Blocking Port

**Check if port 8547 is accessible**:
```bash
# On VPS
sudo ufw status

# Should show:
# 8547/tcp ALLOW Anywhere
```

**If blocked**:
```bash
sudo ufw allow 8547/tcp
```

**Note**: If using Dockploy's proxy, you might not need to open 8547 directly. Dockploy handles internal routing.

---

## Step-by-Step Diagnosis

### Step 1: Verify Container Status

```bash
docker ps | grep smart-cost-calculator
```

**If not running**:
```bash
# Try to start it
docker start smart-cost-calculator

# Check logs
docker logs smart-cost-calculator
```

### Step 2: Test Application Directly

```bash
# From VPS
curl http://localhost:8547

# Should return HTML or redirect
```

**If this works**: Proxy issue  
**If this fails**: App issue

### Step 3: Check Dockploy Proxy

In Dockploy:
1. Go to application
2. Check "Domains" tab
3. Verify domain configuration
4. Check proxy logs (if available)

### Step 4: Check Application Logs

```bash
docker logs smart-cost-calculator --tail 100
```

**Look for**:
- Startup messages
- Error messages
- Port binding confirmation
- "Ready" message

---

## Quick Fixes

### Fix 1: Restart Container

In Dockploy:
1. Go to your application
2. Click "Restart"
3. Wait for container to start
4. Check logs

Or via command line:
```bash
docker restart smart-cost-calculator
```

### Fix 2: Rebuild and Redeploy

In Dockploy:
1. Click "Redeploy"
2. Wait for build to complete
3. Container will restart automatically

### Fix 3: Check Environment Variables

```bash
# View container environment
docker exec smart-cost-calculator env | grep -E "SUPABASE|NODE_ENV|PORT"
```

**Should show**:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- NODE_ENV=production
- PORT=3000

**If missing**: Add in Dockploy and restart

---

## Dockploy Configuration Checklist

### Application Settings
- [x] Build completed successfully
- [ ] Container is running
- [ ] Port 8547 is mapped
- [ ] Environment variables are set

### Domain Settings
- [ ] Domain added (yourdomain.com)
- [ ] Port set to 8547
- [ ] SSL enabled (Auto)
- [ ] Proxy enabled
- [ ] DNS pointing to VPS IP

### Environment Variables
- [ ] NEXT_PUBLIC_SUPABASE_URL
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] NODE_ENV=production
- [ ] PORT=3000
- [ ] Puppeteer variables

---

## Testing Checklist

### Test 1: Container Running
```bash
docker ps | grep smart-cost-calculator
# Should show: Up X minutes
```

### Test 2: Health Endpoint
```bash
curl http://localhost:8547/api/health
# Should return: {"status":"healthy",...}
```

### Test 3: Direct Access
```bash
curl http://localhost:8547
# Should return: HTML content
```

### Test 4: Domain Access
```bash
curl https://yourdomain.com
# Should return: HTML content or redirect
```

---

## Most Likely Issues

Based on your setup, the most likely causes are:

### 1. Missing Environment Variables (80% probability)
**Solution**: Add all required env vars in Dockploy and restart

### 2. Container Not Running (15% probability)
**Solution**: Check logs, fix errors, restart container

### 3. Proxy Misconfiguration (5% probability)
**Solution**: Verify domain settings in Dockploy

---

## Get Container Status

Run these commands to get full status:

```bash
# Container status
docker ps -a | grep smart-cost-calculator

# Container logs (last 50 lines)
docker logs smart-cost-calculator --tail 50

# Container environment
docker exec smart-cost-calculator env | grep -E "SUPABASE|NODE|PORT|PUPPETEER"

# Test health endpoint
curl http://localhost:8547/api/health

# Test main page
curl http://localhost:8547
```

Send me the output of these commands and I can help diagnose the specific issue.

---

## Expected Working State

When everything is working correctly:

### Container Status
```bash
$ docker ps | grep smart-cost-calculator
CONTAINER ID   IMAGE                    STATUS          PORTS
abc123def456   smart-cost-calculator    Up 5 minutes    0.0.0.0:8547->3000/tcp
```

### Health Check
```bash
$ curl http://localhost:8547/api/health
{"status":"healthy","timestamp":"2026-01-07T...","uptime":123.45}
```

### Main Page
```bash
$ curl http://localhost:8547
<!DOCTYPE html><html>... (HTML content)
```

### Domain Access
```bash
$ curl https://yourdomain.com
<!DOCTYPE html><html>... (HTML content)
```

---

## Need More Help?

If the issue persists, please provide:

1. **Container status**: `docker ps -a | grep smart-cost-calculator`
2. **Container logs**: `docker logs smart-cost-calculator --tail 50`
3. **Environment check**: `docker exec smart-cost-calculator env | grep SUPABASE`
4. **Direct access test**: `curl http://localhost:8547/api/health`
5. **Dockploy domain configuration** (screenshot or description)

With this information, I can provide a specific solution.

---

**Last Updated**: January 7, 2026  
**Issue**: 404 Page Not Found  
**Status**: Troubleshooting
