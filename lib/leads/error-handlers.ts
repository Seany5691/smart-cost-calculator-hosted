/**
 * Client-Side Error Handling Utilities
 * 
 * Provides error handling utilities specifically for client-side operations
 * in the leads management system. Complements the server-side error handling
 * in lib/errors.ts.
 * 
 * Validates: Requirements 26.1-26.25, 32.1-32.20
 */

import { AppError, ValidationError, NotFoundError } from '../errors';

// =====================================================
// Error Display Types
// =====================================================

export type ErrorSeverity = 'error' | 'warning' | 'info';

export interface DisplayError {
  message: string;
  severity: ErrorSeverity;
  code?: string;
  details?: Record<string, string>;
  dismissible: boolean;
  autoDismiss: boolean;
  autoDismissDelay?: number;
}

// =====================================================
// Error Parsing Functions
// =====================================================

/**
 * Parse API error response
 */
export function parseApiError(error: unknown): DisplayError {
  // Handle Response objects
  if (error instanceof Response) {
    return {
      message: `Request failed with status ${error.status}`,
      severity: 'error',
      dismissible: true,
      autoDismiss: false,
    };
  }

  // Handle AppError instances
  if (error instanceof AppError) {
    return {
      message: error.message,
      severity: error.statusCode >= 500 ? 'error' : 'warning',
      code: error.code,
      details: error.details,
      dismissible: true,
      autoDismiss: false,
    };
  }

  // Handle Error instances
  if (error instanceof Error) {
    return {
      message: error.message,
      severity: 'error',
      dismissible: true,
      autoDismiss: false,
    };
  }

  // Handle error objects from API responses
  if (typeof error === 'object' && error !== null) {
    const errorObj = error as any;
    
    if (errorObj.error) {
      return {
        message: errorObj.error.message || errorObj.error,
        severity: 'error',
        code: errorObj.error.code,
        details: errorObj.error.details,
        dismissible: true,
        autoDismiss: false,
      };
    }

    if (errorObj.message) {
      return {
        message: errorObj.message,
        severity: 'error',
        dismissible: true,
        autoDismiss: false,
      };
    }
  }

  // Default error
  return {
    message: 'An unexpected error occurred. Please try again.',
    severity: 'error',
    dismissible: true,
    autoDismiss: false,
  };
}

/**
 * Parse network error
 */
export function parseNetworkError(error: unknown): DisplayError {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      message: 'Network error. Please check your internet connection.',
      severity: 'error',
      dismissible: true,
      autoDismiss: false,
    };
  }

  return parseApiError(error);
}

/**
 * Parse validation error
 */
export function parseValidationError(error: unknown): DisplayError {
  if (error instanceof ValidationError) {
    const details = error.details || {};
    const fieldErrors = Object.entries(details)
      .map(([field, message]) => `${field}: ${message}`)
      .join(', ');

    return {
      message: fieldErrors || error.message,
      severity: 'warning',
      code: error.code,
      details: error.details,
      dismissible: true,
      autoDismiss: false,
    };
  }

  return parseApiError(error);
}

// =====================================================
// Error Message Formatting
// =====================================================

/**
 * Format error message for display
 */
export function formatErrorMessage(error: unknown): string {
  const displayError = parseApiError(error);
  return displayError.message;
}

/**
 * Format validation errors for form display
 */
export function formatValidationErrors(
  errors: Record<string, string>
): string[] {
  return Object.entries(errors).map(([field, message]) => {
    const fieldName = field
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
    return `${fieldName}: ${message}`;
  });
}

/**
 * Get user-friendly error message based on error code
 */
export function getUserFriendlyMessage(code: string): string {
  const messages: Record<string, string> = {
    // Validation errors
    VALIDATION_ERROR: 'Please check your input and try again.',
    INVALID_INPUT: 'The provided information is invalid.',
    MISSING_REQUIRED_FIELD: 'Please fill in all required fields.',

    // Authentication errors
    AUTHENTICATION_REQUIRED: 'Please log in to continue.',
    INVALID_CREDENTIALS: 'Invalid username or password.',
    TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
    INVALID_TOKEN: 'Invalid authentication token.',

    // Authorization errors
    INSUFFICIENT_PERMISSIONS: 'You do not have permission to perform this action.',
    FORBIDDEN: 'Access denied.',

    // Not found errors
    RESOURCE_NOT_FOUND: 'The requested item could not be found.',

    // Conflict errors
    RESOURCE_ALREADY_EXISTS: 'This item already exists.',
    CONFLICT: 'A conflict occurred. Please refresh and try again.',

    // Business logic errors
    INVALID_STATE_TRANSITION: 'This action is not allowed in the current state.',
    BUSINESS_RULE_VIOLATION: 'This action violates business rules.',

    // Server errors
    INTERNAL_SERVER_ERROR: 'A server error occurred. Please try again later.',
    DATABASE_ERROR: 'A database error occurred. Please try again.',
    EXTERNAL_SERVICE_ERROR: 'An external service is unavailable. Please try again later.',
  };

  return messages[code] || 'An error occurred. Please try again.';
}

// =====================================================
// Error Handling Utilities
// =====================================================

/**
 * Handle API fetch errors
 */
export async function handleFetchError(response: Response): Promise<never> {
  let errorData: any;

  try {
    errorData = await response.json();
  } catch {
    throw new Error(`Request failed with status ${response.status}`);
  }

  if (errorData.error) {
    const error = new AppError(
      errorData.error.code || 'UNKNOWN_ERROR',
      errorData.error.message || 'An error occurred',
      response.status,
      errorData.error.details
    );
    throw error;
  }

  throw new Error(errorData.message || `Request failed with status ${response.status}`);
}

/**
 * Safe async error handler wrapper
 */
export function safeAsync<T extends any[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R | null> {
  return async (...args: T): Promise<R | null> => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error('Async operation failed:', error);
      return null;
    }
  };
}

/**
 * Retry async operation with exponential backoff
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
  } = options;

  let lastError: unknown;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * backoffFactor, maxDelay);
      }
    }
  }

  throw lastError;
}

// =====================================================
// Validation Helpers
// =====================================================

/**
 * Validate required fields
 */
export function validateRequired(
  data: Record<string, any>,
  fields: string[]
): Record<string, string> {
  const errors: Record<string, string> = {};

  fields.forEach((field) => {
    const value = data[field];
    if (value === undefined || value === null || value === '') {
      errors[field] = 'This field is required';
    }
  });

  return errors;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Invalid email format';
  }
  return null;
}

/**
 * Validate phone format
 */
export function validatePhone(phone: string): string | null {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  if (!phoneRegex.test(phone)) {
    return 'Invalid phone format';
  }
  return null;
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): string | null {
  try {
    new URL(url);
    return null;
  } catch {
    return 'Invalid URL format';
  }
}

/**
 * Validate date format
 */
export function validateDate(date: string): string | null {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date format';
  }
  return null;
}

/**
 * Validate future date
 */
export function validateFutureDate(date: string): string | null {
  const dateError = validateDate(date);
  if (dateError) return dateError;

  const dateObj = new Date(date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (dateObj < now) {
    return 'Date must be in the future';
  }

  return null;
}

/**
 * Validate file size
 */
export function validateFileSize(file: File, maxSize: number): string | null {
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
    return `File size must be less than ${maxSizeMB}MB`;
  }
  return null;
}

/**
 * Validate file type
 */
export function validateFileType(
  file: File,
  allowedTypes: string[]
): string | null {
  if (!allowedTypes.includes(file.type)) {
    return `File type must be one of: ${allowedTypes.join(', ')}`;
  }
  return null;
}

// =====================================================
// Error Boundary Helpers
// =====================================================

/**
 * Check if error is recoverable
 */
export function isRecoverableError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }

  // Network errors are usually recoverable
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // Validation errors are recoverable
  if (error instanceof ValidationError) {
    return true;
  }

  return false;
}

/**
 * Get error recovery suggestion
 */
export function getRecoverySuggestion(error: unknown): string | null {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return 'Please check your internet connection and try again.';
  }

  if (error instanceof ValidationError) {
    return 'Please correct the errors and try again.';
  }

  if (error instanceof NotFoundError) {
    return 'The item may have been deleted. Please refresh the page.';
  }

  if (error instanceof AppError) {
    if (error.statusCode === 401) {
      return 'Please log in again to continue.';
    }
    if (error.statusCode === 403) {
      return 'You do not have permission to perform this action.';
    }
    if (error.statusCode >= 500) {
      return 'Please try again later or contact support if the problem persists.';
    }
  }

  return null;
}

// =====================================================
// Logging Helpers
// =====================================================

/**
 * Log error to console with context
 */
export function logError(
  error: unknown,
  context?: Record<string, any>
): void {
  console.error('Error occurred:', {
    error,
    context,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log error to external service (placeholder)
 */
export function reportError(
  error: unknown,
  context?: Record<string, any>
): void {
  // In production, this would send to an error tracking service like Sentry
  if (process.env.NODE_ENV === 'production') {
    // TODO: Implement error reporting to external service
    console.error('Error reported:', { error, context });
  }
}
