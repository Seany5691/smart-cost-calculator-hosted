@echo off
echo ========================================
echo RESTARTING FOR ROUTES FIX
echo ========================================
echo.
echo This will:
echo 1. Stop the dev server
echo 2. Clear Next.js cache
echo 3. Restart the dev server
echo.
echo After this, you MUST also clear your browser cache!
echo Press Ctrl+Shift+Delete in your browser and clear cached files.
echo.
pause

echo.
echo Stopping any running dev servers...
taskkill /F /IM node.exe 2>nul

echo.
echo Clearing Next.js cache...
if exist .next rmdir /s /q .next
if exist .next\cache rmdir /s /q .next\cache

echo.
echo Cache cleared!
echo.
echo Now starting dev server...
echo.
start cmd /k "npm run dev"

echo.
echo ========================================
echo Dev server is starting in a new window
echo ========================================
echo.
echo IMPORTANT: Clear your browser cache now!
echo 1. Press Ctrl+Shift+Delete in your browser
echo 2. Select "Cached images and files"
echo 3. Click "Clear data"
echo 4. Hard refresh the page (Ctrl+F5)
echo.
pause
