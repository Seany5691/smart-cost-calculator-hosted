const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addPasswordTracking() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('\n=== Adding Password Tracking Columns ===\n');
    
    // Add last_password_change column
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMP
    `);
    console.log('✅ Added last_password_change column');
    
    // Add temporary_password column
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS temporary_password BOOLEAN DEFAULT FALSE
    `);
    console.log('✅ Added temporary_password column');
    
    // Update existing users
    await client.query(`
      UPDATE users 
      SET last_password_change = created_at 
      WHERE last_password_change IS NULL
    `);
    console.log('✅ Set last_password_change for existing users');
    
    await client.query(`
      UPDATE users 
      SET temporary_password = FALSE 
      WHERE temporary_password IS NULL
    `);
    console.log('✅ Set temporary_password for existing users');
    
    // Ensure Camryn is properly configured
    await client.query(`
      UPDATE users 
      SET role = 'admin', 
          is_super_admin = TRUE, 
          requires_password_change = FALSE,
          temporary_password = FALSE
      WHERE username = 'Camryn'
    `);
    console.log('✅ Ensured Camryn is properly configured');
    
    await client.query('COMMIT');
    
    console.log('\n=== Migration Complete ===\n');
    
    // Show final user status
    const result = await client.query(`
      SELECT username, role, is_super_admin, requires_password_change, temporary_password
      FROM users 
      ORDER BY username
    `);
    
    console.log('Current Users:');
    result.rows.forEach(user => {
      console.log(`\n${user.username}:`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Super Admin: ${user.is_super_admin ? 'YES' : 'NO'}`);
      console.log(`  Requires Password Change: ${user.requires_password_change ? 'YES' : 'NO'}`);
      console.log(`  Temporary Password: ${user.temporary_password ? 'YES' : 'NO'}`);
    });
    
    console.log('\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addPasswordTracking().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
