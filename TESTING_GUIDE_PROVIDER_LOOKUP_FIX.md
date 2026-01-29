# Testing Guide: Provider Lookup Fix

## Quick Test (5 minutes)

### Test 1: Verify Browser Creation Count
Run a scrape with 10 phone numbers and check console logs:

**Expected Output:**
```
[ProviderLookup] Starting lookup for 10 phone numbers
[ProviderLookup] Need to lookup 10 numbers (not in cache)
[ProviderLookup] Using BatchManager for 10 lookups
[ProviderLookup] Processing batch 1 with 5 lookups
[ProviderLookup] [Batch 1] Created browser for 5 lookups
[ProviderLookup] [Batch 1] Lookup 1/5: 0123456789
[ProviderLookup] [Batch 1] Lookup 2/5: 0123456790
[ProviderLookup] [Batch 1] Lookup 3/5: 0123456791
[ProviderLookup] [Batch 1] Lookup 4/5: 0123456792
[ProviderLookup] [Batch 1] Lookup 5/5: 0123456793
[ProviderLookup] [Batch 1] Closing browser after 5 lookups
[ProviderLookup] [Batch 1] Complete: 5 successful, 0 failed (100% success rate)
[ProviderLookup] Processing batch 2 with 5 lookups
[ProviderLookup] [Batch 2] Created browser for 5 lookups
[ProviderLookup] [Batch 2] Lookup 1/5: 0123456794
[ProviderLookup] [Batch 2] Lookup 2/5: 0123456795
[ProviderLookup] [Batch 2] Lookup 3/5: 0123456796
[ProviderLookup] [Batch 2] Lookup 4/5: 0123456797
[ProviderLookup] [Batch 2] Lookup 5/5: 0123456798
[ProviderLookup] [Batch 2] Closing browser after 5 lookups
[ProviderLookup] [Batch 2] Complete: 5 successful, 0 failed (100% success rate)
```

**✅ Success Criteria:**
- See "Created browser" exactly 2 times (not 10 times)
- See "Closing browser" exactly 2 times (not 10 times)
- Each batch shows 5 lookups with same browser

**❌ Failure Indicators:**
- "Created browser" appears 10 times → Still broken
- "Closing browser" appears 10 times → Still broken
- Each lookup shows separate browser creation → Still broken

### Test 2: Verify Cache Works
Run the same scrape twice:

**First Run:**
```
[ProviderLookup] Starting lookup for 10 phone numbers
[ProviderLookup] Found 0 results in cache
[ProviderLookup] Need to lookup 10 numbers (not in cache)
... (processes all 10 lookups)
[ProviderLookup] Cached 10 new provider lookups
```

**Second Run (Immediate):**
```
[ProviderLookup] Starting lookup for 10 phone numbers
[ProviderLookup] Found 10 results in cache
[ProviderLookup] All results found in cache, no lookups needed!
[ProviderLookup] Completed all lookups. Total results: 10 (10 from cache, 0 new)
```

**✅ Success Criteria:**
- Second run completes instantly (< 1 second)
- No browser creation on second run
- All results from cache

## Comprehensive Test (30 minutes)

### Test 3: 30+ Lookups Without Captcha
Run a scrape with 35 phone numbers:

**Expected Behavior:**
- Batch 1-6: Complete successfully (30 lookups)
- Batch 7: May encounter captcha (31st lookup, 7th browser)

**Console Output Pattern:**
```
[ProviderLookup] Processing batch 1 with 5 lookups
[ProviderLookup] [Batch 1] Created browser for 5 lookups
... 5 lookups ...
[ProviderLookup] [Batch 1] Closing browser after 5 lookups

[ProviderLookup] Processing batch 2 with 5 lookups
[ProviderLookup] [Batch 2] Created browser for 5 lookups
... 5 lookups ...
[ProviderLookup] [Batch 2] Closing browser after 5 lookups

... (repeat for batches 3-6) ...

[ProviderLookup] Processing batch 7 with 5 lookups
[ProviderLookup] [Batch 7] Created browser for 5 lookups
... may encounter captcha here ...
```

**✅ Success Criteria:**
- First 30 lookups complete without captcha
- 6 browser instances created for first 30 lookups
- Timing: ~30-40 seconds total (6 batches × 5-7 seconds each)

**Timing Breakdown:**
- Batch 1: ~5 seconds (5 lookups × 500ms + delays)
- Inter-batch delay: 2-5 seconds
- Batch 2: ~5 seconds
- Inter-batch delay: 2-5 seconds
- ... (repeat)
- Total: ~30-40 seconds for 30 lookups

### Test 4: Adaptive Batch Sizing
Simulate failures to test adaptive sizing:

**Setup:**
- Use invalid phone numbers to trigger failures
- Mix valid and invalid numbers

**Expected Behavior:**
```
[ProviderLookup] [Batch 1] Complete: 2 successful, 3 failed (40% success rate)
[BatchManager] Reducing batch size due to low success rate
[ProviderLookup] Processing batch 2 with 4 lookups
[ProviderLookup] [Batch 2] Complete: 1 successful, 3 failed (25% success rate)
[BatchManager] Reducing batch size due to low success rate
[ProviderLookup] Processing batch 3 with 3 lookups
```

**✅ Success Criteria:**
- Batch size reduces from 5 → 4 → 3 on failures
- Batch size never exceeds 5
- Batch size never goes below 3 (minBatchSize)

### Test 5: Retry Queue
Check that failed lookups are enqueued:

**Database Query:**
```sql
SELECT * FROM retry_queue WHERE type = 'lookup' ORDER BY created_at DESC LIMIT 10;
```

**Expected:**
- Failed lookups appear in retry_queue table
- Each entry has phone number in data field
- Attempts counter starts at 0

## Performance Benchmarks

### Expected Timings

| Lookups | Batches | Expected Time | Browser Instances |
|---------|---------|---------------|-------------------|
| 5       | 1       | 5-7 seconds   | 1                 |
| 10      | 2       | 12-17 seconds | 2                 |
| 15      | 3       | 19-27 seconds | 3                 |
| 20      | 4       | 26-37 seconds | 4                 |
| 25      | 5       | 33-47 seconds | 5                 |
| 30      | 6       | 40-57 seconds | 6                 |

**Formula:**
```
Time = (Batches × 5 seconds) + ((Batches - 1) × 3.5 seconds avg inter-batch delay)
```

### Cache Performance

| Lookups | First Run | Second Run (Cached) | Speedup |
|---------|-----------|---------------------|---------|
| 10      | 12-17s    | < 1s                | 12-17x  |
| 30      | 40-57s    | < 1s                | 40-57x  |
| 100     | 140-200s  | < 1s                | 140-200x|

## Troubleshooting

### Issue: Captcha appears on 6th lookup
**Diagnosis:** Browser is still being created per lookup
**Check:** Count "Created browser" in logs - should be 2 for 10 lookups, not 10
**Fix:** Verify the fix was applied correctly to provider-lookup-service.ts

### Issue: Lookups are very slow
**Diagnosis:** Inter-batch delay may be too long
**Check:** Look for "Waiting for inter-batch delay" in logs
**Fix:** Adjust interBatchDelay in BatchManager config (default: [2000, 5000])

### Issue: Cache not working
**Diagnosis:** Cache may not be enabled or database connection issue
**Check:** Look for "Cached X new provider lookups" in logs
**Fix:** Verify database connection and provider_cache table exists

### Issue: Batch size not adapting
**Diagnosis:** Success rate may be above threshold
**Check:** Look for "Reducing batch size" in logs
**Fix:** Lower successRateThreshold in BatchManager config (default: 0.5)

## Monitoring Commands

### Watch Console Logs
```bash
cd hosted-smart-cost-calculator
npm run dev | grep -E "\[ProviderLookup\]|\[BatchManager\]"
```

### Check Cache Hit Rate
```sql
-- Run before and after scrape
SELECT COUNT(*) as cached_count FROM provider_cache;
```

### Check Retry Queue
```sql
-- Check failed lookups
SELECT COUNT(*) as failed_count FROM retry_queue WHERE type = 'lookup';

-- Check retry attempts
SELECT phone_number, attempts, created_at 
FROM retry_queue 
WHERE type = 'lookup' 
ORDER BY created_at DESC 
LIMIT 10;
```

### Monitor Browser Instances
```bash
# On Linux/Mac
ps aux | grep chromium | wc -l

# On Windows
tasklist | findstr chrome | find /c /v ""
```

**Expected:** 0-1 browser instances (1 during batch processing, 0 between batches)

## Success Checklist

- [ ] 10 lookups create 2 browsers (not 10)
- [ ] 30 lookups complete without captcha
- [ ] Cache works (second run instant)
- [ ] Batch size adapts on failures (5 → 4 → 3)
- [ ] Failed lookups enqueued to retry_queue
- [ ] Timing matches benchmarks (±20%)
- [ ] No browser instances left running after scrape
- [ ] Console logs show correct browser lifecycle

## Deployment Checklist

- [ ] All tests pass locally
- [ ] Console logs verified
- [ ] Cache verified
- [ ] Retry queue verified
- [ ] Performance benchmarks met
- [ ] Git commit with clear message
- [ ] Push to repository
- [ ] Deploy to VPS
- [ ] Test on VPS with real data
- [ ] Monitor for 24 hours

## Rollback Plan

If issues occur after deployment:

1. **Immediate Rollback:**
   ```bash
   git revert HEAD
   git push
   ```

2. **Alternative: Use Old Method:**
   - Temporarily disable BatchManager
   - Use `processBatchWithNewBrowser` method directly
   - This is the old working method (kept for backward compatibility)

3. **Debug:**
   - Check console logs for browser creation count
   - Verify cache is working
   - Check retry queue for failed lookups
   - Monitor captcha occurrence

## Contact

If you need help with testing or encounter issues:
1. Check console logs first
2. Verify browser creation count
3. Check cache hit rate
4. Review this testing guide
5. Check PROVIDER_LOOKUP_FIX_COMPLETE.md for detailed explanation

The fix is complete and ready for testing!
