require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkReminderShares() {
  try {
    console.log('Checking reminder_shares table...\n');
    
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'reminder_shares'
      );
    `);
    
    console.log('Table exists:', tableCheck.rows[0].exists);
    
    if (tableCheck.rows[0].exists) {
      // Check table structure
      const structure = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'reminder_shares'
        ORDER BY ordinal_position;
      `);
      
      console.log('\nTable structure:');
      structure.rows.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      // Check foreign keys
      const fkeys = await pool.query(`
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
        WHERE tc.table_name = 'reminder_shares' AND tc.constraint_type = 'FOREIGN KEY';
      `);
      
      console.log('\nForeign keys:');
      fkeys.rows.forEach(fk => {
        console.log(`  ${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    }
    
    // Check reminders table id type
    const remindersIdType = await pool.query(`
      SELECT data_type
      FROM information_schema.columns
      WHERE table_name = 'reminders' AND column_name = 'id';
    `);
    
    console.log('\nReminders table id type:', remindersIdType.rows[0]?.data_type || 'NOT FOUND');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkReminderShares();
