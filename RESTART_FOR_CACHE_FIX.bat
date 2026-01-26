@echo off
echo ========================================
echo  STATUS DROPDOWN CACHE FIX - RESTART
echo ========================================
echo.
echo This will:
echo 1. Stop the dev server
echo 2. Clear Next.js cache
echo 3. Restart the dev server
echo.
echo IMPORTANT: After restart, clear your browser cache:
echo Press Ctrl+Shift+Delete and clear cached images/files
echo.
pause

echo.
echo [1/3] Stopping dev server...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/3] Clearing Next.js cache...
if exist .next rmdir /s /q .next
if exist node_modules\.cache rmdir /s /q node_modules\.cache
echo Cache cleared!

echo.
echo [3/3] Starting dev server...
echo.
start cmd /k "npm run dev"

echo.
echo ========================================
echo  NEXT STEPS:
echo ========================================
echo 1. Wait for dev server to start
echo 2. Clear browser cache (Ctrl+Shift+Delete)
echo 3. Test status dropdown changes
echo 4. Verify leads appear in correct tabs
echo ========================================
echo.
pause
