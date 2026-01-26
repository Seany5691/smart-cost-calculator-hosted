@echo off
echo ========================================
echo RESTARTING DEV SERVER FOR PAGINATION FIX
echo ========================================
echo.
echo This will restart the development server to apply the Main Sheet pagination fix.
echo.
echo Press Ctrl+C to cancel, or
pause

echo.
echo Stopping any running dev servers...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Starting dev server...
echo.
npm run dev
