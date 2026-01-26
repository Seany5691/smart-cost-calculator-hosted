@echo off
echo Clearing Next.js cache...
echo.

REM Stop any running dev servers (optional - you may need to do this manually)
echo Please make sure to stop the dev server (Ctrl+C) before running this script
echo.
pause

REM Delete .next folder
if exist .next (
    echo Deleting .next folder...
    rmdir /s /q .next
    echo .next folder deleted successfully!
) else (
    echo .next folder not found - already clean
)

echo.
echo Cache cleared! Now restart your dev server with: npm run dev
echo.
pause
