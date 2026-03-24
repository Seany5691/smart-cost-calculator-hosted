# PLAYWRIGHT MIGRATION CHECKLIST

Use this checklist to track your migration progress.

---

## PRE-MIGRATION

- [ ] Read `PLAYWRIGHT_MIGRATION_SUMMARY.md`
- [ ] Read `PLAYWRIGHT_MIGRATION_GUIDE.md`
- [ ] Understand the changes required
- [ ] Schedule migration time (4-6 hours)
- [ ] Notify team of planned migration

---

## PHASE 1: PREPARATION

- [ ] Create backup branch: `backup/before-playwright-migration`
- [ ] Push backup branch to remote
- [ ] Create feature branch: `feature/playwright-migration`
- [ ] Uninstall Puppeteer: `npm uninstall puppeteer`
- [ ] Install Playwright: `npm install playwright@^1.48.0`
- [ ] Install Chromium: `npx playwright install chromium`
- [ ] Verify installation: `npm list playwright`

---

## PHASE 2: CORE BROWSER MANAGEMENT

- [ ] Migrate `lib/scraper/browserConfig.ts`
  - [ ] Update imports: `puppeteer` → `playwright`
  - [ ] Reduce args from 40+ to 5
  - [ ] Add `timeout` and `chromiumSandbox` options
  - [ ] Add `getPlaywright()` helper
  - [ ] Test: `npm run build`

- [ ] Migrate `lib/scraper/browser-manager.ts` ⭐⭐⭐
  - [ ] Change `browsers` Map → `contexts` Map
  - [ ] Add single `browser` instance
  - [ ] Replace `getBrowser()` → `getContext()`
  - [ ] Replace `releaseBrowser()` → `releaseContext()`
  - [ ] Replace `closeBrowser()` → `closeContext()`
  - [ ] Add `initBrowser()` method
  - [ ] Update `cleanupIdleContexts()` for contexts
  - [ ] Test: `npm run build`

- [ ] Migrate `lib/scraper/browser-worker.ts` ⭐⭐⭐
  - [ ] Change `Browser` → `BrowserContext`
  - [ ] Replace `initBrowser()` → `initContext()`
  - [ ] Remove `setViewport()` and `setUserAgent()`
  - [ ] Update `cleanup()` to use `releaseContext()`
  - [ ] Test: `npm run build`

---

## PHASE 3: SCRAPING LOGIC

- [ ] Migrate `lib/scraper/industry-scraper.ts` ⭐⭐⭐
  - [ ] Update import: `puppeteer` → `playwright`
  - [ ] Replace `$()` → `locator().first()` or `locator().count()`
  - [ ] Replace `$$()` → `locator().all()`
  - [ ] Replace `$eval()` → `locator().textContent()`
  - [ ] Replace `new Promise(setTimeout)` → `page.waitForTimeout()`
  - [ ] Test: `npm run build`

- [ ] Migrate `lib/scraper/business-lookup-scraper.ts` ⭐⭐
  - [ ] Update import: `puppeteer` → `playwright`
  - [ ] Replace `$()` → `locator().first()`
  - [ ] Replace `$$()` → `locator().all()`
  - [ ] Replace `$eval()` → `locator().textContent()`
  - [ ] Test: `npm run build`

---

## PHASE 4: PROVIDER LOOKUP

- [ ] Migrate `lib/scraper/provider-lookup-service.ts` ⭐⭐⭐
  - [ ] Update import: `puppeteer` → `playwright`
  - [ ] Add single `browser` instance
  - [ ] Add `initBrowser()` method
  - [ ] Replace browser-per-batch → context-per-batch
  - [ ] Remove `userDataDir` temp directory logic
  - [ ] Update `cleanup()` to close browser
  - [ ] Test: `npm run build`

---

## PHASE 5: SUPPORTING FILES

- [ ] Update `lib/scraper/NavigationManager.ts`
  - [ ] Change import: `puppeteer` → `playwright`
  - [ ] Test: `npm run build`

- [ ] Update `lib/scraper/CaptchaDetector.ts`
  - [ ] Change import: `puppeteer` → `playwright`
  - [ ] Test: `npm run build`

- [ ] Update `lib/scraper/BatchManager.ts`
  - [ ] Change import: `puppeteer` → `playwright`
  - [ ] Test: `npm run build`

- [ ] Update `lib/scraper/scraper-service.ts`
  - [ ] Change import: `puppeteer` → `playwright`
  - [ ] Update Page methods if needed
  - [ ] Test: `npm run build`

---

## PHASE 6: CLEANUP

- [ ] Delete `lib/scraper/browser-pool.ts`
  - [ ] Run: `rm lib/scraper/browser-pool.ts`
  - [ ] Test: `npm run build`

---

## PHASE 7: CONCURRENCY SETTINGS

- [ ] Update `app/api/scraper/start/route.ts`
  - [ ] Change default `simultaneousTowns`: 2 → 3
  - [ ] Change default `simultaneousIndustries`: 2 → 3
  - [ ] Change max `simultaneousTowns`: 5 → 8
  - [ ] Change max `simultaneousIndustries`: 3 → 5
  - [ ] Change max `simultaneousLookups`: 3 → 5
  - [ ] Test: `npm run build`

---

## PHASE 8: TESTING

### Unit Tests
- [ ] Update test mocks: `puppeteer` → `playwright`
- [ ] Run tests: `npm test`
- [ ] All tests passing

### Local Testing
- [ ] Start app: `npm run dev`
- [ ] Create test session (1 town, 1 industry)
- [ ] Verify scraping works
- [ ] Verify results saved
- [ ] Check memory usage
- [ ] Create test session (3 towns, 3 industries)
- [ ] Verify concurrent scraping
- [ ] Verify provider lookups
- [ ] Check for context leaks

### Integration Testing
- [ ] Google Maps scraping works
- [ ] Provider lookups work
- [ ] Concurrency works
- [ ] Error handling works
- [ ] No memory leaks

---

## PHASE 9: DEPLOYMENT

- [ ] Commit changes
  - [ ] `git add .`
  - [ ] `git commit -m "feat: migrate to Playwright"`
  - [ ] `git push origin feature/playwright-migration`

- [ ] Deploy to Dokploy
  - [ ] Merge to main or deploy feature branch
  - [ ] Install Playwright on server: `npx playwright install chromium`
  - [ ] Update environment variables
  - [ ] Restart application

- [ ] Verify deployment
  - [ ] Application starts
  - [ ] No errors in logs
  - [ ] Can create sessions
  - [ ] Scraping works

---

## PHASE 10: MONITORING

### First Hour
- [ ] Monitor application logs
- [ ] Check for errors
- [ ] Verify scraping sessions complete
- [ ] Check memory usage

### First 24 Hours
- [ ] Monitor RAM usage (should be 30-40% lower)
- [ ] Monitor scraping speed (should be 20-30% faster)
- [ ] Monitor error rates (should be same or lower)
- [ ] Check for context leaks (should be 0)

### Performance Benchmarks
- [ ] RAM usage < 1GB peak
- [ ] Scraping 20-30% faster
- [ ] No increase in errors
- [ ] No context leaks

---

## ROLLBACK (IF NEEDED)

- [ ] Revert git changes: `git reset --hard backup/before-playwright-migration`
- [ ] Force push: `git push origin main --force`
- [ ] Redeploy via Dokploy
- [ ] Reinstall Puppeteer: `npm install puppeteer`
- [ ] Restart application
- [ ] Verify rollback successful

---

## POST-MIGRATION

- [ ] Update documentation
- [ ] Notify team of successful migration
- [ ] Monitor for 1 week
- [ ] Delete backup branch (after 1 week)
- [ ] Celebrate! 🎉

---

## NOTES

**Start Date:** _______________  
**Completion Date:** _______________  
**Issues Encountered:** 

_______________________________________________
_______________________________________________
_______________________________________________

**Performance Improvements:**

- RAM usage: Before _______ → After _______
- Scraping speed: Before _______ → After _______
- Concurrency: Before _______ → After _______

---

**Status:** 
- [ ] Not Started
- [ ] In Progress
- [ ] Testing
- [ ] Deployed
- [ ] Monitoring
- [ ] Complete

