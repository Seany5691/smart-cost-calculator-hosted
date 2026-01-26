/**
 * Unit tests for ErrorLogger
 * 
 * Tests the ErrorLogger singleton class functionality including:
 * - Specialized logging methods
 * - Circular buffer behavior
 * - Error statistics generation
 * - Phone number masking
 * 
 * Validates Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

import { ErrorLogger } from '../../../lib/scraper/error-logger';

describe('ErrorLogger', () => {
  let errorLogger: ErrorLogger;

  beforeEach(() => {
    // Get singleton instance and clear logs before each test
    errorLogger = ErrorLogger.getInstance();
    errorLogger.clearLogs();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ErrorLogger.getInstance();
      const instance2 = ErrorLogger.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('logApiError', () => {
    it('should log API error with endpoint context', () => {
      const error = new Error('Network timeout');
      errorLogger.logApiError('/api/scraper/start', error, { statusCode: 500 });

      const logs = errorLogger.getErrorLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('error');
      expect(logs[0].category).toBe('api');
      expect(logs[0].message).toContain('/api/scraper/start');
      expect(logs[0].context?.endpoint).toBe('/api/scraper/start');
      expect(logs[0].context?.statusCode).toBe(500);
      expect(logs[0].error?.message).toBe('Network timeout');
    });

    it('should handle non-Error objects', () => {
      errorLogger.logApiError('/api/test', 'String error');

      const logs = errorLogger.getErrorLogs();
      expect(logs[0].error?.message).toBe('String error');
    });
  });

  describe('logScrapingError', () => {
    it('should log scraping error with town and industry context', () => {
      const error = new Error('Failed to parse business card');
      errorLogger.logScrapingError('Cape Town', 'Restaurants', error);

      const logs = errorLogger.getErrorLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('error');
      expect(logs[0].category).toBe('scraping');
      expect(logs[0].message).toContain('Restaurants');
      expect(logs[0].message).toContain('Cape Town');
      expect(logs[0].context?.town).toBe('Cape Town');
      expect(logs[0].context?.industry).toBe('Restaurants');
    });

    it('should include additional context', () => {
      const error = new Error('Timeout');
      errorLogger.logScrapingError('Durban', 'Hotels', error, { 
        pageUrl: 'https://maps.google.com/...',
        attemptNumber: 2 
      });

      const logs = errorLogger.getErrorLogs();
      expect(logs[0].context?.pageUrl).toBe('https://maps.google.com/...');
      expect(logs[0].context?.attemptNumber).toBe(2);
    });
  });

  describe('logBrowserError', () => {
    it('should log browser error as critical', () => {
      const error = new Error('Browser crashed');
      errorLogger.logBrowserError(error, { browserId: 'worker-1' });

      const logs = errorLogger.getErrorLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('critical');
      expect(logs[0].category).toBe('browser');
      expect(logs[0].error?.message).toBe('Browser crashed');
      expect(logs[0].context?.browserId).toBe('worker-1');
    });

    it('should include stack trace', () => {
      const error = new Error('Browser error');
      errorLogger.logBrowserError(error);

      const logs = errorLogger.getErrorLogs();
      expect(logs[0].error?.stack).toBeDefined();
    });
  });

  describe('logProviderLookupError', () => {
    it('should log provider lookup error with masked phone number', () => {
      const error = new Error('Lookup failed');
      errorLogger.logProviderLookupError('0821234567', error);

      const logs = errorLogger.getErrorLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('warning');
      expect(logs[0].category).toBe('provider_lookup');
      expect(logs[0].context?.phoneNumber).toBe('******4567');
      expect(logs[0].context?.phoneNumber).not.toContain('0821234567');
    });

    it('should mask short phone numbers', () => {
      const error = new Error('Invalid number');
      errorLogger.logProviderLookupError('123', error);

      const logs = errorLogger.getErrorLogs();
      expect(logs[0].context?.phoneNumber).toBe('****');
    });

    it('should mask empty phone numbers', () => {
      const error = new Error('Empty number');
      errorLogger.logProviderLookupError('', error);

      const logs = errorLogger.getErrorLogs();
      expect(logs[0].context?.phoneNumber).toBe('****');
    });
  });

  describe('logDatabaseError', () => {
    it('should log database error as critical with operation name', () => {
      const error = new Error('Connection timeout');
      errorLogger.logDatabaseError('INSERT INTO businesses', error, { 
        table: 'businesses' 
      });

      const logs = errorLogger.getErrorLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('critical');
      expect(logs[0].category).toBe('database');
      expect(logs[0].message).toContain('INSERT INTO businesses');
      expect(logs[0].context?.operation).toBe('INSERT INTO businesses');
      expect(logs[0].context?.table).toBe('businesses');
    });
  });

  describe('logValidationError', () => {
    it('should log validation error with field and value', () => {
      errorLogger.logValidationError('email', 'invalid-email', 'Invalid email format');

      const logs = errorLogger.getErrorLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('warning');
      expect(logs[0].category).toBe('validation');
      expect(logs[0].message).toContain('email');
      expect(logs[0].context?.field).toBe('email');
      expect(logs[0].context?.value).toBe('invalid-email');
      expect(logs[0].context?.reason).toBe('Invalid email format');
    });

    it('should mask phone numbers in validation errors', () => {
      errorLogger.logValidationError('phone', '0821234567', 'Invalid format');

      const logs = errorLogger.getErrorLogs();
      expect(logs[0].context?.value).toBe('******4567');
    });

    it('should handle non-string values', () => {
      errorLogger.logValidationError('age', 150, 'Age too high');

      const logs = errorLogger.getErrorLogs();
      expect(logs[0].context?.value).toBe(150);
    });
  });

  describe('logError and logWarning', () => {
    it('should log general error', () => {
      const error = new Error('Something went wrong');
      errorLogger.logError('General error occurred', error, { module: 'scraper' });

      const logs = errorLogger.getErrorLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('error');
      expect(logs[0].category).toBe('general');
      expect(logs[0].message).toBe('General error occurred');
      expect(logs[0].error?.message).toBe('Something went wrong');
    });

    it('should log error without error object', () => {
      errorLogger.logError('Simple error message');

      const logs = errorLogger.getErrorLogs();
      expect(logs[0].error).toBeUndefined();
    });

    it('should log warning', () => {
      errorLogger.logWarning('This is a warning', { component: 'worker' });

      const logs = errorLogger.getErrorLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('warning');
      expect(logs[0].message).toBe('This is a warning');
      expect(logs[0].context?.component).toBe('worker');
    });
  });

  describe('Circular Buffer', () => {
    it('should maintain maximum of 1000 entries', () => {
      // Add 1100 errors
      for (let i = 0; i < 1100; i++) {
        errorLogger.logError(`Error ${i}`);
      }

      const logs = errorLogger.getErrorLogs();
      expect(logs).toHaveLength(1000);
      
      // Should have removed the oldest 100 entries
      expect(logs[0].message).toBe('Error 100');
      expect(logs[999].message).toBe('Error 1099');
    });

    it('should keep most recent errors when buffer is full', () => {
      // Fill buffer
      for (let i = 0; i < 1000; i++) {
        errorLogger.logError(`Error ${i}`);
      }

      // Add one more
      errorLogger.logError('Latest error');

      const logs = errorLogger.getErrorLogs();
      expect(logs).toHaveLength(1000);
      expect(logs[999].message).toBe('Latest error');
      expect(logs[0].message).toBe('Error 1'); // First one removed
    });
  });

  describe('getErrorLogsByLevel', () => {
    it('should filter logs by level', () => {
      errorLogger.logError('Error 1');
      errorLogger.logWarning('Warning 1');
      errorLogger.logBrowserError(new Error('Critical 1'));
      errorLogger.logError('Error 2');
      errorLogger.logWarning('Warning 2');

      const errors = errorLogger.getErrorLogsByLevel('error');
      const warnings = errorLogger.getErrorLogsByLevel('warning');
      const criticals = errorLogger.getErrorLogsByLevel('critical');

      expect(errors).toHaveLength(2);
      expect(warnings).toHaveLength(2);
      expect(criticals).toHaveLength(1);
    });

    it('should return empty array for non-existent level', () => {
      errorLogger.logError('Error 1');
      const result = errorLogger.getErrorLogsByLevel('critical');
      expect(result).toHaveLength(0);
    });
  });

  describe('getErrorStats', () => {
    it('should generate correct error statistics', () => {
      errorLogger.logError('Error 1');
      errorLogger.logError('Error 2');
      errorLogger.logWarning('Warning 1');
      errorLogger.logBrowserError(new Error('Critical 1'));
      errorLogger.logDatabaseError('INSERT', new Error('Critical 2'));

      const stats = errorLogger.getErrorStats();

      expect(stats.totalErrors).toBe(5);
      expect(stats.errorsByLevel.error).toBe(2);
      expect(stats.errorsByLevel.warning).toBe(1);
      expect(stats.errorsByLevel.critical).toBe(2);
      expect(stats.errorsByCategory.general).toBe(3);
      expect(stats.errorsByCategory.browser).toBe(1);
      expect(stats.errorsByCategory.database).toBe(1);
    });

    it('should include last 10 errors in recentErrors', () => {
      for (let i = 0; i < 20; i++) {
        errorLogger.logError(`Error ${i}`);
      }

      const stats = errorLogger.getErrorStats();
      expect(stats.recentErrors).toHaveLength(10);
      expect(stats.recentErrors[0].message).toBe('Error 10');
      expect(stats.recentErrors[9].message).toBe('Error 19');
    });

    it('should return empty stats when no errors', () => {
      const stats = errorLogger.getErrorStats();
      expect(stats.totalErrors).toBe(0);
      expect(stats.errorsByLevel).toEqual({});
      expect(stats.errorsByCategory).toEqual({});
      expect(stats.recentErrors).toHaveLength(0);
    });
  });

  describe('exportErrorLogs', () => {
    it('should export logs as JSON string', () => {
      errorLogger.logError('Test error');
      errorLogger.logWarning('Test warning');

      const exported = errorLogger.exportErrorLogs();
      const parsed = JSON.parse(exported);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].message).toBe('Test error');
      expect(parsed[1].message).toBe('Test warning');
    });

    it('should export empty array when no logs', () => {
      const exported = errorLogger.exportErrorLogs();
      const parsed = JSON.parse(exported);
      expect(parsed).toEqual([]);
    });
  });

  describe('clearLogs', () => {
    it('should clear all logs', () => {
      errorLogger.logError('Error 1');
      errorLogger.logError('Error 2');
      errorLogger.logWarning('Warning 1');

      expect(errorLogger.getErrorLogs()).toHaveLength(3);

      errorLogger.clearLogs();

      expect(errorLogger.getErrorLogs()).toHaveLength(0);
      expect(errorLogger.getErrorStats().totalErrors).toBe(0);
    });
  });

  describe('Timestamp', () => {
    it('should include ISO timestamp in all logs', () => {
      errorLogger.logError('Test error');

      const logs = errorLogger.getErrorLogs();
      expect(logs[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('Error Code Extraction', () => {
    it('should extract error code if present', () => {
      const error: any = new Error('Database error');
      error.code = 'ECONNREFUSED';

      errorLogger.logDatabaseError('connect', error);

      const logs = errorLogger.getErrorLogs();
      expect(logs[0].error?.code).toBe('ECONNREFUSED');
    });

    it('should handle errors without code', () => {
      const error = new Error('Simple error');
      errorLogger.logError('Test', error);

      const logs = errorLogger.getErrorLogs();
      expect(logs[0].error?.code).toBeUndefined();
    });
  });
});
