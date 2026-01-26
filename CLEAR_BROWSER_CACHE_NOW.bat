@echo off
echo ========================================
echo CLEARING BROWSER CACHE AND RESTARTING
echo ========================================
echo.

echo Step 1: Stopping any running dev servers...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Step 2: Clearing Next.js cache...
if exist ".next" (
    rmdir /s /q ".next"
    echo .next folder deleted
)

echo Step 3: Clearing node_modules/.cache...
if exist "node_modules\.cache" (
    rmdir /s /q "node_modules\.cache"
    echo node_modules\.cache deleted
)

echo.
echo ========================================
echo CACHE CLEARED!
echo ========================================
echo.
echo IMPORTANT: You MUST now clear your browser cache:
echo.
echo For Chrome/Edge:
echo 1. Press Ctrl + Shift + Delete
echo 2. Select "Cached images and files"
echo 3. Select "All time"
echo 4. Click "Clear data"
echo.
echo OR use Incognito/Private mode (Ctrl + Shift + N)
echo.
echo ========================================
echo.
echo Starting dev server...
npm run dev
