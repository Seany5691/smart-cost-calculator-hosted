# Notes & Reminders Authentication Fix

## Issue
The AddNoteModal and AddReminderModal were getting 401 Unauthorized errors when trying to create notes and reminders because they weren't including the Authorization header in their API requests.

## Root Cause
The modals were making API calls without the Bearer token that the backend requires for authentication via `verifyAuth()` middleware.

## Solution
Updated both modals to:
1. Get the auth token from localStorage ('auth-storage')
2. Parse the token correctly (checking both `data.state?.token` and `data.token`)
3. Include the Authorization header in all API requests
4. Throw an error if not authenticated

## Changes Made

### AddNoteModal.tsx
- Added token retrieval from localStorage
- Added Authorization header to POST request
- Added authentication check before making request
- Matches the pattern used in LaterStageModal

### AddReminderModal.tsx
- Added token retrieval from localStorage
- Added Authorization header to POST request
- Added authentication check before making request
- Fixed request body to match API expectations:
  - Changed `reminderDate` to `reminder_date`
  - Changed `reminderTime` to `reminder_time`
  - Added required fields: `reminder_type`, `priority`, `status`, `completed`
- Matches the pattern used in LaterStageModal

## API Endpoint Requirements

### POST /api/leads/[id]/notes
**Required Headers:**
- `Content-Type: application/json`
- `Authorization: Bearer <token>`

**Required Body:**
```json
{
  "content": "string"
}
```

### POST /api/leads/[id]/reminders
**Required Headers:**
- `Content-Type: application/json`
- `Authorization: Bearer <token>`

**Required Body:**
```json
{
  "message": "string",
  "reminder_date": "YYYY-MM-DD",
  "reminder_time": "HH:MM",
  "reminder_type": "task|call|email|meeting|followup|quote|document",
  "priority": "high|medium|low",
  "status": "pending|completed|snoozed",
  "completed": boolean
}
```

## Testing
- ✅ Notes can now be created successfully
- ✅ Reminders can now be created successfully
- ✅ Both modals handle authentication errors gracefully
- ✅ Created items appear immediately in the dropdown
- ✅ No TypeScript errors

## Status: ✅ FIXED

Both modals now work correctly with proper authentication, matching the pattern used in other working components like LaterStageModal.
