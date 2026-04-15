#!/usr/bin/env node
/**
 * Send a test reminder email to verify email configuration
 * Usage: node scripts/send-test-email.js
 */

require('dotenv').config({ path: '.env.local' });

async function sendTestEmail() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Reminder Email Test - Sending to sean@smartintegrate.co.za');
  console.log('═══════════════════════════════════════════════════\n');

  // Check environment variables
  console.log('📋 Checking configuration...\n');
  
  const config = {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD ? '***configured***' : undefined,
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    fromName: process.env.SMTP_FROM_NAME || 'Smart Calculator Reminders',
  };

  console.log('SMTP Configuration:');
  console.log(`  Host: ${config.host || '❌ NOT SET'}`);
  console.log(`  Port: ${config.port || '❌ NOT SET'}`);
  console.log(`  User: ${config.user || '❌ NOT SET'}`);
  console.log(`  Password: ${config.password || '❌ NOT SET'}`);
  console.log(`  From: ${config.from || '❌ NOT SET'}`);
  console.log(`  From Name: ${config.fromName}`);
  console.log('');

  if (!config.host || !config.port || !config.user || !process.env.SMTP_PASSWORD) {
    console.error('❌ Missing required SMTP configuration!\n');
    console.log('Add these to your .env.local file:');
    console.log('');
    console.log('SMTP_HOST=smtp.gmail.com');
    console.log('SMTP_PORT=587');
    console.log('SMTP_USER=your-email@gmail.com');
    console.log('SMTP_PASSWORD=your-app-password');
    console.log('');
    console.log('For Gmail:');
    console.log('1. Go to https://myaccount.google.com/security');
    console.log('2. Enable 2-Factor Authentication');
    console.log('3. Search for "App passwords"');
    console.log('4. Generate password for "Mail"');
    console.log('5. Use that 16-character password');
    console.log('');
    process.exit(1);
  }

  // Test SMTP connection first
  console.log('🔌 Testing SMTP connection...\n');
  
  try {
    const { testEmailConfig } = require('../lib/email');
    const connectionTest = await testEmailConfig();
    
    if (!connectionTest.success) {
      console.error('❌ SMTP connection failed:', connectionTest.error);
      console.log('');
      console.log('Common issues:');
      console.log('- Gmail: Use App Password, not regular password');
      console.log('- Check host and port are correct');
      console.log('- Verify credentials are valid');
      console.log('');
      process.exit(1);
    }
    
    console.log('✅ SMTP connection successful!\n');
  } catch (error) {
    console.error('❌ Error testing connection:', error.message);
    process.exit(1);
  }

  // Send test email
  console.log('📧 Sending test email to sean@smartintegrate.co.za...\n');

  try {
    const { sendReminderEmail } = require('../lib/email');
    
    const testData = {
      recipientEmail: 'sean@smartintegrate.co.za',
      recipientName: 'Sean',
      reminderTitle: 'Test Reminder - Email System Check',
      reminderMessage: 'This is a test email to verify the reminder notification system is working correctly. If you receive this, the email system is configured properly!',
      reminderDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      reminderTime: '14:30',
      priority: 'high',
      leadName: 'Test Lead Company',
      leadContact: 'John Doe',
      leadPhone: '+27 12 345 6789',
    };

    // Test all three email types
    console.log('Sending "Creation" notification...');
    const result1 = await sendReminderEmail(testData, 'created');
    if (result1.success) {
      console.log('✅ Creation email sent successfully!\n');
    } else {
      console.error('❌ Failed to send creation email:', result1.error, '\n');
    }

    console.log('Sending "1-Day Before" notification...');
    const result2 = await sendReminderEmail(testData, '1day');
    if (result2.success) {
      console.log('✅ 1-day email sent successfully!\n');
    } else {
      console.error('❌ Failed to send 1-day email:', result2.error, '\n');
    }

    console.log('Sending "30-Minute Before" notification...');
    const result3 = await sendReminderEmail(testData, '30min');
    if (result3.success) {
      console.log('✅ 30-min email sent successfully!\n');
    } else {
      console.error('❌ Failed to send 30-min email:', result3.error, '\n');
    }

    const successCount = [result1, result2, result3].filter(r => r.success).length;

    console.log('═══════════════════════════════════════════════════');
    console.log(`✨ Test Complete! ${successCount}/3 emails sent successfully`);
    console.log('═══════════════════════════════════════════════════\n');

    if (successCount === 3) {
      console.log('🎉 All emails sent! Check sean@smartintegrate.co.za inbox');
      console.log('   (Also check spam/junk folder)\n');
      console.log('You should receive 3 emails showing:');
      console.log('  1. Blue "New Reminder" email');
      console.log('  2. Orange "Reminder Tomorrow" email');
      console.log('  3. Red "Reminder in 30 Minutes" email\n');
    } else {
      console.log('⚠️  Some emails failed to send. Check the errors above.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error('');
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

sendTestEmail().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
