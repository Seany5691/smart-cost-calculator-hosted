const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function setupSuperAdmin() {
  try {
    // Add super_admin column
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS super_admin BOOLEAN DEFAULT FALSE');
    console.log('✓ Added super_admin column');
    
    // Mark Camryn as super admin
    await pool.query("UPDATE users SET super_admin = TRUE WHERE username = 'Camryn'");
    console.log('✓ Marked Camryn as super admin');
    
    // Verify
    const result = await pool.query("SELECT username, role, super_admin FROM users WHERE username = 'Camryn'");
    console.log('\nCamryn status:', result.rows[0]);
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

setupSuperAdmin();
