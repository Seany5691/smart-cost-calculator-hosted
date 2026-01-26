@echo off
echo ========================================
echo NUCLEAR CACHE CLEAR
echo ========================================
echo.
echo This will clear EVERYTHING and restart fresh.
echo.
echo What this does:
echo 1. Stop the dev server
echo 2. Delete .next folder (Next.js cache)
echo 3. Clear npm cache
echo 4. Restart dev server
echo.
echo YOU MUST ALSO:
echo - Clear browser cache (Ctrl+Shift+Delete)
echo - Hard refresh the page (Ctrl+Shift+R)
echo.
pause
echo.
echo Stopping any running processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2
echo.
echo Deleting .next folder...
if exist .next rmdir /s /q .next
echo.
echo Clearing npm cache...
npm cache clean --force
echo.
echo Starting fresh dev server...
echo.
npm run dev
