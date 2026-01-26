/**
 * Migration Script: Add Telesales Role
 * 
 * This script adds the 'telesales' role to the users table constraint
 * Run this on existing databases to enable the telesales role
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function addTelesalesRole() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 Starting telesales role migration...\n');

    // Check if migration already ran
    const checkResult = await pool.query(
      "SELECT * FROM migrations WHERE name = '009_add_telesales_role'"
    );

    if (checkResult.rows.length > 0) {
      console.log('✅ Migration already applied. Telesales role is already available.');
      await pool.end();
      return;
    }

    // Drop existing constraint
    console.log('📝 Dropping existing role constraint...');
    await pool.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
    console.log('✅ Old constraint dropped');

    // Add new constraint with telesales
    console.log('📝 Adding new role constraint with telesales...');
    await pool.query(`
      ALTER TABLE users ADD CONSTRAINT users_role_check 
        CHECK (role IN ('admin', 'manager', 'user', 'telesales'))
    `);
    console.log('✅ New constraint added');

    // Record migration
    console.log('📝 Recording migration...');
    await pool.query(
      "INSERT INTO migrations (name) VALUES ('009_add_telesales_role')"
    );
    console.log('✅ Migration recorded');

    // Verify the change
    console.log('\n🔍 Verifying constraint...');
    const verifyResult = await pool.query(`
      SELECT conname as constraint_name, 
             pg_get_constraintdef(oid) as check_clause
      FROM pg_constraint 
      WHERE conrelid = 'users'::regclass 
        AND conname = 'users_role_check'
    `);

    if (verifyResult.rows.length > 0) {
      console.log('✅ Constraint verified:');
      console.log(`   ${verifyResult.rows[0].check_clause}`);
    }

    console.log('\n✨ Migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Restart your development server');
    console.log('   2. Log in as admin');
    console.log('   3. Navigate to Admin → User Management');
    console.log('   4. Create a new user with "Telesales" role');
    console.log('   5. Telesales users will only see Leads and Scraper sections\n');

    await pool.end();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nError details:', error);
    await pool.end();
    process.exit(1);
  }
}

// Run migration
addTelesalesRole();
