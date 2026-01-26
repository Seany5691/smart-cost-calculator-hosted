@echo off
echo ========================================
echo Restarting Dev Server After Auth Fix
echo ========================================
echo.

echo Step 1: Stopping any running processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Step 2: Deleting .next folder...
if exist .next (
    rmdir /s /q .next
    echo .next folder deleted
) else (
    echo .next folder not found
)

echo Step 3: Starting dev server...
echo.
echo ========================================
echo Dev server starting on http://localhost:3000
echo ========================================
echo.

npm run dev
