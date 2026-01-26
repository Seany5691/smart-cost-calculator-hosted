@echo off
echo ========================================
echo  LEAD STATUS MOVEMENT - TEST READY
echo ========================================
echo.
echo FIXES APPLIED:
echo 1. Removed full page reload
echo 2. Enhanced Later Stage modal
echo 3. Cache prevention active
echo.
echo This will restart the dev server for testing.
echo.
pause

echo.
echo [1/3] Stopping dev server...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/3] Clearing cache...
if exist .next rmdir /s /q .next
if exist node_modules\.cache rmdir /s /q node_modules\.cache
echo Cache cleared!

echo.
echo [3/3] Starting dev server...
echo.
start cmd /k "npm run dev"

echo.
echo ========================================
echo  TESTING INSTRUCTIONS:
echo ========================================
echo.
echo 1. Wait for dev server to start
echo 2. Clear browser cache (Ctrl+Shift+Delete)
echo 3. Import 5 leads from Excel
echo 4. Move all 5 to "Leads" tab
echo 5. Change Lead 1 to "Working On"
echo 6. Verify Lead 1 appears in "Working On" tab
echo 7. Verify Leads 2-5 stay in "Leads" tab
echo 8. Test "Later" status with new modal
echo 9. Test "Signed" status
echo 10. Verify notes/reminders follow leads
echo.
echo ========================================
echo.
pause
