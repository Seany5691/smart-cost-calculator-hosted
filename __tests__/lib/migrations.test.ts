/**
 * Unit tests for Migration System
 * Tests migration runner logic and rollback functionality
 * Requirements: 14.1
 */

import { MigrationRunner } from '@/lib/migrations';
import { getClient } from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { PoolClient } from 'pg';

// Mock dependencies
jest.mock('@/lib/db');
jest.mock('fs');
jest.mock('path');

describe('MigrationRunner', () => {
  let mockClient: Partial<PoolClient>;
  let migrationRunner: MigrationRunner;
  const testMigrationsDir = '/test/migrations';

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock database client
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    (getClient as jest.Mock).mockResolvedValue(mockClient);

    // Mock path.join to return predictable paths
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

    migrationRunner = new MigrationRunner(testMigrationsDir);
  });

  describe('Migration Runner Logic', () => {
    test('should create migrations table if it does not exist', async () => {
      // Mock empty migrations directory
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([]);

      await migrationRunner.runMigrations();

      // Verify migrations table creation
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS migrations')
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('should execute pending SQL migrations in order', async () => {
      const migrationFiles = [
        '001_initial_schema.sql',
        '002_add_users.sql',
        '003_add_indexes.sql',
      ];

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(migrationFiles);
      (fs.readFileSync as jest.Mock).mockReturnValue('CREATE TABLE test;');

      // Mock that no migrations have been executed
      (mockClient.query as jest.Mock).mockImplementation((query: string) => {
        if (query.includes('SELECT 1 FROM migrations')) {
          return Promise.resolve({ rowCount: 0, rows: [] });
        }
        return Promise.resolve({ rowCount: 1, rows: [] });
      });

      await migrationRunner.runMigrations();

      // Verify all migrations were executed
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      
      // Each migration should be checked and executed
      migrationFiles.forEach(file => {
        expect(mockClient.query).toHaveBeenCalledWith(
          'SELECT 1 FROM migrations WHERE name = $1',
          [file]
        );
        expect(mockClient.query).toHaveBeenCalledWith(
          'INSERT INTO migrations (name) VALUES ($1)',
          [file]
        );
      });

      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('should skip already executed migrations', async () => {
      const migrationFiles = [
        '001_initial_schema.sql',
        '002_add_users.sql',
      ];

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(migrationFiles);
      (fs.readFileSync as jest.Mock).mockReturnValue('CREATE TABLE test;');

      // Mock that first migration is already executed
      (mockClient.query as jest.Mock).mockImplementation((query: string, params?: any[]) => {
        if (query.includes('SELECT 1 FROM migrations')) {
          if (params && params[0] === '001_initial_schema.sql') {
            return Promise.resolve({ rowCount: 1, rows: [{}] });
          }
          return Promise.resolve({ rowCount: 0, rows: [] });
        }
        return Promise.resolve({ rowCount: 1, rows: [] });
      });

      await migrationRunner.runMigrations();

      // Verify only second migration was executed
      const insertCalls = (mockClient.query as jest.Mock).mock.calls.filter(
        call => call[0].includes('INSERT INTO migrations')
      );
      expect(insertCalls).toHaveLength(1);
      expect(insertCalls[0][1][0]).toBe('002_add_users.sql');
    });

    test('should handle empty migrations directory', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([]);

      await migrationRunner.runMigrations();

      // Should still create migrations table but not execute any migrations
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS migrations')
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('should create migrations directory if it does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);

      await migrationRunner.runMigrations();

      expect(fs.mkdirSync).toHaveBeenCalledWith(testMigrationsDir, { recursive: true });
    });

    test('should rollback transaction on migration failure', async () => {
      const migrationFiles = ['001_failing_migration.sql'];

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(migrationFiles);
      (fs.readFileSync as jest.Mock).mockReturnValue('INVALID SQL;');

      // Mock migration check to return not executed
      (mockClient.query as jest.Mock).mockImplementation((query: string) => {
        if (query.includes('SELECT 1 FROM migrations')) {
          return Promise.resolve({ rowCount: 0, rows: [] });
        }
        if (query.includes('INVALID SQL')) {
          return Promise.reject(new Error('SQL syntax error'));
        }
        return Promise.resolve({ rowCount: 1, rows: [] });
      });

      await expect(migrationRunner.runMigrations()).rejects.toThrow('SQL syntax error');

      // Verify rollback was called
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('Rollback Functionality', () => {
    test('should rollback the last executed migration', async () => {
      const lastMigration = '003_add_indexes.sql';
      const rollbackFile = '003_add_indexes.rollback.sql';

      // Mock getting last migration
      (mockClient.query as jest.Mock).mockImplementation((query: string) => {
        if (query.includes('SELECT name FROM migrations ORDER BY executed_at DESC')) {
          return Promise.resolve({
            rowCount: 1,
            rows: [{ name: lastMigration }],
          });
        }
        return Promise.resolve({ rowCount: 1, rows: [] });
      });

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('DROP TABLE test;');

      await migrationRunner.rollbackLastMigration();

      // Verify rollback SQL was executed
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('DROP TABLE test;');
      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM migrations WHERE name = $1',
        [lastMigration]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('should handle no migrations to rollback', async () => {
      // Mock no migrations exist
      (mockClient.query as jest.Mock).mockImplementation((query: string) => {
        if (query.includes('SELECT name FROM migrations')) {
          return Promise.resolve({ rowCount: 0, rows: [] });
        }
        return Promise.resolve({ rowCount: 1, rows: [] });
      });

      await migrationRunner.rollbackLastMigration();

      // Should commit without doing anything
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      
      // Should not attempt to delete any migration
      const deleteCalls = (mockClient.query as jest.Mock).mock.calls.filter(
        call => call[0].includes('DELETE FROM migrations')
      );
      expect(deleteCalls).toHaveLength(0);
    });

    test('should warn if rollback file does not exist', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const lastMigration = '003_add_indexes.sql';

      (mockClient.query as jest.Mock).mockImplementation((query: string) => {
        if (query.includes('SELECT name FROM migrations ORDER BY executed_at DESC')) {
          return Promise.resolve({
            rowCount: 1,
            rows: [{ name: lastMigration }],
          });
        }
        return Promise.resolve({ rowCount: 1, rows: [] });
      });

      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await migrationRunner.rollbackLastMigration();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No rollback file found')
      );

      consoleSpy.mockRestore();
    });

    test('should rollback transaction on rollback failure', async () => {
      const lastMigration = '003_add_indexes.sql';

      (mockClient.query as jest.Mock).mockImplementation((query: string) => {
        if (query.includes('SELECT name FROM migrations ORDER BY executed_at DESC')) {
          return Promise.resolve({
            rowCount: 1,
            rows: [{ name: lastMigration }],
          });
        }
        if (query.includes('DROP TABLE')) {
          return Promise.reject(new Error('Table does not exist'));
        }
        return Promise.resolve({ rowCount: 1, rows: [] });
      });

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('DROP TABLE test;');

      await expect(migrationRunner.rollbackLastMigration()).rejects.toThrow('Table does not exist');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('Migration Status Queries', () => {
    test('should get list of executed migrations', async () => {
      const executedMigrations = [
        { name: '001_initial_schema.sql' },
        { name: '002_add_users.sql' },
        { name: '003_add_indexes.sql' },
      ];

      (mockClient.query as jest.Mock).mockResolvedValue({
        rows: executedMigrations,
      });

      const result = await migrationRunner.getExecutedMigrations();

      expect(result).toEqual([
        '001_initial_schema.sql',
        '002_add_users.sql',
        '003_add_indexes.sql',
      ]);
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT name FROM migrations ORDER BY executed_at ASC'
      );
    });

    test('should get list of pending migrations', async () => {
      const allFiles = [
        '001_initial_schema.sql',
        '002_add_users.sql',
        '003_add_indexes.sql',
        '004_add_constraints.sql',
      ];
      const executedMigrations = [
        { name: '001_initial_schema.sql' },
        { name: '002_add_users.sql' },
      ];

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(allFiles);
      (mockClient.query as jest.Mock).mockResolvedValue({
        rows: executedMigrations,
      });

      const result = await migrationRunner.getPendingMigrations();

      expect(result).toEqual([
        '003_add_indexes.sql',
        '004_add_constraints.sql',
      ]);
    });
  });
});
