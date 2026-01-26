@echo off
echo ========================================
echo  Restarting Dev Server - Reminder Fix
echo ========================================
echo.
echo This will restart the development server to apply:
echo - Fixed reminder creation (title column issue)
echo - Auto-select current user in share list
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
echo Test reminder creation:
echo 1. Open any lead
echo 2. Click "Add Reminder" from dropdown
echo 3. Fill in message, date, and time
echo 4. Notice current user is pre-selected
echo 5. Click "Save Reminder"
echo 6. Should save successfully!
echo.
pause
