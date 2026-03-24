# Download Space Grotesk Bold and SemiBold

We have Space Grotesk Medium, but need Bold and SemiBold.

## Quick Fix

1. Go to: https://fonts.google.com/specimen/Space+Grotesk
2. Click "Download family"
3. Extract the zip file
4. Copy these files to `public/fonts/google/`:
   - `SpaceGrotesk-Bold.ttf`
   - `SpaceGrotesk-SemiBold.ttf`

OR use this PowerShell command:

```powershell
# Download from Google Fonts
$url = "https://fonts.google.com/download?family=Space%20Grotesk"
Invoke-WebRequest -Uri $url -OutFile "sg-temp.zip"
Expand-Archive -Path "sg-temp.zip" -DestinationPath "sg-temp" -Force

# Find and copy the files
Get-ChildItem "sg-temp" -Recurse -Filter "*Bold.ttf" | Where-Object { $_.Name -eq "SpaceGrotesk-Bold.ttf" } | ForEach-Object { Copy-Item $_.FullName "public\fonts\google\" }
Get-ChildItem "sg-temp" -Recurse -Filter "*SemiBold.ttf" | ForEach-Object { Copy-Item $_.FullName "public\fonts\google\" }

# Cleanup
Remove-Item -Recurse -Force "sg-temp"
Remove-Item "sg-temp.zip"
```

## Current Status

✅ Font Awesome: Complete (all 3 files)
✅ Inter: Complete (all 4 weights)
⚠️ Space Grotesk: Medium only (need Bold and SemiBold)

The PDFs will still work, but Space Grotesk Bold/SemiBold will fall back to Medium weight.
