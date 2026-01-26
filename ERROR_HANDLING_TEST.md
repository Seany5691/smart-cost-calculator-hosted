# Error Handling and Logging - Manual Test Guide

This guide provides manual tests to verify the error handling and logging implementation.

## Prerequisites

1. Ensure the database migration has been run:
```bash
npm run migrate
```

2. Set environment variables in `.env`:
```env
LOG_LEVEL=debug
ADMIN_NOTIFICATION_EMAILS=admin@example.com
```

3. Start the development server:
```bash
npm run dev
```

## Test 1: Structured Logging

### Test Debug Logging
```typescript
// In any API route or service file
import { logger } from '@/lib/logger';

logger.debug('This is a debug message', { userId: '123' }, { data: 'test' });
logger.info('This is an info message', { userId: '123' });
logger.warn('This is a warning message', { userId: '123' });
logger.error('This is an error message', new Error('Test error'), { userId: '123' });
```

**Expected Result:**
- All messages should appear in console with structured JSON format
- Each log should include timestamp, level, message, context, and metadata
- Debug messages only appear when LOG_LEVEL=debug

### Test Child Logger
```typescript
const userLogger = logger.child({ userId: '123', username: 'john' });
userLogger.info('User action performed');
```

**Expected Result:**
- Log should include both userId and username in context

## Test 2: API Error Handling

### Test Validation Error
```bash
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Result:**
- Status code: 400
- Response body:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Missing required fields: ...",
    "details": { ... },
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Test Authentication Error
```bash
curl http://localhost:3000/api/admin/critical-errors
```

**Expected Result:**
- Status code: 401
- Response body:
```json
{
  "error": {
    "code": "AUTHENTICATION_REQUIRED",
    "message": "Authentication required",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Test Not Found Error
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/leads/nonexistent-id
```

**Expected Result:**
- Status code: 404
- Response body:
```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Lead not found",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

## Test 3: Critical Error Notifications

### Test Critical Error Logging
```typescript
// In any API route
import { logger } from '@/lib/logger';

logger.critical(
  'Test critical error',
  new Error('This is a test'),
  { userId: '123', username: 'test' },
  { testData: 'value' }
);
```

**Expected Result:**
1. Console should show critical error alert (in development)
2. Database should have new entry in `critical_errors` table
3. Log message should indicate notification channels used

### Verify Database Entry
```sql
SELECT * FROM critical_errors ORDER BY notified_at DESC LIMIT 1;
```

**Expected Result:**
- New row with message, error_details, context, metadata
- acknowledged = false
- notified_at = current timestamp

### Test Get Unacknowledged Errors
```bash
# Login as admin first
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"Camryn","password":"Elliot6242!"}'

# Get token from response, then:
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/admin/critical-errors
```

**Expected Result:**
- Status code: 200
- Response body: Array of unacknowledged critical errors
```json
[
  {
    "id": "...",
    "message": "Test critical error",
    "errorDetails": { ... },
    "context": { ... },
    "metadata": { ... },
    "notifiedAt": "2024-01-15T10:30:00.000Z",
    "acknowledged": false
  }
]
```

### Test Acknowledge Error
```bash
curl -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/admin/critical-errors/$ERROR_ID
```

**Expected Result:**
- Status code: 200
- Response body:
```json
{
  "success": true,
  "message": "Critical error acknowledged"
}
```

### Verify Acknowledgment
```sql
SELECT * FROM critical_errors WHERE id = '$ERROR_ID';
```

**Expected Result:**
- acknowledged = true
- acknowledged_by = admin user ID
- acknowledged_at = current timestamp

### Test Error Statistics
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/critical-errors?stats=true&days=7"
```

**Expected Result:**
- Status code: 200
- Response body:
```json
{
  "total": 5,
  "unacknowledged": 2,
  "byDay": [
    { "date": "2024-01-15", "count": 3 },
    { "date": "2024-01-14", "count": 2 }
  ]
}
```

## Test 4: Error Handling in Existing Routes

### Test Health Check with Error Handling
```bash
# Stop database to trigger error
# Then:
curl http://localhost:3000/api/health
```

**Expected Result:**
- Status code: 503
- Response body includes error information
- Console shows error log with structured format

## Test 5: Validation Helpers

### Test Required Fields Validation
```typescript
import { validateRequiredFields } from '@/lib/errors';

try {
  validateRequiredFields({ name: 'John' }, ['name', 'email', 'phone']);
} catch (error) {
  console.log(error); // Should be ValidationError with details
}
```

**Expected Result:**
- ValidationError thrown
- Error message: "Missing required fields: email, phone"
- Error details: { email: "email is required", phone: "phone is required" }

### Test Email Validation
```typescript
import { validateEmail } from '@/lib/errors';

try {
  validateEmail('invalid-email');
} catch (error) {
  console.log(error); // Should be ValidationError
}
```

**Expected Result:**
- ValidationError thrown
- Error message: "Invalid email format"

### Test Enum Validation
```typescript
import { validateEnum } from '@/lib/errors';

try {
  validateEnum('status', 'invalid', ['new', 'leads', 'working']);
} catch (error) {
  console.log(error); // Should be ValidationError
}
```

**Expected Result:**
- ValidationError thrown
- Error message: "status must be one of: new, leads, working"

## Test 6: Integration Test

### Complete Error Flow Test
1. Make an API request that triggers a critical error
2. Verify error is logged to console
3. Verify error is saved to database
4. Login as admin
5. Fetch unacknowledged errors
6. Acknowledge the error
7. Verify error is marked as acknowledged

**Expected Result:**
- All steps complete successfully
- Error flows through entire system
- Admin can view and acknowledge errors

## Verification Checklist

- [ ] Structured logging works with all log levels
- [ ] Child loggers include default context
- [ ] API errors return appropriate status codes
- [ ] Error responses have consistent format
- [ ] Validation errors include field-specific details
- [ ] Critical errors are logged to database
- [ ] Critical errors trigger console alerts (dev mode)
- [ ] Admins can view unacknowledged errors
- [ ] Admins can acknowledge errors
- [ ] Error statistics are calculated correctly
- [ ] Validation helpers work correctly
- [ ] Health check uses error handling
- [ ] All requirements (13.1-13.5) are validated

## Troubleshooting

### Logs not appearing
- Check LOG_LEVEL environment variable
- Ensure logger is imported correctly
- Verify console output is not filtered

### Database errors
- Ensure migration has been run
- Check database connection
- Verify critical_errors table exists

### API errors not formatted correctly
- Ensure handleApiError is used in catch blocks
- Check that error classes are imported
- Verify NextResponse is returned

### Critical errors not saved
- Check database connection
- Verify critical_errors table exists
- Check console for notification service errors

## Success Criteria

All tests pass and:
1. Logs are structured with timestamp, level, message, context, error, metadata
2. API errors return appropriate status codes (400, 401, 403, 404, 409, 422, 500)
3. Error responses have consistent format with code, message, details, timestamp
4. Critical errors are saved to database and can be viewed/acknowledged by admins
5. Validation helpers correctly validate input and throw appropriate errors
6. Error handling integrates seamlessly with existing code
