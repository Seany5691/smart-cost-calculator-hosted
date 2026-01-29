@echo off
echo ========================================
echo RESTARTING DEV SERVER - SCRAPER FIXES
echo ========================================
echo.
echo Fixes Applied:
echo 1. Navigation timeout increased to 60s
echo 2. Changed to domcontentloaded for faster loading
echo 3. Added retry logic for timeouts
echo 4. Stop button now forcefully closes browsers
echo 5. All active pages tracked and closed on stop
echo.
echo ========================================

REM Kill any existing Node processes
echo Killing existing Node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

REM Navigate to project directory
cd /d "%~dp0"

REM Clear Next.js cache
echo Clearing Next.js cache...
if exist .next rmdir /s /q .next
timeout /t 1 /nobreak >nul

echo.
echo Starting development server...
echo.
echo ========================================
echo TEST THE FIXES:
echo ========================================
echo 1. Go to Scraper page
echo 2. Start a scraping session
echo 3. Watch console for retry messages
echo 4. Click STOP button during scraping
echo 5. Verify scraping stops immediately
echo ========================================
echo.

npm run dev
