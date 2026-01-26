# Error Handling and Logging Guide

This guide explains how to use the error handling and logging system implemented in the VPS-Hosted Smart Cost Calculator.

## Overview

The system provides three main components:

1. **Structured Logging** (`lib/logger.ts`) - Configurable logging with multiple levels
2. **API Error Handling** (`lib/errors.ts`) - Standardized error responses and validation
3. **Critical Error Notifications** (`lib/notifications.ts`) - Admin notifications for critical errors

## Structured Logging

### Basic Usage

```typescript
import { logger } from '@/lib/logger';

// Debug messages (only in development)
logger.debug('Processing request', { userId: '123' }, { requestData: data });

// Info messages
logger.info('User logged in', { userId: '123', username: 'john' });

// Warning messages
logger.warn('Rate limit approaching', { userId: '123' }, { requestCount: 95 });

// Error messages
logger.error('Database query failed', error, { userId: '123' }, { query: 'SELECT...' });

// Critical errors (triggers admin notifications)
logger.critical('Payment processing failed', error, { userId: '123' }, { amount: 1000 });
```

### Log Levels

- **debug**: Detailed debugging information (only logged when LOG_LEVEL=debug)
- **info**: General informational messages
- **warn**: Warning messages for potentially problematic situations
- **error**: Error messages for failures that don't require immediate attention
- **critical**: Critical errors that require immediate administrator attention

### Configuration

Set the minimum log level via environment variable:

```env
LOG_LEVEL=info  # Options: debug, info, warn, error, critical
```

### Child Loggers

Create child loggers with default context:

```typescript
const userLogger = logger.child({ userId: '123', username: 'john' });

// All logs from this logger will include the default context
userLogger.info('Action performed');  // Includes userId and username
```

## API Error Handling

### Error Classes

Use predefined error classes for common scenarios:

```typescript
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BusinessLogicError,
  DatabaseError,
} from '@/lib/errors';

// Validation error (400)
throw new ValidationError('Invalid input', {
  email: 'Email is required',
  phone: 'Invalid phone format',
});

// Authentication error (401)
throw new AuthenticationError('Invalid credentials');

// Authorization error (403)
throw new AuthorizationError('Admin access required');

// Not found error (404)
throw new NotFoundError('User');

// Conflict error (409)
throw new ConflictError('Email already exists');

// Business logic error (422)
throw new BusinessLogicError('Cannot move lead to signed without date');

// Database error (500)
throw new DatabaseError('Failed to connect to database');
```

### Handling Errors in API Routes

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    if (!body.email) {
      throw new ValidationError('Email is required', {
        email: 'Email field cannot be empty',
      });
    }
    
    // Process request
    const result = await processData(body);
    
    // Log success
    logger.info('Data processed successfully', { userId: body.userId });
    
    return NextResponse.json(result);
  } catch (error) {
    // Handle error with automatic logging and appropriate status codes
    return handleApiError(error, {
      userId: body?.userId,
      requestId: request.headers.get('x-request-id') || undefined,
    });
  }
}
```

### Validation Helpers

Use built-in validation helpers:

```typescript
import {
  validateRequiredFields,
  validateEmail,
  validatePhone,
  validateDate,
  validateEnum,
} from '@/lib/errors';

// Validate required fields
validateRequiredFields(data, ['name', 'email', 'phone']);

// Validate email format
validateEmail(data.email);

// Validate phone format
validatePhone(data.phone);

// Validate date format
validateDate(data.dateOfBirth);

// Validate enum value
validateEnum('status', data.status, ['new', 'leads', 'working', 'bad', 'later', 'signed']);
```

### Error Response Format

All errors return a consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Missing required fields: email, phone",
    "details": {
      "email": "Email is required",
      "phone": "Phone is required"
    },
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "abc123"
  }
}
```

## Critical Error Notifications

### Triggering Notifications

Critical errors automatically trigger admin notifications:

```typescript
import { logger } from '@/lib/logger';

// This will:
// 1. Log to database (critical_errors table)
// 2. Send email to admins (if configured)
// 3. Log to console (in development)
logger.critical(
  'Payment gateway connection failed',
  error,
  { userId: '123', username: 'john' },
  { gateway: 'stripe', amount: 1000 }
);
```

### Configuration

Set admin email addresses for notifications:

```env
ADMIN_NOTIFICATION_EMAILS=admin1@example.com,admin2@example.com
```

### Admin Dashboard Integration

Admins can view and acknowledge critical errors:

```typescript
// GET /api/admin/critical-errors
// Returns unacknowledged critical errors

// GET /api/admin/critical-errors?stats=true&days=7
// Returns error statistics for the last 7 days

// PATCH /api/admin/critical-errors/[id]
// Acknowledges a critical error
```

### Database Schema

Critical errors are stored in the `critical_errors` table:

```sql
CREATE TABLE critical_errors (
  id UUID PRIMARY KEY,
  message TEXT NOT NULL,
  error_details JSONB,
  context JSONB,
  metadata JSONB,
  notified_at TIMESTAMP NOT NULL,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Best Practices

### 1. Use Appropriate Log Levels

- **debug**: Detailed debugging info (e.g., "Processing item 5 of 10")
- **info**: Normal operations (e.g., "User logged in", "Deal saved")
- **warn**: Potential issues (e.g., "Rate limit approaching", "Slow query detected")
- **error**: Recoverable errors (e.g., "Failed to send email", "API call failed")
- **critical**: Unrecoverable errors requiring immediate attention (e.g., "Database connection lost", "Payment processing failed")

### 2. Include Context

Always include relevant context in logs:

```typescript
// Good
logger.info('Deal saved', { userId: user.id, username: user.username }, { dealId: deal.id, dealName: deal.name });

// Bad
logger.info('Deal saved');
```

### 3. Use Specific Error Classes

Use the most specific error class available:

```typescript
// Good
throw new NotFoundError('Lead');

// Bad
throw new Error('Lead not found');
```

### 4. Don't Log Sensitive Data

Never log passwords, tokens, or other sensitive information:

```typescript
// Good
logger.info('User authenticated', { userId: user.id, username: user.username });

// Bad
logger.info('User authenticated', { password: user.password, token: jwt });
```

### 5. Handle Errors at the Right Level

- Catch and handle errors at the API route level
- Let errors bubble up from service functions
- Use try-catch only where you can meaningfully handle the error

```typescript
// Good - Handle at API route level
export async function POST(request: NextRequest) {
  try {
    const result = await userService.createUser(data);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

// Bad - Swallowing errors in service functions
async function createUser(data: any) {
  try {
    return await db.insert(data);
  } catch (error) {
    console.log('Error:', error);  // Don't do this!
    return null;
  }
}
```

### 6. Use Request IDs for Tracing

Include request IDs to trace errors across logs:

```typescript
const requestId = request.headers.get('x-request-id') || crypto.randomUUID();

logger.info('Processing request', { requestId });

// Later...
return handleApiError(error, { requestId });
```

## Migration Guide

To add error handling to existing API routes:

1. Import the error handling utilities:
```typescript
import { handleApiError, ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
```

2. Replace generic error handling with `handleApiError`:
```typescript
// Before
catch (error) {
  return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
}

// After
catch (error) {
  return handleApiError(error, { userId: user?.id });
}
```

3. Add logging for important operations:
```typescript
// Log successful operations
logger.info('User created', { userId: user.id, username: user.username });

// Log errors
logger.error('Failed to create user', error, { username: data.username });
```

4. Use specific error classes instead of generic errors:
```typescript
// Before
if (!user) {
  throw new Error('User not found');
}

// After
if (!user) {
  throw new NotFoundError('User');
}
```

## Testing

### Testing Logging

```typescript
import { Logger } from '@/lib/logger';

describe('Logging', () => {
  let logger: Logger;
  
  beforeEach(() => {
    logger = new Logger();
    logger.setLevel('debug');
  });
  
  test('logs at appropriate level', () => {
    const consoleSpy = jest.spyOn(console, 'info');
    logger.info('Test message');
    expect(consoleSpy).toHaveBeenCalled();
  });
});
```

### Testing Error Handling

```typescript
import { ValidationError, handleApiError } from '@/lib/errors';

describe('Error Handling', () => {
  test('returns correct status code for validation error', () => {
    const error = new ValidationError('Invalid input');
    const response = handleApiError(error);
    expect(response.status).toBe(400);
  });
  
  test('includes error details in response', async () => {
    const error = new ValidationError('Invalid input', {
      email: 'Email is required',
    });
    const response = handleApiError(error);
    const body = await response.json();
    expect(body.error.details).toEqual({ email: 'Email is required' });
  });
});
```

## Environment Variables

```env
# Logging
LOG_LEVEL=info  # debug, info, warn, error, critical

# Notifications
ADMIN_NOTIFICATION_EMAILS=admin1@example.com,admin2@example.com

# Email (optional - for future email notifications)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=notifications@example.com
SMTP_PASS=password
SMTP_FROM=noreply@example.com
```

## Database Migration

Run the migration to create the critical_errors table:

```bash
npm run migrate
```

This will execute `database/migrations/003_critical_errors.sql`.

## Monitoring

### View Critical Errors

Admins can view critical errors in the admin dashboard or via API:

```bash
# Get unacknowledged errors
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/admin/critical-errors

# Get error statistics
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/critical-errors?stats=true&days=7"

# Acknowledge an error
curl -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/admin/critical-errors/$ERROR_ID
```

### Log Analysis

Logs are output in JSON format for easy parsing:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "error",
  "message": "Database query failed",
  "context": {
    "userId": "123",
    "username": "john",
    "requestId": "abc123"
  },
  "error": {
    "message": "Connection timeout",
    "stack": "Error: Connection timeout\n    at ...",
    "code": "ETIMEDOUT"
  },
  "metadata": {
    "query": "SELECT * FROM users WHERE id = $1"
  }
}
```

Use tools like `jq` to analyze logs:

```bash
# Filter error logs
cat logs.json | jq 'select(.level == "error")'

# Count errors by user
cat logs.json | jq -r 'select(.level == "error") | .context.userId' | sort | uniq -c

# Find slow queries
cat logs.json | jq 'select(.metadata.duration > 1000)'
```
