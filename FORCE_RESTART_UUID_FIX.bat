@echo off
echo ========================================
echo FORCE RESTART FOR UUID FIX
echo ========================================
echo.
echo This will:
echo 1. Kill all Node.js processes
echo 2. Delete the .next cache folder
echo 3. Restart the dev server
echo.
echo Press Ctrl+C to cancel, or
pause

echo.
echo Step 1: Killing all Node.js processes...
taskkill /F /IM node.exe 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Node.js processes killed successfully
) else (
    echo No Node.js processes were running
)
timeout /t 2 /nobreak >nul

echo.
echo Step 2: Deleting .next cache folder...
cd /d "%~dp0"
if exist ".next" (
    rmdir /s /q ".next"
    echo .next folder deleted
) else (
    echo .next folder doesn't exist
)
timeout /t 1 /nobreak >nul

echo.
echo Step 3: Starting dev server...
echo.
npm run dev
