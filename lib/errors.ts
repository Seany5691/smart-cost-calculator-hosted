/**
 * API Error Handling Utilities
 * 
 * Provides standardized error handling for API routes including:
 * - Appropriate HTTP status codes
 * - User-friendly error messages
 * - Structured error responses
 * - Error logging integration
 * 
 * Validates: Requirements 13.2, 13.3
 */

import { NextResponse } from 'next/server';
import { logger, LogContext } from './logger';

/**
 * Standard error codes
 */
export enum ErrorCode {
  // Validation errors (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Authentication errors (401)
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  
  // Authorization errors (403)
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  FORBIDDEN = 'FORBIDDEN',
  
  // Not found errors (404)
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  
  // Conflict errors (409)
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',
  
  // Business logic errors (422)
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  
  // Server errors (500)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  error: {
    code: ErrorCode | string;
    message: string;
    details?: Record<string, string>;
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Custom application error class
 */
export class AppError extends Error {
  constructor(
    public code: ErrorCode | string,
    public message: string,
    public statusCode: number = 500,
    public details?: Record<string, string>,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error class
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, string>) {
    super(ErrorCode.VALIDATION_ERROR, message, 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication error class
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', code: ErrorCode = ErrorCode.AUTHENTICATION_REQUIRED) {
    super(code, message, 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error class
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(ErrorCode.INSUFFICIENT_PERMISSIONS, message, 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * Not found error class
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(ErrorCode.RESOURCE_NOT_FOUND, `${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict error class
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(ErrorCode.CONFLICT, message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * Business logic error class
 */
export class BusinessLogicError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.BUSINESS_RULE_VIOLATION) {
    super(code, message, 422);
    this.name = 'BusinessLogicError';
  }
}

/**
 * Database error class
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed') {
    super(ErrorCode.DATABASE_ERROR, message, 500, undefined, false);
    this.name = 'DatabaseError';
  }
}

/**
 * Get HTTP status code from error
 */
function getStatusCode(error: unknown): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }
  
  // PostgreSQL error codes
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const pgError = error as { code: string };
    switch (pgError.code) {
      case '23505': // unique_violation
        return 409;
      case '23503': // foreign_key_violation
        return 400;
      case '23502': // not_null_violation
        return 400;
      case '23514': // check_violation
        return 400;
      default:
        return 500;
    }
  }
  
  return 500;
}

/**
 * Get error code from error
 */
function getErrorCode(error: unknown): ErrorCode | string {
  if (error instanceof AppError) {
    return error.code;
  }
  
  // PostgreSQL error codes
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const pgError = error as { code: string };
    switch (pgError.code) {
      case '23505':
        return ErrorCode.RESOURCE_ALREADY_EXISTS;
      case '23503':
      case '23502':
      case '23514':
        return ErrorCode.VALIDATION_ERROR;
      default:
        return ErrorCode.DATABASE_ERROR;
    }
  }
  
  return ErrorCode.INTERNAL_SERVER_ERROR;
}

/**
 * Get user-friendly error message
 */
function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  
  // PostgreSQL error messages
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const pgError = error as { code: string; detail?: string };
    switch (pgError.code) {
      case '23505':
        return 'A record with this information already exists';
      case '23503':
        return 'Referenced record does not exist';
      case '23502':
        return 'Required field is missing';
      case '23514':
        return 'Invalid value provided';
      default:
        return 'A database error occurred';
    }
  }
  
  if (error instanceof Error) {
    // Don't expose internal error messages in production
    if (process.env.NODE_ENV === 'production') {
      return 'An unexpected error occurred';
    }
    return error.message;
  }
  
  return 'An unexpected error occurred';
}

/**
 * Check if error is operational (expected) or programming error
 */
function isOperationalError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Create error response
 */
export function createErrorResponse(
  error: unknown,
  requestId?: string
): ErrorResponse {
  const statusCode = getStatusCode(error);
  const code = getErrorCode(error);
  const message = getUserFriendlyMessage(error);
  
  const response: ErrorResponse = {
    error: {
      code,
      message,
      timestamp: new Date().toISOString(),
      requestId,
    },
  };
  
  // Add details for validation errors
  if (error instanceof AppError && error.details) {
    response.error.details = error.details;
  }
  
  return response;
}

/**
 * Handle API error and return NextResponse
 */
export function handleApiError(
  error: unknown,
  context?: LogContext,
  requestId?: string
): NextResponse<ErrorResponse> {
  const statusCode = getStatusCode(error);
  const errorResponse = createErrorResponse(error, requestId);
  
  // Log the error
  if (statusCode >= 500) {
    // Server errors are critical
    logger.error(
      `API Error: ${errorResponse.error.message}`,
      error instanceof Error ? error : undefined,
      context,
      { requestId, statusCode }
    );
  } else if (statusCode >= 400) {
    // Client errors are warnings
    logger.warn(
      `API Client Error: ${errorResponse.error.message}`,
      context,
      { requestId, statusCode, code: errorResponse.error.code }
    );
  }
  
  return NextResponse.json(errorResponse, { status: statusCode });
}

/**
 * Async error handler wrapper for API routes
 */
export function asyncHandler<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await handler(...args);
    } catch (error) {
      // Re-throw to be caught by the route's error handling
      throw error;
    }
  };
}

/**
 * Validate required fields
 */
export function validateRequiredFields(
  data: Record<string, any>,
  requiredFields: string[]
): void {
  const missing: string[] = [];
  const details: Record<string, string> = {};
  
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missing.push(field);
      details[field] = `${field} is required`;
    }
  }
  
  if (missing.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missing.join(', ')}`,
      details
    );
  }
}

/**
 * Validate field format
 */
export function validateField(
  fieldName: string,
  value: any,
  validator: (value: any) => boolean,
  errorMessage: string
): void {
  if (!validator(value)) {
    throw new ValidationError(errorMessage, {
      [fieldName]: errorMessage,
    });
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  validateField(
    'email',
    email,
    (val) => emailRegex.test(val),
    'Invalid email format'
  );
}

/**
 * Validate phone format
 */
export function validatePhone(phone: string): void {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  validateField(
    'phone',
    phone,
    (val) => phoneRegex.test(val),
    'Invalid phone format'
  );
}

/**
 * Validate date format
 */
export function validateDate(date: string | Date): void {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  validateField(
    'date',
    dateObj,
    (val) => val instanceof Date && !isNaN(val.getTime()),
    'Invalid date format'
  );
}

/**
 * Validate enum value
 */
export function validateEnum<T extends string>(
  fieldName: string,
  value: string,
  allowedValues: T[]
): void {
  validateField(
    fieldName,
    value,
    (val) => allowedValues.includes(val as T),
    `${fieldName} must be one of: ${allowedValues.join(', ')}`
  );
}
