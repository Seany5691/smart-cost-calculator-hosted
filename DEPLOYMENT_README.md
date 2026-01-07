# Deployment Files - Quick Reference

This directory contains all files needed to deploy the Smart Cost Calculator to a self-hosted VPS using Dockploy.

---

## 📁 Files Overview

### Docker Configuration Files
- **`Dockerfile`** - Multi-stage Docker build with Chromium support
- **`.dockerignore`** - Excludes unnecessary files from build
- **`docker-compose.yml`** - Service orchestration with resource limits
- **`.env.example`** - Environment variables template

### Deployment Scripts
- **`deploy.sh`** - Interactive deployment helper script

### Documentation Files
- **`DEPLOYMENT_SUMMARY.md`** - ⭐ **START HERE** - Overview and quick start
- **`DOCKPLOY_DEPLOYMENT_GUIDE.md`** - Complete deployment guide (50+ pages)
- **`VPS_REQUIREMENTS_SUMMARY.md`** - VPS specifications and requirements
- **`DEPLOYMENT_CHECKLIST.md`** - Step-by-step deployment checklist
- **`DEPLOYMENT_README.md`** - This file

---

## 🚀 Quick Start

### 1. Read the Summary
Start with **`DEPLOYMENT_SUMMARY.md`** for an overview.

### 2. Check Requirements
Review **`VPS_REQUIREMENTS_SUMMARY.md`** to choose your VPS specs.

**Recommended**: 4 vCPU, 4 GB RAM, 40 GB SSD (~$24/month)

### 3. Follow the Guide
Use **`DOCKPLOY_DEPLOYMENT_GUIDE.md`** for detailed instructions.

### 4. Use the Checklist
Follow **`DEPLOYMENT_CHECKLIST.md`** to ensure nothing is missed.

---

## 📋 What You Need

### Before Starting

1. **VPS Server**
   - Ubuntu 22.04 LTS or Debian 11+
   - Minimum: 2 vCPU, 2 GB RAM
   - Recommended: 4 vCPU, 4 GB RAM
   - SSH access

2. **Supabase Project**
   - Project created at https://supabase.com
   - Database schemas deployed
   - API credentials ready

3. **Domain Name** (Optional)
   - Pointed to your VPS IP
   - For SSL/HTTPS

4. **Git Repository**
   - Code pushed to GitHub/GitLab/Bitbucket
   - All deployment files included

---

## 🎯 Deployment Steps

### Step 1: Provision VPS
Choose a provider (Hetzner, DigitalOcean, Linode, Vultr) and provision a server.

### Step 2: Install Dockploy
```bash
ssh root@your-vps-ip
curl -sSL https://dockploy.com/install.sh | sh
```

### Step 3: Configure Supabase
Run both SQL schema files in your Supabase dashboard:
- `supabase-schema.sql`
- `supabase-scraper-schema.sql`

### Step 4: Deploy in Dockploy
1. Create new application
2. Connect Git repository
3. Add environment variables
4. Set resource limits
5. Deploy

### Step 5: Configure SSL
Enable Auto SSL in Dockploy for your domain.

### Step 6: Test
Verify all functionality works correctly.

---

## 💰 Cost Estimate

### VPS Hosting
| Provider | 4 vCPU, 4GB RAM | Notes |
|----------|-----------------|-------|
| Hetzner | €9.90/month | Best value |
| DigitalOcean | $24/month | Easy to use |
| Linode | $24/month | Reliable |
| Vultr | $24/month | Fast |

### Database (Supabase)
- **Free Tier**: $0/month (500 MB database)
- **Pro Tier**: $25/month (8 GB database) - Recommended

### Total Monthly Cost
- **Budget**: $12-18/month (VPS + Supabase Free)
- **Recommended**: $49/month (VPS + Supabase Pro)

---

## 🔧 Technical Details

### Why These Requirements?

The app uses **Puppeteer with Chromium** for web scraping:
- Each Chromium instance: 200-400 MB RAM
- Concurrent scraping (3 towns): 1.5-2 GB RAM
- CPU-intensive rendering
- Requires adequate resources

### Resource Allocation

**Docker Container Limits:**
```yaml
CPU: 2-4 cores
Memory: 2-4 GB
```

**Scraping Concurrency:**
- Conservative (2GB): 1 town, 3 industries
- Balanced (4GB): 2 towns, 5 industries
- Aggressive (8GB): 3 towns, 10 industries

---

## 📊 Performance Expectations

| VPS Specs | Scraping Performance | User Experience |
|-----------|---------------------|-----------------|
| 2 vCPU, 2GB | Acceptable | Good |
| 4 vCPU, 4GB | Good | Excellent ✅ |
| 8 vCPU, 8GB | Excellent | Outstanding |

---

## 🛠️ Using the Deployment Script

The `deploy.sh` script provides an interactive menu:

```bash
chmod +x deploy.sh
./deploy.sh
```

**Options:**
1. Build and start
2. Stop
3. Restart
4. View logs
5. Check status
6. Clean rebuild
7. Exit

---

## 📖 Documentation Guide

### For First-Time Deployment
Read in this order:
1. **DEPLOYMENT_SUMMARY.md** - Overview
2. **VPS_REQUIREMENTS_SUMMARY.md** - Specs
3. **DOCKPLOY_DEPLOYMENT_GUIDE.md** - Full guide
4. **DEPLOYMENT_CHECKLIST.md** - Step-by-step

### For Quick Reference
- **VPS_REQUIREMENTS_SUMMARY.md** - Specs and costs
- **DEPLOYMENT_CHECKLIST.md** - Quick checklist

### For Troubleshooting
- **DOCKPLOY_DEPLOYMENT_GUIDE.md** - Troubleshooting section
- Container logs: `docker logs smart-cost-calculator`

---

## 🔒 Security Notes

### Environment Variables
Never commit `.env` files to Git. Use Dockploy's secret management.

### Required Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Keep secret!
```

### Security Checklist
- [ ] Firewall configured
- [ ] SSH secured
- [ ] SSL/HTTPS enabled
- [ ] Service role key kept secret
- [ ] Strong passwords
- [ ] Regular backups

---

## 🐛 Troubleshooting

### Container Won't Start
```bash
docker logs smart-cost-calculator
```
Check for missing environment variables or port conflicts.

### Scraping Fails
- Increase memory allocation
- Reduce concurrency settings
- Check Chromium installation

### Out of Memory
- Add swap space
- Upgrade VPS RAM
- Reduce concurrent operations

### Connection Issues
- Verify environment variables
- Test Supabase connection
- Check firewall rules

---

## 📞 Getting Help

### Documentation
- **Dockploy**: https://docs.dockploy.com
- **Next.js**: https://nextjs.org/docs
- **Supabase**: https://supabase.com/docs
- **Docker**: https://docs.docker.com

### Community
- Dockploy Discord
- Supabase Discord
- Next.js GitHub Discussions

### Debugging
1. Check container logs
2. Review deployment guide
3. Search documentation
4. Ask in community forums

---

## ✅ Success Criteria

Your deployment is successful when:

- ✅ Application accessible via HTTPS
- ✅ Login works
- ✅ Calculator functions properly
- ✅ Scraper processes towns successfully
- ✅ Data persists in Supabase
- ✅ No errors in logs
- ✅ Resource usage within limits
- ✅ SSL certificate valid

---

## 🎓 Learning Resources

### Docker
- Docker basics
- Docker Compose
- Container optimization

### Next.js
- Standalone output mode
- API routes
- Production deployment

### Puppeteer
- Headless browser automation
- Resource management
- Chromium configuration

### Dockploy
- Application management
- Environment variables
- SSL configuration

---

## 📝 Notes

### Differences from Vercel

**Advantages of Self-Hosting:**
- ✅ No serverless timeout limits
- ✅ Better scraping performance
- ✅ Full control over resources
- ✅ No bandwidth limits
- ✅ Predictable costs

**Considerations:**
- ⚠️ You manage the server
- ⚠️ You handle updates
- ⚠️ You configure backups
- ⚠️ You monitor uptime

### What Stays the Same

- ✅ Supabase database (no changes)
- ✅ Application code (no changes)
- ✅ All features work identically
- ✅ User experience unchanged

---

## 🚦 Deployment Status

### Pre-Deployment
- [x] Docker configuration created
- [x] Documentation written
- [x] Scripts prepared
- [x] Health checks added
- [ ] VPS provisioned
- [ ] Dockploy installed
- [ ] Application deployed

### Post-Deployment
- [ ] SSL configured
- [ ] Monitoring set up
- [ ] Backups configured
- [ ] Team trained
- [ ] Documentation updated

---

## 📅 Maintenance Schedule

### Daily
- Check container status
- Review error logs

### Weekly
- Monitor resource usage
- Check disk space
- Verify backups

### Monthly
- Update Docker images
- Review security settings
- Archive old data

### Quarterly
- Review VPS performance
- Consider scaling
- Update documentation

---

## 🎉 Ready to Deploy?

1. **Read**: Start with `DEPLOYMENT_SUMMARY.md`
2. **Plan**: Review `VPS_REQUIREMENTS_SUMMARY.md`
3. **Deploy**: Follow `DOCKPLOY_DEPLOYMENT_GUIDE.md`
4. **Verify**: Use `DEPLOYMENT_CHECKLIST.md`

**Good luck! 🚀**

---

## 📧 Support

For issues or questions:
1. Check the documentation
2. Review container logs
3. Search community forums
4. Ask for help in Discord

---

*Last Updated: January 7, 2026*  
*Version: 1.0*  
*Status: Ready for Deployment*
