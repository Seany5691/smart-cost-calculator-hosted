# Test Email Setup - Step by Step

## Goal
Send a test email to sean@smartintegrate.co.za to verify the email system works before deploying to VPS.

## Prerequisites
- Node.js installed
- Access to an email account for sending (Gmail recommended for testing)

---

## Step 1: Install Dependencies

```bash
cd hosted-smart-cost-calculator
npm install nodemailer @types/nodemailer
```

---

## Step 2: Configure Email Settings

### Option A: Using Gmail (Recommended for Testing)

1. **Enable 2-Factor Authentication on your Gmail account:**
   - Go to https://myaccount.google.com/security
   - Click "2-Step Verification" and follow the setup

2. **Generate an App Password:**
   - Go to https://myaccount.google.com/apppasswords
   - Or search for "App passwords" in your Google Account settings
   - Select "Mail" and your device
   - Click "Generate"
   - Copy the 16-character password (no spaces)

3. **Add to `.env.local` file:**

Open `hosted-smart-cost-calculator/.env.local` and add these lines:

```env
# Email Configuration for Reminders
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-gmail-address@gmail.com
SMTP_PASSWORD=your-16-char-app-password
SMTP_FROM=your-gmail-address@gmail.com
SMTP_FROM_NAME=Smart Calculator Reminders
```

**Replace:**
- `your-gmail-address@gmail.com` with your actual Gmail address
- `your-16-char-app-password` with the password from step 2

### Option B: Using Another Email Provider

If you're not using Gmail, see the examples in `.env.reminder-emails.example` for SendGrid, AWS SES, or custom SMTP servers.

---

## Step 3: Test the Configuration

Run the configuration test:

```bash
npm run test:reminder-emails
```

**Expected output:**
```
✅ Environment variables found
✅ SMTP connection successful!
📧 Email system is ready to send notifications.
```

**If you see errors:**
- Check your SMTP credentials are correct
- For Gmail, make sure you're using the App Password, not your regular password
- Verify 2-Factor Authentication is enabled

---

## Step 4: Send Test Email to Sean

Run the test email script:

```bash
npm run test:send-email
```

This will send 3 test emails to sean@smartintegrate.co.za showing all three notification types:
1. Blue "New Reminder" email
2. Orange "Reminder Tomorrow" email  
3. Red "Reminder in 30 Minutes" email

**Expected output:**
```
✅ SMTP connection successful!
📧 Sending test email to sean@smartintegrate.co.za...
✅ Creation email sent successfully!
✅ 1-day email sent successfully!
✅ 30-min email sent successfully!
🎉 All emails sent! Check sean@smartintegrate.co.za inbox
```

---

## Step 5: Verify Email Received

1. Check the inbox for sean@smartintegrate.co.za
2. Also check the spam/junk folder
3. You should see 3 emails with different colors and urgency levels

**Email Features to Check:**
- Professional HTML formatting
- Color-coded headers (blue/orange/red)
- Reminder details clearly displayed
- Priority badge visible
- Lead information included
- Responsive design (looks good on mobile)

---

## Step 6: Run Database Migration

Once emails are working, run the migration to add tracking columns:

```bash
npm run migrate:reminder-emails
```

**Expected output:**
```
✅ Migration completed
```

This adds three columns to the reminders table:
- `email_sent_created`
- `email_sent_1day`
- `email_sent_30min`

---

## Step 7: Ready for VPS Deployment

Once all tests pass, you're ready to deploy! Before pushing to GitHub:

### Checklist:
- [ ] Test emails sent successfully
- [ ] Database migration completed
- [ ] `.env.local` is in `.gitignore` (it should be)
- [ ] Email credentials are NOT in any committed files
- [ ] All 3 email types display correctly

### On VPS, you'll need to:
1. Add the same SMTP environment variables to VPS `.env.local`
2. Run the migration: `npm run migrate:reminder-emails`
3. Set up a cron job (see REMINDER_EMAIL_SETUP.md)

---

## Troubleshooting

### "Missing required SMTP configuration"
- Check `.env.local` file exists in `hosted-smart-cost-calculator/` folder
- Verify all SMTP variables are set
- Make sure there are no typos in variable names

### "SMTP connection failed"
- **Gmail users:** Use App Password, not regular password
- Verify 2-Factor Authentication is enabled
- Check SMTP_HOST and SMTP_PORT are correct
- Try disabling antivirus/firewall temporarily

### "Authentication failed"
- Double-check SMTP_USER and SMTP_PASSWORD
- For Gmail, regenerate the App Password
- Make sure there are no extra spaces in the password

### Emails not received
- Check spam/junk folder
- Verify sean@smartintegrate.co.za is correct
- Check email provider's sending limits
- Look for bounce-back emails in your sent folder

### "Cannot find module '../lib/email'"
- Make sure you're in the `hosted-smart-cost-calculator` directory
- Run `npm install` to ensure all dependencies are installed
- Check that `lib/email.ts` file exists

---

## Quick Reference Commands

```bash
# Install dependencies
npm install nodemailer @types/nodemailer

# Test email configuration
npm run test:reminder-emails

# Send test email to Sean
npm run test:send-email

# Run database migration
npm run migrate:reminder-emails

# Start dev server (if needed)
npm run dev
```

---

## Security Notes

- Never commit `.env.local` to Git
- Use different email credentials for dev/staging/production
- Rotate App Passwords periodically
- Consider using a dedicated email service (SendGrid, AWS SES) for production

---

## Next Steps After Testing

1. **Commit the code** (without .env.local):
   ```bash
   git add .
   git commit -m "Add email notification system for reminders"
   git push
   ```

2. **Deploy to VPS:**
   - Pull latest code
   - Add SMTP variables to VPS `.env.local`
   - Run migration
   - Set up cron job (see REMINDER_EMAIL_SETUP.md)

3. **Set up cron job** to call `/api/reminders/notifications` every 10 minutes

4. **Monitor logs** for any email sending errors

---

## Support

If you encounter issues:
1. Check this guide first
2. Review `REMINDER_EMAIL_SETUP.md` for detailed documentation
3. Check application logs for error messages
4. Verify environment variables are set correctly

---

**Ready to test?** Run: `npm run test:send-email`
