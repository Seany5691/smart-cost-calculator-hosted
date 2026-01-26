// Test script to create a standalone reminder
const fetch = require('node-fetch');

async function testStandaloneReminder() {
  try {
    // First, login to get a token
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      console.error('Login failed:', await loginResponse.text());
      return;
    }

    const { token } = await loginResponse.json();
    console.log('✓ Login successful');

    // Now try to create a standalone reminder
    const reminderData = {
      title: 'Test Standalone Reminder',
      description: 'This is a test',
      reminder_date: '2026-01-22',
      reminder_time: '10:00',
      is_all_day: false,
      reminder_type: 'task',
      priority: 'medium',
      message: 'Test message',
      note: 'Test note',
      is_recurring: false,
      recurrence_pattern: null,
      route_id: null
    };

    console.log('\nSending reminder data:', JSON.stringify(reminderData, null, 2));

    const response = await fetch('http://localhost:3000/api/reminders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(reminderData)
    });

    console.log('\nResponse status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('\nResponse body:', responseText);

    if (response.ok) {
      console.log('\n✓ Reminder created successfully!');
      const reminder = JSON.parse(responseText);
      console.log('Created reminder:', reminder);
    } else {
      console.error('\n✗ Failed to create reminder');
      try {
        const error = JSON.parse(responseText);
        console.error('Error:', error);
      } catch (e) {
        console.error('Raw error:', responseText);
      }
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testStandaloneReminder();
