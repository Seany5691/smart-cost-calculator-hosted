@echo off
echo ========================================
echo RESTARTING - LEAD NUMBERING REMOVED
echo ========================================
echo.
echo Lead numbering has been completely removed from status changes.
echo The # column is not displayed in the UI, so we don't need to maintain it.
echo.
echo Status changes will now work instantly without any numbering conflicts!
echo.
echo Press Ctrl+C in the other terminal to stop the current server...
timeout /t 3
echo.
echo Starting fresh dev server...
echo.
cd /d "%~dp0"
npm run dev
