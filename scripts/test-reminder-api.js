require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testReminderAPI() {
  try {
    console.log('Testing reminder creation API logic...\n');
    
    // Get a test lead and user
    const leadResult = await pool.query(`
      SELECT l.id as lead_id, l.name, l.user_id, u.id as user_id, u.username
      FROM leads l
      JOIN users u ON l.user_id = u.id
      LIMIT 1
    `);
    
    if (leadResult.rows.length === 0) {
      console.log('❌ No leads found');
      return;
    }
    
    const { lead_id, name, user_id, username } = leadResult.rows[0];
    console.log('Test data:');
    console.log('  Lead:', name, `(${lead_id})`);
    console.log('  User:', username, `(${user_id})`);
    
    // Simulate the API call
    const testData = {
      message: 'Test reminder',
      reminder_date: '2026-01-20',
      reminder_time: '09:00',
      reminder_type: 'task',
      priority: 'medium',
      status: 'pending',
      completed: false,
      shared_with_user_ids: []
    };
    
    console.log('\nTest reminder data:', JSON.stringify(testData, null, 2));
    
    // Check if user has access to lead
    const accessCheck = await pool.query(
      `SELECT l.id FROM leads l
       LEFT JOIN lead_shares ls ON l.id = ls.lead_id
       WHERE l.id = $1::uuid AND (l.user_id = $2::uuid OR ls.shared_with_user_id = $2::uuid)
       LIMIT 1`,
      [lead_id, user_id]
    );
    
    console.log('\nAccess check:', accessCheck.rows.length > 0 ? '✓ Has access' : '❌ No access');
    
    if (accessCheck.rows.length === 0) {
      console.log('❌ User does not have access to lead');
      return;
    }
    
    // Construct due_date
    const due_date = `${testData.reminder_date} ${testData.reminder_time}`;
    console.log('\nDue date:', due_date);
    
    // Try to insert
    console.log('\nAttempting to insert reminder...');
    const result = await pool.query(
      `INSERT INTO reminders (
        lead_id, user_id, title, description, message, note,
        reminder_date, reminder_time, is_all_day,
        reminder_type, priority, status, completed,
        is_recurring, recurrence_pattern, route_id,
        due_date, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        lead_id,
        user_id,
        testData.message, // Use message as title
        null, // description
        testData.message,
        null, // note
        testData.reminder_date,
        testData.reminder_time,
        false, // is_all_day
        testData.reminder_type,
        testData.priority,
        testData.status,
        testData.completed,
        false, // is_recurring
        null, // recurrence_pattern
        null, // route_id
        due_date,
      ]
    );
    
    console.log('✓ Reminder created successfully!');
    console.log('  ID:', result.rows[0].id);
    
    // Clean up
    await pool.query('DELETE FROM reminders WHERE id = $1', [result.rows[0].id]);
    console.log('✓ Test reminder cleaned up');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Details:', error);
  } finally {
    await pool.end();
  }
}

testReminderAPI();
