@echo off
echo ========================================
echo RESTARTING WITH TRANSACTION FIX
echo ========================================
echo.
echo This restart includes the transaction-based fix for status changes.
echo All status updates and renumbering now happen atomically.
echo.
echo Press Ctrl+C in the other terminal to stop the current server...
timeout /t 3
echo.
echo Starting fresh dev server...
echo.
cd /d "%~dp0"
npm run dev
