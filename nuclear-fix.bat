@echo off
echo ========================================
echo NUCLEAR WEBPACK FIX
echo ========================================
echo.
echo This will:
echo 1. Delete ALL caches
echo 2. Delete node_modules
echo 3. Delete package-lock.json
echo 4. Reinstall everything fresh
echo.
echo This may take 5-10 minutes.
echo.
pause

echo.
echo [1/7] Stopping any running processes...
taskkill /F /IM node.exe 2>nul
echo Done!

echo.
echo [2/7] Deleting .next cache...
if exist .next rmdir /s /q .next
echo Done!

echo.
echo [3/7] Deleting node_modules cache...
if exist node_modules\.cache rmdir /s /q node_modules\.cache
echo Done!

echo.
echo [4/7] Deleting .swc cache...
if exist .swc rmdir /s /q .swc
echo Done!

echo.
echo [5/7] Deleting TypeScript build info...
if exist tsconfig.tsbuildinfo del /f /q tsconfig.tsbuildinfo
echo Done!

echo.
echo [6/7] Deleting node_modules...
if exist node_modules rmdir /s /q node_modules
echo Done!

echo.
echo [7/7] Deleting package-lock.json...
if exist package-lock.json del /f /q package-lock.json
echo Done!

echo.
echo ========================================
echo Cleanup complete!
echo ========================================
echo.
echo Now run: npm install
echo Then run: npm run dev
echo.
pause
