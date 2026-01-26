require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testInsert() {
  try {
    // Get a test lead and user
    const leadResult = await pool.query('SELECT id FROM leads LIMIT 1');
    const userResult = await pool.query('SELECT id FROM users LIMIT 1');
    
    if (leadResult.rows.length === 0 || userResult.rows.length === 0) {
      console.log('No leads or users found in database');
      return;
    }
    
    const leadId = leadResult.rows[0].id;
    const userId = userResult.rows[0].id;
    
    console.log('Testing reminder insert...');
    console.log('Lead ID:', leadId);
    console.log('User ID:', userId);
    
    const reminderData = {
      lead_id: leadId,
      user_id: userId,
      title: 'Test Callback',
      description: 'Test description',
      message: 'Test message',
      note: 'Test note',
      reminder_date: '2026-01-20',
      reminder_time: '09:00',
      is_all_day: false,
      reminder_type: 'followup',
      priority: 'medium',
      status: 'pending',
      completed: false,
      is_recurring: false,
      recurrence_pattern: null,
      route_id: null
    };
    
    // Construct due_date from reminder_date and reminder_time
    let due_date;
    if (reminderData.is_all_day || !reminderData.reminder_time) {
      due_date = `${reminderData.reminder_date} 00:00:00`;
    } else {
      due_date = `${reminderData.reminder_date} ${reminderData.reminder_time}`;
    }
    
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
        reminderData.lead_id,
        reminderData.user_id,
        reminderData.title,
        reminderData.description,
        reminderData.message,
        reminderData.note,
        reminderData.reminder_date,
        reminderData.reminder_time,
        reminderData.is_all_day,
        reminderData.reminder_type,
        reminderData.priority,
        reminderData.status,
        reminderData.completed,
        reminderData.is_recurring,
        reminderData.recurrence_pattern,
        reminderData.route_id,
        due_date
      ]
    );
    
    console.log('\n✓ Reminder created successfully!');
    console.log('Reminder ID:', result.rows[0].id);
    
    // Clean up - delete the test reminder
    await pool.query('DELETE FROM reminders WHERE id = $1', [result.rows[0].id]);
    console.log('✓ Test reminder cleaned up');
    
  } catch (error) {
    console.error('\n✗ Error creating reminder:');
    console.error('Message:', error.message);
    console.error('Detail:', error.detail);
    console.error('Code:', error.code);
  } finally {
    await pool.end();
  }
}

testInsert();
