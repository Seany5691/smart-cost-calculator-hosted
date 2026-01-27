/**
 * Database Migrations Runner
 * Runs database migrations including calendar events system
 * 
 * Usage: node run-scraper-migrations.js [migration-file]
 * Example: node run-scraper-migrations.js 010_calendar_events_system.sql
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function runMigration(pool, migrationFile, migrationName) {
  try {
    log(`\n📦 Running ${migrationName}...`, 'cyan');
    
    const migrationPath = path.join(__dirname, 'database', 'migrations', migrationFile);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await pool.query(sql);
    
    log(`✅ ${migrationName} completed successfully`, 'green');
    return true;
  } catch (error) {
    log(`❌ ${migrationName} failed:`, 'red');
    console.error(error.message);
    return false;
  }
}

async function verifyTables(pool, expectedTables) {
  try {
    log('\n🔍 Verifying tables...', 'cyan');
    
    const tableList = expectedTables.map(t => `'${t}'`).join(', ');
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (${tableList})
      ORDER BY table_name
    `);
    
    if (result.rows.length === expectedTables.length) {
      log('✅ All tables created successfully:', 'green');
      result.rows.forEach(row => {
        log(`   - ${row.table_name}`, 'green');
      });
      return true;
    } else {
      log(`⚠️  Warning: Expected ${expectedTables.length} tables, found ${result.rows.length}`, 'yellow');
      if (result.rows.length > 0) {
        log('Found tables:', 'yellow');
        result.rows.forEach(row => {
          log(`   - ${row.table_name}`, 'yellow');
        });
      }
      return false;
    }
  } catch (error) {
    log('❌ Table verification failed:', 'red');
    console.error(error.message);
    return false;
  }
}

async function main() {
  // Get migration file from command line argument
  const migrationFile = process.argv[2];
  
  if (migrationFile) {
    log(`🚀 Running Single Migration: ${migrationFile}...`, 'blue');
  } else {
    log('🚀 Running Scraper Enhancement Migrations...', 'blue');
  }
  log('', 'reset');
  
  // Check for DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    log('❌ ERROR: DATABASE_URL environment variable is not set', 'red');
    log('Please set DATABASE_URL before running migrations', 'yellow');
    log('\nExample:', 'yellow');
    log('  export DATABASE_URL="postgresql://user:password@host:5432/database"', 'yellow');
    log('  node run-scraper-migrations.js', 'yellow');
    process.exit(1);
  }
  
  log('✅ DATABASE_URL is set', 'green');
  
  // Create database pool
  // Try without SSL first (for local databases), then with SSL if that fails
  let pool;
  
  try {
    // First attempt: no SSL (for local databases)
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: false
    });
    
    // Test connection
    await pool.query('SELECT NOW()');
    log('✅ Database connection successful (no SSL)', 'green');
  } catch (error) {
    // If no-SSL fails, try with SSL (for remote databases)
    log('⚠️  No-SSL connection failed, trying with SSL...', 'yellow');
    
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false }
    });
    
    // Test connection
    await pool.query('SELECT NOW()');
    log('✅ Database connection successful (with SSL)', 'green');
  }

  try {
    // If specific migration file provided, run only that
    if (migrationFile) {
      const migrationName = migrationFile.replace('.sql', '').replace(/_/g, ' ');
      const success = await runMigration(pool, migrationFile, `Migration: ${migrationName}`);
      
      if (!success) {
        log(`\n❌ Migration ${migrationFile} failed.`, 'red');
        process.exit(1);
      }
      
      // Verify tables based on migration
      let expectedTables = [];
      if (migrationFile.includes('calendar_events')) {
        expectedTables = ['calendar_events', 'calendar_shares'];
      } else if (migrationFile.includes('provider_cache')) {
        expectedTables = ['provider_lookup_cache'];
      } else if (migrationFile.includes('scraping_templates')) {
        expectedTables = ['scraping_templates'];
      }
      
      if (expectedTables.length > 0) {
        await verifyTables(pool, expectedTables);
      }
      
      log('\n🎉 Migration completed successfully!', 'green');
      process.exit(0);
    }
    
    // Otherwise run default migrations
    const migration015Success = await runMigration(
      pool,
      '015_add_provider_cache.sql',
      'Migration 015: Provider Lookup Cache'
    );
    
    if (!migration015Success) {
      log('\n❌ Migration 015 failed. Stopping.', 'red');
      process.exit(1);
    }
    
    const migration016Success = await runMigration(
      pool,
      '016_add_scraping_templates.sql',
      'Migration 016: Scraping Templates'
    );
    
    if (!migration016Success) {
      log('\n❌ Migration 016 failed. Stopping.', 'red');
      process.exit(1);
    }
    
    // Verify tables
    const verifySuccess = await verifyTables(pool, ['provider_lookup_cache', 'scraping_templates']);
    
    if (verifySuccess) {
      log('\n🎉 All migrations completed successfully!', 'green');
      log('', 'reset');
      log('Next steps:', 'cyan');
      log('  1. Test the scraper features', 'cyan');
      log('  2. Build the app: npm run build', 'cyan');
      log('  3. Deploy to production', 'cyan');
      process.exit(0);
    } else {
      log('\n⚠️  Migrations completed with warnings', 'yellow');
      process.exit(0);
    }
    
  } catch (error) {
    log('\n❌ Migration failed:', 'red');
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations
main();
