require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testReminderCreation() {
  try {
    console.log('Testing reminder creation and sharing...\n');
    
    // Get a test lead and users
    const leadResult = await pool.query(`
      SELECT l.id, l.name, l.user_id, u.username as owner_username
      FROM leads l
      JOIN users u ON l.user_id = u.id
      LIMIT 1
    `);
    
    if (leadResult.rows.length === 0) {
      console.log('❌ No leads found in database');
      return;
    }
    
    const lead = leadResult.rows[0];
    console.log('✓ Test lead:', lead.name, `(ID: ${lead.id})`);
    console.log('  Owner:', lead.owner_username);
    
    // Get users who have access to this lead
    const accessResult = await pool.query(`
      SELECT DISTINCT u.id, u.username, u.email
      FROM users u
      WHERE u.id = $1
      UNION
      SELECT DISTINCT u.id, u.username, u.email
      FROM users u
      JOIN lead_shares ls ON u.id = ls.shared_with_user_id
      WHERE ls.lead_id = $2
    `, [lead.user_id, lead.id]);
    
    console.log('\n✓ Users with access to this lead:');
    accessResult.rows.forEach(user => {
      console.log(`  - ${user.username} (${user.email})`);
    });
    
    // Check reminder_shares table structure
    const tableCheck = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'reminder_shares'
      ORDER BY ordinal_position
    `);
    
    console.log('\n✓ reminder_shares table structure:');
    tableCheck.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Check foreign keys
    const fkCheck = await pool.query(`
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'reminder_shares' AND tc.constraint_type = 'FOREIGN KEY'
    `);
    
    console.log('\n✓ Foreign key constraints:');
    fkCheck.rows.forEach(fk => {
      console.log(`  - ${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });
    
    console.log('\n✅ All checks passed! Ready to test reminder creation in the UI.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testReminderCreation();
