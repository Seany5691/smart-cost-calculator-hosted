#!/usr/bin/env node
/**
 * Test script for reminder email notifications
 * Usage: node scripts/test-reminder-emails.js
 */

require('dotenv').config({ path: '.env.local' });

async function testEmailConfig() {
  console.log('🔍 Testing email configuration...\n');

  // Check environment variables
  const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD'];
  const missingVars = requiredVars.filter(v => !process.env[v]);

  if (missingVars.length > 0) {
    console.error('❌ Missing environment variables:', missingVars.join(', '));
    console.log('\nAdd these to your .env.local file:');
    console.log('SMTP_HOST=smtp.gmail.com');
    console.log('SMTP_PORT=587');
    console.log('SMTP_USER=your-email@gmail.com');
    console.log('SMTP_PASSWORD=your-app-password');
    process.exit(1);
  }

  console.log('✅ Environment variables found');
  console.log(`   Host: ${process.env.SMTP_HOST}`);
  console.log(`   Port: ${process.env.SMTP_PORT}`);
  console.log(`   User: ${process.env.SMTP_USER}`);
  console.log(`   From: ${process.env.SMTP_FROM || process.env.SMTP_USER}`);
  console.log('');

  // Test SMTP connection
  try {
    const { testEmailConfig } = require('../lib/email');
    const result = await testEmailConfig();

    if (result.success) {
      console.log('✅ SMTP connection successful!');
      console.log('');
      console.log('📧 Email system is ready to send notifications.');
      console.log('');
      console.log('Next steps:');
      console.log('1. Run the database migration: npm run migrate:reminder-emails');
      console.log('2. Set up a cron job to call: POST /api/reminders/notifications');
      console.log('3. Create a test reminder in your app');
      console.log('');
    } else {
      console.error('❌ SMTP connection failed:', result.error);
      console.log('');
      console.log('Common issues:');
      console.log('- Gmail: Use an App Password, not your regular password');
      console.log('- Check SMTP host and port are correct');
      console.log('- Verify credentials are valid');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error testing email:', error.message);
    process.exit(1);
  }
}

async function testNotificationEndpoint() {
  console.log('🔍 Testing notification endpoint...\n');

  try {
    const response = await fetch('http://localhost:3000/api/reminders/notifications', {
      method: 'GET',
      headers: process.env.CRON_SECRET 
        ? { 'Authorization': `Bearer ${process.env.CRON_SECRET}` }
        : {},
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Notification endpoint is accessible');
      console.log('   Status:', data.status);
      console.log('   Email configured:', data.config?.emailConfigured);
      console.log('');
    } else {
      console.error('❌ Endpoint returned error:', response.status);
      if (response.status === 401) {
        console.log('   Check your CRON_SECRET environment variable');
      }
    }
  } catch (error) {
    console.log('⚠️  Could not reach endpoint (is the server running?)');
    console.log('   Start your dev server: npm run dev');
    console.log('');
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Reminder Email Notification Test');
  console.log('═══════════════════════════════════════════════════\n');

  await testEmailConfig();
  await testNotificationEndpoint();

  console.log('═══════════════════════════════════════════════════');
  console.log('✨ All tests completed!');
  console.log('═══════════════════════════════════════════════════');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
