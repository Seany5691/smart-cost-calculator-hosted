/**
 * Run the follow-up email tracking migration
 * This adds the email_sent_followup column to the reminders table
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting follow-up email tracking migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'database', 'migrations', '023_add_reminder_followup_email_tracking.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Executing migration SQL...');
    await client.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('The email_sent_followup column has been added to the reminders table.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
