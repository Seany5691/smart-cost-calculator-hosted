#!/usr/bin/env node
/**
 * Test script for follow-up reminder email
 * Sends a sample follow-up email to see what it looks like
 * Usage: node scripts/test-followup-email.js
 */

require('dotenv').config({ path: '.env.local' });

async function sendTestFollowupEmail() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Follow-Up Email Test');
  console.log('═══════════════════════════════════════════════════\n');

  // Check environment variables
  const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD'];
  const missingVars = requiredVars.filter(v => !process.env[v]);

  if (missingVars.length > 0) {
    console.error('❌ Missing environment variables:', missingVars.join(', '));
    console.log('\nAdd these to your .env.local file:');
    console.log('SMTP_HOST=smtp.gmail.com');
    console.log('SMTP_PORT=587');
    console.log('SMTP_USER=smartcostcalculator@gmail.com');
    console.log('SMTP_PASSWORD=uixdmyfxwvjdkvei');
    process.exit(1);
  }

  console.log('✅ Environment variables found');
  console.log(`   Host: ${process.env.SMTP_HOST}`);
  console.log(`   Port: ${process.env.SMTP_PORT}`);
  console.log(`   User: ${process.env.SMTP_USER}`);
  console.log('');

  try {
    console.log('📧 Sending sample follow-up email...\n');

    // Import nodemailer directly since we can't import TypeScript modules
    const nodemailer = require('nodemailer');

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const FROM_EMAIL = process.env.SMTP_FROM || process.env.SMTP_USER;
    const FROM_NAME = process.env.SMTP_FROM_NAME || 'Smart Calculator Reminders';

    // Sample data for the follow-up email
    const sampleData = {
      recipientEmail: 'sean@smartintegrate.co.za',
      recipientName: 'Sean',
      reminderTitle: 'Follow up with Sky Arch Travel',
      reminderMessage: 'Call to discuss solar panel installation quote and finalize pricing details',
      reminderDate: '16 Apr 2026',
      reminderTime: '17:44:00',
      priority: 'high',
      reminderType: 'lead',
      leadId: 'sample-lead-123',
      leadName: 'Sky Arch Travel',
      leadPhone: '016 004 0021',
      leadProvider: 'SWITCH/SWITCH',
      leadAddress: '123 Main Street',
      leadTown: 'Sasolburg, Gauteng',
      leadMapsAddress: 'https://www.google.com/maps/search/?api=1&query=Sky+Arch+Travel+Sasolburg',
    };

    console.log('Sample email details:');
    console.log(`   To: ${sampleData.recipientEmail}`);
    console.log(`   Lead: ${sampleData.leadName}`);
    console.log(`   Reminder: ${sampleData.reminderTitle}`);
    console.log(`   Time: ${sampleData.reminderDate} at ${sampleData.reminderTime}`);
    console.log('');

    // Build the email HTML
    const subject = `✅ Reminder Complete: ${sampleData.reminderTitle}`;
    const urgencyColor = '#10b981'; // green
    const timeInfo = `${sampleData.reminderDate} at ${sampleData.reminderTime}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: ${urgencyColor}; padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">
                Time to update your lead!
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 24px; border-radius: 4px; margin-bottom: 24px;">
                <h2 style="margin: 0 0 12px 0; color: #1e40af; font-size: 22px; font-weight: bold;">
                  ${sampleData.leadName}
                </h2>
                <p style="margin: 0 0 12px 0; color: #374151; font-size: 15px;">
                  <strong>📅 Due:</strong> ${timeInfo}
                </p>
                <p style="margin: 0 0 8px 0; color: #374151; font-size: 15px;">
                  <strong>📞 Phone:</strong> <a href="tel:${sampleData.leadPhone}" style="color: #2563eb; text-decoration: none;">${sampleData.leadPhone}</a>
                </p>
                <p style="margin: 0 0 8px 0; color: #374151; font-size: 15px;">
                  <strong>🏢 Provider:</strong> ${sampleData.leadProvider}
                </p>
                <p style="margin: 0 0 8px 0; color: #374151; font-size: 15px;">
                  <strong>📍 Address:</strong> ${sampleData.leadAddress}
                </p>
                <p style="margin: 0 0 12px 0; color: #374151; font-size: 15px;">
                  <strong>🏙️ Town:</strong> ${sampleData.leadTown}
                </p>
                <p style="margin: 0 0 20px 0; color: #374151; font-size: 15px; line-height: 1.6;">
                  <strong>📝 Notes:</strong> ${sampleData.reminderMessage}
                </p>
                
                <div style="background-color: #d1fae5; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                  <h3 style="margin: 0 0 12px 0; color: #065f46; font-size: 18px; font-weight: bold;">
                    ✅ Action Required
                  </h3>
                  <p style="margin: 0 0 12px 0; color: #047857; font-size: 15px; line-height: 1.6;">
                    Your reminder time has passed. Now is the perfect time to:
                  </p>
                  <ul style="margin: 0 0 0 20px; padding: 0; color: #047857; font-size: 14px; line-height: 1.8;">
                    <li>Update the lead status if needed</li>
                    <li>Add notes about your interaction</li>
                    <li>Set new reminders for follow-up actions</li>
                    <li>Move the lead to the next stage in your pipeline</li>
                  </ul>
                </div>
                
                <div style="margin-top: 0;">
                  <a href="${sampleData.leadMapsAddress}" target="_blank" style="display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: bold; margin-right: 10px;">
                    🗺️ Open in Google Maps
                  </a>
                  <a href="https://deals.smartintegrate.co.za/leads?openModal=${sampleData.leadId}" target="_blank" style="display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: bold;">
                    View Lead Details
                  </a>
                </div>
              </div>
              
              <p style="margin: 20px 0 0 0; color: #9ca3af; font-size: 13px; line-height: 1.5; text-align: center;">
                This is an automated reminder notification from Smart Calculator.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} Smart Calculator. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const mailOptions = {
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: sampleData.recipientEmail,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('✅ Follow-up email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response}`);
    console.log(`   Accepted: ${info.accepted?.join(', ')}`);
    console.log(`   Rejected: ${info.rejected?.join(', ') || 'none'}`);
      console.log('');
      console.log('📬 Check your inbox at: sean@smartintegrate.co.za');
      console.log('');
      console.log('The email should have:');
      console.log('   ✓ Green header with "Time to update your lead!"');
      console.log('   ✓ Lead information (Sky Arch Travel)');
      console.log('   ✓ Green "Action Required" box with bullet points');
      console.log('   ✓ Blue action buttons (Google Maps & View Lead Details)');
      console.log('');
    } catch (error) {
      console.error('❌ Error:', error.message);
      console.error(error);
      process.exit(1);
    }

  console.log('═══════════════════════════════════════════════════');
  console.log('✨ Test completed!');
  console.log('═══════════════════════════════════════════════════');
}

sendTestFollowupEmail().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
