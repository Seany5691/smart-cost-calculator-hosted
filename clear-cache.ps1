Write-Host "Clearing Next.js cache..." -ForegroundColor Yellow

if (Test-Path .next) {
    Remove-Item -Recurse -Force .next
    Write-Host "✅ Cleared .next directory" -ForegroundColor Green
}

if (Test-Path node_modules\.cache) {
    Remove-Item -Recurse -Force node_modules\.cache
    Write-Host "✅ Cleared node_modules\.cache directory" -ForegroundColor Green
}

Write-Host ""
Write-Host "Cache cleared successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Now restart your dev server with: npm run dev" -ForegroundColor Cyan
