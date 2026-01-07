# VPS Requirements Summary - Smart Cost Calculator

## Quick Reference

### Minimum Requirements (Basic Operation)
```
CPU:      1 vCPU
RAM:      1 GB
Storage:  10 GB SSD
Cost:     ~$6-12/month
Use Case: Testing, low traffic, no scraping
```

### Recommended Requirements (Full Operation)
```
CPU:      2 vCPUs
RAM:      2 GB
Storage:  20 GB SSD
Cost:     ~$12-18/month
Use Case: Production, moderate scraping (1-2 towns at a time)
```

### Optimal Requirements (Best Performance)
```
CPU:      4 vCPUs
RAM:      4 GB
Storage:  40 GB SSD
Cost:     ~$24-30/month
Use Case: Production, heavy scraping (3-5 towns concurrently)
```

---

## Why These Requirements?

### Memory Breakdown During Scraping

| Component | Memory Usage |
|-----------|--------------|
| Next.js Application | 200-300 MB |
| Single Chromium Instance | 200-400 MB |
| 3 Concurrent Chromium Instances | 800 MB - 1.2 GB |
| System Overhead | 200-300 MB |
| **Total During Active Scraping** | **1.5 - 2 GB** |

### CPU Requirements

- **Base Application**: Low CPU usage (5-15%)
- **Scraping Operations**: High CPU usage (50-100% per core)
- **Chromium Rendering**: CPU-intensive
- **Recommendation**: 2-4 vCPUs for smooth concurrent scraping

### Storage Requirements

| Component | Size |
|-----------|------|
| Application Code | ~200 MB |
| Chromium Binary | ~300 MB |
| Node Modules | ~500 MB |
| Logs & Temp Files | ~500 MB |
| **Total Base** | **~1.5 GB** |
| **Recommended with Buffer** | **20-40 GB** |

---

## Scraping Performance by VPS Tier

### 1 vCPU, 1 GB RAM - NOT RECOMMENDED
- ❌ Scraping will be very slow
- ❌ May timeout or crash
- ❌ Can only handle 1 town at a time
- ✅ OK for testing without scraping

### 2 vCPU, 2 GB RAM - MINIMUM FOR PRODUCTION
- ✅ Can handle 1-2 towns concurrently
- ✅ 3-5 industries per town
- ⚠️ May slow down under heavy load
- ⚠️ Scraping takes longer
- **Performance**: Acceptable

### 4 vCPU, 4 GB RAM - RECOMMENDED
- ✅ Can handle 2-3 towns concurrently
- ✅ 5-10 industries per town
- ✅ Fast scraping performance
- ✅ Smooth user experience
- **Performance**: Good

### 8 vCPU, 8 GB RAM - OPTIMAL
- ✅ Can handle 3-5 towns concurrently
- ✅ 10-20 industries per town
- ✅ Very fast scraping
- ✅ Excellent for high traffic
- **Performance**: Excellent

---

## Scraping Concurrency Settings

### Conservative (2 vCPU, 2 GB RAM)
```javascript
{
  simultaneousTowns: 1,
  simultaneousIndustries: 3,
  simultaneousLookups: 5
}
```

### Balanced (4 vCPU, 4 GB RAM)
```javascript
{
  simultaneousTowns: 2,
  simultaneousIndustries: 5,
  simultaneousLookups: 10
}
```

### Aggressive (8 vCPU, 8 GB RAM)
```javascript
{
  simultaneousTowns: 3,
  simultaneousIndustries: 10,
  simultaneousLookups: 20
}
```

---

## Cost Comparison

### VPS Providers (2 vCPU, 2 GB RAM)

| Provider | Monthly Cost | Notes |
|----------|--------------|-------|
| **Hetzner** | €4.90 (~$5.50) | Best value, EU locations |
| **Contabo** | €6.99 (~$7.80) | Good value, multiple locations |
| **DigitalOcean** | $12 | Easy to use, good docs |
| **Linode** | $12 | Reliable, good support |
| **Vultr** | $12 | Fast deployment |

### VPS Providers (4 vCPU, 4 GB RAM)

| Provider | Monthly Cost | Notes |
|----------|--------------|-------|
| **Hetzner** | €9.90 (~$11) | Best value |
| **Contabo** | €13.99 (~$15.50) | Good value |
| **DigitalOcean** | $24 | Premium pricing |
| **Linode** | $24 | Premium pricing |
| **Vultr** | $24 | Premium pricing |

### Total Monthly Cost (VPS + Supabase)

| Configuration | VPS | Supabase | Total |
|---------------|-----|----------|-------|
| **Minimum** | $12 | Free | **$12/month** |
| **Recommended** | $12 | $25 (Pro) | **$37/month** |
| **Optimal** | $24 | $25 (Pro) | **$49/month** |
| **Best Value** | $5.50 (Hetzner) | $25 (Pro) | **$30.50/month** |

---

## Bandwidth Requirements

### Typical Usage

| Activity | Bandwidth per Month |
|----------|---------------------|
| Normal App Usage (10 users) | ~5 GB |
| Scraping (100 sessions) | ~10 GB |
| PDF Generation (500 PDFs) | ~2 GB |
| **Total Typical** | **~20 GB/month** |

### Included Bandwidth

Most VPS providers include:
- **1-2 TB/month** (more than enough)
- Overage charges: $0.01-0.02 per GB

**Recommendation**: Any standard VPS plan has sufficient bandwidth.

---

## Docker Resource Limits

### In docker-compose.yml

**Minimum Configuration:**
```yaml
deploy:
  resources:
    limits:
      cpus: '1'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 512M
```

**Recommended Configuration:**
```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
    reservations:
      cpus: '1'
      memory: 1G
```

**Optimal Configuration:**
```yaml
deploy:
  resources:
    limits:
      cpus: '4'
      memory: 4G
    reservations:
      cpus: '2'
      memory: 2G
```

---

## When to Upgrade

### Signs You Need More RAM

- ❌ Container gets killed (OOMKilled)
- ❌ Scraping sessions fail mid-process
- ❌ "Out of memory" errors in logs
- ❌ Memory usage consistently > 90%

**Solution**: Upgrade to next RAM tier (2GB → 4GB)

### Signs You Need More CPU

- ❌ Scraping is very slow
- ❌ CPU usage consistently > 90%
- ❌ Application feels sluggish
- ❌ Timeouts during scraping

**Solution**: Upgrade to more vCPUs (2 → 4)

### Signs You Need More Storage

- ❌ "No space left on device" errors
- ❌ Disk usage > 80%
- ❌ Cannot save scraper results
- ❌ Docker build fails

**Solution**: Upgrade storage or clean up old data

---

## Optimization Tips

### Reduce Memory Usage

1. **Lower scraping concurrency**
   - Fewer simultaneous towns
   - Fewer simultaneous industries

2. **Enable swap space**
   ```bash
   # Add 2GB swap
   fallocate -l 2G /swapfile
   chmod 600 /swapfile
   mkswap /swapfile
   swapon /swapfile
   ```

3. **Restart container periodically**
   - Clears memory leaks
   - Fresh start

### Improve Performance

1. **Use SSD storage** (not HDD)
2. **Choose nearby VPS location** (lower latency)
3. **Enable caching** (Redis optional)
4. **Optimize Chromium settings** (already done)
5. **Use CDN** for static assets (Cloudflare free tier)

---

## Monitoring Commands

### Check Memory Usage
```bash
# Container stats
docker stats smart-cost-calculator

# Inside container
docker exec smart-cost-calculator free -h
```

### Check CPU Usage
```bash
# Real-time
docker stats --no-stream smart-cost-calculator

# System-wide
top
htop
```

### Check Disk Usage
```bash
# Container
docker exec smart-cost-calculator df -h

# System
df -h
du -sh /var/lib/docker
```

### Check Logs
```bash
# Application logs
docker logs -f smart-cost-calculator

# Last 100 lines
docker logs --tail 100 smart-cost-calculator

# Errors only
docker logs smart-cost-calculator 2>&1 | grep -i error
```

---

## Recommendation Summary

### For Most Users
**4 vCPU, 4 GB RAM, 40 GB SSD**
- Cost: ~$24-30/month (VPS) + $25/month (Supabase Pro)
- Total: ~$50/month
- Best balance of performance and cost

### For Budget-Conscious Users
**2 vCPU, 2 GB RAM, 20 GB SSD**
- Cost: ~$12/month (VPS) + $0-25/month (Supabase)
- Total: ~$12-37/month
- Acceptable performance with limitations

### For High-Traffic/Heavy Scraping
**8 vCPU, 8 GB RAM, 80 GB SSD**
- Cost: ~$50/month (VPS) + $25/month (Supabase Pro)
- Total: ~$75/month
- Excellent performance, no limitations

---

## Quick Start Checklist

- [ ] Choose VPS provider and plan (recommended: 4 vCPU, 4 GB RAM)
- [ ] Provision VPS with Ubuntu 22.04 LTS
- [ ] Install Dockploy
- [ ] Set up Supabase project (Pro plan recommended)
- [ ] Run database migrations (both SQL files)
- [ ] Configure environment variables in Dockploy
- [ ] Deploy application
- [ ] Configure SSL/HTTPS
- [ ] Test scraping functionality
- [ ] Set up monitoring and backups
- [ ] Go live!

---

## Need Help?

Refer to the complete deployment guide: `DOCKPLOY_DEPLOYMENT_GUIDE.md`

**Key Files:**
- `Dockerfile` - Container configuration
- `docker-compose.yml` - Service orchestration
- `.env.example` - Environment variables template
- `DOCKPLOY_DEPLOYMENT_GUIDE.md` - Complete deployment guide
