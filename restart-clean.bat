@echo off
echo ========================================
echo NUCLEAR CLEANUP AND RESTART
echo ========================================
echo.

echo [1/8] Killing all Node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 3 /nobreak >nul

echo [2/8] Deleting .next directory...
if exist .next (
    rmdir /s /q .next
    echo .next deleted
) else (
    echo .next not found
)
timeout /t 1 /nobreak >nul

echo [3/8] Deleting node_modules...
if exist node_modules (
    rmdir /s /q node_modules
    echo node_modules deleted
) else (
    echo node_modules not found
)
timeout /t 1 /nobreak >nul

echo [4/8] Deleting package-lock.json...
if exist package-lock.json (
    del /f /q package-lock.json
    echo package-lock.json deleted
) else (
    echo package-lock.json not found
)

echo [5/8] Clearing npm cache...
call npm cache clean --force
call npm cache verify
timeout /t 1 /nobreak >nul

echo [6/8] Clearing Windows temp files...
del /f /q %TEMP%\npm-* 2>nul
timeout /t 1 /nobreak >nul

echo [7/8] Reinstalling dependencies with legacy peer deps...
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo.
    echo ========================================
    echo ERROR: npm install failed!
    echo ========================================
    pause
    exit /b 1
)

echo [8/8] Starting development server...
echo.
echo ========================================
echo CLEANUP COMPLETE - Starting server...
echo Test URL: http://localhost:3000/test-minimal
echo ========================================
echo.
call npm run dev
