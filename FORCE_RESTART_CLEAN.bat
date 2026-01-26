@echo off
echo ========================================
echo NUCLEAR CACHE CLEAR - COMPLETE RESTART
echo ========================================
echo.

echo Step 1: Killing all Node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Step 2: Deleting .next cache...
if exist .next (
    rmdir /s /q .next
    echo .next folder deleted
) else (
    echo .next folder not found
)

echo Step 3: Deleting node_modules/.cache...
if exist node_modules\.cache (
    rmdir /s /q node_modules\.cache
    echo node_modules\.cache deleted
) else (
    echo node_modules\.cache not found
)

echo Step 4: Clearing npm cache...
call npm cache clean --force

echo.
echo ========================================
echo CACHE CLEARED - STARTING DEV SERVER
echo ========================================
echo.
echo Starting development server...
echo.

call npm run dev
