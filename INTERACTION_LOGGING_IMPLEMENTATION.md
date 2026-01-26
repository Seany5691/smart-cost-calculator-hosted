# Interaction Logging Implementation

## Overview

This document describes the comprehensive interaction logging system implemented for the VPS-hosted Smart Cost Calculator. The system logs all lead interactions including status changes, notes, reminders, attachments, and general updates to provide a complete audit trail.

## Database Schema

The `interactions` table stores all lead interaction logs:

```sql
CREATE TABLE IF NOT EXISTS interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interaction_type VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_interactions_lead_id ON interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON interactions(created_at);
```

## Interaction Types

The system logs the following interaction types:

### Lead Operations
- **`lead_created`**: When a new lead is created
  - `new_value`: Initial status
  - `metadata`: `{ name, provider, town }`

- **`lead_updated`**: When a lead is updated
  - `old_value`: JSON of old lead data
  - `new_value`: JSON of new lead data
  - `metadata`: `{ fields_updated: string[] }`

- **`status_change`**: When a lead's status changes
  - `old_value`: Previous status
  - `new_value`: New status

- **`callback_scheduled`**: When a callback date is set
  - `new_value`: Callback date

### Note Operations
- **`note_added`**: When a note is added to a lead
  - `new_value`: Note content
  - `metadata`: `{ note_id }`

- **`note_updated`**: When a note is updated
  - `old_value`: Previous note content
  - `new_value`: New note content
  - `metadata`: `{ note_id }`

- **`note_deleted`**: When a note is deleted
  - `old_value`: Deleted note content
  - `metadata`: `{ note_id }`

### Reminder Operations
- **`reminder_created`**: When a reminder is created
  - `new_value`: Reminder title
  - `metadata`: `{ reminder_id, reminder_type, priority, due_date }`

- **`reminder_updated`**: When a reminder is updated
  - `new_value`: Reminder title
  - `metadata`: `{ reminder_id, updates }`

- **`reminder_completed`**: When a reminder is marked as completed
  - `new_value`: Reminder title
  - `metadata`: `{ reminder_id, updates }`

- **`reminder_deleted`**: When a reminder is deleted
  - `old_value`: Reminder title
  - `metadata`: `{ reminder_id }`

### Attachment Operations
- **`attachment_added`**: When an attachment is uploaded
  - `new_value`: File name
  - `metadata`: `{ attachment_id, file_type, file_size }`

- **`attachment_deleted`**: When an attachment is deleted
  - `old_value`: File name
  - `metadata`: `{ attachment_id }`

### Bulk Operations
- **`bulk_update`**: When multiple leads are updated at once
  - `new_value`: JSON of update fields
  - `metadata`: `{ lead_id, fields_updated }`

## API Endpoints

### Get Interactions for a Lead

**Endpoint**: `GET /api/leads/[id]/interactions`

**Description**: Retrieves all interactions for a specific lead, ordered by most recent first.

**Response**:
```json
{
  "interactions": [
    {
      "id": "uuid",
      "lead_id": "uuid",
      "user_id": "uuid",
      "interaction_type": "status_change",
      "old_value": "leads",
      "new_value": "working",
      "metadata": null,
      "created_at": "2024-01-15T10:30:00Z",
      "user_name": "John Doe",
      "username": "john"
    }
  ]
}
```

## Implementation Details

### Automatic Logging

Interaction logging is automatically triggered in the following API routes:

1. **Lead Creation** (`POST /api/leads`)
   - Logs `lead_created` interaction
   - Logs to `activity_log` table

2. **Lead Update** (`PUT /api/leads/[id]`)
   - Logs `lead_updated` interaction
   - Logs `status_change` if status changed
   - Logs `callback_scheduled` if callback date changed
   - Logs to `activity_log` for status changes

3. **Note Creation** (`POST /api/leads/[id]/notes`)
   - Logs `note_added` interaction

4. **Note Update** (`PUT /api/leads/[id]/notes/[noteId]`)
   - Logs `note_updated` interaction

5. **Note Deletion** (`DELETE /api/leads/[id]/notes/[noteId]`)
   - Logs `note_deleted` interaction

6. **Reminder Creation** (`POST /api/leads/[id]/reminders`)
   - Logs `reminder_created` interaction

7. **Reminder Update** (`PUT /api/leads/[id]/reminders/[reminderId]`)
   - Logs `reminder_updated` or `reminder_completed` interaction

8. **Reminder Deletion** (`DELETE /api/leads/[id]/reminders/[reminderId]`)
   - Logs `reminder_deleted` interaction

9. **Attachment Upload** (`POST /api/leads/[id]/attachments`)
   - Logs `attachment_added` interaction

10. **Attachment Deletion** (`DELETE /api/leads/[id]/attachments/[attachmentId]`)
    - Logs `attachment_deleted` interaction

11. **Bulk Update** (`POST /api/leads/bulk`)
    - Logs `bulk_update` interaction for each affected lead

### Error Handling

Interaction logging is designed to be non-blocking:
- Logging errors are caught and logged to console
- Failed interaction logs do not prevent the main operation from succeeding
- This ensures that the user experience is not affected by logging failures

### Example Code

```typescript
// Log an interaction
await pool.query(
  `INSERT INTO interactions (lead_id, user_id, interaction_type, old_value, new_value, metadata)
   VALUES ($1, $2, $3, $4, $5, $6)`,
  [
    leadId,
    userId,
    'status_change',
    'leads',
    'working',
    JSON.stringify({ additional_info: 'value' })
  ]
);
```

## Benefits

1. **Complete Audit Trail**: Every change to a lead is logged with timestamp and user information
2. **Accountability**: Track who made what changes and when
3. **Debugging**: Helps diagnose issues by reviewing the history of changes
4. **Compliance**: Provides evidence of actions taken for regulatory requirements
5. **Analytics**: Can analyze user behavior and lead lifecycle patterns

## Requirements Validation

This implementation satisfies **Requirement 5.23**:

> WHEN lead interactions are logged THEN the system SHALL record interaction_type (status_change, note_added, note_updated, note_deleted, lead_created, lead_updated, callback_scheduled, callback_completed), old_value, new_value, and metadata

**Property 48: Interaction logging completeness**
*For any* lead interaction (status change, note added/updated/deleted, lead created/updated, callback scheduled/completed), all required fields (interaction_type, old_value, new_value, metadata) should be logged
**Validates: Requirements 5.23**

## Testing

The interaction logging system is tested through:

1. **Unit Tests**: Verify that interaction logging code is present in all relevant API routes
2. **Integration Tests**: Test that interactions are correctly stored in the database
3. **Property Tests**: Verify that all interaction types are logged with required fields

See `__tests__/api/notes.test.ts` for examples of interaction logging tests.

## Future Enhancements

Potential improvements to the interaction logging system:

1. **Interaction History UI**: Display interaction history in the lead details modal
2. **Filtering**: Filter interactions by type, user, or date range
3. **Export**: Export interaction logs for specific leads or date ranges
4. **Notifications**: Send notifications based on specific interaction types
5. **Retention Policy**: Implement automatic cleanup of old interaction logs
6. **Performance**: Add caching for frequently accessed interaction logs

## Related Files

- Database Schema: `database/schema.sql`
- API Routes:
  - `app/api/leads/route.ts`
  - `app/api/leads/[id]/route.ts`
  - `app/api/leads/[id]/notes/route.ts`
  - `app/api/leads/[id]/notes/[noteId]/route.ts`
  - `app/api/leads/[id]/reminders/route.ts`
  - `app/api/leads/[id]/reminders/[reminderId]/route.ts`
  - `app/api/leads/[id]/attachments/route.ts`
  - `app/api/leads/[id]/attachments/[attachmentId]/route.ts`
  - `app/api/leads/[id]/interactions/route.ts` (new)
  - `app/api/leads/bulk/route.ts`
- Tests: `__tests__/api/notes.test.ts`
