/**
 * ErrorLogger - Singleton class for comprehensive error logging
 * 
 * This class provides specialized error logging methods for different error types
 * in the scraper system. It maintains a circular buffer of errors for analysis
 * and provides error statistics generation.
 * 
 * Validates Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

export interface ErrorContext {
  [key: string]: any;
}

export interface ErrorLogEntry {
  timestamp: string;
  level: 'error' | 'warning' | 'critical';
  category: 'api' | 'scraping' | 'browser' | 'provider_lookup' | 'database' | 'validation' | 'general';
  message: string;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  context?: ErrorContext;
}

export interface ErrorStats {
  totalErrors: number;
  errorsByLevel: Record<string, number>;
  errorsByCategory: Record<string, number>;
  recentErrors: ErrorLogEntry[];
}

export class ErrorLogger {
  private static instance: ErrorLogger;
  private errorLogs: ErrorLogEntry[] = [];
  private readonly MAX_LOGS = 1000;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}

  /**
   * Gets the singleton instance of ErrorLogger
   * 
   * @returns The ErrorLogger instance
   */
  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  /**
   * Logs an API error
   * 
   * @param endpoint - The API endpoint that failed
   * @param error - The error object
   * @param context - Additional context information
   * 
   * Validates Requirement 6.1: Log API errors with full context
   */
  logApiError(endpoint: string, error: unknown, context?: ErrorContext): void {
    this.addLog({
      timestamp: new Date().toISOString(),
      level: 'error',
      category: 'api',
      message: `API error at endpoint: ${endpoint}`,
      error: this.extractErrorDetails(error),
      context: {
        endpoint,
        ...context,
      },
    });
  }

  /**
   * Logs a scraping error
   * 
   * @param town - The town being scraped
   * @param industry - The industry being scraped
   * @param error - The error object
   * @param context - Additional context information
   * 
   * Validates Requirement 6.2: Log scraping errors with town and industry context
   */
  logScrapingError(town: string, industry: string, error: unknown, context?: ErrorContext): void {
    this.addLog({
      timestamp: new Date().toISOString(),
      level: 'error',
      category: 'scraping',
      message: `Scraping error for ${industry} in ${town}`,
      error: this.extractErrorDetails(error),
      context: {
        town,
        industry,
        ...context,
      },
    });
  }

  /**
   * Logs a browser error
   * 
   * @param error - The error object
   * @param context - Additional context information
   * 
   * Validates Requirement 6.3: Log browser errors as critical with browser context
   */
  logBrowserError(error: unknown, context?: ErrorContext): void {
    this.addLog({
      timestamp: new Date().toISOString(),
      level: 'critical',
      category: 'browser',
      message: 'Browser error occurred',
      error: this.extractErrorDetails(error),
      context,
    });
  }

  /**
   * Logs a provider lookup error
   * 
   * @param phoneNumber - The phone number being looked up (will be masked)
   * @param error - The error object
   * @param context - Additional context information
   * 
   * Validates Requirement 6.4: Log provider lookup errors with masked phone number
   */
  logProviderLookupError(phoneNumber: string, error: unknown, context?: ErrorContext): void {
    this.addLog({
      timestamp: new Date().toISOString(),
      level: 'warning',
      category: 'provider_lookup',
      message: `Provider lookup failed for phone number`,
      error: this.extractErrorDetails(error),
      context: {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        ...context,
      },
    });
  }

  /**
   * Logs a database error
   * 
   * @param operation - The database operation that failed
   * @param error - The error object
   * @param context - Additional context information
   * 
   * Validates Requirement 6.5: Log database errors as critical with operation name
   */
  logDatabaseError(operation: string, error: unknown, context?: ErrorContext): void {
    this.addLog({
      timestamp: new Date().toISOString(),
      level: 'critical',
      category: 'database',
      message: `Database error during operation: ${operation}`,
      error: this.extractErrorDetails(error),
      context: {
        operation,
        ...context,
      },
    });
  }

  /**
   * Logs a validation error
   * 
   * @param field - The field that failed validation
   * @param value - The invalid value
   * @param reason - The reason for validation failure
   * @param context - Additional context information
   * 
   * Validates Requirement 6.6: Log validation errors with field and value
   */
  logValidationError(field: string, value: any, reason: string, context?: ErrorContext): void {
    this.addLog({
      timestamp: new Date().toISOString(),
      level: 'warning',
      category: 'validation',
      message: `Validation error for field: ${field}`,
      error: {
        message: reason,
      },
      context: {
        field,
        value: this.sanitizeValue(value),
        reason,
        ...context,
      },
    });
  }

  /**
   * Logs a general error
   * 
   * @param message - The error message
   * @param error - The error object (optional)
   * @param context - Additional context information
   * 
   * Validates Requirement 6.1: Log errors with full context
   */
  logError(message: string, error?: unknown, context?: ErrorContext): void {
    this.addLog({
      timestamp: new Date().toISOString(),
      level: 'error',
      category: 'general',
      message,
      error: error ? this.extractErrorDetails(error) : undefined,
      context,
    });
  }

  /**
   * Logs a warning
   * 
   * @param message - The warning message
   * @param context - Additional context information
   */
  logWarning(message: string, context?: ErrorContext): void {
    this.addLog({
      timestamp: new Date().toISOString(),
      level: 'warning',
      category: 'general',
      message,
      context,
    });
  }

  /**
   * Adds a log entry to the circular buffer
   * 
   * @param entry - The log entry to add
   * 
   * Validates Requirement 6.7: Maintain circular buffer of last 1000 errors
   */
  private addLog(entry: ErrorLogEntry): void {
    this.errorLogs.push(entry);

    // Maintain circular buffer - remove oldest entries if exceeding max
    if (this.errorLogs.length > this.MAX_LOGS) {
      this.errorLogs.shift();
    }

    // Also log to console for immediate visibility
    this.logToConsole(entry);
  }

  /**
   * Logs an entry to the console with appropriate formatting
   * 
   * @param entry - The log entry to output
   */
  private logToConsole(entry: ErrorLogEntry): void {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.category}]`;
    const message = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case 'critical':
        console.error(message, entry.error, entry.context);
        break;
      case 'error':
        console.error(message, entry.error, entry.context);
        break;
      case 'warning':
        console.warn(message, entry.error, entry.context);
        break;
    }
  }

  /**
   * Extracts error details from an error object
   * 
   * @param error - The error object
   * @returns Structured error details
   */
  private extractErrorDetails(error: unknown): {
    message: string;
    stack?: string;
    code?: string;
  } {
    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      };
    }

    return {
      message: String(error),
    };
  }

  /**
   * Masks a phone number for privacy
   * 
   * Shows only the last 4 digits, masks the rest with asterisks
   * 
   * @param phoneNumber - The phone number to mask
   * @returns Masked phone number
   * 
   * Validates Requirement 6.4: Mask phone numbers for privacy
   */
  private maskPhoneNumber(phoneNumber: string): string {
    if (!phoneNumber || phoneNumber.length < 4) {
      return '****';
    }

    const lastFour = phoneNumber.slice(-4);
    const maskedPart = '*'.repeat(phoneNumber.length - 4);
    return maskedPart + lastFour;
  }

  /**
   * Sanitizes a value for logging (removes sensitive data)
   * 
   * @param value - The value to sanitize
   * @returns Sanitized value
   */
  private sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      // Check if it looks like a phone number
      if (/^\+?\d[\d\s\-()]{7,}$/.test(value)) {
        return this.maskPhoneNumber(value);
      }
    }
    return value;
  }

  /**
   * Gets all error logs
   * 
   * @returns Array of all error log entries
   */
  getErrorLogs(): ErrorLogEntry[] {
    return [...this.errorLogs];
  }

  /**
   * Gets error logs filtered by level
   * 
   * @param level - The error level to filter by
   * @returns Array of filtered error log entries
   */
  getErrorLogsByLevel(level: string): ErrorLogEntry[] {
    return this.errorLogs.filter(log => log.level === level);
  }

  /**
   * Generates error statistics
   * 
   * @returns Error statistics object
   * 
   * Validates Requirement 6.7: Generate error statistics
   */
  getErrorStats(): ErrorStats {
    const errorsByLevel: Record<string, number> = {};
    const errorsByCategory: Record<string, number> = {};

    for (const log of this.errorLogs) {
      // Count by level
      errorsByLevel[log.level] = (errorsByLevel[log.level] || 0) + 1;

      // Count by category
      errorsByCategory[log.category] = (errorsByCategory[log.category] || 0) + 1;
    }

    return {
      totalErrors: this.errorLogs.length,
      errorsByLevel,
      errorsByCategory,
      recentErrors: this.errorLogs.slice(-10), // Last 10 errors
    };
  }

  /**
   * Exports error logs as JSON string
   * 
   * @returns JSON string of all error logs
   */
  exportErrorLogs(): string {
    return JSON.stringify(this.errorLogs, null, 2);
  }

  /**
   * Clears all error logs
   */
  clearLogs(): void {
    this.errorLogs = [];
  }
}
