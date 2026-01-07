# Dockploy Deployment Guide - Smart Cost Calculator

## Overview

This guide covers deploying the Smart Cost Calculator to a self-hosted VPS using Dockploy while keeping your Supabase instance. The app includes web scraping functionality using Puppeteer/Chromium which requires specific resource allocation.

---

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Dockploy Setup](#dockploy-setup)
4. [Environment Configuration](#environment-configuration)
5. [Deployment Steps](#deployment-steps)
6. [Resource Monitoring](#resource-monitoring)
7. [Troubleshooting](#troubleshooting)
8. [Scaling Considerations](#scaling-considerations)

---

## System Requirements

### Minimum VPS Requirements

**For Basic Operation (No Scraping):**
- **CPU**: 1 vCPU
- **RAM**: 1 GB
- **Storage**: 10 GB SSD
- **Bandwidth**: 1 TB/month

**For Full Operation (With Scraping):**
- **CPU**: 2 vCPUs (4 vCPUs recommended)
- **RAM**: 2 GB minimum (4 GB recommended)
- **Storage**: 20 GB SSD
- **Bandwidth**: 2 TB/month

### Recommended VPS Specifications

**Optimal Configuration:**
- **CPU**: 4 vCPUs
- **RAM**: 4 GB
- **Storage**: 40 GB SSD
- **Bandwidth**: 3 TB/month
- **OS**: Ubuntu 22.04 LTS or Debian 11+

### Why These Requirements?

#### Puppeteer/Chromium Resource Usage

The scraping functionality uses Puppeteer with headless Chromium, which is resource-intensive:

1. **Memory Requirements:**
   - Base Next.js app: ~200-300 MB
   - Single Chromium instance: ~200-400 MB
   - Concurrent scraping (3 towns): ~800 MB - 1.2 GB
   - System overhead: ~200-300 MB
   - **Total during scraping**: 1.5 - 2 GB

2. **CPU Requirements:**
   - Chromium rendering: CPU-intensive
   - Concurrent scraping: Multiple browser instances
   - Recommended: 2-4 vCPUs for smooth operation

3. **Storage Requirements:**
   - Application code: ~200 MB
   - Chromium binary: ~300 MB
   - Node modules: ~500 MB
   - Logs and temp files: ~500 MB
   - **Total**: ~1.5 GB + room for growth

### Scraping Performance Expectations

| VPS Specs | Concurrent Towns | Concurrent Industries | Performance |
|-----------|------------------|----------------------|-------------|
| 1 vCPU, 1GB RAM | 1 | 2 | Slow, may timeout |
| 2 vCPU, 2GB RAM | 1-2 | 3-5 | Acceptable |
| 4 vCPU, 4GB RAM | 2-3 | 5-10 | Good |
| 8 vCPU, 8GB RAM | 3-5 | 10-20 | Excellent |

---

## Pre-Deployment Checklist

### 1. Supabase Setup

Ensure your Supabase project is configured:

- [ ] Project created at https://supabase.com
- [ ] Database schema deployed (run both SQL files):
  - `supabase-schema.sql` - Main application tables
  - `supabase-scraper-schema.sql` - Scraper tables
- [ ] API keys obtained:
  - Project URL
  - Anon/Public key
  - Service role key (keep secret!)
- [ ] Row Level Security (RLS) policies configured
- [ ] Default admin user created

### 2. VPS Setup

- [ ] VPS provisioned with minimum specs
- [ ] Ubuntu 22.04 LTS or Debian 11+ installed
- [ ] SSH access configured
- [ ] Firewall configured (ports 80, 443, 22)
- [ ] Domain name pointed to VPS IP (optional but recommended)

### 3. Dockploy Installation

Install Dockploy on your VPS:

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Install Dockploy (one-line installer)
curl -sSL https://dockploy.com/install.sh | sh

# Or manual installation
# Follow: https://docs.dockploy.com/installation
```

After installation:
- Access Dockploy at `http://your-vps-ip:3000`
- Complete initial setup
- Create admin account

---

## Dockploy Setup

### 1. Create New Application

1. Log into Dockploy dashboard
2. Click **"New Application"**
3. Select **"Docker"** as deployment type
4. Configure:
   - **Name**: `smart-cost-calculator`
   - **Repository**: Your Git repository URL
   - **Branch**: `main` (or your production branch)
   - **Build Method**: Dockerfile

### 2. Configure Build Settings

In the application settings:

**Build Configuration:**
- **Dockerfile Path**: `./Dockerfile`
- **Build Context**: `.`
- **Build Args**: (none needed)

**Port Configuration:**
- **Container Port**: `3000`
- **Host Port**: `80` (or `443` with SSL)

**Resource Limits:**
```yaml
CPU Limit: 2 cores (or 4 for better performance)
Memory Limit: 2048 MB (or 4096 MB recommended)
Memory Reservation: 1024 MB
```

### 3. Configure Volumes (Optional)

For persistent scraper output:

```yaml
Volumes:
  - Host Path: /var/dockploy/smart-calculator/output
    Container Path: /app/output
```

---

## Environment Configuration

### 1. Create Environment Variables in Dockploy

In your application settings, add these environment variables:

#### Required Variables

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Node Environment
NODE_ENV=production
PORT=3000
NEXT_TELEMETRY_DISABLED=1

# Puppeteer Configuration
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
CHROME_BIN=/usr/bin/chromium
```

#### Optional Variables

```bash
# Logging
LOG_LEVEL=info

# Custom Domain (if using)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 2. Secure Your Environment Variables

**Important Security Notes:**

1. **Never commit `.env` files to Git**
2. **Use Dockploy's secret management** for sensitive keys
3. **Rotate keys regularly** (especially service role key)
4. **Use different keys** for development and production

### 3. Get Supabase Credentials

From your Supabase dashboard:

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep secret!)

---

## Deployment Steps

### Step 1: Prepare Your Repository

1. **Ensure all files are committed:**
   ```bash
   git add .
   git commit -m "Prepare for Dockploy deployment"
   git push origin main
   ```

2. **Verify these files exist:**
   - ✅ `Dockerfile`
   - ✅ `.dockerignore`
   - ✅ `docker-compose.yml`
   - ✅ `.env.example`
   - ✅ `next.config.js` (with `output: 'standalone'`)

### Step 2: Deploy via Dockploy

#### Option A: Git-Based Deployment (Recommended)

1. In Dockploy, go to your application
2. Click **"Deploy"**
3. Dockploy will:
   - Clone your repository
   - Build the Docker image
   - Start the container
   - Map ports and volumes

4. Monitor the build logs for errors

#### Option B: Manual Docker Deployment

If you prefer manual control:

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Clone repository
git clone https://github.com/yourusername/smart-cost-calculator.git
cd smart-cost-calculator

# Create .env file
cp .env.example .env
nano .env  # Edit with your Supabase credentials

# Build and run with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f
```

### Step 3: Verify Deployment

1. **Check container status:**
   ```bash
   docker ps
   ```
   Should show `smart-cost-calculator` running

2. **Check health endpoint:**
   ```bash
   curl http://localhost:3000/api/health
   ```
   Should return:
   ```json
   {
     "status": "healthy",
     "timestamp": "2026-01-07T...",
     "uptime": 123.45
   }
   ```

3. **Access the application:**
   - Open browser to `http://your-vps-ip:3000`
   - Or `https://yourdomain.com` if using a domain

4. **Test login:**
   - Username: `Camryn`
   - Password: `Elliot6242!`

### Step 4: Configure SSL (Recommended)

#### Using Dockploy's Built-in SSL

1. In Dockploy, go to your application
2. Navigate to **"Domains"**
3. Add your domain
4. Enable **"Auto SSL"** (uses Let's Encrypt)
5. Dockploy will automatically:
   - Request SSL certificate
   - Configure HTTPS
   - Set up auto-renewal

#### Manual SSL with Nginx

If you prefer manual setup:

```bash
# Install Certbot
apt-get update
apt-get install certbot python3-certbot-nginx

# Get certificate
certbot --nginx -d yourdomain.com

# Auto-renewal is configured automatically
```

---

## Resource Monitoring

### Monitor Container Resources

```bash
# Real-time stats
docker stats smart-cost-calculator

# Check memory usage
docker exec smart-cost-calculator free -h

# Check disk usage
docker exec smart-cost-calculator df -h
```

### Monitor Scraping Performance

When scraping is active, monitor:

1. **Memory Usage:**
   ```bash
   docker stats --no-stream smart-cost-calculator
   ```
   - Normal: 200-400 MB
   - During scraping: 1-2 GB
   - Alert if > 90% of limit

2. **CPU Usage:**
   - Normal: 5-15%
   - During scraping: 50-100%
   - Multiple cores recommended

3. **Application Logs:**
   ```bash
   docker logs -f smart-cost-calculator
   ```
   Look for:
   - `[INFO] Scraping session ... created`
   - `Processing town: ...`
   - `Found X businesses`
   - Errors or timeouts

### Set Up Alerts (Optional)

Use monitoring tools:
- **Prometheus + Grafana** - Comprehensive monitoring
- **Netdata** - Real-time performance monitoring
- **Uptime Kuma** - Uptime monitoring with alerts

---

## Troubleshooting

### Common Issues

#### 1. Container Won't Start

**Symptoms:**
- Container exits immediately
- "Exited (1)" status

**Solutions:**
```bash
# Check logs
docker logs smart-cost-calculator

# Common causes:
# - Missing environment variables
# - Port already in use
# - Insufficient memory

# Fix port conflict
docker ps -a  # Find conflicting container
docker stop <container-id>

# Restart with more memory
docker-compose down
# Edit docker-compose.yml to increase memory limit
docker-compose up -d
```

#### 2. Scraping Fails or Timeouts

**Symptoms:**
- "Browser launch failed"
- "Navigation timeout"
- Scraping sessions stuck

**Solutions:**

1. **Increase memory allocation:**
   ```yaml
   # In docker-compose.yml
   deploy:
     resources:
       limits:
         memory: 4G  # Increase from 2G
   ```

2. **Reduce concurrency:**
   - In scraper settings, lower:
     - Simultaneous towns: 1-2
     - Simultaneous industries: 3-5
     - Simultaneous lookups: 5-10

3. **Check Chromium installation:**
   ```bash
   docker exec smart-cost-calculator which chromium
   docker exec smart-cost-calculator chromium --version
   ```

4. **Verify Puppeteer config:**
   ```bash
   docker exec smart-cost-calculator env | grep PUPPETEER
   ```

#### 3. Out of Memory Errors

**Symptoms:**
- Container killed unexpectedly
- "OOMKilled" in logs
- Scraping stops mid-process

**Solutions:**

1. **Increase VPS RAM** (upgrade plan)

2. **Increase swap space:**
   ```bash
   # Create 2GB swap file
   fallocate -l 2G /swapfile
   chmod 600 /swapfile
   mkswap /swapfile
   swapon /swapfile
   
   # Make permanent
   echo '/swapfile none swap sw 0 0' >> /etc/fstab
   ```

3. **Optimize Docker memory:**
   ```yaml
   # In docker-compose.yml
   deploy:
     resources:
       limits:
         memory: 3G
       reservations:
         memory: 1.5G
   ```

#### 4. Supabase Connection Issues

**Symptoms:**
- "Failed to fetch"
- "Network error"
- Authentication fails

**Solutions:**

1. **Verify environment variables:**
   ```bash
   docker exec smart-cost-calculator env | grep SUPABASE
   ```

2. **Test Supabase connection:**
   ```bash
   curl https://your-project.supabase.co/rest/v1/
   ```

3. **Check RLS policies** in Supabase dashboard

4. **Verify API keys** are correct and not expired

#### 5. Build Fails

**Symptoms:**
- Docker build errors
- "npm install" fails
- TypeScript errors

**Solutions:**

1. **Clear Docker cache:**
   ```bash
   docker system prune -a
   docker-compose build --no-cache
   ```

2. **Check Node version:**
   - Dockerfile uses Node 20
   - Ensure compatibility

3. **Verify package.json:**
   - All dependencies listed
   - No version conflicts

### Debug Mode

Enable verbose logging:

```bash
# In .env or Dockploy environment variables
LOG_LEVEL=debug
NODE_OPTIONS=--trace-warnings

# Restart container
docker-compose restart
```

---

## Scaling Considerations

### Vertical Scaling (Upgrade VPS)

When to upgrade:

1. **Memory usage consistently > 80%**
   - Upgrade from 2GB → 4GB

2. **CPU usage consistently > 80%**
   - Upgrade from 2 vCPU → 4 vCPU

3. **Scraping takes too long**
   - More CPU = faster scraping
   - More RAM = more concurrent operations

### Horizontal Scaling (Multiple Instances)

For high traffic:

1. **Load Balancer Setup:**
   - Use Nginx or HAProxy
   - Distribute traffic across multiple containers

2. **Database Considerations:**
   - Supabase handles scaling automatically
   - Connection pooling already configured

3. **Session Management:**
   - Scraper sessions stored in Supabase
   - Stateless application design
   - Can run multiple instances safely

### Cost Optimization

**VPS Provider Recommendations:**

| Provider | 2 vCPU, 2GB RAM | 4 vCPU, 4GB RAM |
|----------|-----------------|-----------------|
| DigitalOcean | $12/month | $24/month |
| Linode | $12/month | $24/month |
| Vultr | $12/month | $24/month |
| Hetzner | €4.90/month | €9.90/month |
| Contabo | €6.99/month | €13.99/month |

**Supabase Costs:**
- Free tier: 500 MB database, 2 GB bandwidth
- Pro tier: $25/month (8 GB database, 50 GB bandwidth)
- Recommended: Pro tier for production

**Total Monthly Cost Estimate:**
- **Minimum**: $12 (VPS) + $0 (Supabase free) = **$12/month**
- **Recommended**: $24 (VPS) + $25 (Supabase Pro) = **$49/month**
- **Optimal**: $50 (VPS) + $25 (Supabase Pro) = **$75/month**

---

## Performance Optimization

### 1. Enable Caching

Add Redis for caching (optional):

```yaml
# In docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis-data:/data
    networks:
      - app-network

volumes:
  redis-data:
```

### 2. Optimize Chromium

In scraper settings:
- Use headless mode (already enabled)
- Disable images for faster scraping
- Reduce viewport size
- Limit concurrent browsers

### 3. Database Optimization

In Supabase:
- Add indexes on frequently queried columns
- Use connection pooling (already configured)
- Archive old scraper sessions periodically

### 4. CDN for Static Assets

Use Cloudflare (free tier):
- Faster asset delivery
- DDoS protection
- SSL/TLS encryption
- Caching

---

## Backup Strategy

### 1. Database Backups

Supabase handles this automatically:
- Daily backups (Pro plan)
- Point-in-time recovery
- Download backups manually if needed

### 2. Application Backups

```bash
# Backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/smart-calculator"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup environment variables
docker exec smart-cost-calculator env > $BACKUP_DIR/env_$DATE.txt

# Backup volumes
docker run --rm \
  --volumes-from smart-cost-calculator \
  -v $BACKUP_DIR:/backup \
  ubuntu tar czf /backup/volumes_$DATE.tar.gz /app/output

# Keep only last 7 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

### 3. Automated Backups

Set up cron job:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /root/backup-smart-calculator.sh
```

---

## Maintenance

### Regular Tasks

**Weekly:**
- [ ] Check container logs for errors
- [ ] Monitor resource usage
- [ ] Review scraper session logs
- [ ] Check disk space

**Monthly:**
- [ ] Update Docker images
- [ ] Review and archive old data
- [ ] Check SSL certificate expiry
- [ ] Update dependencies (if needed)

**Quarterly:**
- [ ] Review VPS performance
- [ ] Consider scaling up/down
- [ ] Audit security settings
- [ ] Update documentation

### Update Procedure

```bash
# 1. Pull latest code
cd /path/to/smart-cost-calculator
git pull origin main

# 2. Rebuild container
docker-compose build --no-cache

# 3. Stop old container
docker-compose down

# 4. Start new container
docker-compose up -d

# 5. Verify deployment
curl http://localhost:3000/api/health
```

---

## Security Best Practices

### 1. Firewall Configuration

```bash
# UFW (Ubuntu)
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable

# Fail2ban for SSH protection
apt-get install fail2ban
systemctl enable fail2ban
```

### 2. Docker Security

```bash
# Run as non-root user (already configured in Dockerfile)
# Limit container capabilities
# Use read-only file systems where possible
```

### 3. Environment Security

- Never expose service role key publicly
- Use HTTPS only in production
- Rotate API keys regularly
- Enable Supabase RLS policies
- Use strong passwords

### 4. Monitoring & Alerts

Set up alerts for:
- High CPU/memory usage
- Container restarts
- Failed login attempts
- Scraping errors
- Database connection issues

---

## Support & Resources

### Documentation
- **Next.js**: https://nextjs.org/docs
- **Dockploy**: https://docs.dockploy.com
- **Supabase**: https://supabase.com/docs
- **Puppeteer**: https://pptr.dev

### Community
- Dockploy Discord
- Supabase Discord
- Next.js GitHub Discussions

### Getting Help

If you encounter issues:

1. Check logs: `docker logs smart-cost-calculator`
2. Review this guide's troubleshooting section
3. Check Dockploy documentation
4. Search GitHub issues
5. Ask in community forums

---

## Conclusion

You now have a complete guide to deploy the Smart Cost Calculator on your self-hosted VPS using Dockploy. The application will run efficiently with the recommended 4 vCPU / 4 GB RAM configuration, providing smooth operation for both the calculator and scraping functionality.

**Key Takeaways:**

✅ **Minimum**: 2 vCPU, 2 GB RAM (basic operation)  
✅ **Recommended**: 4 vCPU, 4 GB RAM (optimal performance)  
✅ **Scraping**: Resource-intensive, requires adequate CPU/RAM  
✅ **Supabase**: Handles all data persistence and scaling  
✅ **Docker**: Containerized deployment for easy management  
✅ **Monitoring**: Essential for production stability  

**Next Steps:**

1. Provision your VPS with recommended specs
2. Install Dockploy
3. Configure environment variables
4. Deploy the application
5. Test all functionality
6. Set up monitoring and backups
7. Configure SSL/HTTPS
8. Go live!

Good luck with your deployment! 🚀
