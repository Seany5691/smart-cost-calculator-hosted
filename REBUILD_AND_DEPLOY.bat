@echo off
echo Cleaning build cache...
rmdir /s /q .next 2>nul
rmdir /s /q node_modules\.cache 2>nul

echo Installing dependencies...
call npm install

echo Building application...
call npm run build

echo.
echo Build complete! Now deploy to VPS:
echo 1. Copy the .next folder to your VPS
echo 2. Restart your Node.js application
echo.
pause
