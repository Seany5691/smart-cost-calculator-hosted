@echo off
echo ========================================
echo  LOGIN ERROR HANDLING FIX - RESTART
echo ========================================
echo.
echo This will restart the dev server to apply the login security fixes.
echo.
echo Changes applied:
echo - Added Next.js middleware for server-side route protection
echo - Enhanced auth store error handling
echo - Improved login page error display
echo.
pause

echo.
echo Stopping any running dev servers...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Clearing Next.js cache...
if exist .next rmdir /s /q .next
timeout /t 1 /nobreak >nul

echo.
echo Starting dev server...
echo.
start cmd /k "npm run dev"

echo.
echo ========================================
echo  Dev server is starting...
echo ========================================
echo.
echo The server should be running at http://localhost:3000
echo.
echo TEST THE FIX:
echo 1. Go to http://localhost:3000/login
echo 2. Enter INCORRECT username/password
echo 3. You should see an error message
echo 4. You should NOT be able to access the dashboard
echo.
echo 5. Try accessing http://localhost:3000 directly
echo 6. You should be redirected to /login
echo.
pause
