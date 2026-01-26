@echo off
echo ========================================
echo  URL Persistence Fix - Restart Server
echo ========================================
echo.
echo This will restart the development server with the URL persistence fixes applied.
echo.
echo Changes made:
echo - Fixed page refresh redirecting to default tab
echo - URLs now persist on page refresh
echo - Browser back/forward buttons work correctly
echo - Direct URL access to specific tabs works
echo.
pause

echo.
echo Stopping any running Next.js processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Clearing Next.js cache...
if exist .next rmdir /s /q .next
if exist .swc rmdir /s /q .swc

echo.
echo Starting development server...
echo.
echo ========================================
echo  Server Starting - Please Wait
echo ========================================
echo.
echo Once the server is ready, test these scenarios:
echo.
echo 1. Navigate to /leads?tab=working
echo 2. Press F5 to refresh
echo 3. Should stay on Working On tab (not go back to Dashboard)
echo.
echo 4. Navigate to /admin?tab=users
echo 5. Press F5 to refresh
echo 6. Should stay on Users tab (not go back to Hardware)
echo.
echo 7. Click different tabs, then use browser back button
echo 8. Should navigate through tab history correctly
echo.
echo ========================================
echo.

npm run dev
