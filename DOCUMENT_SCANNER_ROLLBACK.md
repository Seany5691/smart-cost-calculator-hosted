# Document Scanner Rollback Procedure

## Overview

This document describes the rollback procedure for the document-scanner feature implementation. The feature is designed to be completely isolated with minimal changes to existing code, making rollback straightforward.

## Checkpoint Information

- **Branch**: `feature/document-scanner`
- **Checkpoint Commit**: `75df290` (chore: checkpoint before document-scanner implementation)
- **Date**: Created before any document-scanner implementation
- **Base Branch**: `main`

## Rollback Options

### Option 1: Discard All Changes (Complete Rollback)

If you need to completely abandon the document-scanner feature and return to the checkpoint state:

```bash
# Switch to the feature branch
git checkout feature/document-scanner

# Reset to the checkpoint commit (discards all changes)
git reset --hard 75df290

# Or reset to main branch
git reset --hard main
```

### Option 2: Return to Main Branch

If you want to keep the feature branch but switch back to main:

```bash
# Switch back to main branch
git checkout main

# The feature branch remains intact for future work
```

### Option 3: Selective Rollback (Remove Specific Files)

If you need to remove only the document-scanner files while keeping other changes:

```bash
# Remove document-scanner components
rm -rf components/leads/DocumentScanner/

# Remove document-scanner utilities
rm -rf lib/documentScanner/

# Revert changes to AttachmentsSection (if modified)
git checkout main -- components/leads/AttachmentsSection.tsx

# Revert package.json changes (if browser-image-compression was added)
git checkout main -- package.json package-lock.json

# Commit the selective rollback
git add -A
git commit -m "rollback: remove document-scanner feature"
```

### Option 4: Create Backup Branch

Before making any changes, create a backup branch:

```bash
# Create backup of current state
git checkout -b feature/document-scanner-backup

# Return to feature branch
git checkout feature/document-scanner
```

## Files Modified by Document Scanner Feature

### New Files (Safe to Delete)
- `components/leads/DocumentScanner/` (entire directory)
- `lib/documentScanner/` (entire directory)
- `DOCUMENT_SCANNER_ROLLBACK.md` (this file)

### Modified Files (Requires Careful Rollback)
- `components/leads/AttachmentsSection.tsx` (added "Scan Document" button)
- `package.json` (added browser-image-compression dependency)
- `package-lock.json` (updated with new dependency)

## Verification After Rollback

After performing a rollback, verify the application works correctly:

1. **Check Git Status**
   ```bash
   git status
   ```

2. **Reinstall Dependencies** (if package.json was reverted)
   ```bash
   npm install
   ```

3. **Run Tests**
   ```bash
   npm test
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Test AttachmentsSection**
   - Open a lead detail page
   - Open the attachments modal
   - Verify file upload still works
   - Verify existing attachments display correctly

## Emergency Rollback (Production)

If the feature causes issues in production:

1. **Immediate Revert**
   ```bash
   # On main branch
   git revert <commit-hash-of-merge>
   
   # Push immediately
   git push origin main
   ```

2. **Deploy Previous Version**
   - Trigger deployment of the reverted commit
   - Monitor application logs
   - Verify attachments functionality works

3. **Notify Team**
   - Document the issue
   - Create incident report
   - Plan fix or alternative approach

## Prevention Measures

The document-scanner feature is designed with isolation in mind:

- ✅ All new code in separate directories
- ✅ Minimal changes to existing files
- ✅ No database schema changes
- ✅ No API endpoint modifications
- ✅ Feature can be disabled by removing button from AttachmentsSection
- ✅ Existing attachment functionality remains unchanged

## Support

If you encounter issues during rollback:

1. Check git log: `git log --oneline`
2. Review this document
3. Contact the development team
4. Preserve error messages and logs

## Notes

- The checkpoint commit (`75df290`) represents a clean state before any document-scanner work
- All document-scanner code is isolated and can be safely removed
- The feature does not modify any existing database tables or API endpoints
- Rollback should not affect any existing functionality
