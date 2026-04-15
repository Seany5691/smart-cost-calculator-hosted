# Reminder Email Notifications Setup Guide

This guide explains how to set up email notifications for reminders in the leads section.

## Features

The system sends three types of email notifications:
1. **Creation notification** - Sent immediately when a reminder is created
2. **1-day before notification** - Sent when the reminder is 24 hours away
3. **30-minute before notification** - Sent when the reminder is 30 minutes away

## Setup Steps

### 1. Install Dependencies

```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

### 2. Configure Environment Variables

Add these variables to your `.env.local` file:

```env
# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com
SMTP_FROM_NAME=Smart Calculator Reminders

# Cron Job Security (optional but recommended)
CRON_SECRET=your-random-secret-key-here
```

### 3. Email Provider Setup

#### Option A: Gmail (Recommended for testing)

1. Go to your Google Account settings
2. Enable 2-Factor Authentication
3. Generate an App Password:
   - Go to Security → 2-Step Verification → App passwords
   - Select "Mail" and your device
   - Copy the generated 16-character password
4. Use this app password as `SMTP_PASSWORD`

#### Option B: SendGrid

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

#### Option C: AWS SES

```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-ses-smtp-username
SMTP_PASSWORD=your-ses-smtp-password
```

#### Option D: Custom SMTP Server

Use your own SMTP server credentials.

### 4. Run Database Migration

```bash
node -e "
const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const sql = fs.readFileSync('./database/migrations/022_add_reminder_email_tracking.sql', 'utf8');
pool.query(sql).then(() => {
  console.log('Migration completed successfully');
  pool.end();
}).catch(err => {
  console.error('Migration failed:', err);
  pool.end();
  process.exit(1);
});
"
```

Or manually run the SQL from `database/migrations/022_add_reminder_email_tracking.sql`.

### 5. Set Up Cron Job

You need to call the notification endpoint periodically. Choose one option:

#### Option A: External Cron Service (Recommended for production)

Use a service like:
- **Cron-job.org** (free)
- **EasyCron** (free tier available)
- **AWS EventBridge**
- **Vercel Cron** (if deployed on Vercel)

Configure it to call:
```
POST https://your-domain.com/api/reminders/notifications
Headers:
  Authorization: Bearer your-cron-secret
```

Run every 5-15 minutes for best results.

#### Option B: Vercel Cron (if using Vercel)

Create `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/reminders/notifications",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

#### Option C: Node-cron (for self-hosted)

Create `lib/cron.ts`:
```typescript
import cron from 'node-cron';
import { processReminderNotifications } from './reminderNotifications';

// Run every 10 minutes
cron.schedule('*/10 * * * *', async () => {
  console.log('Running reminder notification check...');
  try {
    await processReminderNotifications();
  } catch (error) {
    console.error('Cron job error:', error);
  }
});
```

Then import and initialize in your app startup.

### 6. Test the Setup

#### Test Email Configuration

Create a test script `test-email.js`:
```javascript
require('dotenv').config({ path: '.env.local' });
const { testEmailConfig } = require('./lib/email');

testEmailConfig().then(result => {
  if (result.success) {
    console.log('✅ Email configuration is valid!');
  } else {
    console.error('❌ Email configuration error:', result.error);
  }
  process.exit(result.success ? 0 : 1);
});
```

Run: `node test-email.js`

#### Test Notification Processing

```bash
curl -X POST http://localhost:3000/api/reminders/notifications \
  -H "Authorization: Bearer your-cron-secret"
```

Or visit the endpoint in your browser (if no CRON_SECRET is set).

## How It Works

1. **When a reminder is created**: The system immediately sends a creation notification email to the user who owns the reminder.

2. **Background job runs**: Every 5-15 minutes (depending on your cron setup), the system:
   - Queries all active (non-completed) reminders
   - Checks which notifications haven't been sent yet
   - Sends appropriate emails based on time remaining
   - Updates the database to mark emails as sent

3. **Email tracking**: Three boolean columns track which emails have been sent:
   - `email_sent_created` - Creation notification
   - `email_sent_1day` - 1-day-before notification
   - `email_sent_30min` - 30-minute-before notification

## Email Content

Each email includes:
- Reminder title and message
- Due date and time
- Priority level (color-coded)
- Lead information (if attached to a lead)
- Professional HTML formatting with responsive design

## Troubleshooting

### Emails not sending

1. Check environment variables are set correctly
2. Verify SMTP credentials with test script
3. Check application logs for errors
4. Ensure cron job is running
5. Check spam folder

### Gmail "Less secure app" error

Use an App Password instead of your regular password (see Gmail setup above).

### Rate limiting

Most email providers have rate limits:
- Gmail: 500 emails/day (free), 2000/day (Google Workspace)
- SendGrid: 100 emails/day (free tier)
- AWS SES: 200 emails/day (sandbox), unlimited (production)

### Testing without sending real emails

Set `SMTP_USER` and `SMTP_PASSWORD` to empty strings. The system will log attempts but not send emails.

## Production Recommendations

1. Use a dedicated email service (SendGrid, AWS SES, Mailgun)
2. Set up proper SPF, DKIM, and DMARC records
3. Use a professional "from" address
4. Monitor email delivery rates
5. Implement retry logic for failed sends
6. Add unsubscribe functionality if needed
7. Consider using a queue system (Bull, BullMQ) for high volume

## Security Notes

- Never commit `.env.local` to version control
- Use strong, random values for `CRON_SECRET`
- Restrict cron endpoint access in production
- Use environment-specific configurations
- Rotate SMTP credentials periodically

## Future Enhancements

Possible improvements:
- Email preferences per user (opt-in/opt-out)
- Custom notification timing
- SMS notifications
- In-app notifications
- Email templates customization
- Batch email sending
- Email delivery tracking
- Retry failed emails
