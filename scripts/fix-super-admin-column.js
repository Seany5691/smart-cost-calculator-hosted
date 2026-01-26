const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixSuperAdminColumn() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('\n=== Checking super_admin column status ===\n');
    
    // Check which columns exist
    const columnsResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('super_admin', 'is_super_admin')
      ORDER BY column_name
    `);
    
    const existingColumns = columnsResult.rows.map(r => r.column_name);
    console.log('Existing columns:', existingColumns);
    
    // Check if we have both columns
    const hasSuperAdmin = existingColumns.includes('super_admin');
    const hasIsSuperAdmin = existingColumns.includes('is_super_admin');
    
    if (hasSuperAdmin && hasIsSuperAdmin) {
      console.log('\n⚠️  Both columns exist! Consolidating...');
      
      // Copy data from super_admin to is_super_admin if needed
      await client.query(`
        UPDATE users 
        SET is_super_admin = super_admin 
        WHERE super_admin = true AND (is_super_admin IS NULL OR is_super_admin = false)
      `);
      
      // Drop the super_admin column (keeping is_super_admin as the standard)
      await client.query('ALTER TABLE users DROP COLUMN IF EXISTS super_admin');
      console.log('✅ Dropped duplicate super_admin column, kept is_super_admin');
      
    } else if (hasSuperAdmin && !hasIsSuperAdmin) {
      console.log('\n⚠️  Only super_admin exists, renaming to is_super_admin...');
      
      // Rename super_admin to is_super_admin
      await client.query('ALTER TABLE users RENAME COLUMN super_admin TO is_super_admin');
      console.log('✅ Renamed super_admin to is_super_admin');
      
    } else if (!hasSuperAdmin && hasIsSuperAdmin) {
      console.log('\n✅ Only is_super_admin exists (correct state)');
      
    } else {
      console.log('\n⚠️  Neither column exists! Creating is_super_admin...');
      
      // Create is_super_admin column
      await client.query('ALTER TABLE users ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE');
      console.log('✅ Created is_super_admin column');
    }
    
    // Ensure Camryn is marked as super admin
    console.log('\n=== Ensuring Camryn is super admin ===');
    const updateResult = await client.query(`
      UPDATE users 
      SET is_super_admin = true, role = 'admin' 
      WHERE username = 'Camryn'
      RETURNING username, role, is_super_admin
    `);
    
    if (updateResult.rows.length > 0) {
      console.log('✅ Camryn updated:');
      console.log('   Username:', updateResult.rows[0].username);
      console.log('   Role:', updateResult.rows[0].role);
      console.log('   Super Admin:', updateResult.rows[0].is_super_admin);
    } else {
      console.log('⚠️  Camryn user not found in database');
    }
    
    // Create index if it doesn't exist
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_is_super_admin 
      ON users(is_super_admin) 
      WHERE is_super_admin = true
    `);
    console.log('✅ Created index on is_super_admin');
    
    // Drop old index if it exists
    await client.query('DROP INDEX IF EXISTS idx_users_super_admin');
    
    await client.query('COMMIT');
    
    console.log('\n=== Final user status ===');
    const finalResult = await client.query(`
      SELECT username, role, is_super_admin 
      FROM users 
      WHERE username IN ('Camryn', 'Nick') 
      ORDER BY username
    `);
    
    finalResult.rows.forEach(user => {
      console.log(`\n${user.username}:`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Super Admin: ${user.is_super_admin ? 'YES' : 'NO'}`);
    });
    
    console.log('\n✅ Super admin column fix complete!\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixSuperAdminColumn().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
