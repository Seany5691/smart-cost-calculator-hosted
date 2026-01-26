@echo off
echo ========================================
echo Webpack Module Resolution Fix
echo ========================================
echo.
echo This script will:
echo 1. Clear all webpack caches
echo 2. Clear TypeScript build info
echo 3. Reinstall dependencies
echo.
pause

echo.
echo [1/4] Clearing .next cache...
if exist .next rmdir /s /q .next
echo Done!

echo.
echo [2/4] Clearing node_modules cache...
if exist node_modules\.cache rmdir /s /q node_modules\.cache
echo Done!

echo.
echo [3/4] Clearing .swc cache...
if exist .swc rmdir /s /q .swc
echo Done!

echo.
echo [4/4] Clearing TypeScript build info...
if exist tsconfig.tsbuildinfo del /f /q tsconfig.tsbuildinfo
echo Done!

echo.
echo ========================================
echo Cache cleanup complete!
echo ========================================
echo.
echo Now run: npm run dev
echo.
pause
