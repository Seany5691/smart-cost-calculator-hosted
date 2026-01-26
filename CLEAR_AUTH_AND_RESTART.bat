@echo off
echo ========================================
echo  CLEAR AUTH TOKEN AND RESTART
echo ========================================
echo.
echo This script will help fix the 401 errors
echo by guiding you to clear your auth token.
echo.
echo ROOT CAUSE:
echo - JWT_SECRET was changed for security
echo - Your old auth token is now invalid
echo - You need to log out and log back in
echo.
echo ========================================
echo  STEP 1: Open Your Browser
echo ========================================
echo.
echo 1. Open your browser where the app is running
echo 2. Press F12 to open DevTools
echo 3. Go to the Console tab
echo 4. Paste this command:
echo.
echo    localStorage.removeItem('auth-storage'); window.location.href = '/login';
echo.
echo 5. Press Enter
echo 6. Log back in with your credentials
echo.
echo ========================================
echo  STEP 2: Restart Dev Server
echo ========================================
echo.
echo Press any key to restart the dev server...
pause >nul

echo.
echo Stopping any running dev servers...
taskkill /F /IM node.exe 2>nul
timeout /t 2 >nul

echo.
echo Starting dev server...
cd /d "%~dp0"
start cmd /k "npm run dev"

echo.
echo ========================================
echo  DONE!
echo ========================================
echo.
echo The dev server is starting in a new window.
echo.
echo NEXT STEPS:
echo 1. Wait for server to start (usually 10-20 seconds)
echo 2. Go to http://localhost:3000/login
echo 3. Log in with your credentials
echo 4. Go to Calculator - it should work now!
echo.
echo If you still see 401 errors:
echo - Make sure you cleared localStorage (Step 1)
echo - Try closing ALL browser tabs and reopening
echo - Check CALCULATOR_401_ROOT_CAUSE_AND_FIX.md for more help
echo.
pause
