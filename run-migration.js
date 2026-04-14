/**
 * Generic Migration Runner Script
 * Usage: node run-migration.js <migration-file.sql>
 * Example: node run-migration.js 021_add_appointments_status.sql
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  // Get migration file from command line argument
  const migrationFile = process.argv[2];
  
  if (!migrationFile) {
    console.error('❌ Error: Please provide a migration file name');
    console.log('\nUsage: node run-migration.js <migration-file.sql>');
    console.log('Example: node run-migration.js 021_add_appointments_status.sql');
    process.exit(1);
  }

  console.log(`🚀 Starting migration: ${migrationFile}\n`);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'database/migrations', migrationFile);
    console.log(`📄 Reading migration file: ${migrationPath}`);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded\n');

    // Execute the migration
    console.log('⚙️  Executing migration...');
    await pool.query(migrationSQL);
    console.log('✅ Migration executed successfully!\n');

    console.log('🎉 Migration completed successfully!');
    console.log(`\n✨ ${migrationFile} has been applied to the database!`);

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
