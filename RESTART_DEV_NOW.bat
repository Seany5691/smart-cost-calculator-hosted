@echo off
echo Stopping any running Next.js processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Clearing Next.js cache...
if exist .next rmdir /s /q .next
timeout /t 1 /nobreak >nul

echo Starting development server...
start cmd /k "npm run dev"

echo.
echo Dev server is restarting in a new window...
echo Please wait for it to compile and then refresh your browser.
pause
