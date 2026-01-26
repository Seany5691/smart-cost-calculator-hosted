const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const username = process.argv[2] || 'Nick';

async function setManager() {
  try {
    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE username = $2 RETURNING username, role',
      ['manager', username]
    );
    
    if (result.rows.length > 0) {
      console.log(`✓ ${username} is now a manager`);
      console.log(`  Role: ${result.rows[0].role}`);
    } else {
      console.log(`✗ User '${username}' not found`);
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
  }
}

setManager();
