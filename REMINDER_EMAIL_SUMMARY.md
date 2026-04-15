# Reminder Email Notifications - Summary

## Overview

A complete email notification system for lead reminders that automatically sends emails at three key times:
1. When a reminder is created
2. 1 day before it's due
3. 30 minutes before it's due

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     User Creates Reminder                        │
│                  (via UI or API endpoint)                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Database (PostgreSQL)                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ reminders table                                           │  │
│  │ - id, lead_id, user_id, message, reminder_date, etc.     │  │
│  │ - email_sent_created  (boolean)                          │  │
│  │ - email_sent_1day     (boolean)                          │  │
│  │ - email_sent_30min    (boolean)                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Cron Job (Every 5-15 minutes)                       │
│         POST /api/reminders/notifications                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│         lib/reminderNotifications.ts                             │
│         processReminderNotifications()                           │
│                                                                   │
│  1. Query all active reminders                                   │
│  2. Check which emails haven't been sent                         │
│  3. Calculate time until due                                     │
│  4. Send appropriate emails                                      │
│  5. Update database flags                                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    lib/email.ts                                  │
│                sendReminderEmail()                               │
│                                                                   │
│  - Formats HTML email with reminder details                      │
│  - Includes lead information if available                        │
│  - Color-coded by urgency (blue/orange/red)                      │
│  - Sends via SMTP (Gmail, SendGrid, AWS SES, etc.)              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    User's Email Inbox                            │
│              Professional HTML Email Received                    │
└─────────────────────────────────────────────────────────────────┘
```

## Files Created

### Core Services
- **`lib/email.ts`** (280 lines)
  - Email service using Nodemailer
  - HTML email templates
  - SMTP configuration
  - Test utilities

- **`lib/reminderNotifications.ts`** (140 lines)
  - Background job logic
  - Queries reminders needing notifications
  - Calculates timing for each notification type
  - Updates tracking flags

### API Endpoints
- **`app/api/reminders/notifications/route.ts`** (70 lines)
  - POST endpoint for cron jobs
  - GET endpoint for status checks
  - Authentication via CRON_SECRET

### Database
- **`database/migrations/022_add_reminder_email_tracking.sql`**
  - Adds 3 boolean columns to track sent emails
  - Adds index for efficient querying

- **`database/schema.sql`** (updated)
  - Updated with new columns

### Documentation
- **`REMINDER_EMAIL_QUICK_START.md`**
  - 5-minute setup guide
  - Quick reference

- **`REMINDER_EMAIL_SETUP.md`**
  - Comprehensive documentation
  - Multiple email provider options
  - Production recommendations
  - Troubleshooting guide

- **`REMINDER_EMAIL_SUMMARY.md`** (this file)
  - Architecture overview
  - File listing

### Testing & Scripts
- **`scripts/test-reminder-emails.js`**
  - Tests email configuration
  - Validates SMTP connection
  - Checks endpoint accessibility

- **`package.json`** (updated)
  - Added `npm run migrate:reminder-emails`
  - Added `npm run test:reminder-emails`

## Email Notification Logic

### Creation Notification
```
Trigger: email_sent_created = false
Action: Send immediately
Update: email_sent_created = true
```

### 1-Day Before Notification
```
Trigger: email_sent_1day = false AND time_until_due <= 24 hours
Action: Send "tomorrow" email
Update: email_sent_1day = true
```

### 30-Minute Before Notification
```
Trigger: email_sent_30min = false AND time_until_due <= 30 minutes
Action: Send "urgent" email
Update: email_sent_30min = true
```

## Email Content

Each email includes:
- **Header**: Color-coded urgency banner
- **Title**: Reminder title/message
- **Details**: 
  - Message content
  - Due date and time
  - Priority badge (color-coded)
- **Lead Info** (if applicable):
  - Lead name
  - Contact person
  - Phone number
- **Footer**: Professional branding

### Color Scheme
- **Creation**: Blue (#3b82f6)
- **1-Day Before**: Orange (#f59e0b)
- **30-Min Before**: Red (#ef4444)

### Priority Colors
- **Low**: Green (#10b981)
- **Medium**: Orange (#f59e0b)
- **High**: Red (#ef4444)
- **Urgent**: Dark Red (#dc2626)

## Environment Variables

Required:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

Optional:
```env
SMTP_FROM=your-email@gmail.com
SMTP_FROM_NAME=Smart Calculator Reminders
CRON_SECRET=random-secret-for-cron-endpoint
```

## Setup Checklist

- [ ] Install nodemailer: `npm install nodemailer @types/nodemailer`
- [ ] Add environment variables to `.env.local`
- [ ] Set up email provider (Gmail app password, SendGrid, etc.)
- [ ] Run database migration: `npm run migrate:reminder-emails`
- [ ] Test email config: `npm run test:reminder-emails`
- [ ] Set up cron job (cron-job.org, Vercel Cron, etc.)
- [ ] Test with a real reminder
- [ ] Monitor logs for errors

## Cron Job Options

### External Services (Recommended)
- **cron-job.org**: Free, reliable, no signup needed
- **EasyCron**: Free tier available
- **UptimeRobot**: Can trigger endpoints

### Platform-Specific
- **Vercel Cron**: Built-in for Vercel deployments
- **AWS EventBridge**: For AWS deployments
- **Google Cloud Scheduler**: For GCP deployments

### Self-Hosted
- **node-cron**: Run within your Node.js app
- **System cron**: Use server's cron daemon

## Performance Considerations

- Cron runs every 5-15 minutes (configurable)
- Queries only active (non-completed) reminders
- Uses indexed columns for fast queries
- Processes reminders in batches
- Logs all operations for monitoring

## Security

- SMTP credentials in environment variables (never committed)
- Optional CRON_SECRET for endpoint protection
- Email addresses validated before sending
- Rate limiting handled by email provider
- No sensitive data in email content

## Future Enhancements

Possible additions:
- [ ] User email preferences (opt-in/opt-out)
- [ ] Custom notification timing
- [ ] SMS notifications via Twilio
- [ ] In-app notifications
- [ ] Email template customization
- [ ] Batch email sending
- [ ] Delivery tracking
- [ ] Retry failed emails
- [ ] Email open tracking
- [ ] Click tracking

## Monitoring

Check these regularly:
- Application logs for email errors
- Email provider dashboard for delivery rates
- Database for unsent notifications
- Cron job execution logs

## Cost Estimates

### Email Providers (Monthly)
- **Gmail**: Free (500/day limit)
- **SendGrid**: Free tier (100/day)
- **AWS SES**: $0.10 per 1,000 emails
- **Mailgun**: $0.80 per 1,000 emails

### Cron Services
- **cron-job.org**: Free
- **Vercel Cron**: Free (included)
- **AWS EventBridge**: $1 per million invocations

## Support

For issues or questions:
1. Check `REMINDER_EMAIL_SETUP.md` for detailed docs
2. Run `npm run test:reminder-emails` to diagnose
3. Check application logs
4. Verify environment variables
5. Test SMTP connection manually

## Quick Commands

```bash
# Install dependencies
npm install nodemailer @types/nodemailer

# Run migration
npm run migrate:reminder-emails

# Test email setup
npm run test:reminder-emails

# Manually trigger notification check
curl -X POST http://localhost:3000/api/reminders/notifications

# Check endpoint status
curl http://localhost:3000/api/reminders/notifications
```

---

**Status**: ✅ Ready to use
**Last Updated**: 2026-04-15
**Version**: 1.0.0
