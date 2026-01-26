@echo off
echo ========================================
echo RESTARTING DEV SERVER FOR STATUS FIX
echo ========================================
echo.
echo This will restart the development server with the status dropdown fix.
echo.
echo Press Ctrl+C to stop the current server if it's running...
timeout /t 3
echo.
echo Starting fresh dev server...
echo.
cd /d "%~dp0"
npm run dev
