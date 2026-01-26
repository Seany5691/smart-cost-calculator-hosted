@echo off
echo ========================================
echo  CLEAN RESTART - Auth Fix
echo ========================================
echo.

echo Step 1: Stopping any running processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 >nul

echo Step 2: Deleting .next folder...
if exist .next rmdir /s /q .next
echo   - .next folder deleted

echo Step 3: Clearing node_modules cache...
if exist node_modules\.cache rmdir /s /q node_modules\.cache
echo   - Cache cleared

echo.
echo ========================================
echo  READY TO START
echo ========================================
echo.
echo Now run: npm run dev
echo.
echo Then in your browser:
echo 1. Open DevTools (F12)
echo 2. Application tab - Clear storage
echo 3. Go to http://localhost:3000
echo.
pause
