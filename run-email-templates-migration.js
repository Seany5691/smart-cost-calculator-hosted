const { Pool } = require('pg');
const fs = require('fs');

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const sql = fs.readFileSync('database/migrations/024_email_templates.sql', 'utf8');
    console.log('🚀 Running migration 024_email_templates.sql...');
    await pool.query(sql);
    console.log('✅ Migration completed successfully!');
    console.log('📧 Email templates system is now ready to use');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
