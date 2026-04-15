# How to Test Reminder Emails

## Overview

The reminder email system has three types of notifications:
1. **Creation Email** - Sent immediately when reminder is created ✅ (automatic)
2. **1-Day Before Email** - Sent when reminder is 24 hours away (needs cron/manual check)
3. **30-Min Before Email** - Sent when reminder is 30 minutes away (needs cron/manual check)

## Testing Creation Emails (Immediate)

These work automatically now!

1. **Create a reminder** in the app (any date/time)
2. **Check your email immediately**
3. You should receive a blue "New Reminder" email

## Testing 1-Day Before Emails (Batched)

### Option A: Use Test Button (Easiest)
1. Create 2-3 reminders for tomorrow
2. Click the orange "Test 1-Day Email" button
3. Check your email - you'll get ONE email with all tomorrow's reminders

### Option B: Manual Cron Check
1. Create reminders for tomorrow (24 hours from now)
2. Run: `npm run check:reminders`
3. Check your email

## Testing 30-Min Before Emails (Individual)

### Option A: Create reminder 45 minutes from now
1. Create a reminder for 45 minutes from now
2. Wait 15 minutes
3. Run: `npm run check:reminders`
4. Check your email - you'll get individual email for that reminder

### Option B: Create reminder 25 minutes from now
1. Create a reminder for 25 minutes from now
2. Immediately run: `npm run check:reminders`
3. Check your email

## Manual Reminder Check Command

```bash
npm run check:reminders
```

This command:
- Checks all active reminders
- Sends 1-day-before emails (batched by user)
- Sends 30-min-before emails (individual)
- Shows statistics of what was sent

## Production Setup

On your VPS, set up a cron job to run every 10 minutes:

### Using cron-job.org (Recommended)
1. Go to https://cron-job.org
2. Create new cron job:
   - URL: `https://your-domain.com/api/reminders/notifications`
   - Method: POST
   - Schedule: `*/10 * * * *` (every 10 minutes)
   - Optional: Add `Authorization: Bearer your-cron-secret` header

### Using System Cron (Linux/VPS)
```bash
# Edit crontab
crontab -e

# Add this line (runs every 10 minutes)
*/10 * * * * cd /path/to/your/app && node scripts/run-reminder-check.js >> /var/log/reminder-cron.log 2>&1
```

## Testing Checklist

- [ ] Create reminder → Receive creation email immediately
- [ ] Create reminder for tomorrow → Click test button → Receive batched email
- [ ] Create reminder for 45 min from now → Wait 15 min → Run check → Receive 30-min email
- [ ] Create 3 reminders for tomorrow → Run check → Receive ONE email with all 3

## Troubleshooting

### Creation emails not received
- Check your spam folder
- Verify SMTP settings in `.env.local`
- Check console logs for errors
- Run: `npm run test:send-email` to verify email config

### 1-day or 30-min emails not received
- Make sure you ran `npm run check:reminders`
- Check that reminders are in the correct time window:
  - 1-day: Between 0-24 hours away
  - 30-min: Between 0-30 minutes away
- Verify email tracking columns exist (run migration)
- Check console output for errors

### Email already sent
Each email type is only sent once per reminder:
- `email_sent_created` - Creation email sent
- `email_sent_1day` - 1-day email sent
- `email_sent_30min` - 30-min email sent

If you want to test again, you need to create a new reminder.

## Quick Test Sequence

```bash
# 1. Test creation email (automatic)
# Create a reminder in the app → Check email

# 2. Test 1-day email (manual)
# Create reminder for tomorrow
npm run check:reminders
# Check email

# 3. Test 30-min email (manual)
# Create reminder for 25 minutes from now
npm run check:reminders
# Check email
```

## Notes

- Creation emails are sent immediately when reminder is created
- 1-day and 30-min emails require running the check (cron job or manual)
- In production, the cron job runs automatically every 10 minutes
- For local testing, run `npm run check:reminders` manually
- Each email is only sent once (tracked in database)
