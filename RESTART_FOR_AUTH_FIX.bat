@echo off
echo ========================================
echo  Authentication Fix - Restart Server
echo ========================================
echo.
echo This will restart the development server with the auth fixes applied.
echo.
echo Changes made:
echo - Created /api/auth/me endpoint for token validation
echo - Improved auth store hydration logic
echo - Removed page reloads that were clearing auth state
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
echo Once the server is ready:
echo 1. Open http://localhost:3000
echo 2. Log in to the application
echo 3. Test navigation and page refreshes
echo 4. Click on status cards in the leads dashboard
echo.
echo The authentication should now persist!
echo.
echo ========================================
echo.

npm run dev
