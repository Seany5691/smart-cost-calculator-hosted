/**
 * Unit tests for LoggingManager
 * 
 * Tests the logging functionality including:
 * - Town-level logging
 * - Circular buffer for display logs
 * - Full logs storage
 * - Summary generation
 */

import { EventEmitter } from 'events';
import { LoggingManager } from '../../../lib/scraper/logging-manager';
import { LogEntry, TownLog, SessionSummary } from '../../../lib/scraper/types';

describe('LoggingManager', () => {
  let eventEmitter: EventEmitter;
  let loggingManager: LoggingManager;

  beforeEach(() => {
    eventEmitter = new EventEmitter();
    loggingManager = new LoggingManager(eventEmitter);
  });

  describe('Town-level logging', () => {
    test('logTownStart creates town log entry', () => {
      loggingManager.logTownStart('Cape Town');

      const townLogs = loggingManager.getTownLogs();
      expect(townLogs.has('Cape Town')).toBe(true);

      const townLog = townLogs.get('Cape Town')!;
      expect(townLog.townName).toBe('Cape Town');
      expect(townLog.status).toBe('in_progress');
      expect(townLog.leadCount).toBe(0);
      expect(townLog.errors).toEqual([]);
      expect(townLog.industryProgress).toEqual({});
    });

    test('logTownComplete updates town log with results', () => {
      loggingManager.logTownStart('Cape Town');
      loggingManager.logTownComplete('Cape Town', 25, 5000);

      const townLog = loggingManager.getTownLogs().get('Cape Town')!;
      expect(townLog.status).toBe('completed');
      expect(townLog.leadCount).toBe(25);
      expect(townLog.endTime).toBeDefined();
    });

    test('logIndustryProgress updates industry progress', () => {
      loggingManager.logTownStart('Cape Town');
      loggingManager.logIndustryProgress('Cape Town', 'Restaurants', 'Scraping...');

      const townLog = loggingManager.getTownLogs().get('Cape Town')!;
      expect(townLog.industryProgress['Restaurants']).toBe('Scraping...');
    });

    test('logError adds error to town log', () => {
      loggingManager.logTownStart('Cape Town');
      loggingManager.logError('Cape Town', 'Restaurants', 'Failed to load page');

      const townLog = loggingManager.getTownLogs().get('Cape Town')!;
      expect(townLog.errors).toContain('Restaurants: Failed to load page');
      expect(townLog.status).toBe('error');
    });

    test('logError does not change status if town already completed', () => {
      loggingManager.logTownStart('Cape Town');
      loggingManager.logTownComplete('Cape Town', 25, 5000);
      loggingManager.logError('Cape Town', 'Restaurants', 'Late error');

      const townLog = loggingManager.getTownLogs().get('Cape Town')!;
      expect(townLog.status).toBe('completed');
      expect(townLog.errors).toContain('Restaurants: Late error');
    });
  });

  describe('Circular buffer for display logs', () => {
    test('maintains max 300 display logs by default', () => {
      // Add 350 logs
      for (let i = 0; i < 350; i++) {
        loggingManager.logMessage(`Log ${i}`);
      }

      const displayLogs = loggingManager.getDisplayLogEntries();
      expect(displayLogs.length).toBe(300);

      // Should have the last 300 logs (50-349)
      expect(displayLogs[0].message).toBe('Log 50');
      expect(displayLogs[299].message).toBe('Log 349');
    });

    test('setMaxDisplayLogs changes buffer size', () => {
      loggingManager.setMaxDisplayLogs(100);

      // Add 150 logs
      for (let i = 0; i < 150; i++) {
        loggingManager.logMessage(`Log ${i}`);
      }

      const displayLogs = loggingManager.getDisplayLogEntries();
      expect(displayLogs.length).toBe(100);

      // Should have the last 100 logs (50-149)
      expect(displayLogs[0].message).toBe('Log 50');
      expect(displayLogs[99].message).toBe('Log 149');
    });

    test('setMaxDisplayLogs trims existing logs', () => {
      // Add 200 logs
      for (let i = 0; i < 200; i++) {
        loggingManager.logMessage(`Log ${i}`);
      }

      // Reduce max to 50
      loggingManager.setMaxDisplayLogs(50);

      const displayLogs = loggingManager.getDisplayLogEntries();
      expect(displayLogs.length).toBe(50);

      // Should have the last 50 logs (150-199)
      expect(displayLogs[0].message).toBe('Log 150');
      expect(displayLogs[49].message).toBe('Log 199');
    });
  });

  describe('Full logs storage', () => {
    test('stores all logs without limit', () => {
      // Add 500 logs
      for (let i = 0; i < 500; i++) {
        loggingManager.logMessage(`Log ${i}`);
      }

      const fullLogs = loggingManager.getFullLogs();
      expect(fullLogs.length).toBe(500);

      // Display logs should still be limited to 300
      const displayLogs = loggingManager.getDisplayLogEntries();
      expect(displayLogs.length).toBe(300);
    });

    test('full logs include timestamp and level', () => {
      loggingManager.logMessage('Test message');

      const fullLogs = loggingManager.getFullLogs();
      expect(fullLogs[0]).toMatch(/\[.*\] \[INFO\] Test message/);
    });

    test('full logs include different log levels', () => {
      loggingManager.logMessage('Info message');
      loggingManager.logTownStart('Cape Town');
      loggingManager.logTownComplete('Cape Town', 10, 1000);
      loggingManager.logError('Cape Town', 'Restaurants', 'Error message');

      const fullLogs = loggingManager.getFullLogs();
      expect(fullLogs.some(log => log.includes('[INFO]'))).toBe(true);
      expect(fullLogs.some(log => log.includes('[SUCCESS]'))).toBe(true);
      expect(fullLogs.some(log => log.includes('[ERROR]'))).toBe(true);
    });
  });

  describe('Event emission', () => {
    test('emits log event when adding log', (done) => {
      eventEmitter.on('log', (logEntry: LogEntry) => {
        expect(logEntry.message).toBe('Test message');
        expect(logEntry.level).toBe('info');
        expect(logEntry.timestamp).toBeDefined();
        done();
      });

      loggingManager.logMessage('Test message');
    });

    test('emits log event for town start', (done) => {
      eventEmitter.on('log', (logEntry: LogEntry) => {
        expect(logEntry.message).toBe('Started scraping: Cape Town');
        expect(logEntry.level).toBe('info');
        done();
      });

      loggingManager.logTownStart('Cape Town');
    });

    test('emits log event for town complete', (done) => {
      loggingManager.logTownStart('Cape Town');

      eventEmitter.on('log', (logEntry: LogEntry) => {
        if (logEntry.message.includes('Completed:')) {
          expect(logEntry.message).toContain('Cape Town');
          expect(logEntry.message).toContain('25 businesses');
          expect(logEntry.level).toBe('success');
          done();
        }
      });

      loggingManager.logTownComplete('Cape Town', 25, 5000);
    });

    test('emits log event for errors', (done) => {
      loggingManager.logTownStart('Cape Town');

      eventEmitter.on('log', (logEntry: LogEntry) => {
        if (logEntry.level === 'error') {
          expect(logEntry.message).toContain('ERROR');
          expect(logEntry.message).toContain('Cape Town');
          expect(logEntry.message).toContain('Restaurants');
          done();
        }
      });

      loggingManager.logError('Cape Town', 'Restaurants', 'Failed');
    });
  });

  describe('Summary generation', () => {
    test('getSummary returns correct statistics', async () => {
      // Add some town logs
      loggingManager.logTownStart('Cape Town');
      
      // Wait a tiny bit to ensure duration > 0
      await new Promise(resolve => setTimeout(resolve, 10));
      
      loggingManager.logTownComplete('Cape Town', 25, 5000);

      loggingManager.logTownStart('Johannesburg');
      loggingManager.logTownComplete('Johannesburg', 30, 6000);

      loggingManager.logTownStart('Durban');
      loggingManager.logError('Durban', 'Restaurants', 'Failed');

      const summary = loggingManager.getSummary();

      expect(summary.totalTowns).toBe(3);
      expect(summary.completedTowns).toBe(2);
      expect(summary.totalLeads).toBe(55); // 25 + 30
      expect(summary.totalErrors).toBe(1);
      expect(summary.totalDuration).toBeGreaterThanOrEqual(0);
      expect(summary.averageDuration).toBeGreaterThanOrEqual(0);
    });

    test('getSummary handles no completed towns', () => {
      loggingManager.logTownStart('Cape Town');

      const summary = loggingManager.getSummary();

      expect(summary.totalTowns).toBe(1);
      expect(summary.completedTowns).toBe(0);
      expect(summary.totalLeads).toBe(0);
      expect(summary.totalErrors).toBe(0);
      expect(summary.averageDuration).toBe(0);
    });

    test('getSummaryTable generates formatted table', () => {
      loggingManager.logTownStart('Cape Town');
      loggingManager.logTownComplete('Cape Town', 25, 5000);

      loggingManager.logTownStart('Johannesburg');
      loggingManager.logError('Johannesburg', 'Restaurants', 'Failed');

      const table = loggingManager.getSummaryTable();

      expect(table).toContain('=== SCRAPING SUMMARY ===');
      expect(table.some(line => line.includes('Cape Town') && line.includes('25') && line.includes('Completed'))).toBe(true);
      expect(table.some(line => line.includes('Johannesburg') && line.includes('Error'))).toBe(true);
      expect(table.some(line => line.includes('Total Towns: 2'))).toBe(true);
      expect(table.some(line => line.includes('Completed Towns: 1'))).toBe(true);
      expect(table.some(line => line.includes('Total Businesses: 25'))).toBe(true);
    });
  });

  describe('Display log formatting', () => {
    test('getDisplayLogs returns formatted string', () => {
      loggingManager.logMessage('First message');
      loggingManager.logMessage('Second message');

      const displayLogs = loggingManager.getDisplayLogs();

      expect(displayLogs).toContain('First message');
      expect(displayLogs).toContain('Second message');
      expect(displayLogs).toMatch(/\[.*\] First message/);
      expect(displayLogs).toMatch(/\[.*\] Second message/);
    });

    test('getDisplayLogEntries returns array of log entries', () => {
      loggingManager.logMessage('Test message');

      const entries = loggingManager.getDisplayLogEntries();

      expect(entries).toHaveLength(1);
      expect(entries[0].message).toBe('Test message');
      expect(entries[0].level).toBe('info');
      expect(entries[0].timestamp).toBeDefined();
    });
  });

  describe('Clear functionality', () => {
    test('clear resets all logs and state', () => {
      loggingManager.logTownStart('Cape Town');
      loggingManager.logTownComplete('Cape Town', 25, 5000);
      loggingManager.logMessage('Test message');

      loggingManager.clear();

      expect(loggingManager.getDisplayLogEntries()).toHaveLength(0);
      expect(loggingManager.getFullLogs()).toHaveLength(0);
      expect(loggingManager.getTownLogs().size).toBe(0);

      const summary = loggingManager.getSummary();
      expect(summary.totalTowns).toBe(0);
      expect(summary.completedTowns).toBe(0);
      expect(summary.totalLeads).toBe(0);
    });

    test('clear resets session start time', () => {
      const startTime1 = loggingManager.getSessionStartTime();

      // Wait a bit
      setTimeout(() => {
        loggingManager.clear();
        const startTime2 = loggingManager.getSessionStartTime();

        expect(startTime2).toBeGreaterThan(startTime1);
      }, 10);
    });
  });

  describe('Edge cases', () => {
    test('handles logging for non-existent town gracefully', () => {
      // Should not throw error
      loggingManager.logTownComplete('NonExistent', 10, 1000);
      loggingManager.logIndustryProgress('NonExistent', 'Restaurants', 'Done');
      loggingManager.logError('NonExistent', 'Restaurants', 'Error');

      // Logs should still be added
      expect(loggingManager.getDisplayLogEntries().length).toBeGreaterThan(0);
    });

    test('handles multiple errors for same town', () => {
      loggingManager.logTownStart('Cape Town');
      loggingManager.logError('Cape Town', 'Restaurants', 'Error 1');
      loggingManager.logError('Cape Town', 'Hotels', 'Error 2');
      loggingManager.logError('Cape Town', 'Shops', 'Error 3');

      const townLog = loggingManager.getTownLogs().get('Cape Town')!;
      expect(townLog.errors).toHaveLength(3);

      const summary = loggingManager.getSummary();
      expect(summary.totalErrors).toBe(3);
    });

    test('handles zero duration for town completion', () => {
      loggingManager.logTownStart('Cape Town');
      loggingManager.logTownComplete('Cape Town', 10, 0);

      const displayLogs = loggingManager.getDisplayLogs();
      expect(displayLogs).toContain('0.00s');
    });

    test('handles very large lead counts', () => {
      loggingManager.logTownStart('Cape Town');
      loggingManager.logTownComplete('Cape Town', 999999, 10000);

      const summary = loggingManager.getSummary();
      expect(summary.totalLeads).toBe(999999);
    });
  });

  describe('Log level handling', () => {
    test('correctly assigns info level', () => {
      loggingManager.logMessage('Info message');
      loggingManager.logTownStart('Cape Town');
      loggingManager.logIndustryProgress('Cape Town', 'Restaurants', 'Scraping');

      const entries = loggingManager.getDisplayLogEntries();
      expect(entries.every(e => e.level === 'info')).toBe(true);
    });

    test('correctly assigns success level', () => {
      loggingManager.logTownStart('Cape Town');
      loggingManager.logTownComplete('Cape Town', 10, 1000);

      const entries = loggingManager.getDisplayLogEntries();
      const successEntry = entries.find(e => e.message.includes('Completed:'));
      expect(successEntry?.level).toBe('success');
    });

    test('correctly assigns error level', () => {
      loggingManager.logTownStart('Cape Town');
      loggingManager.logError('Cape Town', 'Restaurants', 'Failed');

      const entries = loggingManager.getDisplayLogEntries();
      const errorEntry = entries.find(e => e.message.includes('ERROR'));
      expect(errorEntry?.level).toBe('error');
    });
  });
});
