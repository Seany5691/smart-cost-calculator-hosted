#!/bin/bash

# Production Rebuild Script for VPS
# Run this on your VPS to fix the stale build cache issue

echo "=========================================="
echo "Production App Rebuild Script"
echo "=========================================="
echo ""

# Navigate to app directory
cd /app || { echo "Error: /app directory not found"; exit 1; }

echo "Step 1: Removing stale .next build cache..."
rm -rf .next
echo "✓ Build cache removed"
echo ""

echo "Step 2: Rebuilding application..."
npm run build
if [ $? -ne 0 ]; then
    echo "✗ Build failed! Check the error messages above."
    exit 1
fi
echo "✓ Build completed successfully"
echo ""

echo "Step 3: Restarting PM2 processes..."
pm2 restart all
if [ $? -ne 0 ]; then
    echo "✗ PM2 restart failed! Trying alternative restart..."
    pm2 restart smart-cost-calculator
fi
echo "✓ Server restarted"
echo ""

echo "=========================================="
echo "Rebuild Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Test the Excel import again"
echo "2. Verify hardware items are being created"
echo "3. Check the hardware config page"
echo ""
