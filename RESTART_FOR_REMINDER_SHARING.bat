@echo off
echo ========================================
echo  Restarting Dev Server for Reminder Sharing
echo ========================================
echo.
echo This will restart the development server to apply:
echo - AddReminderModal user selection UI
echo - Shared reminders visibility in API
echo - Database migration 012 (already applied)
echo.
pause

echo.
echo Stopping any running dev servers...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Clearing Next.js cache...
if exist .next rmdir /s /q .next
if exist .next\cache rmdir /s /q .next\cache

echo.
echo Starting development server...
echo.
start cmd /k "npm run dev"

echo.
echo ========================================
echo  Dev server is starting!
echo ========================================
echo.
echo The server should be available at:
echo http://localhost:3000
echo.
echo Test the reminder sharing feature:
echo 1. Open a lead that is shared with other users
echo 2. Click "Add Reminder"
echo 3. You should see a list of users to share with
echo 4. Select users and create the reminder
echo 5. Log in as a selected user to verify they see it
echo.
pause
