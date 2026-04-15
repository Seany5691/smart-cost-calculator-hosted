@echo off
REM Quick setup script for testing email notifications
REM Run this from the hosted-smart-cost-calculator directory

echo ========================================
echo Email Notification System - Quick Setup
echo ========================================
echo.

echo Step 1: Installing nodemailer...
call npm install nodemailer @types/nodemailer
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo.

echo Step 2: Checking .env.local configuration...
if not exist ".env.local" (
    echo WARNING: .env.local file not found!
    echo Please create .env.local and add your SMTP settings.
    echo See .env.reminder-emails.example for template.
    pause
    exit /b 1
)
echo .env.local found
echo.

echo Step 3: Testing email configuration...
call npm run test:reminder-emails
if errorlevel 1 (
    echo.
    echo ERROR: Email configuration test failed!
    echo Please check your SMTP settings in .env.local
    echo.
    echo For Gmail:
    echo 1. Enable 2-Factor Authentication
    echo 2. Generate App Password at https://myaccount.google.com/apppasswords
    echo 3. Add to .env.local:
    echo    SMTP_HOST=smtp.gmail.com
    echo    SMTP_PORT=587
    echo    SMTP_USER=your-email@gmail.com
    echo    SMTP_PASSWORD=your-app-password
    pause
    exit /b 1
)
echo.

echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Ready to send test email to sean@smartintegrate.co.za
echo.
echo Run: npm run test:send-email
echo.
pause
