# ROLLBACK PLAN: Puppeteer to Playwright Migration

**Project:** hosted-smart-cost-calculator  
**Migration:** Puppeteer to Playwright  
**Date Created:** 2025  
**Status:** Ready for Use

---

## WHEN TO ROLLBACK

Execute this rollback plan if you encounter any of the following critical issues after deploying the Playwright migration:

### Critical Issues (Immediate Rollback Required)
- ❌ Application fails to start or crashes on startup
- ❌ All scraping sessions fail immediately
- ❌ RAM usage is HIGHER than before migration (should be 30-40% lower)
- ❌ Frequent browser/context crashes (more than 1 per hour)
- ❌ Database corruption or data loss
- ❌ Complete loss of scraping functionality

### Major Issues (Rollback Recommended)
- ⚠️ More than 50% of scraping sessions fail
- ⚠️ Provider lookups completely broken
- ⚠️ Memory leaks causing server instability
- ⚠️ Performance worse than Puppeteer baseline
- ⚠️ Critical features not working (export, import, etc.)

### Minor Issues (Fix Forward, Don't Rollback)
- ✅ Occasional scraping failures (< 10%)
- ✅ Minor UI glitches
- ✅ Non-critical logging errors
- ✅ Performance similar to Puppeteer (not worse)

---

## ROLLBACK OVERVIEW

This rollback plan will:
1. Revert all code changes to the pre-migration state
2. Reinstall Puppeteer dependencies
3. Remove Playwright dependencies
4. Restore original concurrency settings
5. Verify the application works as before

**Estimated Time:** 15-20 minutes  
**Downtime:** 5-10 minutes  
**Risk Level:** LOW (reverting to known-good state)

---

## STEP-BY-STEP ROLLBACK INSTRUCTIONS

### PHASE 1: Backup Current State (Optional but Recommended)

Before rolling back, create a backup of the current (failed) state for investigation:

```bash
# SSH into your Dokploy VPS
ssh your-user@your-vps-ip

# Navigate to project directory
cd /path/to/hosted-smart-cost-calculator

# Create backup of failed state
git branch backup/failed-playwright-migration

# Push backup to remote
git push origin backup/failed-playwright-migration
```

**Why?** This preserves the failed state for debugging while allowing you to rollback safely.

---

### PHASE 2: Revert Git Changes

Revert all code changes to the pre-migration state using the backup branch.

#### Step 2.1: Verify Backup Branch Exists

```bash
# Check that backup branch exists
git branch -a | grep backup/before-playwright-migration
```

**Expected Output:** `backup/before-playwright-migration`

If the backup branch doesn't exist, **STOP** and contact the development team immediately.

#### Step 2.2: Checkout Main Branch

```bash
# Ensure you're on the main branch
git checkout main

# Verify current branch
git branch --show-current
```

**Expected Output:** `main`

#### Step 2.3: Reset to Backup Branch

```bash
# Reset main to the backup branch (this discards all Playwright changes)
git reset --hard backup/before-playwright-migration

# Verify the reset
git log -1
```

**Expected Output:** The latest commit should be from BEFORE the Playwright migration started.

**⚠️ WARNING:** This command discards all changes. Make sure you created a backup in Phase 1!

#### Step 2.4: Force Push to Remote

```bash
# Force push to remote (overwrites main branch)
git push origin main --force

# Verify push succeeded
git status
```

**Expected Output:** `Your branch is up to date with 'origin/main'`

**⚠️ WARNING:** Force push overwrites the remote branch. Ensure backup exists before proceeding!

---

### PHASE 3: Reinstall Puppeteer Dependencies

Restore Puppeteer and remove Playwright from the project.

#### Step 3.1: Remove Playwright

```bash
# Remove Playwright from dependencies
npm uninstall playwright

# Verify removal
npm list playwright
```

**Expected Output:** `npm ERR! code ELSPROBLEMS` or `(empty)` - Playwright should not be found.

#### Step 3.2: Install Puppeteer

```bash
# Install Puppeteer (version 21.0.0 or compatible)
npm install puppeteer@^21.0.0

# Verify installation
npm list puppeteer
```

**Expected Output:** `puppeteer@21.x.x` (or the version specified in package.json)

#### Step 3.3: Clean Install Dependencies

```bash
# Remove existing node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Fresh install of all dependencies
npm install

# Verify installation completed successfully
echo $?
```

**Expected Output:** `0` (indicates successful installation)

**Why Clean Install?** Ensures no Playwright artifacts remain and all dependencies are correctly resolved.

---

### PHASE 4: Rebuild and Verify Application

Build the application with Puppeteer dependencies and verify it compiles.

#### Step 4.1: Build Application

```bash
# Build the Next.js application
npm run build

# Check build output for errors
echo $?
```

**Expected Output:** 
- Build completes without errors
- Exit code: `0`
- No Playwright-related import errors

**Common Errors:**
- `Cannot find module 'playwright'` - Good! This means Playwright is removed.
- `Cannot find module 'puppeteer'` - Bad! Reinstall Puppeteer (Step 3.2).

#### Step 4.2: Verify No Playwright References

```bash
# Search for any remaining Playwright imports
grep -r "from 'playwright'" lib/scraper/

# Search for Playwright types
grep -r "import.*playwright" lib/scraper/
```

**Expected Output:** No results (empty output)

If Playwright references are found, the git reset may have failed. Verify you're on the correct branch.

---

### PHASE 5: Deploy to Production

Deploy the rolled-back version to your Dokploy VPS.

#### Step 5.1: Trigger Deployment

If using Dokploy auto-deploy:

```bash
# Dokploy will automatically detect the force push and redeploy
# Monitor deployment in Dokploy dashboard
```

If manual deployment is required:

```bash
# SSH into production server
ssh your-user@your-vps-ip

# Navigate to application directory
cd /path/to/hosted-smart-cost-calculator

# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Build application
npm run build

# Restart application via Dokploy dashboard or PM2
# Via Dokploy: Use the dashboard to restart the application
# Via PM2: pm2 restart hosted-smart-cost-calculator
```

#### Step 5.2: Monitor Deployment

```bash
# Watch application logs during startup
tail -f /var/log/dokploy/hosted-smart-cost-calculator.log

# Or if using PM2:
pm2 logs hosted-smart-cost-calculator
```

**Look For:**
- ✅ "Server started successfully"
- ✅ "[BrowserManager] Browser initialized successfully"
- ✅ No Playwright-related errors
- ❌ Any errors mentioning "playwright" (should not appear)

---

### PHASE 6: Verification Steps After Rollback

Verify that the application is working correctly after rollback.

#### Step 6.1: Verify Application Startup

```bash
# Check application is running
curl http://localhost:3000/api/health

# Check process status
ps aux | grep node
```

**Expected Output:** 
- Health check returns 200 OK
- Node process is running

#### Step 6.2: Verify Scraping Functionality

**Manual Test:**
1. Open the application in a browser
2. Log in with admin credentials
3. Navigate to Scraper Management
4. Create a new scraping session:
   - Select 1 town (e.g., "Cape Town")
   - Select 1 industry (e.g., "Restaurants")
   - Click "Start Scraping"
5. Monitor progress in real-time
6. Wait for completion (should take 2-5 minutes)
7. Verify results appear in the UI
8. Check database for saved results

**Expected Results:**
- ✅ Scraping session starts without errors
- ✅ Progress updates appear in UI
- ✅ Session completes successfully
- ✅ Results are saved to database
- ✅ No errors in browser console
- ✅ No errors in server logs

#### Step 6.3: Verify Provider Lookup Functionality

**Manual Test:**
1. Navigate to Provider Lookup section
2. Enter a test phone number (e.g., "0821234567")
3. Click "Lookup Provider"
4. Verify provider information is returned

**Expected Results:**
- ✅ Lookup completes within 5-10 seconds
- ✅ Provider information is displayed (e.g., "Vodacom", "MTN")
- ✅ No errors in UI
- ✅ No errors in server logs

#### Step 6.4: Verify Memory Usage

```bash
# Monitor RAM usage
free -h

# Monitor process memory
ps aux | grep node | awk '{print $6}'

# Watch memory over time (5-minute intervals)
watch -n 300 'free -h && ps aux | grep node'
```

**Expected Results:**
- Peak RAM usage: ~1.4GB (Puppeteer baseline)
  - 2 towns × 300MB per browser = 600MB
  - 2 provider lookup browsers × 300MB = 600MB
  - Base application: ~200MB
- Stable memory usage over time (no leaks)
- Memory should NOT be higher than 1.5GB

**⚠️ If memory is still high (>1.5GB):** There may be a memory leak unrelated to Playwright. Investigate further.

#### Step 6.5: Verify No Errors in Logs

```bash
# Check for errors in application logs (last 100 lines)
tail -n 100 /var/log/dokploy/hosted-smart-cost-calculator.log | grep -i error

# Check for Playwright references (should be none)
tail -n 500 /var/log/dokploy/hosted-smart-cost-calculator.log | grep -i playwright
```

**Expected Results:**
- ✅ No critical errors
- ✅ No Playwright-related errors
- ✅ No "module not found" errors
- ✅ Normal application logs only

#### Step 6.6: Run Full Integration Test

**Test Scenario:** Multiple towns, multiple industries (stress test)

1. Create a scraping session:
   - Select 3 towns
   - Select 3 industries per town
   - Start scraping
2. Monitor memory usage during scraping
3. Wait for completion (15-20 minutes)
4. Verify all results saved correctly

**Expected Results:**
- ✅ All 9 scraping tasks complete (3 towns × 3 industries)
- ✅ Memory stays under 1.5GB
- ✅ No crashes or errors
- ✅ All results saved to database

---

### PHASE 7: Restart Application (If Needed)

If the application is not responding or behaving incorrectly after rollback:

#### Step 7.1: Restart via Dokploy Dashboard

1. Log into Dokploy dashboard
2. Navigate to your application
3. Click "Restart" button
4. Wait for restart to complete (30-60 seconds)
5. Verify application is running

#### Step 7.2: Restart via Command Line (Alternative)

```bash
# If using PM2
pm2 restart hosted-smart-cost-calculator

# If using systemd
sudo systemctl restart hosted-smart-cost-calculator

# If using Docker
docker restart hosted-smart-cost-calculator
```

#### Step 7.3: Verify Restart Successful

```bash
# Check application logs
tail -f /var/log/dokploy/hosted-smart-cost-calculator.log

# Check process is running
ps aux | grep node

# Test health endpoint
curl http://localhost:3000/api/health
```

**Expected Output:** Application starts successfully with no errors.

---

## ROLLBACK VERIFICATION CHECKLIST

Use this checklist to confirm rollback is complete and successful:

### Git and Dependencies
- [ ] Git reset to `backup/before-playwright-migration` successful
- [ ] Force push to `origin/main` successful
- [ ] Puppeteer installed (verify: `npm list puppeteer`)
- [ ] Playwright removed (verify: `npm list playwright` returns error)
- [ ] `npm install` completed without errors
- [ ] `npm run build` completed without errors

### Deployment
- [ ] Application deployed to production
- [ ] Application starts without errors
- [ ] No Playwright-related errors in logs
- [ ] Health check endpoint returns 200 OK

### Functionality
- [ ] Test scraping session (1 town, 1 industry) completes successfully
- [ ] Results saved to database correctly
- [ ] Provider lookup functionality works
- [ ] UI displays results correctly
- [ ] No errors in browser console

### Performance
- [ ] Memory usage at expected levels (~1.4GB peak)
- [ ] No memory leaks detected (stable over 1 hour)
- [ ] Scraping speed similar to pre-migration baseline
- [ ] No performance degradation

### Final Verification
- [ ] All critical functionality verified
- [ ] Full integration test passed (3 towns × 3 industries)
- [ ] Application stable for 1 hour post-rollback
- [ ] Issue documented for investigation
- [ ] Root cause analysis initiated

---

## TROUBLESHOOTING COMMON ROLLBACK ISSUES

### Issue 1: Git Reset Fails with Uncommitted Changes

**Error:** `error: Your local changes to the following files would be overwritten by checkout`

**Solution:**
```bash
# Stash uncommitted changes
git stash

# Retry reset
git reset --hard backup/before-playwright-migration

# If you need the stashed changes later:
git stash list
git stash pop
```

---

### Issue 2: npm install Fails

**Error:** `npm ERR! code ERESOLVE` or dependency conflicts

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Retry install with legacy peer deps
npm install --legacy-peer-deps

# If still failing, try with force
npm install --force
```

---

### Issue 3: Build Fails with "Cannot find module 'playwright'"

**Error:** `Error: Cannot find module 'playwright'`

**Solution:**
This is actually expected! It means Playwright is removed. However, if the build fails:

```bash
# Search for remaining Playwright imports
grep -r "from 'playwright'" lib/scraper/

# If found, manually replace with Puppeteer imports
# Then rebuild
npm run build
```

---

### Issue 4: Build Fails with "Cannot find module 'puppeteer'"

**Error:** `Error: Cannot find module 'puppeteer'`

**Solution:**
```bash
# Reinstall Puppeteer
npm install puppeteer@^21.0.0

# Verify installation
npm list puppeteer

# Rebuild
npm run build
```

---

### Issue 5: Application Won't Start After Rollback

**Error:** Application crashes on startup or port conflicts

**Solution:**
```bash
# Check for port conflicts
lsof -i :3000

# Kill conflicting process if needed
kill -9 <PID>

# Check for missing environment variables
cat .env | grep -i browser

# Restart application
npm run start

# Check logs for specific error
tail -f /var/log/dokploy/hosted-smart-cost-calculator.log
```

---

### Issue 6: Scraping Still Fails After Rollback

**Error:** Scraping sessions fail even after rollback

**Solution:**

1. **Verify Puppeteer browsers are installed:**
   ```bash
   # Puppeteer installs browsers automatically during npm install
   # Check if Chrome/Chromium is available
   which chromium-browser
   chromium-browser --version
   ```

2. **Reinstall Puppeteer to trigger browser download:**
   ```bash
   npm uninstall puppeteer
   npm install puppeteer@^21.0.0
   ```

3. **Check for missing system dependencies:**
   ```bash
   # Install system dependencies for Puppeteer (Ubuntu/Debian)
   sudo apt-get update
   sudo apt-get install -y \
     libnss3 \
     libatk-bridge2.0-0 \
     libdrm2 \
     libxkbcommon0 \
     libgbm1 \
     libasound2 \
     libxshmfence1 \
     libglu1-mesa
   ```

4. **Check browser permissions:**
   ```bash
   # Ensure Chrome can run with --no-sandbox
   chromium-browser --no-sandbox --version
   ```

---

### Issue 7: Memory Usage Still High After Rollback

**Error:** RAM usage is still >1.5GB after rollback

**Solution:**

1. **Check for memory leaks unrelated to Playwright:**
   ```bash
   # Monitor memory over time
   watch -n 60 'free -h && ps aux | grep node'
   ```

2. **Restart application to clear memory:**
   ```bash
   pm2 restart hosted-smart-cost-calculator
   # Or via Dokploy dashboard
   ```

3. **Check for zombie browser processes:**
   ```bash
   # List all Chrome/Chromium processes
   ps aux | grep chrome

   # Kill zombie processes if found
   pkill -f chrome
   ```

4. **If memory leak persists:**
   - This may be an existing issue unrelated to Playwright
   - Monitor and investigate separately
   - Consider restarting server if critical

---

## POST-ROLLBACK ACTIONS

After successful rollback, take these actions to prevent future issues:

### 1. Document the Failure

Create a detailed incident report:

**Template:**
```markdown
# Playwright Migration Rollback Incident Report

**Date:** [Date of rollback]
**Time:** [Time of rollback]
**Duration:** [How long was the issue present?]
**Impact:** [What was affected?]

## Symptoms Observed
- [List all symptoms that triggered the rollback]
- [Include error messages, screenshots, logs]

## Timeline
- [Time] - Migration deployed
- [Time] - First issue detected
- [Time] - Rollback initiated
- [Time] - Rollback completed
- [Time] - Verification completed

## Root Cause
- [What went wrong?]
- [Why did it happen?]

## Lessons Learned
- [What could have been done differently?]
- [What safeguards should be added?]

## Next Steps
- [Plan to fix the issues]
- [Additional testing needed]
```

### 2. Investigate Root Cause

Analyze why the migration failed:

```bash
# Review error logs from failed deployment
tail -n 1000 /var/log/dokploy/hosted-smart-cost-calculator.log > migration-failure-logs.txt

# Search for specific errors
grep -i "error" migration-failure-logs.txt
grep -i "playwright" migration-failure-logs.txt
grep -i "context" migration-failure-logs.txt
```

**Common Root Causes:**
- Missing Playwright browser installation (`npx playwright install chromium`)
- Incorrect API usage (Puppeteer vs Playwright differences)
- Context not properly closed (memory leaks)
- Concurrency limits too high for server resources
- Environment variables not set correctly

### 3. Create Fix Plan

Develop a plan to address identified issues:

1. **Fix Code Issues:**
   - Review failed code changes
   - Identify incorrect API usage
   - Add missing error handling

2. **Improve Testing:**
   - Add integration tests for Playwright
   - Test on staging environment first
   - Run performance benchmarks before deployment

3. **Add Safeguards:**
   - Implement gradual rollout (canary deployment)
   - Add monitoring and alerts
   - Create automated rollback triggers

### 4. Test Fixes Locally

Before attempting deployment again:

```bash
# Checkout feature branch
git checkout feature/playwright-migration

# Apply fixes
# ... make code changes ...

# Test locally
npm install
npm run build
npm run dev

# Run integration tests
npm test

# Run manual tests
# - Test scraping (1 town, 1 industry)
# - Test provider lookups
# - Monitor memory usage
# - Check for errors in logs
```

### 5. Update Rollback Plan

If any issues were encountered during rollback:

- Document what worked and what didn't
- Update this rollback plan with improvements
- Add additional verification steps
- Update troubleshooting section

---

## EMERGENCY CONTACTS

If rollback fails or additional assistance is needed:

- **Development Team Lead:** [Contact Info]
- **DevOps Team:** [Contact Info]
- **System Administrator:** [Contact Info]
- **Dokploy Support:** [Support URL/Email]

---

## RELATED DOCUMENTS

- **Migration Design:** `.kiro/specs/puppeteer-to-playwright-migration/design.md`
- **Migration Requirements:** `.kiro/specs/puppeteer-to-playwright-migration/requirements.md`
- **Migration Tasks:** `.kiro/specs/puppeteer-to-playwright-migration/tasks.md`
- **Migration Guide:** `PLAYWRIGHT_MIGRATION_GUIDE.md`

---

## BACKUP BRANCH INFORMATION

- **Branch Name:** `backup/before-playwright-migration`
- **Created:** Before Playwright migration started (Task 1.1.1)
- **Purpose:** Snapshot of working Puppeteer implementation
- **Verification:** Should contain all Puppeteer code and dependencies

**To verify backup branch:**
```bash
git checkout backup/before-playwright-migration
git log -1
# Should show commit before migration started

# Check for Puppeteer
grep -r "from 'puppeteer'" lib/scraper/

# Should NOT have Playwright
grep -r "from 'playwright'" lib/scraper/
```

---

## NOTES

- **Estimated Rollback Time:** 15-20 minutes
- **Estimated Downtime:** 5-10 minutes during deployment
- **Risk Level:** LOW (reverting to known-good state)
- **Prerequisites:** Backup branch must exist and be functional
- **Verification:** Always verify each step before proceeding
- **Documentation:** Keep detailed notes of any issues encountered

---

## REVISION HISTORY

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-01-XX | 1.0 | Initial rollback plan created | Development Team |
| 2025-01-XX | 1.1 | Completed all sections (git, npm, verification, restart) | Kiro |

---

**Last Updated:** 2025-01-XX  
**Document Owner:** Development Team  
**Review Frequency:** After each deployment attempt  
**Status:** ✅ Complete and Ready for Use