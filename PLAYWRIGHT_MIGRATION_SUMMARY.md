# PLAYWRIGHT MIGRATION - EXECUTIVE SUMMARY

## Quick Overview

**What:** Migrate from Puppeteer to Playwright  
**Why:** 60-80% RAM reduction, 20-30% faster, better stability  
**When:** Ready to implement now  
**Risk:** Low (comprehensive rollback plan included)

---

## Key Changes

### 1. Browser Management (CRITICAL)
- **Before:** 3 separate browser instances (900MB RAM)
- **After:** 1 browser + 10 contexts (400MB RAM)
- **File:** `lib/scraper/browser-manager.ts`
- **Impact:** 55% RAM reduction

### 2. Provider Lookups (CRITICAL)
- **Before:** 1 browser per batch of 5 phones (6GB over time)
- **After:** 1 browser + contexts for all batches (310MB)
- **File:** `lib/scraper/provider-lookup-service.ts`
- **Impact:** 95% RAM reduction

### 3. Scraping Logic
- **Before:** Puppeteer `$()` and `$$()` selectors
- **After:** Playwright `locator()` API
- **Files:** `industry-scraper.ts`, `business-lookup-scraper.ts`
- **Impact:** Better auto-waiting, fewer retries

### 4. Concurrency Limits
- **Before:** 2 towns, 2 industries (4 concurrent)
- **After:** 3 towns, 3 industries (9 concurrent)
- **File:** `app/api/scraper/start/route.ts`
- **Impact:** 2.25x throughput

---

## Files to Change

| Priority | File | Lines | Complexity |
|----------|------|-------|------------|
| ⭐⭐⭐ | `browser-manager.ts` | ~250 | HIGH |
| ⭐⭐⭐ | `browser-worker.ts` | ~200 | MEDIUM |
| ⭐⭐⭐ | `provider-lookup-service.ts` | ~800 | HIGH |
| ⭐⭐⭐ | `industry-scraper.ts` | ~400 | MEDIUM |
| ⭐⭐ | `business-lookup-scraper.ts` | ~300 | MEDIUM |
| ⭐⭐ | `browserConfig.ts` | ~50 | LOW |
| ⭐ | Type imports (7 files) | ~1 each | TRIVIAL |

**Total:** 10 files to modify, 1 file to delete

---

## Performance Improvements

### Memory Usage
```
BEFORE: ~1.4GB peak
AFTER:  ~880MB peak
SAVINGS: 37% reduction
```

### Scraping Speed
```
BEFORE: 15 minutes for 9 scrapes
AFTER:  10 minutes for 9 scrapes
IMPROVEMENT: 33% faster
```

### Concurrency
```
BEFORE: 4 concurrent scrapes
AFTER:  9 concurrent scrapes
IMPROVEMENT: 2.25x throughput
```

---

## Implementation Steps

1. **Backup** - Create backup branch
2. **Install** - `npm install playwright@^1.48.0`
3. **Migrate** - Update 10 files (follow guide)
4. **Test** - Run tests, test locally
5. **Deploy** - Push to Dokploy
6. **Monitor** - Watch RAM/speed for 24 hours

**Estimated Time:** 4-6 hours

---

## Risk Assessment

### Low Risk ✅
- Comprehensive testing strategy
- Detailed rollback plan
- No database changes
- No API changes
- Same functionality

### Mitigation
- Backup branch created
- Can rollback in 5 minutes
- Incremental testing
- Monitor deployment closely

---

## Success Criteria

- [ ] Application starts without errors
- [ ] Can create scraping sessions
- [ ] Scraping completes successfully
- [ ] Results saved correctly
- [ ] RAM usage < 1GB
- [ ] Speed improvement 20-30%
- [ ] No context leaks
- [ ] No errors in logs

---

## Quick Start

```bash
# 1. Backup
git checkout -b backup/before-playwright-migration
git push -u origin backup/before-playwright-migration

# 2. Create feature branch
git checkout main
git checkout -b feature/playwright-migration

# 3. Install Playwright
npm uninstall puppeteer
npm install playwright@^1.48.0
npx playwright install chromium

# 4. Follow migration guide
# See PLAYWRIGHT_MIGRATION_GUIDE.md for detailed steps

# 5. Test
npm run build
npm test
npm run dev

# 6. Deploy
git push origin feature/playwright-migration
# Deploy via Dokploy dashboard
```

---

## Support

**Full Guide:** `PLAYWRIGHT_MIGRATION_GUIDE.md`  
**Rollback Plan:** See guide Section 8  
**Testing Strategy:** See guide Section 6

---

**Ready to migrate?** Follow the complete guide in `PLAYWRIGHT_MIGRATION_GUIDE.md`

