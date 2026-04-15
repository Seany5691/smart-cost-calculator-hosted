# 🚀 START HERE - Email Test Setup

## What You Need to Do Right Now

Follow these steps to test email notifications before deploying to VPS.

---

## Quick Start (5 Minutes)

### 1. Install Dependencies
```bash
cd hosted-smart-cost-calculator
npm install nodemailer @types/nodemailer
```

### 2. Set Up Gmail App Password

**Go to:** https://myaccount.google.com/apppasswords

**Steps:**
1. Enable 2-Factor Authentication (if not already enabled)
2. Click "App passwords" or search for it
3. Select "Mail" and your device
4. Click "Generate"
5. Copy the 16-character password (example: `abcd efgh ijkl mnop`)

### 3. Add to .env.local

Open `hosted-smart-cost-calculator/.env.local` and add:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=abcdefghijklmnop
SMTP_FROM=your-email@gmail.com
SMTP_FROM_NAME=Smart Calculator Reminders
```

**Replace:**
- `your-email@gmail.com` → Your Gmail address
- `abcdefghijklmnop` → The 16-char password from step 2 (remove spaces)

### 4. Send Test Email

```bash
npm run test:send-email
```

This sends 3 test emails to **sean@smartintegrate.co.za**

### 5. Check Email

Look in sean@smartintegrate.co.za inbox (and spam folder) for 3 emails:
- 🔵 Blue "New Reminder" email
- 🟠 Orange "Reminder Tomorrow" email
- 🔴 Red "Reminder in 30 Minutes" email

---

## If Something Goes Wrong

### Error: "Missing required SMTP configuration"
→ Check `.env.local` has all the SMTP variables

### Error: "SMTP connection failed"
→ Make sure you're using the App Password, NOT your regular Gmail password

### Error: "Authentication failed"
→ Regenerate the App Password and try again

### Emails not received
→ Check spam folder first
→ Verify sean@smartintegrate.co.za is correct

---

## After Successful Test

### 1. Run Database Migration
```bash
npm run migrate:reminder-emails
```

### 2. Commit to GitHub
```bash
git add .
git commit -m "Add email notification system for reminders"
git push
```

**Note:** `.env.local` is NOT committed (it's in .gitignore)

### 3. Deploy to VPS

On your VPS:
1. Pull the latest code
2. Add the same SMTP variables to VPS `.env.local`
3. Run: `npm run migrate:reminder-emails`
4. Set up cron job (see REMINDER_EMAIL_SETUP.md)

---

## What This Does

When a user creates a reminder, they'll automatically receive emails:
- ✉️ Immediately when created
- ⏰ 1 day before it's due
- 🚨 30 minutes before it's due

Each email includes:
- Reminder title and message
- Due date and time
- Priority level (color-coded)
- Lead information (if attached)
- Professional HTML design

---

## Files You Created

- `lib/email.ts` - Email sending service
- `lib/reminderNotifications.ts` - Notification logic
- `app/api/reminders/notifications/route.ts` - Cron endpoint
- `database/migrations/022_add_reminder_email_tracking.sql` - Database changes
- `scripts/send-test-email.js` - Test script
- Documentation files

---

## Commands Reference

```bash
# Install dependencies
npm install nodemailer @types/nodemailer

# Send test email to Sean
npm run test:send-email

# Test email configuration
npm run test:reminder-emails

# Run database migration
npm run migrate:reminder-emails
```

---

## Need More Help?

- **Quick guide:** `TEST_EMAIL_SETUP_STEPS.md`
- **Full documentation:** `REMINDER_EMAIL_SETUP.md`
- **Architecture overview:** `REMINDER_EMAIL_SUMMARY.md`

---

## Ready? Let's Test!

```bash
npm install nodemailer @types/nodemailer
npm run test:send-email
```

Then check sean@smartintegrate.co.za inbox! 📧
