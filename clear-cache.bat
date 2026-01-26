@echo off
echo Clearing Next.js cache...
if exist .next rmdir /s /q .next
if exist node_modules\.cache rmdir /s /q node_modules\.cache
echo.
echo ✅ Cache cleared successfully!
echo.
echo Now restart your dev server with: npm run dev
pause
