/**
 * Structured Logging Service
 * 
 * Provides configurable logging with structured output including:
 * - Timestamp
 * - Log level
 * - Message
 * - User context
 * - Error details (message, stack trace)
 * - Additional metadata
 * 
 * Validates: Requirements 13.1, 13.5
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface LogContext {
  userId?: string;
  username?: string;
  role?: string;
  requestId?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  metadata?: Record<string, any>;
}

class Logger {
  private minLevel: LogLevel;
  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    critical: 4,
  };

  constructor() {
    // Set minimum log level from environment variable or default to 'info'
    const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
    this.minLevel = envLevel && this.levelPriority[envLevel] !== undefined ? envLevel : 'info';
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.minLevel];
  }

  /**
   * Format and output a log entry
   */
  private log(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    // In production, you might send this to a logging service
    // For now, we'll use console with structured output
    const output = JSON.stringify(entry, null, 2);

    switch (entry.level) {
      case 'debug':
        console.debug(output);
        break;
      case 'info':
        console.info(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
      case 'critical':
        console.error(output);
        break;
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'debug',
      message,
      context,
      metadata,
    });
  }

  /**
   * Log an info message
   */
  info(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context,
      metadata,
    });
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      context,
      metadata,
    });
  }

  /**
   * Log an error
   */
  error(
    message: string,
    error?: Error | unknown,
    context?: LogContext,
    metadata?: Record<string, any>
  ): void {
    const errorDetails = this.extractErrorDetails(error);

    this.log({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      context,
      error: errorDetails,
      metadata,
    });
  }

  /**
   * Log a critical error (will trigger admin notifications)
   */
  critical(
    message: string,
    error?: Error | unknown,
    context?: LogContext,
    metadata?: Record<string, any>
  ): void {
    const errorDetails = this.extractErrorDetails(error);

    this.log({
      timestamp: new Date().toISOString(),
      level: 'critical',
      message,
      context,
      error: errorDetails,
      metadata,
    });

    // Critical errors should trigger notifications
    // This will be handled by the notification service
    this.triggerCriticalErrorNotification(message, errorDetails, context, metadata);
  }

  /**
   * Extract error details from an error object
   */
  private extractErrorDetails(error?: Error | unknown): {
    message: string;
    stack?: string;
    code?: string;
  } | undefined {
    if (!error) {
      return undefined;
    }

    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      };
    }

    // Handle non-Error objects
    return {
      message: String(error),
    };
  }

  /**
   * Trigger critical error notification
   */
  private triggerCriticalErrorNotification(
    message: string,
    error?: { message: string; stack?: string; code?: string },
    context?: LogContext,
    metadata?: Record<string, any>
  ): void {
    // Import notification service dynamically to avoid circular dependencies
    import('./notifications').then(({ notificationService }) => {
      notificationService.notifyCriticalError(message, error, context, metadata);
    }).catch((err) => {
      // If notification service fails to load, log to console
      console.error('[CRITICAL ERROR - NOTIFICATION SERVICE FAILED]', {
        message,
        error,
        context,
        metadata,
        notificationError: err,
      });
    });
  }

  /**
   * Create a child logger with default context
   */
  child(defaultContext: LogContext): Logger {
    const childLogger = new Logger();
    childLogger.minLevel = this.minLevel;

    // Override log methods to include default context
    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = (entry: LogEntry) => {
      originalLog({
        ...entry,
        context: { ...defaultContext, ...entry.context },
      });
    };

    return childLogger;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export class for testing
export { Logger };
