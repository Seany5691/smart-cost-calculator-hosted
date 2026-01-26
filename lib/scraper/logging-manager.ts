/**
 * LoggingManager - Thread-safe logging service with UI callback support
 * 
 * Manages log collection, formatting, and statistics tracking for scraping operations.
 * Maintains a circular buffer for display and generates summary reports.
 * 
 * Validates Requirements: 9.1, 9.2, 9.3, 9.4, 15.1, 15.2, 15.3, 15.4, 15.5, 16.1, 16.2, 16.3, 16.4
 */

import { EventEmitter } from 'events';
import { LogEntry, TownLog, SessionSummary } from './types';

export class LoggingManager {
  private eventEmitter: EventEmitter;
  private displayLogs: LogEntry[] = [];
  private fullLogs: string[] = [];
  private townLogs: Map<string, TownLog> = new Map();
  private maxDisplayLogs: number = 300;
  private sessionStartTime: number = 0;

  /**
   * Creates a new LoggingManager instance
   * 
   * @param eventEmitter - EventEmitter for emitting log events to UI
   */
  constructor(eventEmitter: EventEmitter) {
    this.eventEmitter = eventEmitter;
    this.sessionStartTime = Date.now();
  }

  /**
   * Logs the start of scraping for a town
   * 
   * @param town - Town name
   * 
   * Validates Requirement 9.1: Emit progress events with town information
   * Validates Requirement 15.1: Display logs in real-time with timestamps
   */
  logTownStart(town: string): void {
    const townLog: TownLog = {
      townName: town,
      startTime: Date.now(),
      leadCount: 0,
      status: 'in_progress',
      errors: [],
      industryProgress: {}
    };

    this.townLogs.set(town, townLog);

    const message = `Started scraping: ${town}`;
    this.addLog('info', message);
  }

  /**
   * Logs the completion of scraping for a town
   * 
   * @param town - Town name
   * @param leadCount - Number of businesses found
   * @param duration - Duration in milliseconds
   * 
   * Validates Requirement 9.2: Calculate average time per town and estimate remaining time
   * Validates Requirement 15.1: Display logs in real-time with timestamps
   * Validates Requirement 16.4: Track town completion times for accurate time estimation
   */
  logTownComplete(town: string, leadCount: number, duration: number): void {
    const townLog = this.townLogs.get(town);
    
    if (townLog) {
      townLog.endTime = Date.now();
      townLog.leadCount = leadCount;
      townLog.status = 'completed';
    }

    const durationSeconds = (duration / 1000).toFixed(2);
    const message = `Completed: ${town} - ${leadCount} businesses in ${durationSeconds}s`;
    this.addLog('success', message);
  }

  /**
   * Logs progress for an industry within a town
   * 
   * @param town - Town name
   * @param industry - Industry name
   * @param status - Status message
   * 
   * Validates Requirement 9.1: Emit progress events with industry information
   * Validates Requirement 15.1: Display logs in real-time with timestamps
   */
  logIndustryProgress(town: string, industry: string, status: string): void {
    const townLog = this.townLogs.get(town);
    
    if (townLog) {
      townLog.industryProgress[industry] = status;
    }

    const message = `${town} - ${industry}: ${status}`;
    this.addLog('info', message);
  }

  /**
   * Logs an error for a town and industry
   * 
   * @param town - Town name
   * @param industry - Industry name
   * @param error - Error message
   * 
   * Validates Requirement 15.2: Use color coding for log levels (error = red)
   * Validates Requirement 16.1: Track total errors in summary
   */
  logError(town: string, industry: string, error: string): void {
    const townLog = this.townLogs.get(town);
    
    if (townLog) {
      townLog.errors.push(`${industry}: ${error}`);
      
      // Update status to error if not already completed
      if (townLog.status === 'in_progress') {
        townLog.status = 'error';
      }
    }

    const message = `ERROR - ${town} - ${industry}: ${error}`;
    this.addLog('error', message);
  }

  /**
   * Logs a general message
   * 
   * @param message - Message to log
   * 
   * Validates Requirement 15.1: Display logs in real-time with timestamps
   */
  logMessage(message: string): void {
    this.addLog('info', message);
  }

  /**
   * Adds a log entry to both display and full logs
   * 
   * @param level - Log level
   * @param message - Log message
   * 
   * Validates Requirement 15.3: Maintain circular buffer with max 300 logs
   * Validates Requirement 15.5: Maintain separate full logs for export (no size limit)
   */
  private addLog(level: 'info' | 'error' | 'success', message: string): void {
    const timestamp = new Date().toISOString();
    
    const logEntry: LogEntry = {
      timestamp,
      message,
      level
    };

    // Add to display logs (circular buffer)
    this.displayLogs.push(logEntry);
    if (this.displayLogs.length > this.maxDisplayLogs) {
      this.displayLogs.shift(); // Remove oldest entry
    }

    // Add to full logs (unlimited)
    const fullLogMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    this.fullLogs.push(fullLogMessage);

    // Emit log event to UI
    this.eventEmitter.emit('log', logEntry);
  }

  /**
   * Gets the display logs (circular buffer) as a formatted string
   * 
   * @returns String representation of display logs
   * 
   * Validates Requirement 15.3: Display logs from circular buffer
   */
  getDisplayLogs(): string {
    return this.displayLogs
      .map(log => `[${log.timestamp}] ${log.message}`)
      .join('\n');
  }

  /**
   * Gets all display log entries
   * 
   * @returns Array of log entries
   * 
   * Validates Requirement 15.1: Provide log entries for UI display
   */
  getDisplayLogEntries(): LogEntry[] {
    return [...this.displayLogs];
  }

  /**
   * Gets all full logs
   * 
   * @returns Array of full log strings
   * 
   * Validates Requirement 15.5: Provide full logs for export
   */
  getFullLogs(): string[] {
    return [...this.fullLogs];
  }

  /**
   * Gets town logs
   * 
   * @returns Map of town name to TownLog
   * 
   * Validates Requirement 16.3: Provide town-level statistics
   */
  getTownLogs(): Map<string, TownLog> {
    return new Map(this.townLogs);
  }

  /**
   * Generates a summary of the scraping session
   * 
   * @returns SessionSummary object
   * 
   * Validates Requirement 16.1: Display summary with total towns, completed towns, total businesses, total errors
   * Validates Requirement 16.2: Include total duration and average duration per town
   */
  getSummary(): SessionSummary {
    const completedTowns = Array.from(this.townLogs.values()).filter(
      log => log.status === 'completed'
    );

    const totalLeads = completedTowns.reduce(
      (sum, log) => sum + log.leadCount,
      0
    );

    const totalErrors = Array.from(this.townLogs.values()).reduce(
      (sum, log) => sum + log.errors.length,
      0
    );

    const totalDuration = Date.now() - this.sessionStartTime;

    const durations = completedTowns
      .filter(log => log.endTime)
      .map(log => log.endTime! - log.startTime);

    const averageDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;

    return {
      totalTowns: this.townLogs.size,
      completedTowns: completedTowns.length,
      totalLeads,
      totalErrors,
      totalDuration,
      averageDuration
    };
  }

  /**
   * Generates a summary table for export
   * 
   * @returns Array of summary strings
   * 
   * Validates Requirement 16.3: Generate table with town name, business count, and status
   */
  getSummaryTable(): string[] {
    const summary: string[] = [];
    
    summary.push('=== SCRAPING SUMMARY ===');
    summary.push('');
    summary.push('Town Name | Businesses Scraped | Status');
    summary.push('-'.repeat(60));

    for (const [townName, townLog] of this.townLogs) {
      const status = townLog.status === 'completed' 
        ? 'Completed'
        : townLog.status === 'error'
        ? 'Error'
        : 'In Progress';

      summary.push(`${townName} | ${townLog.leadCount} | ${status}`);
    }

    summary.push('');
    
    const sessionSummary = this.getSummary();
    summary.push(`Total Towns: ${sessionSummary.totalTowns}`);
    summary.push(`Completed Towns: ${sessionSummary.completedTowns}`);
    summary.push(`Total Businesses: ${sessionSummary.totalLeads}`);
    summary.push(`Total Errors: ${sessionSummary.totalErrors}`);
    summary.push(`Total Duration: ${(sessionSummary.totalDuration / 1000).toFixed(2)}s`);
    summary.push(`Average Duration per Town: ${(sessionSummary.averageDuration / 1000).toFixed(2)}s`);

    return summary;
  }

  /**
   * Clears all logs and resets state
   */
  clear(): void {
    this.displayLogs = [];
    this.fullLogs = [];
    this.townLogs.clear();
    this.sessionStartTime = Date.now();
  }

  /**
   * Gets the session start time
   * 
   * @returns Session start time in milliseconds
   */
  getSessionStartTime(): number {
    return this.sessionStartTime;
  }

  /**
   * Sets the maximum number of display logs
   * 
   * @param max - Maximum number of logs to keep in display buffer
   * 
   * Validates Requirement 15.3: Maintain circular buffer with configurable max size
   */
  setMaxDisplayLogs(max: number): void {
    this.maxDisplayLogs = max;
    
    // Trim existing logs if needed
    while (this.displayLogs.length > this.maxDisplayLogs) {
      this.displayLogs.shift();
    }
  }
}
