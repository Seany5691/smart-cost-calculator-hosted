# Deployment Checklist - Smart Cost Calculator

Use this checklist to ensure a smooth deployment to your VPS with Dockploy.

---

## Pre-Deployment

### VPS Setup
- [ ] VPS provisioned with recommended specs (4 vCPU, 4 GB RAM, 40 GB SSD)
- [ ] Ubuntu 22.04 LTS or Debian 11+ installed
- [ ] SSH access configured and tested
- [ ] Root or sudo access confirmed
- [ ] Firewall configured (ports 22, 80, 443 open)
- [ ] Domain name purchased (optional but recommended)
- [ ] Domain DNS pointed to VPS IP address

### Supabase Setup
- [ ] Supabase project created at https://supabase.com
- [ ] Project URL copied
- [ ] Anon/Public key copied
- [ ] Service role key copied (keep secret!)
- [ ] Database schema deployed: `supabase-schema.sql`
- [ ] Scraper schema deployed: `supabase-scraper-schema.sql`
- [ ] Default admin user created (Camryn/Elliot6242!)
- [ ] RLS policies verified
- [ ] Test connection from local machine

### Repository Preparation
- [ ] All code committed to Git
- [ ] `.env` files NOT committed (in .gitignore)
- [ ] `Dockerfile` present in root
- [ ] `.dockerignore` present in root
- [ ] `docker-compose.yml` present in root
- [ ] `.env.example` present in root
- [ ] `next.config.js` has `output: 'standalone'`
- [ ] Repository pushed to GitHub/GitLab/Bitbucket

---

## Dockploy Installation

### Install Dockploy on VPS
- [ ] SSH into VPS: `ssh root@your-vps-ip`
- [ ] Run Dockploy installer: `curl -sSL https://dockploy.com/install.sh | sh`
- [ ] Wait for installation to complete
- [ ] Access Dockploy at `http://your-vps-ip:3000`
- [ ] Complete initial setup wizard
- [ ] Create admin account
- [ ] Secure admin password saved

---

## Application Configuration in Dockploy

### Create New Application
- [ ] Click "New Application"
- [ ] Select "Docker" deployment type
- [ ] Name: `smart-cost-calculator`
- [ ] Repository URL entered
- [ ] Branch selected (main/master)
- [ ] Build method: Dockerfile

### Configure Build Settings
- [ ] Dockerfile path: `./Dockerfile`
- [ ] Build context: `.`
- [ ] Container port: `3000`
- [ ] Host port: `80` (or `443` with SSL)

### Set Resource Limits
- [ ] CPU limit: `2` cores (or `4` for optimal)
- [ ] Memory limit: `2048` MB (or `4096` MB for optimal)
- [ ] Memory reservation: `1024` MB (or `2048` MB for optimal)

### Configure Environment Variables
- [ ] `NEXT_PUBLIC_SUPABASE_URL` = Your Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Your anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = Your service role key (secret!)
- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = `3000`
- [ ] `NEXT_TELEMETRY_DISABLED` = `1`
- [ ] `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` = `true`
- [ ] `PUPPETEER_EXECUTABLE_PATH` = `/usr/bin/chromium`
- [ ] `CHROME_BIN` = `/usr/bin/chromium`

### Optional: Configure Volumes
- [ ] Host path: `/var/dockploy/smart-calculator/output`
- [ ] Container path: `/app/output`

---

## Deployment

### Initial Deployment
- [ ] Click "Deploy" in Dockploy
- [ ] Monitor build logs for errors
- [ ] Wait for build to complete (5-10 minutes)
- [ ] Verify container status: "Running"
- [ ] Check container logs for startup errors

### Verify Deployment
- [ ] Health check: `curl http://your-vps-ip:3000/api/health`
- [ ] Response shows `"status": "healthy"`
- [ ] Open browser to `http://your-vps-ip:3000`
- [ ] Application loads successfully
- [ ] Login page accessible

### Test Core Functionality
- [ ] Login with admin credentials (Camryn/Elliot6242!)
- [ ] Dashboard loads
- [ ] Navigation works
- [ ] Calculator page loads
- [ ] Admin panel accessible
- [ ] Configuration data loads from Supabase

### Test Scraper Functionality
- [ ] Navigate to Scraper page
- [ ] Enter test town (e.g., "Johannesburg")
- [ ] Select 1-2 industries
- [ ] Start scraping
- [ ] Monitor progress
- [ ] Verify results appear
- [ ] Check Supabase for scraper_businesses records
- [ ] Export results to Excel

---

## SSL/HTTPS Configuration

### Option A: Dockploy Auto SSL (Recommended)
- [ ] In Dockploy, go to application settings
- [ ] Navigate to "Domains" tab
- [ ] Add your domain name
- [ ] Enable "Auto SSL"
- [ ] Wait for certificate provisioning (2-5 minutes)
- [ ] Verify HTTPS works: `https://yourdomain.com`
- [ ] HTTP redirects to HTTPS

### Option B: Manual SSL with Certbot
- [ ] Install Certbot: `apt-get install certbot python3-certbot-nginx`
- [ ] Run: `certbot --nginx -d yourdomain.com`
- [ ] Follow prompts
- [ ] Verify certificate: `certbot certificates`
- [ ] Test auto-renewal: `certbot renew --dry-run`

---

## Security Hardening

### Firewall Configuration
- [ ] UFW installed: `apt-get install ufw`
- [ ] Allow SSH: `ufw allow 22/tcp`
- [ ] Allow HTTP: `ufw allow 80/tcp`
- [ ] Allow HTTPS: `ufw allow 443/tcp`
- [ ] Enable firewall: `ufw enable`
- [ ] Verify rules: `ufw status`

### SSH Security
- [ ] Disable root login (optional)
- [ ] Use SSH keys instead of passwords
- [ ] Install Fail2ban: `apt-get install fail2ban`
- [ ] Enable Fail2ban: `systemctl enable fail2ban`
- [ ] Configure Fail2ban for SSH protection

### Application Security
- [ ] Service role key is secret (not in client code)
- [ ] HTTPS enabled (SSL certificate)
- [ ] Strong admin password set
- [ ] Supabase RLS policies enabled
- [ ] Environment variables secured in Dockploy
- [ ] No sensitive data in logs

---

## Monitoring Setup

### Container Monitoring
- [ ] Test: `docker stats smart-cost-calculator`
- [ ] Verify memory usage < 80%
- [ ] Verify CPU usage reasonable
- [ ] Check disk usage: `df -h`

### Application Monitoring
- [ ] Check logs: `docker logs -f smart-cost-calculator`
- [ ] No errors in startup
- [ ] API requests logging correctly
- [ ] Scraping sessions logging

### Optional: Advanced Monitoring
- [ ] Install Netdata for real-time monitoring
- [ ] Set up Uptime Kuma for uptime monitoring
- [ ] Configure email/SMS alerts
- [ ] Set up Prometheus + Grafana (advanced)

---

## Backup Configuration

### Database Backups
- [ ] Supabase automatic backups enabled (Pro plan)
- [ ] Test manual backup download
- [ ] Document backup restoration process

### Application Backups
- [ ] Create backup script (see deployment guide)
- [ ] Test backup script
- [ ] Set up cron job for daily backups
- [ ] Verify backups are created
- [ ] Test restoration from backup

### Backup Schedule
- [ ] Daily: Environment variables
- [ ] Daily: Application volumes
- [ ] Weekly: Full system backup
- [ ] Monthly: Verify backup integrity

---

## Performance Optimization

### Application Performance
- [ ] Verify Next.js build is optimized
- [ ] Check bundle size (should be reasonable)
- [ ] Test page load times
- [ ] Verify images are optimized

### Scraping Performance
- [ ] Test scraping with 1 town
- [ ] Test scraping with 2 towns concurrently
- [ ] Adjust concurrency settings if needed
- [ ] Monitor memory during scraping
- [ ] Verify no timeouts or crashes

### Optional: CDN Setup
- [ ] Sign up for Cloudflare (free tier)
- [ ] Add domain to Cloudflare
- [ ] Update DNS nameservers
- [ ] Enable caching
- [ ] Enable minification
- [ ] Test CDN is working

---

## Documentation

### Update Documentation
- [ ] Document your specific VPS details
- [ ] Document your Supabase project details
- [ ] Document any custom configurations
- [ ] Document backup procedures
- [ ] Document troubleshooting steps

### Team Access
- [ ] Share admin credentials securely
- [ ] Document how to access Dockploy
- [ ] Document how to access Supabase
- [ ] Document how to SSH into VPS
- [ ] Create runbook for common tasks

---

## Post-Deployment Testing

### Functional Testing
- [ ] Create new user account
- [ ] Test user login
- [ ] Test manager login
- [ ] Create new deal calculation
- [ ] Save deal to database
- [ ] Load saved deal
- [ ] Generate PDF
- [ ] Test admin configuration changes
- [ ] Test scraper with multiple towns
- [ ] Export scraper results

### Performance Testing
- [ ] Test with 5 concurrent users
- [ ] Test scraping under load
- [ ] Monitor resource usage
- [ ] Verify no memory leaks
- [ ] Check response times

### Security Testing
- [ ] Test HTTPS enforcement
- [ ] Test authentication
- [ ] Test authorization (role-based access)
- [ ] Verify API keys are not exposed
- [ ] Test SQL injection protection (Supabase handles this)

---

## Go Live

### Final Checks
- [ ] All tests passing
- [ ] No errors in logs
- [ ] SSL certificate valid
- [ ] Monitoring active
- [ ] Backups configured
- [ ] Documentation complete
- [ ] Team trained

### Announce Launch
- [ ] Notify users of new URL
- [ ] Provide login instructions
- [ ] Share documentation
- [ ] Set up support channel

### Monitor First 24 Hours
- [ ] Check logs every few hours
- [ ] Monitor resource usage
- [ ] Watch for errors
- [ ] Respond to user feedback
- [ ] Be ready to rollback if needed

---

## Maintenance Schedule

### Daily
- [ ] Check container status
- [ ] Review error logs
- [ ] Monitor resource usage

### Weekly
- [ ] Review all logs
- [ ] Check disk space
- [ ] Verify backups
- [ ] Review scraper sessions

### Monthly
- [ ] Update Docker images
- [ ] Review and archive old data
- [ ] Check SSL certificate expiry
- [ ] Review security settings
- [ ] Update dependencies (if needed)

### Quarterly
- [ ] Review VPS performance
- [ ] Consider scaling up/down
- [ ] Audit security
- [ ] Update documentation
- [ ] Review costs

---

## Troubleshooting Reference

### Container Won't Start
1. Check logs: `docker logs smart-cost-calculator`
2. Verify environment variables
3. Check port conflicts
4. Verify sufficient memory

### Scraping Fails
1. Check Chromium installation
2. Verify memory allocation
3. Reduce concurrency settings
4. Check logs for specific errors

### Out of Memory
1. Increase VPS RAM
2. Add swap space
3. Reduce scraping concurrency
4. Restart container

### Supabase Connection Issues
1. Verify environment variables
2. Check API keys
3. Test Supabase connection
4. Review RLS policies

### Performance Issues
1. Check resource usage
2. Review logs for bottlenecks
3. Consider upgrading VPS
4. Optimize scraping settings

---

## Success Criteria

Your deployment is successful when:

✅ Application accessible via HTTPS  
✅ All core features working  
✅ Scraping functionality operational  
✅ No errors in logs  
✅ Resource usage within limits  
✅ Backups configured and tested  
✅ Monitoring active  
✅ SSL certificate valid  
✅ Users can login and use the app  
✅ Data persists in Supabase  

---

## Support

If you encounter issues:

1. **Check logs first**: `docker logs smart-cost-calculator`
2. **Review deployment guide**: `DOCKPLOY_DEPLOYMENT_GUIDE.md`
3. **Check requirements**: `VPS_REQUIREMENTS_SUMMARY.md`
4. **Search documentation**: Dockploy, Next.js, Supabase docs
5. **Ask for help**: Community forums, Discord servers

---

## Congratulations! 🎉

Once all items are checked, your Smart Cost Calculator is successfully deployed and ready for production use!

**Deployment Date**: _______________  
**Deployed By**: _______________  
**VPS Provider**: _______________  
**VPS Specs**: _______________  
**Domain**: _______________  
**Supabase Project**: _______________
