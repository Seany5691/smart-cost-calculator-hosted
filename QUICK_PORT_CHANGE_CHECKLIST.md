# Quick Port Change Checklist ✅

## Before You Start
- [ ] Choose your port number (default: 3456)
- [ ] Verify port is not in use: `sudo lsof -i :3456`
- [ ] Have Dockploy access ready

---

## Step-by-Step Checklist

### 1. Update Dockploy Environment Variables
- [ ] Go to Dockploy → Your App → Settings → Environment
- [ ] Add/Update these variables:
  ```
  PORT=3456
  APP_PORT=3456
  APP_INTERNAL_PORT=3456
  ```
- [ ] Keep all other variables the same
- [ ] Click Save

### 2. Update Dockploy Port Mapping
- [ ] Go to Settings → Ports
- [ ] Set Container Port: `3456`
- [ ] Set Host Port: `3456`
- [ ] Click Save

### 3. Commit and Push Code Changes
```bash
cd hosted-smart-cost-calculator
git add docker-compose.yml Dockerfile .env.example
git commit -m "Change port to 3456"
git push
```
- [ ] Code committed
- [ ] Code pushed to GitHub

### 4. Deploy on Dockploy
- [ ] Click "Redeploy" in Dockploy
- [ ] Wait for build to complete (5-10 minutes)
- [ ] Check deployment logs for errors

### 5. Verify Deployment
```bash
# Test health endpoint
curl http://YOUR_VPS_IP:3456/api/health
```
- [ ] Health check returns `{"status":"ok"}`
- [ ] No errors in logs

### 6. Run Database Migrations
```bash
docker exec -it smart-calculator-app npm run migrate
```
- [ ] Migrations completed successfully
- [ ] No database errors

### 7. Test Application
- [ ] Open browser: `http://YOUR_VPS_IP:3456/login`
- [ ] Login with super admin credentials
- [ ] Test calculator page
- [ ] Test leads page
- [ ] All features working

### 8. Open Firewall (If Needed)
```bash
sudo ufw allow 3456/tcp
sudo ufw status
```
- [ ] Port opened in firewall
- [ ] Can access from external network

---

## Quick Troubleshooting

### Port Already in Use?
```bash
# Find what's using the port
sudo lsof -i :3456

# Choose different port and update:
# PORT=4500, APP_PORT=4500, APP_INTERNAL_PORT=4500
```

### Can't Access Application?
```bash
# Check if container is running
docker ps | grep smart-calculator

# Check logs
docker logs smart-calculator-app

# Verify port is open
sudo ufw status | grep 3456
```

### Health Check Failing?
```bash
# Check from inside container
docker exec smart-calculator-app wget -O- http://localhost:3456/api/health

# Check environment variables
docker exec smart-calculator-app env | grep PORT
```

---

## Environment Variables Quick Copy

```env
DATABASE_URL=postgresql://postgres:tbbbrb8rmrzaqab0@smart-cost-calculator-postgres-rnfhko:5432/smart_calculator
NODE_ENV=production
PORT=3456
APP_PORT=3456
APP_INTERNAL_PORT=3456
JWT_SECRET=c70e42b247faa37aab0ee37e619441425fb1ba56d2c2d97221854745314e8d8
STORAGE_TYPE=local
STORAGE_PATH=./uploads
LOG_LEVEL=debug
SUPER_ADMIN_USERNAME=Camryn
SUPER_ADMIN_PASSWORD=Elliot6242!
SUPER_ADMIN_EMAIL=camryn@example.com
```

---

## Access URLs After Deployment

- **Health Check:** `http://YOUR_VPS_IP:3456/api/health`
- **Login:** `http://YOUR_VPS_IP:3456/login`
- **Dashboard:** `http://YOUR_VPS_IP:3456/`
- **Calculator:** `http://YOUR_VPS_IP:3456/calculator`
- **Leads:** `http://YOUR_VPS_IP:3456/leads`
- **Admin:** `http://YOUR_VPS_IP:3456/admin`

---

## Success Criteria ✅

- [ ] Application builds without errors
- [ ] Container starts and stays running
- [ ] Health check returns 200 OK
- [ ] Can login with super admin
- [ ] Database migrations completed
- [ ] All pages load correctly
- [ ] No errors in Docker logs

---

**Estimated Time:** 15-20 minutes
**Difficulty:** Easy
**Default Port:** 3456
