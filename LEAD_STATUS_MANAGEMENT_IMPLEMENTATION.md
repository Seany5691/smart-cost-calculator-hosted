# Lead Status Management Implementation

## Overview

This document describes the implementation of lead status management functionality for the VPS-Hosted Smart Cost Calculator application. The implementation satisfies requirements 5.4, 5.5, 5.6, 5.7, and 5.28 from the requirements document.

## Requirements Implemented

### Requirement 5.4: Status Transitions
**Status**: ✅ Complete

The system supports transitions between all valid lead statuses:
- `new` - Newly created leads
- `leads` - Qualified leads
- `working` - Leads being actively worked
- `bad` - Leads that are not viable
- `later` - Leads to follow up later
- `signed` - Leads that have been converted to customers

**Implementation Location**: `app/api/leads/[id]/route.ts` (PUT endpoint)

### Requirement 5.5: Later Status Validation
**Status**: ✅ Complete

When a lead is moved to "later" status, the system requires a `date_to_call_back` to be set.

**Implementation Details**:
- **Backend Validation**: Lines 119-124 in `app/api/leads/[id]/route.ts`
  ```typescript
  if (status === 'later' && !dateToCallBack) {
    return NextResponse.json(
      { error: 'Date to call back is required for "later" status' },
      { status: 400 }
    );
  }
  ```

- **Frontend Validation**: Lines 213-224 in `components/leads/EditLeadModal.tsx`
  - Conditional rendering of date field with `required` attribute
  - Field only appears when status is "later"

### Requirement 5.6: Signed Status Validation
**Status**: ✅ Complete

When a lead is moved to "signed" status, the system requires a `dateSigned` to be set.

**Implementation Details**:
- **Backend Validation**: Lines 126-131 in `app/api/leads/[id]/route.ts`
  ```typescript
  if (status === 'signed' && !dateSigned) {
    return NextResponse.json(
      { error: 'Date signed is required for "signed" status' },
      { status: 400 }
    );
  }
  ```

- **Frontend Validation**: Lines 226-237 in `components/leads/EditLeadModal.tsx`
  - Conditional rendering of date field with `required` attribute
  - Field only appears when status is "signed"

### Requirement 5.7: Automatic Renumbering
**Status**: ✅ Complete

When a lead's status changes, the system automatically renumbers all leads within both the old and new status categories.

**Implementation Details**:
- **Renumbering Function**: Lines 17-38 in `app/api/leads/[id]/route.ts`
  ```typescript
  async function renumberLeads(status: string) {
    // Get all leads for this status sorted by provider priority
    const result = await pool.query(
      'SELECT id, provider FROM leads WHERE status = $1 ORDER BY provider, number',
      [status]
    );

    // Sort by provider priority
    const leads = result.rows.sort((a, b) => {
      const priorityA = getProviderPriority(a.provider);
      const priorityB = getProviderPriority(b.provider);
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      return 0;
    });

    // Update numbers sequentially
    for (let i = 0; i < leads.length; i++) {
      await pool.query(
        'UPDATE leads SET number = $1 WHERE id = $2',
        [i + 1, leads[i].id]
      );
    }
  }
  ```

- **Trigger Logic**: Lines 165-166 in `app/api/leads/[id]/route.ts`
  ```typescript
  // Renumber leads in both old and new status categories
  await renumberLeads(existingLead.status);
  await renumberLeads(status);
  ```

### Requirement 5.28: Provider Priority Sorting
**Status**: ✅ Complete

When leads are renumbered, they maintain provider priority sorting and receive sequential numbers within each status category.

**Provider Priority Order**:
1. Telkom (priority: 1)
2. Vodacom (priority: 2)
3. MTN (priority: 3)
4. Cell C (priority: 4)
5. Other (priority: 5)

**Implementation Details**:
- **Priority Mapping**: Lines 6-12 in `app/api/leads/[id]/route.ts`
  ```typescript
  const PROVIDER_PRIORITY: Record<string, number> = {
    'Telkom': 1,
    'Vodacom': 2,
    'MTN': 3,
    'Cell C': 4,
    'Other': 5
  };
  ```

- **Priority Function**: Lines 14-17 in `app/api/leads/[id]/route.ts`
  ```typescript
  function getProviderPriority(provider: string | null): number {
    if (!provider) return 5;
    return PROVIDER_PRIORITY[provider] || 5;
  }
  ```

## Additional Features Implemented

### Interaction Logging
The system logs all lead status changes for audit purposes:

```typescript
// Log status change
await pool.query(
  `INSERT INTO interactions (lead_id, user_id, interaction_type, old_value, new_value)
   VALUES ($1, $2, $3, $4, $5)`,
  [
    params.id,
    authResult.user.userId,
    'status_change',
    existingLead.status,
    status
  ]
);
```

### Activity Logging
Status changes are also logged to the activity log for dashboard display:

```typescript
// Log activity
await pool.query(
  `INSERT INTO activity_log (user_id, activity_type, entity_type, entity_id, metadata)
   VALUES ($1, $2, $3, $4, $5)`,
  [
    authResult.user.userId,
    'lead_status_changed',
    'lead',
    params.id,
    JSON.stringify({ 
      name: result.rows[0].name,
      old_status: existingLead.status,
      new_status: status
    })
  ]
);
```

### Callback Scheduling
When a callback date is set, the system logs the interaction:

```typescript
if (dateToCallBack && dateToCallBack !== existingLead.date_to_call_back) {
  await pool.query(
    `INSERT INTO interactions (lead_id, user_id, interaction_type, new_value)
     VALUES ($1, $2, $3, $4)`,
    [
      params.id,
      authResult.user.userId,
      'callback_scheduled',
      dateToCallBack
    ]
  );
}
```

## Testing

### Unit Tests
A comprehensive test suite was created at `__tests__/lib/lead-status-management.test.ts` with 16 tests covering:

1. **Status Transitions** (2 tests)
   - Validates all status values are supported
   - Verifies transitions between all statuses are allowed

2. **Later Status Validation** (3 tests)
   - Requires dateToCallBack for "later" status
   - Accepts valid dateToCallBack
   - Doesn't require dateToCallBack for other statuses

3. **Signed Status Validation** (3 tests)
   - Requires dateSigned for "signed" status
   - Accepts valid dateSigned
   - Doesn't require dateSigned for other statuses

4. **Provider Priority Sorting** (3 tests)
   - Assigns correct priority to each provider
   - Assigns priority 5 to null/unknown providers
   - Sorts leads by provider priority correctly

5. **Automatic Renumbering** (2 tests)
   - Renumbers leads sequentially within status
   - Maintains provider priority when renumbering

6. **Status Change Workflow** (3 tests)
   - Triggers renumbering when status changes
   - Doesn't trigger renumbering when status stays the same
   - Renumbers both old and new status categories

### Test Results
```
Test Suites: 1 passed, 1 total
Tests:       16 passed, 16 total
Snapshots:   0 total
Time:        0.751 s
```

## Files Modified

1. **`app/api/leads/[id]/route.ts`**
   - Added status validation for "later" and "signed" statuses
   - Implemented automatic renumbering on status changes
   - Added interaction and activity logging

2. **`lib/middleware.ts`**
   - Added `verifyAuth` function for authentication verification
   - Provides simpler alternative to `withAuth` for routes needing more control

3. **`lib/db.ts`**
   - Exported `pool` constant for direct use in API routes
   - Fixed variable naming for consistency

4. **`components/leads/EditLeadModal.tsx`**
   - Already had client-side validation for status-specific fields
   - Conditional rendering of date fields based on status

## Files Created

1. **`__tests__/lib/lead-status-management.test.ts`**
   - Comprehensive test suite for status management functionality
   - 16 tests covering all requirements

2. **`LEAD_STATUS_MANAGEMENT_IMPLEMENTATION.md`**
   - This documentation file

## API Endpoints

### PUT /api/leads/[id]
Updates a lead with validation for status-specific requirements.

**Request Body**:
```json
{
  "status": "later",
  "dateToCallBack": "2024-12-31",
  // ... other lead fields
}
```

**Validation Rules**:
- If `status` is "later", `dateToCallBack` is required
- If `status` is "signed", `dateSigned` is required

**Response**:
- Success: Returns updated lead object
- Error 400: Missing required fields for status
- Error 401: Unauthorized
- Error 404: Lead not found

### POST /api/leads/renumber
Manually triggers renumbering for a specific status category.

**Request Body**:
```json
{
  "status": "leads"
}
```

**Response**:
```json
{
  "message": "Successfully renumbered 15 leads in status \"leads\"",
  "count": 15
}
```

## Database Schema

The implementation uses the existing `leads` table with these relevant fields:

```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY,
  number INTEGER,
  status VARCHAR(50) CHECK (status IN ('new', 'leads', 'working', 'bad', 'later', 'signed')),
  provider VARCHAR(50),
  date_to_call_back DATE,
  date_signed DATE,
  -- ... other fields
);

CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_provider ON leads(provider);
```

## Conclusion

The lead status management implementation is complete and fully tested. All requirements (5.4, 5.5, 5.6, 5.7, and 5.28) have been satisfied with:

- ✅ Full status transition support
- ✅ Backend and frontend validation
- ✅ Automatic renumbering with provider priority
- ✅ Comprehensive logging and audit trail
- ✅ 16 passing unit tests
- ✅ No TypeScript diagnostics errors

The implementation is production-ready and maintains consistency with the existing codebase architecture.
