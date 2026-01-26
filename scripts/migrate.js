#!/usr/bin/env node

/**
 * Database Migration Script
 * Runs all pending migrations
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Only load dotenv in development
if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config({ path: '.env.local' });
  } catch (e) {
    // dotenv not available in production standalone build
  }
}

async function main() {
  console.log('Starting database migrations...\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Get list of migration files
    const migrationsDir = path.join(process.cwd(), 'database', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    // Get already executed migrations
    const result = await pool.query('SELECT name FROM migrations');
    const executedMigrations = new Set(result.rows.map(row => row.name));
    
    // Run pending migrations
    for (const file of migrationFiles) {
      if (executedMigrations.has(file)) {
        console.log(`⊘ Skipping ${file} (already executed)`);
        continue;
      }
      
      console.log(`Running migration: ${file}`);
      const migrationPath = path.join(migrationsDir, file);
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');
      
      await pool.query('BEGIN');
      try {
        await pool.query(migrationSql);
        await pool.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
        await pool.query('COMMIT');
        console.log(`✓ ${file} completed successfully!`);
      } catch (error) {
        await pool.query('ROLLBACK');
        throw new Error(`Failed to execute ${file}: ${error.message}`);
      }
    }
    
    console.log('\n✓ All migrations completed successfully!');
    
    // Create super admin user if it doesn't exist
    console.log('\nChecking for super admin user...');
    const bcrypt = require('bcrypt');
    const superAdminUsername = process.env.SUPER_ADMIN_USERNAME || 'Camryn';
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Elliot6242!';
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'camryn@example.com';
    
    const userCheck = await pool.query('SELECT id FROM users WHERE username = $1', [superAdminUsername]);
    
    if (userCheck.rows.length === 0) {
      console.log(`Creating super admin user: ${superAdminUsername}`);
      const hashedPassword = await bcrypt.hash(superAdminPassword, 10);
      await pool.query(
        `INSERT INTO users (username, password, role, name, email, is_active, super_admin, requires_password_change)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [superAdminUsername, hashedPassword, 'admin', superAdminUsername, superAdminEmail, true, true, false]
      );
      console.log(`✓ Super admin user created: ${superAdminUsername}`);
    } else {
      console.log(`⊘ Super admin user already exists: ${superAdminUsername}`);
    }
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Migration failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

main();
