# Deployment Checklist: Provider Lookup Fix

## Pre-Deployment Testing

### ✅ Local Testing (Required)

- [ ] **Test 1: Browser Creation Count**
  - Run scrape with 10 phone numbers
  - Verify "Created browser" appears exactly 2 times (not 10)
  - Verify "Closing browser" appears exactly 2 times (not 10)
  - Each batch shows 5 lookups with same browser

- [ ] **Test 2: Cache Functionality**
  - Run same scrape twice
  - First run: All lookups hit API (~15 seconds)
  - Second run: All from cache (<1 second)
  - Verify "All results found in cache" message

- [ ] **Test 3: 30+ Lookups**
  - Run scrape with 35 phone numbers
  - First 30 lookups complete without captcha
  - 6 browser instances created for first 30 lookups
  - Timing: ~40-57 seconds for 30 lookups

- [ ] **Test 4: Console Logs**
  - Logs show correct batch processing
  - No errors or warnings
  - Browser lifecycle is correct (create → use → close)

### ✅ Code Review (Required)

- [ ] **File: provider-lookup-service.ts**
  - `processLookupsWithBatchManager` creates browser BEFORE batch
  - Browser is reused for all lookups in batch
  - Browser is closed AFTER batch completes
  - 500ms delay between lookups within batch

- [ ] **Configuration**
  - `enableCaptchaDetection` defaults to false
  - `maxBatchSize` is 5 (never exceeds)
  - `minBatchSize` is 3
  - `interBatchDelay` is [2000, 5000]

### ✅ Documentation (Required)

- [ ] Read CRITICAL_PROVIDER_LOOKUP_ANALYSIS.md
- [ ] Read PROVIDER_LOOKUP_FIX_COMPLETE.md
- [ ] Read TESTING_GUIDE_PROVIDER_LOOKUP_FIX.md
- [ ] Read START_HERE_PROVIDER_LOOKUP_FIX.md
- [ ] Read BEFORE_AFTER_PROVIDER_LOOKUP.md

## Deployment Steps

### Step 1: Commit Changes

```bash
cd hosted-smart-cost-calculator
git status
# Should show: modified: lib/scraper/provider-lookup-service.ts
```

- [ ] Verify only provider-lookup-service.ts is modified
- [ ] No unintended changes

```bash
git add lib/scraper/provider-lookup-service.ts
git commit -m "Fix: Provider lookup now creates 1 browser per batch (not per lookup)

- Fixed processLookupsWithBatchManager to create ONE browser per batch
- Browser is now reused for all lookups in batch (up to 5)
- Browser is closed after batch completes (not after each lookup)
- Added enableCaptchaDetection config option (default: false)
- This fixes captcha appearing on 6th lookup (was 6th browser instance)
- Now matches old working scraper behavior (1 browser per 5 lookups)
- Keeps all robustness features (cache, retry queue, adaptive sizing)"
```

- [ ] Commit created successfully
- [ ] Commit message is clear and descriptive

### Step 2: Push to Repository

```bash
git push origin main
# Or: git push origin master
```

- [ ] Push successful
- [ ] No conflicts
- [ ] Remote repository updated

### Step 3: Backup Current VPS State

```bash
# SSH into VPS
ssh user@your-vps-ip

# Create backup
cd /path/to/hosted-smart-cost-calculator
git stash
git branch backup-before-provider-fix
```

- [ ] Backup branch created
- [ ] Can rollback if needed

### Step 4: Pull Changes on VPS

```bash
# On VPS
cd /path/to/hosted-smart-cost-calculator
git pull origin main
# Or: git pull origin master
```

- [ ] Pull successful
- [ ] provider-lookup-service.ts updated
- [ ] No merge conflicts

### Step 5: Restart Application

```bash
# On VPS
npm install  # In case dependencies changed
pm2 restart hosted-smart-cost-calculator
# Or your restart command
```

- [ ] Application restarted successfully
- [ ] No startup errors
- [ ] Application is running

### Step 6: Verify Deployment

```bash
# Check application logs
pm2 logs hosted-smart-cost-calculator
# Or: tail -f /path/to/logs/app.log
```

- [ ] Application started successfully
- [ ] No errors in logs
- [ ] Database connection successful

## Post-Deployment Testing

### ✅ Smoke Tests (Required - Within 5 minutes)

- [ ] **Test 1: Basic Scrape**
  - Run scrape with 5 businesses
  - Should complete successfully
  - Check logs for correct browser creation

- [ ] **Test 2: Console Logs**
  - Verify "Created browser" appears once per batch
  - Verify "Closing browser" appears once per batch
  - No errors or warnings

### ✅ Integration Tests (Required - Within 30 minutes)

- [ ] **Test 3: 10 Lookups**
  - Run scrape with 10 businesses
  - Should create 2 browsers (not 10)
  - Should complete in ~12-17 seconds
  - No captcha

- [ ] **Test 4: Cache Test**
  - Run same scrape twice
  - Second run should be instant (<1 second)
  - All results from cache

- [ ] **Test 5: 30+ Lookups**
  - Run scrape with 30+ businesses
  - Should complete without captcha
  - Should create 6 browsers for 30 lookups
  - Timing: ~40-57 seconds

### ✅ Monitoring (Required - First 24 hours)

- [ ] **Hour 1: Active Monitoring**
  - Watch logs for errors
  - Monitor browser creation count
  - Check for captcha occurrences
  - Verify cache is working

- [ ] **Hour 6: Check Metrics**
  - Review scrape success rate
  - Check cache hit rate
  - Review retry queue size
  - No captcha issues reported

- [ ] **Hour 24: Final Check**
  - Review all scrapes in last 24 hours
  - Verify no captcha issues
  - Check cache performance
  - Review any errors or warnings

## Success Criteria

### ✅ Deployment is Successful If:

- [ ] 30 lookups complete without captcha
- [ ] Browser creation count is correct (1 per batch, not 1 per lookup)
- [ ] Cache reduces subsequent runs to instant
- [ ] Timing matches expectations (~40-57s for 30 lookups)
- [ ] No errors in logs
- [ ] Retry queue captures failed lookups
- [ ] Adaptive batch sizing works (reduces on failures)
- [ ] No browser instances left running

### ❌ Rollback If:

- [ ] Captcha appears on 6th lookup (browser still created per lookup)
- [ ] Browser creation count is wrong (10 browsers for 10 lookups)
- [ ] Errors in logs
- [ ] Application crashes
- [ ] Scrapes fail consistently
- [ ] Performance is worse than before

## Rollback Procedure

### If Issues Occur:

```bash
# On VPS
cd /path/to/hosted-smart-cost-calculator

# Option 1: Revert to backup branch
git checkout backup-before-provider-fix
pm2 restart hosted-smart-cost-calculator

# Option 2: Revert the commit
git revert HEAD
pm2 restart hosted-smart-cost-calculator

# Option 3: Hard reset (use with caution)
git reset --hard HEAD~1
pm2 restart hosted-smart-cost-calculator
```

- [ ] Rollback completed
- [ ] Application running on old version
- [ ] Verify old version works
- [ ] Investigate issue before re-deploying

## Monitoring Commands

### Check Application Status
```bash
pm2 status
pm2 logs hosted-smart-cost-calculator --lines 100
```

### Check Browser Instances
```bash
# Should be 0-1 (1 during batch, 0 between batches)
ps aux | grep chromium | wc -l
```

### Check Database
```sql
-- Cache hit rate
SELECT COUNT(*) FROM provider_cache;

-- Retry queue size
SELECT COUNT(*) FROM retry_queue WHERE type = 'lookup';

-- Recent scrapes
SELECT * FROM scraper_sessions ORDER BY created_at DESC LIMIT 10;
```

### Check Logs for Issues
```bash
# Look for errors
grep -i "error" /path/to/logs/app.log | tail -20

# Look for captcha
grep -i "captcha" /path/to/logs/app.log | tail -20

# Count browser creations
grep "Created browser" /path/to/logs/app.log | wc -l
```

## Communication

### Notify Team (If Applicable)

- [ ] **Before Deployment**
  - Notify team of upcoming deployment
  - Provide estimated downtime (if any)
  - Share rollback plan

- [ ] **After Deployment**
  - Confirm deployment successful
  - Share test results
  - Provide monitoring dashboard link

- [ ] **If Issues Occur**
  - Notify team immediately
  - Share error details
  - Provide ETA for fix or rollback

## Documentation Updates

- [ ] Update README.md with new behavior (if needed)
- [ ] Update deployment documentation
- [ ] Document any issues encountered
- [ ] Update monitoring procedures

## Final Checklist

### Before Marking Complete:

- [ ] All pre-deployment tests passed
- [ ] Code committed and pushed
- [ ] VPS updated successfully
- [ ] Application restarted
- [ ] All post-deployment tests passed
- [ ] Monitoring in place
- [ ] Team notified (if applicable)
- [ ] Documentation updated

### Success Indicators:

- [ ] ✅ 30+ lookups complete without captcha
- [ ] ✅ Browser creation count correct (1 per batch)
- [ ] ✅ Cache working (instant second runs)
- [ ] ✅ No errors in logs
- [ ] ✅ Performance improved
- [ ] ✅ All robustness features working

## Notes

### Deployment Date: _________________

### Deployed By: _________________

### Issues Encountered: _________________

### Resolution: _________________

### Final Status: ☐ Success  ☐ Rolled Back  ☐ Partial Success

---

## Quick Reference

**What was fixed:** Browser creation moved from per-lookup to per-batch

**Expected behavior:** 1 browser per 5 lookups (not 1 per lookup)

**Success metric:** 30 lookups = 6 browsers (not 30 browsers)

**Rollback command:** `git checkout backup-before-provider-fix && pm2 restart`

**Documentation:** See START_HERE_PROVIDER_LOOKUP_FIX.md

---

**Deployment is complete when all checkboxes are marked and success criteria are met.**
