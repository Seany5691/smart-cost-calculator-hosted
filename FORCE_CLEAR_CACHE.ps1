# Force Clear All Caches - PowerShell Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FORCE CLEARING ALL CACHES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .next exists
if (Test-Path ".next") {
    Write-Host "Deleting .next folder..." -ForegroundColor Yellow
    Remove-Item -Path ".next" -Recurse -Force
    Write-Host "✓ .next folder deleted" -ForegroundColor Green
} else {
    Write-Host "✓ .next folder doesn't exist (already clean)" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Clear your browser cache:" -ForegroundColor Yellow
Write-Host "   - Press Ctrl+Shift+Delete" -ForegroundColor White
Write-Host "   - Select 'Cached images and files'" -ForegroundColor White
Write-Host "   - Click 'Clear data'" -ForegroundColor White
Write-Host ""
Write-Host "   OR do a hard refresh:" -ForegroundColor Yellow
Write-Host "   - Press Ctrl+Shift+R or Ctrl+F5" -ForegroundColor White
Write-Host ""
Write-Host "2. Restart the dev server:" -ForegroundColor Yellow
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "3. After restarting, check the console for:" -ForegroundColor Yellow
Write-Host "   [CALCULATOR PAGE] Rendering calculator page" -ForegroundColor White
Write-Host ""
Write-Host "If you see that message, the cache is cleared!" -ForegroundColor Green
Write-Host ""
