# Deployment Checklist - PDF Rasterization Fix

## Pre-Deployment Verification

### ✅ Code Changes
- [x] Added `pdf-lib` import to `html-to-pdf/route.ts`
- [x] Implemented page rasterization logic
- [x] Maintained all existing functionality
- [x] No TypeScript errors
- [x] No breaking changes

### ✅ Dependencies
- [x] `pdf-lib` already installed (v1.17.1)
- [x] No new packages required

## Deployment Steps

### 1. Commit Changes
```bash
git add hosted-smart-cost-calculator/app/api/calculator/html-to-pdf/route.ts
git commit -m "Fix: Implement PDF rasterization for consistent shadow rendering across all viewers"
```

### 2. Push to Repository
```bash
git push origin main
```

### 3. Deploy to VPS (Dokploy)
- Dokploy will automatically detect the changes
- Wait for build to complete
- Verify deployment success

### 4. Restart Application
**IMPORTANT:** Restart the application on your VPS to apply changes
```bash
# Via Dokploy dashboard or SSH
pm2 restart smart-cost-calculator
# OR
docker restart <container-name>
```

## Post-Deployment Testing

### Test 1: Generate Normal Proposal
1. Open calculator
2. Configure a normal proposal
3. Select "Generate Proposal"
4. Verify PDF generates successfully
5. Check file size (~1-1.5 MB)

### Test 2: Generate Comparative Proposal
1. Configure comparative proposal
2. Generate PDF
3. Verify all pages render correctly
4. Check file size (~1.5-2 MB)

### Test 3: Generate Full Feature Proposal
1. Select ALL feature pages:
   - Telephones
   - Network
   - Printing
   - CCTV
   - Access Control
   - Signal Enhancement
   - Computer Solutions
2. Generate PDF
3. Verify all pages captured
4. Check file size (~3-4 MB)

### Test 4: Cross-Viewer Compatibility
Download one of the generated PDFs and open in:
- [ ] Adobe Acrobat Reader
- [ ] Foxit Reader
- [ ] Microsoft Edge PDF viewer
- [ ] Chrome PDF viewer
- [ ] Mobile device (iOS/Android)

**Verify:** Shadows render correctly (no gray boxes)

### Test 5: Email Delivery
1. Attach generated PDF to email
2. Send to test email addresses:
   - [ ] Gmail account
   - [ ] Outlook account
   - [ ] Corporate email
3. Open attachments and verify rendering

### Test 6: Lead Attachment
1. Generate proposal with lead attachment
2. Verify PDF attaches to lead correctly
3. Check interactions log
4. Download from lead and verify

## Success Criteria

### ✅ All Tests Pass
- PDF generates without errors
- All pages captured correctly
- Shadows render consistently across viewers
- File sizes within acceptable range (1-4 MB)
- Email delivery works
- Lead attachment works

### ✅ No Regressions
- Existing proposals still work
- Calculator functions normally
- No console errors
- No performance issues

## Rollback Plan (If Issues Occur)

### Option 1: Quick Rollback
```bash
git revert HEAD
git push origin main
```

### Option 2: Restore Previous Version
```bash
git checkout <previous-commit-hash> hosted-smart-cost-calculator/app/api/calculator/html-to-pdf/route.ts
git commit -m "Rollback: Restore vector PDF generation"
git push origin main
```

## Monitoring

### Check Logs
```bash
# View application logs
pm2 logs smart-cost-calculator
# OR
docker logs <container-name>
```

### Look For
- `[HTML-to-PDF] Generating rasterized PDF...`
- `[HTML-to-PDF] Found X pages to render`
- `[HTML-to-PDF] Page X/Y rendered successfully`
- `[HTML-to-PDF] Rasterized PDF generated successfully`

### Error Indicators
- PDF generation failures
- Timeout errors
- Memory issues
- File size anomalies

## Support Information

### If Issues Arise
1. Check application logs
2. Verify Puppeteer/Chromium is running
3. Check disk space for uploads directory
4. Verify network connectivity for external resources
5. Test with minimal proposal first (no features)

### Contact
- Check `PDF_RASTERIZATION_IMPLEMENTATION.md` for technical details
- Review error logs for specific issues
- Test locally if needed

---

## Deployment Status

- [ ] Code committed
- [ ] Pushed to repository
- [ ] Deployed to VPS
- [ ] Application restarted
- [ ] Test 1: Normal proposal ✅
- [ ] Test 2: Comparative proposal ✅
- [ ] Test 3: Full features ✅
- [ ] Test 4: Cross-viewer ✅
- [ ] Test 5: Email delivery ✅
- [ ] Test 6: Lead attachment ✅

**Deployment Date:** _____________
**Deployed By:** _____________
**Status:** _____________
