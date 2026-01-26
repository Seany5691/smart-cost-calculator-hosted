@echo off
echo ========================================
echo RESTARTING DEV SERVER FOR UUID FIX
echo ========================================
echo.
echo This will restart the development server to apply UUID casting fixes.
echo.
echo Fixed 17 files with UUID casting issues:
echo - Lead sharing routes
echo - Notes and reminders routes
echo - Import routes (scraper, excel, direct)
echo - Routes management
echo - List management
echo - Bulk operations
echo - Stats queries
echo.
echo Press Ctrl+C to cancel, or
pause

echo.
echo Stopping any running dev servers...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Starting dev server...
cd /d "%~dp0"
npm run dev
