# Local Fonts Setup for PDF Generation

## Problem
Puppeteer PDF generation was missing Font Awesome icons and Google Fonts because they were loading from external CDNs, which can timeout or fail.

## Solution
Download and serve fonts locally from `/public/fonts/` so Puppeteer can access them reliably.

## Step 1: Download Font Awesome (Required)

Run this command in your project root:

```bash
cd hosted-smart-cost-calculator
curl -L https://use.fontawesome.com/releases/v6.5.1/fontawesome-free-6.5.1-web.zip -o fontawesome.zip
unzip fontawesome.zip
mkdir -p public/fonts/fontawesome
cp fontawesome-free-6.5.1-web/webfonts/fa-solid-900.woff2 public/fonts/fontawesome/
cp fontawesome-free-6.5.1-web/webfonts/fa-regular-400.woff2 public/fonts/fontawesome/
cp fontawesome-free-6.5.1-web/webfonts/fa-brands-400.woff2 public/fonts/fontawesome/
rm -rf fontawesome-free-6.5.1-web fontawesome.zip
```

**Windows PowerShell Alternative:**
```powershell
cd hosted-smart-cost-calculator
Invoke-WebRequest -Uri "https://use.fontawesome.com/releases/v6.5.1/fontawesome-free-6.5.1-web.zip" -OutFile "fontawesome.zip"
Expand-Archive -Path "fontawesome.zip" -DestinationPath "."
New-Item -ItemType Directory -Force -Path "public/fonts/fontawesome"
Copy-Item "fontawesome-free-6.5.1-web/webfonts/fa-solid-900.woff2" "public/fonts/fontawesome/"
Copy-Item "fontawesome-free-6.5.1-web/webfonts/fa-regular-400.woff2" "public/fonts/fontawesome/"
Copy-Item "fontawesome-free-6.5.1-web/webfonts/fa-brands-400.woff2" "public/fonts/fontawesome/"
Remove-Item -Recurse -Force "fontawesome-free-6.5.1-web"
Remove-Item "fontawesome.zip"
```

## Step 2: Download Google Fonts (Required)

Download Inter and Space Grotesk fonts:

```bash
# Create fonts directory
mkdir -p public/fonts/google

# Download Inter font
curl -L "https://fonts.google.com/download?family=Inter" -o inter.zip
unzip inter.zip -d inter-font
cp inter-font/static/Inter-Regular.ttf public/fonts/google/
cp inter-font/static/Inter-Medium.ttf public/fonts/google/
cp inter-font/static/Inter-SemiBold.ttf public/fonts/google/
cp inter-font/static/Inter-Bold.ttf public/fonts/google/
rm -rf inter-font inter.zip

# Download Space Grotesk font
curl -L "https://fonts.google.com/download?family=Space%20Grotesk" -o spacegrotesk.zip
unzip spacegrotesk.zip -d spacegrotesk-font
cp spacegrotesk-font/static/SpaceGrotesk-Medium.ttf public/fonts/google/
cp spacegrotesk-font/static/SpaceGrotesk-SemiBold.ttf public/fonts/google/
cp spacegrotesk-font/static/SpaceGrotesk-Bold.ttf public/fonts/google/
rm -rf spacegrotesk-font spacegrotesk.zip
```

**Windows PowerShell Alternative:**
```powershell
# Create fonts directory
New-Item -ItemType Directory -Force -Path "public/fonts/google"

# Download Inter font
Invoke-WebRequest -Uri "https://fonts.google.com/download?family=Inter" -OutFile "inter.zip"
Expand-Archive -Path "inter.zip" -DestinationPath "inter-font"
Copy-Item "inter-font/static/Inter-Regular.ttf" "public/fonts/google/"
Copy-Item "inter-font/static/Inter-Medium.ttf" "public/fonts/google/"
Copy-Item "inter-font/static/Inter-SemiBold.ttf" "public/fonts/google/"
Copy-Item "inter-font/static/Inter-Bold.ttf" "public/fonts/google/"
Remove-Item -Recurse -Force "inter-font"
Remove-Item "inter.zip"

# Download Space Grotesk font
Invoke-WebRequest -Uri "https://fonts.google.com/download?family=Space%20Grotesk" -OutFile "spacegrotesk.zip"
Expand-Archive -Path "spacegrotesk.zip" -DestinationPath "spacegrotesk-font"
Copy-Item "spacegrotesk-font/static/SpaceGrotesk-Medium.ttf" "public/fonts/google/"
Copy-Item "spacegrotesk-font/static/SpaceGrotesk-SemiBold.ttf" "public/fonts/google/"
Copy-Item "spacegrotesk-font/static/SpaceGrotesk-Bold.ttf" "public/fonts/google/"
Remove-Item -Recurse -Force "spacegrotesk-font"
Remove-Item "spacegrotesk.zip"
```

## Step 3: Verify Files

After running the commands, verify these files exist:

```
public/fonts/fontawesome/
  ├── all.min.css
  ├── fa-solid-900.woff2
  ├── fa-regular-400.woff2
  └── fa-brands-400.woff2

public/fonts/google/
  ├── fonts.css
  ├── Inter-Regular.ttf
  ├── Inter-Medium.ttf
  ├── Inter-SemiBold.ttf
  ├── Inter-Bold.ttf
  ├── SpaceGrotesk-Medium.ttf
  ├── SpaceGrotesk-SemiBold.ttf
  └── SpaceGrotesk-Bold.ttf
```

## Step 4: Deploy

After setting up locally:

```bash
git add public/fonts
git commit -m "Add local fonts for PDF generation"
git push origin main
```

Then deploy to your VPS and restart the app.

## How It Works

1. The HTML template now references `/fonts/fontawesome/all.min.css` and `/fonts/google/fonts.css`
2. These CSS files use relative paths to the font files
3. Puppeteer loads everything from your domain (no external requests)
4. PDF generation is faster and 100% reliable

## File Sizes

- Font Awesome: ~500 KB
- Google Fonts: ~400 KB
- Total: ~900 KB added to your project

This is negligible and ensures reliable PDF generation!
