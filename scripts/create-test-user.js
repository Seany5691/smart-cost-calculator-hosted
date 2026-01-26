const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createTestUser() {
  try {
    // Check if test user already exists
    const checkResult = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      ['admin']
    );

    if (checkResult.rows.length > 0) {
      console.log('Test user "admin" already exists');
      
      // Update password
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        'UPDATE users SET password = $1 WHERE username = $2',
        [hashedPassword, 'admin']
      );
      console.log('Updated password for test user "admin"');
    } else {
      // Create new test user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const result = await pool.query(
        `INSERT INTO users (username, password, role, name, email, is_active, is_super_admin)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, username, role`,
        ['admin', hashedPassword, 'admin', 'Test Admin', 'admin@test.com', true, false]
      );
      
      console.log('Created test user:', result.rows[0]);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

createTestUser();
