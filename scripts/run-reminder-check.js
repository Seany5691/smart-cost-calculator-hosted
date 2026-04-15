#!/usr/bin/env node
/**
 * Manual Reminder Notification Check
 * Run this script to manually trigger the reminder notification check
 * Usage: node scripts/run-reminder-check.js
 * 
 * In production, this should be called by a cron job every 10 minutes
 */

require('dotenv').config({ path: '.env.local' });

async function runReminderCheck() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Manual Reminder Notification Check');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // Import the notification processor
    const { processReminderNotifications } = require('../lib/reminderNotifications');

    console.log('🔄 Running reminder notification check...\n');
    
    const stats = await processReminderNotifications();

    console.log('\n═══════════════════════════════════════════════════');
    console.log('✅ Reminder check complete!');
    console.log('═══════════════════════════════════════════════════\n');
    console.log(`📊 Statistics:`);
    console.log(`   Processed: ${stats.processed} reminders`);
    console.log(`   Sent: ${stats.sent} emails`);
    console.log(`   Errors: ${stats.errors}`);
    console.log('');

    if (stats.sent > 0) {
      console.log('📧 Check your email inbox for notifications!');
    } else {
      console.log('ℹ️  No emails needed to be sent at this time.');
      console.log('   Emails are sent when:');
      console.log('   - Reminders are 24 hours away (1-day-before)');
      console.log('   - Reminders are 30 minutes away (30-min-before)');
    }
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error running reminder check:', error);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

runReminderCheck();
