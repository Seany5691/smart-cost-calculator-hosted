@echo off
echo ========================================
echo   RESTARTING DEV SERVER - 401 FIX
echo ========================================
echo.
echo Stopping any running dev servers...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
echo.
echo Starting dev server with fix...
cd /d "%~dp0"
start cmd /k "npm run dev"
echo.
echo ========================================
echo   Dev server starting in new window
echo ========================================
echo.
echo Next steps:
echo 1. Wait for "Ready" message in the new window
echo 2. Open http://localhost:3000
echo 3. Log in
echo 4. Go to Calculator
echo 5. Check console - should see "Core configs loaded successfully"
echo.
pause
