# Attachments System Implementation

## Overview

This document describes the implementation of the file attachments system for lead management, allowing users to upload, download, and manage files associated with leads.

## Features Implemented

### 1. File Storage Service (`lib/storage.ts`)

**Purpose**: Handle file operations on the local filesystem

**Key Functions**:
- `initializeStorage()`: Creates upload directory if it doesn't exist
- `saveFile(file, leadId)`: Saves uploaded file with unique filename
- `readFile(storagePath)`: Reads file from storage for download
- `deleteFile(storagePath)`: Removes file from storage
- `fileExists(storagePath)`: Checks if file exists

**Storage Location**: `uploads/attachments/` (configurable via `UPLOAD_DIR` env variable)

**File Naming**: `{leadId}_{uuid}{extension}` for uniqueness

### 2. API Routes

#### GET `/api/leads/[id]/attachments`
- Retrieves all attachments for a specific lead
- Returns array of attachment metadata
- Ordered by creation date (newest first)

#### POST `/api/leads/[id]/attachments`
- Uploads a new file attachment
- Accepts multipart form data with:
  - `file`: The file to upload (required)
  - `description`: Optional description text
- Validates file size (max 10MB)
- Stores file and creates database record
- Logs interaction for audit trail

#### GET `/api/leads/[id]/attachments/[attachmentId]`
- Downloads a specific attachment
- Returns file with appropriate headers
- Sets Content-Disposition for download

#### DELETE `/api/leads/[id]/attachments/[attachmentId]`
- Deletes attachment file and database record
- Logs interaction for audit trail
- Requires authentication

### 3. Database Schema

**Table**: `attachments`

```sql
CREATE TABLE attachments (
  id UUID PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  storage_path TEXT NOT NULL,
  description TEXT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
- `idx_attachments_lead_id` on `lead_id` for fast lookups

### 4. UI Component (`components/leads/AttachmentsSection.tsx`)

**Features**:
- Modal interface for managing attachments
- File upload with drag-and-drop support
- Optional description field
- File size validation (10MB limit)
- List of existing attachments with:
  - File name, size, and upload date
  - Download button
  - Delete button (with confirmation)
- Real-time updates after upload/delete
- Error handling and user feedback
- Loading states

**Design**:
- Glassmorphism styling consistent with app design
- Responsive layout
- Accessible controls
- Clear visual feedback

### 5. Integration

**LeadDetailsModal Updates**:
- Added "Manage Attachments" button in lead details
- Opens AttachmentsSection modal
- Integrated with existing notes and reminders sections

## File Size Limits

- **Maximum file size**: 10MB per file
- Validated on both client and server side
- Clear error messages for oversized files

## Security Considerations

1. **Authentication**: All attachment operations require valid JWT token
2. **Authorization**: Users can only access attachments for leads they have permission to view
3. **File Validation**: File size limits prevent abuse
4. **Path Security**: Storage paths use UUIDs to prevent path traversal attacks
5. **Cascade Deletion**: Attachments are automatically deleted when lead is deleted

## Interaction Logging

All attachment operations are logged to the `interactions` table:

- `attachment_added`: When file is uploaded
- `attachment_deleted`: When file is removed

Logs include:
- User ID
- Lead ID
- Interaction type
- File name
- Metadata (file size, etc.)
- Timestamp

## Storage Considerations

### Local Filesystem Storage

**Pros**:
- Simple implementation
- No external dependencies
- Fast access
- No additional costs

**Cons**:
- Not suitable for multi-server deployments
- Requires backup strategy
- Limited by disk space

### Future: S3-Compatible Storage

For production deployments with multiple servers, consider migrating to S3-compatible storage:

1. Install AWS SDK: `npm install @aws-sdk/client-s3`
2. Update `lib/storage.ts` to use S3 operations
3. Configure S3 bucket and credentials
4. Update environment variables

## Environment Variables

```env
# Optional: Custom upload directory (defaults to ./uploads/attachments)
UPLOAD_DIR=/path/to/uploads/attachments
```

## Testing

### Manual Testing Checklist

- [ ] Upload file successfully
- [ ] Upload file with description
- [ ] Upload file exceeding 10MB (should fail)
- [ ] Download uploaded file
- [ ] Delete attachment
- [ ] View attachments list
- [ ] Upload multiple files
- [ ] Verify files are stored correctly
- [ ] Verify database records are created
- [ ] Verify interactions are logged
- [ ] Test with different file types (PDF, images, documents)

### API Testing

```bash
# Upload attachment
curl -X POST http://localhost:3000/api/leads/{leadId}/attachments \
  -H "Authorization: Bearer {token}" \
  -F "file=@/path/to/file.pdf" \
  -F "description=Important document"

# Get attachments
curl http://localhost:3000/api/leads/{leadId}/attachments \
  -H "Authorization: Bearer {token}"

# Download attachment
curl http://localhost:3000/api/leads/{leadId}/attachments/{attachmentId} \
  -H "Authorization: Bearer {token}" \
  -o downloaded_file.pdf

# Delete attachment
curl -X DELETE http://localhost:3000/api/leads/{leadId}/attachments/{attachmentId} \
  -H "Authorization: Bearer {token}"
```

## Migration

Run the migration to ensure the attachments table exists:

```bash
npm run migrate
```

The migration file `002_add_attachments.sql` creates the table if it doesn't exist.

## Usage Example

1. Open a lead in the Lead Details modal
2. Click "Manage Attachments" button
3. Click "Choose File" or drag file to upload area
4. Optionally add a description
5. File uploads automatically
6. View, download, or delete attachments as needed

## Requirements Satisfied

✅ **Requirement 5.22**: WHEN attachments are uploaded THEN the system SHALL store files in local storage or S3-compatible storage with file_name, file_type, file_size, storage_path, and description

✅ **Property 47**: Attachment metadata persistence - For any uploaded attachment, all metadata (file_name, file_type, file_size, storage_path, description, uploaded_by) should be persisted

## Future Enhancements

1. **Drag-and-drop upload**: Add drag-and-drop zone for easier uploads
2. **Multiple file upload**: Allow uploading multiple files at once
3. **File preview**: Show thumbnails for images, preview for PDFs
4. **File type restrictions**: Limit to specific file types if needed
5. **Virus scanning**: Integrate antivirus scanning for uploaded files
6. **Compression**: Automatically compress large files
7. **Cloud storage**: Migrate to S3 for production deployments
8. **Attachment search**: Search attachments by filename or description
9. **Attachment categories**: Categorize attachments (contract, invoice, etc.)
10. **Version control**: Track file versions and changes

## Troubleshooting

### Upload fails with "Failed to save file"
- Check that upload directory exists and has write permissions
- Verify disk space is available
- Check file size is under 10MB limit

### Download returns 404
- Verify attachment exists in database
- Check that file exists in storage directory
- Verify storage_path is correct

### Files not persisting after server restart
- Ensure upload directory is outside of temporary directories
- Configure proper volume mounts in Docker
- Verify backup strategy includes upload directory

## Backup Strategy

For production deployments:

1. **Database backups**: Include `attachments` table in regular backups
2. **File backups**: Backup the upload directory regularly
3. **Sync strategy**: Keep database and files in sync
4. **Restore testing**: Regularly test restore procedures

## Performance Considerations

- Files are served directly from filesystem (fast)
- Database queries use indexed lead_id for fast lookups
- Consider CDN for frequently accessed files
- Monitor disk usage and implement cleanup policies
- Consider file size limits based on available storage

## Compliance

- Ensure uploaded files comply with data retention policies
- Implement file encryption if handling sensitive data
- Log all file access for audit trails
- Consider GDPR implications for file storage
