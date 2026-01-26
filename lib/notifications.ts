/**
 * Critical Error Notification Service
 * 
 * Sends notifications to administrators when critical errors occur.
 * Supports multiple notification channels:
 * - Email (future implementation)
 * - Database logging for admin dashboard
 * - Console alerts (development)
 * 
 * Validates: Requirements 13.4
 */

import { logger, LogContext } from './logger';
import { pool } from './db';

export interface CriticalErrorNotification {
  id?: string;
  message: string;
  errorDetails?: {
    message: string;
    stack?: string;
    code?: string;
  };
  context?: LogContext;
  metadata?: Record<string, any>;
  notifiedAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

/**
 * Notification service class
 */
class NotificationService {
  private adminEmails: string[] = [];
  
  constructor() {
    // Load admin emails from environment variable
    const emails = process.env.ADMIN_NOTIFICATION_EMAILS;
    if (emails) {
      this.adminEmails = emails.split(',').map(email => email.trim());
    }
  }

  /**
   * Send critical error notification to administrators
   */
  async notifyCriticalError(
    message: string,
    errorDetails?: {
      message: string;
      stack?: string;
      code?: string;
    },
    context?: LogContext,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // 1. Log to database for admin dashboard
      await this.logToDatabase(message, errorDetails, context, metadata);

      // 2. Send email notifications (if configured)
      if (this.adminEmails.length > 0) {
        await this.sendEmailNotifications(message, errorDetails, context, metadata);
      }

      // 3. Log to console in development
      if (process.env.NODE_ENV !== 'production') {
        this.logToConsole(message, errorDetails, context, metadata);
      }

      logger.info('Critical error notification sent', context, {
        message,
        notificationChannels: this.getActiveChannels(),
      });
    } catch (error) {
      // If notification fails, log the error but don't throw
      // We don't want notification failures to crash the application
      logger.error(
        'Failed to send critical error notification',
        error instanceof Error ? error : undefined,
        context,
        { originalMessage: message }
      );
    }
  }

  /**
   * Log critical error to database for admin dashboard
   */
  private async logToDatabase(
    message: string,
    errorDetails?: {
      message: string;
      stack?: string;
      code?: string;
    },
    context?: LogContext,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO critical_errors (
          message,
          error_details,
          context,
          metadata,
          notified_at,
          acknowledged
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;

      const values = [
        message,
        errorDetails ? JSON.stringify(errorDetails) : null,
        context ? JSON.stringify(context) : null,
        metadata ? JSON.stringify(metadata) : null,
        new Date(),
        false,
      ];

      await pool.query(query, values);
    } catch (error) {
      // If database logging fails, log to console
      console.error('Failed to log critical error to database:', error);
      console.error('Original critical error:', { message, errorDetails, context, metadata });
    }
  }

  /**
   * Send email notifications to administrators
   * This is a placeholder for future email integration
   */
  private async sendEmailNotifications(
    message: string,
    errorDetails?: {
      message: string;
      stack?: string;
      code?: string;
    },
    context?: LogContext,
    metadata?: Record<string, any>
  ): Promise<void> {
    // TODO: Implement email sending using a service like SendGrid, AWS SES, or Nodemailer
    // For now, we'll just log that an email would be sent
    
    const emailContent = this.formatEmailContent(message, errorDetails, context, metadata);
    
    logger.info('Email notification would be sent', undefined, {
      recipients: this.adminEmails,
      subject: `[CRITICAL] ${message}`,
      preview: emailContent.substring(0, 100),
    });

    // Example implementation (commented out):
    /*
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: this.adminEmails.join(','),
      subject: `[CRITICAL] ${message}`,
      text: emailContent,
      html: this.formatEmailHtml(message, errorDetails, context, metadata),
    });
    */
  }

  /**
   * Format email content
   */
  private formatEmailContent(
    message: string,
    errorDetails?: {
      message: string;
      stack?: string;
      code?: string;
    },
    context?: LogContext,
    metadata?: Record<string, any>
  ): string {
    let content = `CRITICAL ERROR ALERT\n\n`;
    content += `Message: ${message}\n\n`;

    if (errorDetails) {
      content += `Error Details:\n`;
      content += `  Message: ${errorDetails.message}\n`;
      if (errorDetails.code) {
        content += `  Code: ${errorDetails.code}\n`;
      }
      if (errorDetails.stack) {
        content += `  Stack Trace:\n${errorDetails.stack}\n`;
      }
      content += `\n`;
    }

    if (context) {
      content += `Context:\n`;
      if (context.userId) content += `  User ID: ${context.userId}\n`;
      if (context.username) content += `  Username: ${context.username}\n`;
      if (context.role) content += `  Role: ${context.role}\n`;
      if (context.requestId) content += `  Request ID: ${context.requestId}\n`;
      content += `\n`;
    }

    if (metadata) {
      content += `Additional Information:\n`;
      content += JSON.stringify(metadata, null, 2);
      content += `\n`;
    }

    content += `\nTimestamp: ${new Date().toISOString()}\n`;
    content += `Environment: ${process.env.NODE_ENV || 'development'}\n`;

    return content;
  }

  /**
   * Log to console (development only)
   */
  private logToConsole(
    message: string,
    errorDetails?: {
      message: string;
      stack?: string;
      code?: string;
    },
    context?: LogContext,
    metadata?: Record<string, any>
  ): void {
    console.error('\n' + '='.repeat(80));
    console.error('🚨 CRITICAL ERROR - ADMIN NOTIFICATION REQUIRED 🚨');
    console.error('='.repeat(80));
    console.error(`\nMessage: ${message}`);
    
    if (errorDetails) {
      console.error('\nError Details:');
      console.error(errorDetails);
    }
    
    if (context) {
      console.error('\nContext:');
      console.error(context);
    }
    
    if (metadata) {
      console.error('\nMetadata:');
      console.error(metadata);
    }
    
    console.error('\nTimestamp:', new Date().toISOString());
    console.error('='.repeat(80) + '\n');
  }

  /**
   * Get active notification channels
   */
  private getActiveChannels(): string[] {
    const channels: string[] = ['database'];
    
    if (this.adminEmails.length > 0) {
      channels.push('email');
    }
    
    if (process.env.NODE_ENV !== 'production') {
      channels.push('console');
    }
    
    return channels;
  }

  /**
   * Get unacknowledged critical errors (for admin dashboard)
   */
  async getUnacknowledgedErrors(): Promise<CriticalErrorNotification[]> {
    try {
      const query = `
        SELECT 
          id,
          message,
          error_details,
          context,
          metadata,
          notified_at,
          acknowledged,
          acknowledged_by,
          acknowledged_at
        FROM critical_errors
        WHERE acknowledged = false
        ORDER BY notified_at DESC
        LIMIT 50
      `;

      const result = await pool.query(query);

      return result.rows.map(row => ({
        id: row.id,
        message: row.message,
        errorDetails: row.error_details ? JSON.parse(row.error_details) : undefined,
        context: row.context ? JSON.parse(row.context) : undefined,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        notifiedAt: row.notified_at,
        acknowledged: row.acknowledged,
        acknowledgedBy: row.acknowledged_by,
        acknowledgedAt: row.acknowledged_at,
      }));
    } catch (error) {
      logger.error('Failed to fetch unacknowledged errors', error instanceof Error ? error : undefined);
      return [];
    }
  }

  /**
   * Acknowledge a critical error
   */
  async acknowledgeError(errorId: string, userId: string): Promise<void> {
    try {
      const query = `
        UPDATE critical_errors
        SET 
          acknowledged = true,
          acknowledged_by = $1,
          acknowledged_at = $2
        WHERE id = $3
      `;

      await pool.query(query, [userId, new Date(), errorId]);

      logger.info('Critical error acknowledged', { userId }, { errorId });
    } catch (error) {
      logger.error('Failed to acknowledge critical error', error instanceof Error ? error : undefined, { userId }, { errorId });
      throw error;
    }
  }

  /**
   * Get critical error statistics
   */
  async getErrorStats(days: number = 7): Promise<{
    total: number;
    unacknowledged: number;
    byDay: Array<{ date: string; count: number }>;
  }> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE acknowledged = false) as unacknowledged,
          DATE(notified_at) as date,
          COUNT(*) as count
        FROM critical_errors
        WHERE notified_at >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE(notified_at)
        ORDER BY date DESC
      `;

      const result = await pool.query(query);

      const total = result.rows.length > 0 ? parseInt(result.rows[0].total) : 0;
      const unacknowledged = result.rows.length > 0 ? parseInt(result.rows[0].unacknowledged) : 0;
      const byDay = result.rows.map(row => ({
        date: row.date,
        count: parseInt(row.count),
      }));

      return { total, unacknowledged, byDay };
    } catch (error) {
      logger.error('Failed to fetch error stats', error instanceof Error ? error : undefined);
      return { total: 0, unacknowledged: 0, byDay: [] };
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

// Export class for testing
export { NotificationService };
