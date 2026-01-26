const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function makeAdmin() {
  try {
    // Get all users
    const users = await pool.query('SELECT id, username, role FROM users ORDER BY id');
    
    console.log('\n=== Current Users ===');
    users.rows.forEach(user => {
      console.log(`ID: ${user.id}, Username: ${user.username}, Role: ${user.role}`);
    });
    
    if (users.rows.length === 0) {
      console.log('\nNo users found in database!');
      await pool.end();
      return;
    }
    
    // Make the first user an admin (or specify username)
    const targetUsername = process.argv[2] || users.rows[0].username;
    
    console.log(`\n=== Making ${targetUsername} an admin ===`);
    
    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE username = $2 RETURNING id, username, role',
      ['admin', targetUsername]
    );
    
    if (result.rows.length > 0) {
      console.log('✓ User updated successfully:');
      console.log(`  Username: ${result.rows[0].username}`);
      console.log(`  Role: ${result.rows[0].role}`);
    } else {
      console.log(`✗ User '${targetUsername}' not found`);
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

makeAdmin();
