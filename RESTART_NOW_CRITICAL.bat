@echo off
echo ========================================
echo CRITICAL: COMPLETE CACHE CLEAR REQUIRED
echo ========================================
echo.
echo This will:
echo 1. Delete .next folder
echo 2. Clear npm cache
echo 3. You must then close browser completely
echo 4. Restart dev server
echo.
pause

echo Deleting .next folder...
if exist .next rmdir /s /q .next
echo Done!

echo.
echo Clearing npm cache...
npm cache clean --force
echo Done!

echo.
echo ========================================
echo NEXT STEPS - DO THESE MANUALLY:
echo ========================================
echo.
echo 1. CLOSE YOUR BROWSER COMPLETELY (all windows)
echo 2. Run: npm run dev
echo 3. Open FRESH browser window
echo 4. Press Ctrl+Shift+Delete to clear browser cache
echo 5. Go to localhost:3000/login
echo.
echo Press any key to exit...
pause
