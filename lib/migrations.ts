import { getClient } from './db';
import fs from 'fs';
import path from 'path';
import { PoolClient } from 'pg';

export interface Migration {
  name: string;
  up: (client: PoolClient) => Promise<void>;
  down: (client: PoolClient) => Promise<void>;
}

export class MigrationRunner {
  private migrationsDir: string;

  constructor(migrationsDir: string = path.join(process.cwd(), 'database', 'migrations')) {
    this.migrationsDir = migrationsDir;
  }

  /**
   * Get all migration files from the migrations directory
   */
  private async getMigrationFiles(): Promise<string[]> {
    try {
      if (!fs.existsSync(this.migrationsDir)) {
        fs.mkdirSync(this.migrationsDir, { recursive: true });
        return [];
      }
      
      const files = fs.readdirSync(this.migrationsDir);
      return files
        .filter(f => f.endsWith('.sql') || f.endsWith('.ts') || f.endsWith('.js'))
        .sort();
    } catch (error) {
      console.error('Error reading migration files:', error);
      return [];
    }
  }

  /**
   * Check if a migration has been executed
   */
  private async isMigrationExecuted(client: PoolClient, name: string): Promise<boolean> {
    const result = await client.query(
      'SELECT 1 FROM migrations WHERE name = $1',
      [name]
    );
    return result.rowCount! > 0;
  }

  /**
   * Record a migration as executed
   */
  private async recordMigration(client: PoolClient, name: string): Promise<void> {
    await client.query(
      'INSERT INTO migrations (name) VALUES ($1)',
      [name]
    );
  }

  /**
   * Remove a migration record
   */
  private async removeMigrationRecord(client: PoolClient, name: string): Promise<void> {
    await client.query(
      'DELETE FROM migrations WHERE name = $1',
      [name]
    );
  }

  /**
   * Execute a SQL migration file
   */
  private async executeSqlMigration(client: PoolClient, filePath: string): Promise<void> {
    const sql = fs.readFileSync(filePath, 'utf-8');
    await client.query(sql);
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(): Promise<void> {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');
      
      // Ensure migrations table exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      const files = await this.getMigrationFiles();
      let executedCount = 0;
      
      for (const file of files) {
        const migrationName = file;
        const isExecuted = await this.isMigrationExecuted(client, migrationName);
        
        if (!isExecuted) {
          console.log(`Running migration: ${migrationName}`);
          const filePath = path.join(this.migrationsDir, file);
          
          if (file.endsWith('.sql')) {
            await this.executeSqlMigration(client, filePath);
          } else {
            // For TypeScript/JavaScript migrations
            const migration = require(filePath);
            if (migration.up) {
              await migration.up(client);
            }
          }
          
          await this.recordMigration(client, migrationName);
          executedCount++;
          console.log(`✓ Migration completed: ${migrationName}`);
        }
      }
      
      await client.query('COMMIT');
      
      if (executedCount === 0) {
        console.log('No pending migrations to run.');
      } else {
        console.log(`Successfully executed ${executedCount} migration(s).`);
      }
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Migration failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Rollback the last migration
   */
  async rollbackLastMigration(): Promise<void> {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');
      
      // Get the last executed migration
      const result = await client.query(
        'SELECT name FROM migrations ORDER BY executed_at DESC LIMIT 1'
      );
      
      if (result.rowCount === 0) {
        console.log('No migrations to rollback.');
        await client.query('COMMIT');
        return;
      }
      
      const migrationName = result.rows[0].name;
      console.log(`Rolling back migration: ${migrationName}`);
      
      const filePath = path.join(this.migrationsDir, migrationName);
      
      if (migrationName.endsWith('.sql')) {
        // For SQL files, we need a corresponding rollback file
        const rollbackPath = filePath.replace('.sql', '.rollback.sql');
        if (fs.existsSync(rollbackPath)) {
          await this.executeSqlMigration(client, rollbackPath);
        } else {
          console.warn(`No rollback file found for ${migrationName}`);
        }
      } else {
        // For TypeScript/JavaScript migrations
        const migration = require(filePath);
        if (migration.down) {
          await migration.down(client);
        }
      }
      
      await this.removeMigrationRecord(client, migrationName);
      await client.query('COMMIT');
      
      console.log(`✓ Rollback completed: ${migrationName}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Rollback failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get list of executed migrations
   */
  async getExecutedMigrations(): Promise<string[]> {
    const client = await getClient();
    
    try {
      const result = await client.query(
        'SELECT name FROM migrations ORDER BY executed_at ASC'
      );
      return result.rows.map(row => row.name);
    } finally {
      client.release();
    }
  }

  /**
   * Get list of pending migrations
   */
  async getPendingMigrations(): Promise<string[]> {
    const allFiles = await this.getMigrationFiles();
    const executed = await this.getExecutedMigrations();
    return allFiles.filter(file => !executed.includes(file));
  }
}

export default MigrationRunner;
