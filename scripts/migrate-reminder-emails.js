#!/usr/bin/env node
/**
 * Run the reminder email tracking migration
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Reminder Email Tracking Migration');
  console.log('═══════════════════════════════════════════════════\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('📋 Reading migration file...');
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '022_add_reminder_email_tracking.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🔄 Running migration...\n');
    await pool.query(sql);
    
    console.log('✅ Migration completed successfully!\n');
    console.log('Added columns to reminders table:');
    console.log('  - email_sent_created (tracks creation notification)');
    console.log('  - email_sent_1day (tracks 1-day-before notification)');
    console.log('  - email_sent_30min (tracks 30-minute-before notification)\n');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nError details:', error);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
