# Reminder Email Notifications - Quick Start

## What You Get

Email notifications for reminders at three key times:
- ✉️ **Immediately** when a reminder is created
- ⏰ **1 day before** the reminder is due
- 🚨 **30 minutes before** the reminder is due

## 5-Minute Setup

### 1. Install Package
```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

### 2. Add to `.env.local`
```env
# For Gmail (easiest for testing)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password
SMTP_FROM=your-email@gmail.com
SMTP_FROM_NAME=Smart Calculator Reminders

# Optional: Secure your cron endpoint
CRON_SECRET=make-up-a-random-secret-here
```

**Gmail App Password Setup:**
1. Go to Google Account → Security
2. Enable 2-Factor Authentication
3. Go to App Passwords
4. Generate password for "Mail"
5. Copy the 16-character password
6. Use it as `SMTP_PASSWORD`

### 3. Run Database Migration
```bash
# Quick method
node -e "const {Pool}=require('pg');const fs=require('fs');const p=new Pool({connectionString:process.env.DATABASE_URL});p.query(fs.readFileSync('./database/migrations/022_add_reminder_email_tracking.sql','utf8')).then(()=>{console.log('✅ Done');p.end()}).catch(e=>{console.error('❌',e);p.end()})"
```

### 4. Set Up Cron Job

Choose ONE option:

**Option A: Free External Cron (Recommended)**
1. Go to https://cron-job.org (free, no signup needed for basic)
2. Create new cron job:
   - URL: `https://your-domain.com/api/reminders/notifications`
   - Method: POST
   - Header: `Authorization: Bearer your-cron-secret`
   - Schedule: Every 10 minutes

**Option B: Vercel Cron (if using Vercel)**
Create `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/reminders/notifications",
    "schedule": "*/10 * * * *"
  }]
}
```

**Option C: Manual Testing**
```bash
# Test it manually
curl -X POST http://localhost:3000/api/reminders/notifications
```

### 5. Test It
```bash
# Test email config
node -e "require('dotenv').config({path:'.env.local'});require('./lib/email').testEmailConfig().then(r=>console.log(r.success?'✅ Works!':'❌ Error:',r.error))"

# Create a test reminder (via your app UI)
# Check your email inbox!
```

## How It Works

1. User creates a reminder → Email sent immediately
2. Cron job runs every 10 minutes → Checks all reminders
3. If reminder is 24 hours away → Sends "tomorrow" email
4. If reminder is 30 minutes away → Sends "urgent" email
5. Each email is only sent once (tracked in database)

## Email Preview

Emails include:
- Color-coded urgency (blue/orange/red)
- Reminder title and message
- Due date and time
- Priority badge
- Lead information (if attached)
- Professional HTML design

## Troubleshooting

**Emails not sending?**
- Check `.env.local` variables are correct
- Run the test command above
- Check spam folder
- Verify Gmail app password (not regular password)

**Cron not working?**
- Test manually with curl command
- Check cron service is active
- Verify URL is correct
- Check authorization header matches CRON_SECRET

**Want to skip emails during testing?**
- Leave `SMTP_USER` and `SMTP_PASSWORD` empty
- System will log but not send emails

## Production Tips

- Use SendGrid or AWS SES instead of Gmail (better deliverability)
- Set up SPF/DKIM records for your domain
- Monitor email delivery rates
- Consider adding user preferences (opt-in/opt-out)

## Files Created

- `lib/email.ts` - Email sending service
- `lib/reminderNotifications.ts` - Notification processing logic
- `app/api/reminders/notifications/route.ts` - Cron endpoint
- `database/migrations/022_add_reminder_email_tracking.sql` - Database changes

## Need More Help?

See `REMINDER_EMAIL_SETUP.md` for detailed documentation including:
- Alternative email providers (SendGrid, AWS SES, etc.)
- Advanced cron setups
- Security best practices
- Production recommendations
- Troubleshooting guide
