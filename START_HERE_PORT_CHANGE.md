# 🚀 START HERE - Port Change Deployment

## What Changed?
The application port has been changed from **3000** to **3456** to avoid conflicts with your existing services.

---

## 📋 What You Need to Do

### Option 1: Quick Deploy (Recommended)
Follow the **QUICK_PORT_CHANGE_CHECKLIST.md** for a step-by-step checklist.

### Option 2: Detailed Guide
Read **PORT_CHANGE_COMPLETE_GUIDE.md** for comprehensive instructions and troubleshooting.

---

## 🎯 Quick Start (5 Minutes)

### 1. Update Dockploy Environment Variables

Go to your Dockploy app settings and add these three new variables:

```env
PORT=3456
APP_PORT=3456
APP_INTERNAL_PORT=3456
```

**Keep all your existing variables** (DATABASE_URL, JWT_SECRET, etc.)

### 2. Update Port Mapping in Dockploy

- Container Port: `3456`
- Host Port: `3456`

### 3. Redeploy

Click "Redeploy" in Dockploy and wait for the build to complete.

### 4. Test

```bash
curl http://YOUR_VPS_IP:3456/api/health
```

Should return: `{"status":"ok",...}`

### 5. Run Migrations

```bash
docker exec -it smart-calculator-app npm run migrate
```

### 6. Access Your App

Open browser: `http://YOUR_VPS_IP:3456/login`

---

## 🔧 Files Modified

| File | Change | Why |
|------|--------|-----|
| `docker-compose.yml` | Port configuration | Makes port configurable via env vars |
| `Dockerfile` | Dynamic port | Allows any port to be used |
| `.env.example` | Default port 3456 | Documents new default |

---

## 📝 Environment Variables You Need

```env
# NEW - Add these three
PORT=3456
APP_PORT=3456
APP_INTERNAL_PORT=3456

# EXISTING - Keep these
DATABASE_URL=postgresql://postgres:tbbbrb8rmrzaqab0@smart-cost-calculator-postgres-rnfhko:5432/smart_calculator
NODE_ENV=production
JWT_SECRET=c70e42b247faa37aab0ee37e619441425fb1ba56d2c2d97221854745314e8d8
STORAGE_TYPE=local
STORAGE_PATH=./uploads
LOG_LEVEL=debug
SUPER_ADMIN_USERNAME=Camryn
SUPER_ADMIN_PASSWORD=Elliot6242!
SUPER_ADMIN_EMAIL=camryn@example.com
```

---

## 🎨 Want a Different Port?

No problem! Just change the port numbers:

```env
PORT=4500
APP_PORT=4500
APP_INTERNAL_PORT=4500
```

**Recommended Ports:**
- 3456 (default)
- 4000-4999
- 5000-5999
- 8080-8099

**Avoid:**
- 3000-3010 (your other app)
- 80, 443 (HTTP/HTTPS)
- 5432 (PostgreSQL)

---

## ✅ Success Checklist

After deployment, verify:

- [ ] Health check works: `curl http://YOUR_IP:3456/api/health`
- [ ] Can access login page: `http://YOUR_IP:3456/login`
- [ ] Can login with super admin credentials
- [ ] Calculator page loads
- [ ] Leads page loads
- [ ] No errors in logs: `docker logs smart-calculator-app`

---

## 🆘 Common Issues

### "Port already in use"
Choose a different port (e.g., 4500) and update all three PORT variables.

### "Cannot access from browser"
Open firewall: `sudo ufw allow 3456/tcp`

### "Health check failing"
Check logs: `docker logs smart-calculator-app`

### "Database connection error"
Verify DATABASE_URL is correct in environment variables.

---

## 📚 Documentation Files

1. **START_HERE_PORT_CHANGE.md** (this file) - Quick overview
2. **QUICK_PORT_CHANGE_CHECKLIST.md** - Step-by-step checklist
3. **PORT_CHANGE_COMPLETE_GUIDE.md** - Comprehensive guide with troubleshooting

---

## 🚦 Current Status

- ✅ Code updated and pushed to GitHub (commit: 60e374c)
- ✅ Docker configuration updated
- ✅ Documentation created
- ⏳ **Next:** Update Dockploy environment variables and redeploy

---

## 💡 Pro Tips

1. **Test locally first** (optional):
   ```bash
   cd hosted-smart-cost-calculator
   PORT=3456 npm run dev
   ```

2. **Check port availability** before deploying:
   ```bash
   sudo lsof -i :3456
   ```

3. **Monitor deployment** in Dockploy logs for any errors

4. **Keep old port open** temporarily until you confirm new port works

---

## 🎯 Expected Timeline

- Environment variable update: 2 minutes
- Deployment build: 5-10 minutes
- Testing and verification: 3 minutes
- **Total: ~15 minutes**

---

## 📞 Need Help?

1. Check **PORT_CHANGE_COMPLETE_GUIDE.md** troubleshooting section
2. Review Docker logs: `docker logs smart-calculator-app`
3. Verify environment variables: `docker exec smart-calculator-app env | grep PORT`

---

**Ready to deploy?** Start with **QUICK_PORT_CHANGE_CHECKLIST.md** ✨
