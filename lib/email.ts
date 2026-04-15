/**
 * Email Service
 * Handles sending email notifications for reminders
 */

import nodemailer from 'nodemailer';

// Email configuration from environment variables
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
};

const FROM_EMAIL = process.env.SMTP_FROM || process.env.SMTP_USER;
const FROM_NAME = process.env.SMTP_FROM_NAME || 'Smart Calculator Reminders';

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport(EMAIL_CONFIG);
  }
  return transporter;
}

// Email templates
interface ReminderEmailData {
  recipientEmail: string;
  recipientName: string;
  reminderTitle: string;
  reminderMessage: string;
  reminderDate: string;
  reminderTime?: string;
  priority: string;
  reminderType?: string;
  leadName?: string;
  leadContact?: string;
  leadPhone?: string;
}

interface BatchedReminderEmailData {
  recipientEmail: string;
  recipientName: string;
  reminders: Array<{
    reminderTitle: string;
    reminderMessage: string;
    reminderDate: string;
    reminderTime?: string;
    priority: string;
    reminderType: string;
    leadName?: string;
    leadContact?: string;
    leadPhone?: string;
  }>;
}

function formatReminderEmail(data: ReminderEmailData, type: 'created' | '1day' | '30min'): { subject: string; html: string; text: string } {
  const timeInfo = data.reminderTime 
    ? `${data.reminderDate} at ${data.reminderTime}`
    : data.reminderDate;

  let subject = '';
  let urgencyText = '';
  let urgencyColor = '#3b82f6'; // blue

  switch (type) {
    case 'created':
      subject = `New Reminder: ${data.reminderTitle}`;
      urgencyText = 'A new reminder has been created';
      break;
    case '1day':
      subject = `Reminder Tomorrow: ${data.reminderTitle}`;
      urgencyText = 'This reminder is due tomorrow';
      urgencyColor = '#f59e0b'; // orange
      break;
    case '30min':
      subject = `⚠️ Reminder in 30 Minutes: ${data.reminderTitle}`;
      urgencyText = 'This reminder is due in 30 minutes!';
      urgencyColor = '#ef4444'; // red
      break;
  }

  const priorityColors: Record<string, string> = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444',
    urgent: '#dc2626',
  };

  const priorityColor = priorityColors[data.priority] || '#6b7280';

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
          <!-- Header -->
          <tr>
            <td style="background-color: ${urgencyColor}; padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">
                ${urgencyText}
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <!-- Reminder Title -->
              <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 20px;">
                ${data.reminderTitle}
              </h2>
              
              <!-- Reminder Details -->
              <div style="background-color: #f9fafb; border-left: 4px solid ${urgencyColor}; padding: 20px; margin-bottom: 20px; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; color: #374151; font-size: 16px; line-height: 1.5;">
                  <strong>Message:</strong><br>
                  ${data.reminderMessage}
                </p>
                <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">
                  <strong>Due:</strong> ${timeInfo}
                </p>
                <p style="margin: 5px 0 0 0;">
                  <span style="display: inline-block; background-color: ${priorityColor}; color: #ffffff; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; text-transform: uppercase;">
                    ${data.priority} Priority
                  </span>
                </p>
              </div>
              
              ${data.leadName ? `
              <!-- Lead Information -->
              <div style="background-color: #eff6ff; padding: 20px; border-radius: 4px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0; color: #1e40af; font-size: 16px;">Lead Information</h3>
                <p style="margin: 5px 0; color: #374151; font-size: 14px;">
                  <strong>Name:</strong> ${data.leadName}
                </p>
                ${data.leadContact ? `
                <p style="margin: 5px 0; color: #374151; font-size: 14px;">
                  <strong>Contact:</strong> ${data.leadContact}
                </p>
                ` : ''}
                ${data.leadPhone ? `
                <p style="margin: 5px 0; color: #374151; font-size: 14px;">
                  <strong>Phone:</strong> ${data.leadPhone}
                </p>
                ` : ''}
              </div>
              ` : ''}
              
              <!-- Footer Note -->
              <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                This is an automated reminder notification from Smart Calculator.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
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

  const text = `
${urgencyText}

${data.reminderTitle}

Message: ${data.reminderMessage}
Due: ${timeInfo}
Priority: ${data.priority}

${data.leadName ? `
Lead Information:
Name: ${data.leadName}
${data.leadContact ? `Contact: ${data.leadContact}` : ''}
${data.leadPhone ? `Phone: ${data.leadPhone}` : ''}
` : ''}

---
This is an automated reminder notification from Smart Calculator.
  `.trim();

  return { subject, html, text };
}

/**
 * Send a reminder notification email
 */
export async function sendReminderEmail(
  data: ReminderEmailData,
  type: 'created' | '1day' | '30min'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if email is configured
    if (!EMAIL_CONFIG.auth.user || !EMAIL_CONFIG.auth.pass) {
      console.warn('Email not configured. Skipping email notification.');
      return { success: false, error: 'Email not configured' };
    }

    const { subject, html, text } = formatReminderEmail(data, type);

    const mailOptions = {
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: data.recipientEmail,
      subject,
      text,
      html,
    };

    const transporter = getTransporter();
    const info = await transporter.sendMail(mailOptions);

    console.log(`[EMAIL] Reminder email sent: ${info.messageId}`);
    return { success: true };
  } catch (error) {
    console.error('[EMAIL] Error sending reminder email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test email configuration
 */
export async function testEmailConfig(): Promise<{ success: boolean; error?: string }> {
  try {
    if (!EMAIL_CONFIG.auth.user || !EMAIL_CONFIG.auth.pass) {
      return { success: false, error: 'Email credentials not configured' };
    }

    const transporter = getTransporter();
    await transporter.verify();
    
    console.log('[EMAIL] Email configuration is valid');
    return { success: true };
  } catch (error) {
    console.error('[EMAIL] Email configuration error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function formatBatchedReminderEmail(data: BatchedReminderEmailData): { subject: string; html: string; text: string } {
  const subject = `📅 Tomorrow's Reminders (${data.reminders.length})`;
  const urgencyColor = '#f59e0b'; // orange

  const remindersHtml = data.reminders.map((reminder, index) => {
    const priorityColors: Record<string, string> = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444',
      urgent: '#dc2626',
    };
    const priorityColor = priorityColors[reminder.priority] || '#6b7280';
    const timeInfo = reminder.reminderTime 
      ? `${reminder.reminderDate} at ${reminder.reminderTime}`
      : reminder.reminderDate;

    return `
      <div style="background-color: #f9fafb; border-left: 4px solid ${urgencyColor}; padding: 20px; margin-bottom: 15px; border-radius: 4px;">
        <div style="display: flex; align-items: center; margin-bottom: 10px;">
          <span style="display: inline-block; background-color: ${priorityColor}; color: #ffffff; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-right: 10px;">
            ${reminder.priority}
          </span>
          <span style="color: #6b7280; font-size: 14px;">${reminder.reminderType}</span>
        </div>
        <h3 style="margin: 0 0 10px 0; color: #111827; font-size: 18px;">
          ${index + 1}. ${reminder.reminderTitle}
        </h3>
        <p style="margin: 0 0 10px 0; color: #374151; font-size: 15px; line-height: 1.5;">
          ${reminder.reminderMessage}
        </p>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">
          <strong>Due:</strong> ${timeInfo}
        </p>
        ${reminder.leadName ? `
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #6b7280; font-size: 13px;">
            <strong>Lead:</strong> ${reminder.leadName}
            ${reminder.leadContact ? ` - ${reminder.leadContact}` : ''}
            ${reminder.leadPhone ? ` - ${reminder.leadPhone}` : ''}
          </p>
        </div>
        ` : ''}
      </div>
    `;
  }).join('');

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
                You have ${data.reminders.length} reminder${data.reminders.length > 1 ? 's' : ''} due tomorrow
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 16px;">
                Hi ${data.recipientName}, here are your reminders for tomorrow:
              </p>
              ${remindersHtml}
              <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
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

  const text = `
You have ${data.reminders.length} reminder${data.reminders.length > 1 ? 's' : ''} due tomorrow

Hi ${data.recipientName}, here are your reminders for tomorrow:

${data.reminders.map((reminder, index) => {
  const timeInfo = reminder.reminderTime 
    ? `${reminder.reminderDate} at ${reminder.reminderTime}`
    : reminder.reminderDate;
  return `
${index + 1}. ${reminder.reminderTitle}
   Message: ${reminder.reminderMessage}
   Due: ${timeInfo}
   Priority: ${reminder.priority}
   ${reminder.leadName ? `Lead: ${reminder.leadName}` : ''}
`;
}).join('\n')}

---
This is an automated reminder notification from Smart Calculator.
  `.trim();

  return { subject, html, text };
}

/**
 * Send a batched reminder notification email (for 1-day-before notifications)
 */
export async function sendBatchedReminderEmail(
  data: BatchedReminderEmailData
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if email is configured
    if (!EMAIL_CONFIG.auth.user || !EMAIL_CONFIG.auth.pass) {
      console.warn('Email not configured. Skipping email notification.');
      return { success: false, error: 'Email not configured' };
    }

    const { subject, html, text } = formatBatchedReminderEmail(data);

    const mailOptions = {
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: data.recipientEmail,
      subject,
      text,
      html,
    };

    const transporter = getTransporter();
    const info = await transporter.sendMail(mailOptions);

    console.log(`[EMAIL] Batched reminder email sent: ${info.messageId}`);
    return { success: true };
  } catch (error) {
    console.error('[EMAIL] Error sending batched reminder email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
