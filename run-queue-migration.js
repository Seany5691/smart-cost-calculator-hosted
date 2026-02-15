/**
 * Run Queue Migration Script
 * Applies the scraper queue migration to the database
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  console.log('🚀 Starting queue migration...\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'database/migrations/020_scraper_queue.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded\n');

    // Execute the migration
    console.log('⚙️  Executing migration...');
    await pool.query(migrationSQL);
    console.log('✅ Migration executed successfully!\n');

    // Verify the migration
    console.log('🔍 Verifying migration...');
    
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'scraper_queue'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ scraper_queue table created');
    } else {
      throw new Error('scraper_queue table not found after migration');
    }

    // Check if functions exist
    const functionCheck = await pool.query(`
      SELECT proname FROM pg_proc 
      WHERE proname IN ('get_next_queue_position', 'reorder_queue_positions');
    `);
    
    if (functionCheck.rows.length === 2) {
      console.log('✅ Queue management functions created');
    } else {
      throw new Error('Queue management functions not found after migration');
    }

    // Check if trigger exists
    const triggerCheck = await pool.query(`
      SELECT tgname FROM pg_trigger 
      WHERE tgname = 'trigger_reorder_queue';
    `);
    
    if (triggerCheck.rows.length > 0) {
      console.log('✅ Queue reorder trigger created');
    } else {
      throw new Error('Queue reorder trigger not found after migration');
    }

    console.log('\n🎉 Queue migration completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - scraper_queue table created');
    console.log('   - Queue management functions added');
    console.log('   - Automatic queue reordering enabled');
    console.log('   - state column added to scraping_sessions (if needed)');
    console.log('\n✨ The scraper now supports queueing to prevent concurrent sessions!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration();
