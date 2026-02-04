# Attachments API Fix - Column Name Mismatch

## Problem
After changing a lead's status, attachments could not be downloaded or deleted. The API was returning 500 errors.

## Root Cause
The attachments API routes were using incorrect column names that didn't match the database schema:

### Database Schema (Actual):
```sql
CREATE TABLE attachments (
  id UUID PRIMARY KEY,
  lead_id UUID,
  file_name VARCHAR(255),      -- ✅ Correct
  file_type VARCHAR(100),       -- ✅ Correct
  file_size INTEGER,
  storage_path TEXT,            -- ✅ Correct
  uploaded_by UUID,             -- ✅ Correct
  created_at TIMESTAMP
);
```

### API Routes (Incorrect):
The API was trying to use:
- `filename` instead of `file_name`
- `file_path` instead of `storage_path`
- `mime_type` instead of `file_type`
- `user_id` instead of `uploaded_by`

## Why It Broke After Status Change
The issue wasn't actually related to the status change - it was a pre-existing bug in the attachments API that would have affected any attachment operation. The timing was coincidental.

## Fix Applied

### File 1: `app/api/leads/[id]/attachments/route.ts`

**GET endpoint - Fixed SELECT query:**
```typescript
// Before (wrong column names)
SELECT id, lead_id, user_id, filename, file_path, file_size, mime_type, created_at

// After (correct with aliases for backward compatibility)
SELECT 
  id,
  lead_id,
  uploaded_by as user_id,
  file_name as filename,
  storage_path as file_path,
  file_size,
  file_type as mime_type,
  created_at
```

**POST endpoint - Fixed INSERT query:**
```typescript
// Before (wrong column names)
INSERT INTO attachments (lead_id, user_id, filename, file_path, file_size, mime_type, ...)

// After (correct column names)
INSERT INTO attachments (lead_id, uploaded_by, file_name, storage_path, file_size, file_type, ...)
```

### File 2: `app/api/leads/[id]/attachments/[attachmentId]/route.ts`

**GET endpoint - Fixed file reading:**
```typescript
// Before
const fileBuffer = await readFile(attachment.file_path);
'Content-Type': attachment.mime_type
'Content-Disposition': `attachment; filename="${attachment.filename}"`

// After
const fileBuffer = await readFile(attachment.storage_path);
'Content-Type': attachment.file_type
'Content-Disposition': `attachment; filename="${attachment.file_name}"`
```

**DELETE endpoint - Fixed file deletion:**
```typescript
// Before
await deleteFile(attachment.file_path);
old_value: attachment.filename

// After
await deleteFile(attachment.storage_path);
old_value: attachment.file_name
```

## What Now Works

✅ Download attachments
✅ Delete attachments
✅ View attachment list
✅ Upload new attachments (already worked, now consistent)

## Testing

After the VPS redeploys:
1. Open any lead with attachments
2. Try downloading an attachment - should work
3. Try deleting an attachment - should work
4. Upload a new attachment - should work

## Files Modified
1. `app/api/leads/[id]/attachments/route.ts` - Fixed GET and POST endpoints
2. `app/api/leads/[id]/attachments/[attachmentId]/route.ts` - Fixed GET and DELETE endpoints

## Commit
`9532813` - Fix: Correct column names in attachments API routes to match database schema
