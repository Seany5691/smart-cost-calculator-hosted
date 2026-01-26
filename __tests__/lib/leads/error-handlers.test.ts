/**
 * Unit Tests for Error Handling Utilities
 * 
 * Tests the client-side error handling functions to ensure proper
 * error parsing, formatting, and validation.
 */

import {
  parseApiError,
  parseNetworkError,
  parseValidationError,
  formatErrorMessage,
  formatValidationErrors,
  getUserFriendlyMessage,
  validateRequired,
  validateEmail,
  validatePhone,
  validateUrl,
  validateDate,
  validateFutureDate,
  validateFileSize,
  validateFileType,
  isRecoverableError,
  getRecoverySuggestion,
} from '@/lib/leads/error-handlers';

import {
  AppError,
  ValidationError,
  NotFoundError,
  ErrorCode,
} from '@/lib/errors';

describe('Error Handling Utilities', () => {
  describe('parseApiError', () => {
    it('should parse AppError instances', () => {
      const error = new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Validation failed',
        400
      );

      const result = parseApiError(error);

      expect(result.message).toBe('Validation failed');
      expect(result.severity).toBe('warning');
      expect(result.code).toBe(ErrorCode.VALIDATION_ERROR);
    });

    it('should parse Error instances', () => {
      const error = new Error('Something went wrong');

      const result = parseApiError(error);

      expect(result.message).toBe('Something went wrong');
      expect(result.severity).toBe('error');
    });

    it('should parse error objects from API responses', () => {
      const error = {
        error: {
          message: 'API error',
          code: 'API_ERROR',
        },
      };

      const result = parseApiError(error);

      expect(result.message).toBe('API error');
      expect(result.code).toBe('API_ERROR');
    });

    it('should handle unknown error types', () => {
      const error = 'string error';

      const result = parseApiError(error);

      expect(result.message).toBe('An unexpected error occurred. Please try again.');
      expect(result.severity).toBe('error');
    });

    it('should classify server errors correctly', () => {
      const error = new AppError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Server error',
        500
      );

      const result = parseApiError(error);

      expect(result.severity).toBe('error');
    });

    it('should classify client errors correctly', () => {
      const error = new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Validation error',
        400
      );

      const result = parseApiError(error);

      expect(result.severity).toBe('warning');
    });
  });

  describe('parseNetworkError', () => {
    it('should parse network fetch errors', () => {
      const error = new TypeError('Failed to fetch');

      const result = parseNetworkError(error);

      expect(result.message).toBe('Network error. Please check your internet connection.');
      expect(result.severity).toBe('error');
    });

    it('should fall back to parseApiError for non-network errors', () => {
      const error = new Error('Not a network error');

      const result = parseNetworkError(error);

      expect(result.message).toBe('Not a network error');
    });
  });

  describe('parseValidationError', () => {
    it('should parse ValidationError with details', () => {
      const error = new ValidationError('Validation failed', {
        name: 'Name is required',
        email: 'Invalid email format',
      });

      const result = parseValidationError(error);

      expect(result.message).toContain('name: Name is required');
      expect(result.message).toContain('email: Invalid email format');
      expect(result.severity).toBe('warning');
    });

    it('should parse ValidationError without details', () => {
      const error = new ValidationError('Validation failed');

      const result = parseValidationError(error);

      expect(result.message).toBe('Validation failed');
    });
  });

  describe('formatErrorMessage', () => {
    it('should format error message from AppError', () => {
      const error = new AppError(
        ErrorCode.NOT_FOUND,
        'Resource not found',
        404
      );

      const message = formatErrorMessage(error);

      expect(message).toBe('Resource not found');
    });

    it('should format error message from Error', () => {
      const error = new Error('Generic error');

      const message = formatErrorMessage(error);

      expect(message).toBe('Generic error');
    });
  });

  describe('formatValidationErrors', () => {
    it('should format validation errors for display', () => {
      const errors = {
        first_name: 'First name is required',
        email_address: 'Invalid email format',
        phone_number: 'Phone number is required',
      };

      const formatted = formatValidationErrors(errors);

      expect(formatted).toHaveLength(3);
      expect(formatted[0]).toBe('First Name: First name is required');
      expect(formatted[1]).toBe('Email Address: Invalid email format');
      expect(formatted[2]).toBe('Phone Number: Phone number is required');
    });

    it('should handle empty errors object', () => {
      const formatted = formatValidationErrors({});
      expect(formatted).toEqual([]);
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return friendly message for validation error', () => {
      const message = getUserFriendlyMessage(ErrorCode.VALIDATION_ERROR);
      expect(message).toBe('Please check your input and try again.');
    });

    it('should return friendly message for authentication error', () => {
      const message = getUserFriendlyMessage(ErrorCode.AUTHENTICATION_REQUIRED);
      expect(message).toBe('Please log in to continue.');
    });

    it('should return friendly message for not found error', () => {
      const message = getUserFriendlyMessage(ErrorCode.RESOURCE_NOT_FOUND);
      expect(message).toBe('The requested item could not be found.');
    });

    it('should return default message for unknown code', () => {
      const message = getUserFriendlyMessage('UNKNOWN_CODE');
      expect(message).toBe('An error occurred. Please try again.');
    });
  });

  describe('Validation Helpers', () => {
    describe('validateRequired', () => {
      it('should return errors for missing required fields', () => {
        const data = {
          name: 'John',
          email: '',
          phone: null,
        };

        const errors = validateRequired(data, ['name', 'email', 'phone', 'address']);

        expect(errors).toHaveProperty('email');
        expect(errors).toHaveProperty('phone');
        expect(errors).toHaveProperty('address');
        expect(errors).not.toHaveProperty('name');
      });

      it('should return empty object when all required fields are present', () => {
        const data = {
          name: 'John',
          email: 'john@example.com',
          phone: '1234567890',
        };

        const errors = validateRequired(data, ['name', 'email', 'phone']);

        expect(errors).toEqual({});
      });
    });

    describe('validateEmail', () => {
      it('should return null for valid email', () => {
        expect(validateEmail('test@example.com')).toBeNull();
        expect(validateEmail('user.name@domain.co.uk')).toBeNull();
        expect(validateEmail('user+tag@example.com')).toBeNull();
      });

      it('should return error for invalid email', () => {
        expect(validateEmail('invalid')).toBe('Invalid email format');
        expect(validateEmail('invalid@')).toBe('Invalid email format');
        expect(validateEmail('@example.com')).toBe('Invalid email format');
        expect(validateEmail('invalid@domain')).toBe('Invalid email format');
      });
    });

    describe('validatePhone', () => {
      it('should return null for valid phone', () => {
        expect(validatePhone('1234567890')).toBeNull();
        expect(validatePhone('+1 (234) 567-8900')).toBeNull();
        expect(validatePhone('123-456-7890')).toBeNull();
      });

      it('should return error for invalid phone', () => {
        expect(validatePhone('abc123')).toBe('Invalid phone format');
        expect(validatePhone('phone#123')).toBe('Invalid phone format');
      });
    });

    describe('validateUrl', () => {
      it('should return null for valid URL', () => {
        expect(validateUrl('https://example.com')).toBeNull();
        expect(validateUrl('http://example.com/path')).toBeNull();
        expect(validateUrl('https://example.com/path?query=value')).toBeNull();
      });

      it('should return error for invalid URL', () => {
        expect(validateUrl('not a url')).toBe('Invalid URL format');
        expect(validateUrl('example.com')).toBe('Invalid URL format');
        expect(validateUrl('ftp://example.com')).toBeNull(); // Valid URL, just different protocol
      });
    });

    describe('validateDate', () => {
      it('should return null for valid date', () => {
        expect(validateDate('2024-01-01')).toBeNull();
        expect(validateDate('2024-12-31')).toBeNull();
        expect(validateDate(new Date())).toBeNull();
      });

      it('should return error for invalid date', () => {
        expect(validateDate('invalid')).toBe('Invalid date format');
        expect(validateDate('2024-13-01')).toBe('Invalid date format');
        expect(validateDate('2024-01-32')).toBe('Invalid date format');
      });
    });

    describe('validateFutureDate', () => {
      it('should return null for future date', () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        expect(validateFutureDate(tomorrowStr)).toBeNull();
      });

      it('should return error for past date', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        expect(validateFutureDate(yesterdayStr)).toBe('Date must be in the future');
      });

      it('should return error for invalid date', () => {
        expect(validateFutureDate('invalid')).toBe('Invalid date format');
      });
    });

    describe('validateFileSize', () => {
      it('should return null for file within size limit', () => {
        const file = new File(['content'], 'test.txt', { type: 'text/plain' });
        const maxSize = 1024 * 1024; // 1MB

        expect(validateFileSize(file, maxSize)).toBeNull();
      });

      it('should return error for file exceeding size limit', () => {
        const largeContent = 'x'.repeat(2 * 1024 * 1024); // 2MB
        const file = new File([largeContent], 'large.txt', { type: 'text/plain' });
        const maxSize = 1024 * 1024; // 1MB

        const error = validateFileSize(file, maxSize);
        expect(error).toContain('File size must be less than');
      });
    });

    describe('validateFileType', () => {
      it('should return null for allowed file type', () => {
        const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
        const allowedTypes = ['application/pdf', 'image/jpeg'];

        expect(validateFileType(file, allowedTypes)).toBeNull();
      });

      it('should return error for disallowed file type', () => {
        const file = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });
        const allowedTypes = ['application/pdf', 'image/jpeg'];

        const error = validateFileType(file, allowedTypes);
        expect(error).toContain('File type must be one of');
      });
    });
  });

  describe('Error Recovery', () => {
    describe('isRecoverableError', () => {
      it('should return true for operational errors', () => {
        const error = new ValidationError('Validation failed');
        expect(isRecoverableError(error)).toBe(true);
      });

      it('should return true for network errors', () => {
        const error = new TypeError('Failed to fetch');
        expect(isRecoverableError(error)).toBe(true);
      });

      it('should return false for non-operational errors', () => {
        const error = new Error('Programming error');
        expect(isRecoverableError(error)).toBe(false);
      });
    });

    describe('getRecoverySuggestion', () => {
      it('should return suggestion for network error', () => {
        const error = new TypeError('Failed to fetch');
        const suggestion = getRecoverySuggestion(error);

        expect(suggestion).toBe('Please check your internet connection and try again.');
      });

      it('should return suggestion for validation error', () => {
        const error = new ValidationError('Validation failed');
        const suggestion = getRecoverySuggestion(error);

        expect(suggestion).toBe('Please correct the errors and try again.');
      });

      it('should return suggestion for not found error', () => {
        const error = new NotFoundError('Lead');
        const suggestion = getRecoverySuggestion(error);

        expect(suggestion).toBe('The item may have been deleted. Please refresh the page.');
      });

      it('should return suggestion for 401 error', () => {
        const error = new AppError(ErrorCode.AUTHENTICATION_REQUIRED, 'Unauthorized', 401);
        const suggestion = getRecoverySuggestion(error);

        expect(suggestion).toBe('Please log in again to continue.');
      });

      it('should return suggestion for 403 error', () => {
        const error = new AppError(ErrorCode.INSUFFICIENT_PERMISSIONS, 'Forbidden', 403);
        const suggestion = getRecoverySuggestion(error);

        expect(suggestion).toBe('You do not have permission to perform this action.');
      });

      it('should return suggestion for 500 error', () => {
        const error = new AppError(ErrorCode.INTERNAL_SERVER_ERROR, 'Server error', 500);
        const suggestion = getRecoverySuggestion(error);

        expect(suggestion).toBe('Please try again later or contact support if the problem persists.');
      });

      it('should return null for unknown error', () => {
        const error = new Error('Unknown error');
        const suggestion = getRecoverySuggestion(error);

        expect(suggestion).toBeNull();
      });
    });
  });
});
