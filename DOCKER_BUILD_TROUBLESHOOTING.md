# Docker Build Troubleshooting Guide

## Current Issue: Webpack/CSS Build Errors

### Error Message
```
> Build failed because of webpack errors
Import trace for requested module:
./src/app/globals.css
```

## Solutions Applied

### ✅ Solution 1: Increase Node Memory (Applied)
**Status**: Committed and pushed

Added `NODE_OPTIONS="--max-old-space-size=4096"` to Dockerfile to allocate 4GB of memory for Node.js during build.

**File**: `Dockerfile`
```dockerfile
ENV NODE_OPTIONS="--max-old-space-size=4096"
```

This should resolve memory issues during Tailwind CSS/Webpack processing.

---

## If Build Still Fails

### Solution 2: Increase Dockploy Memory Limits

In Dockploy, increase the build memory:

1. Go to your application settings
2. Find "Build Resources" or "Resource Limits"
3. Increase memory to at least **4 GB** for build
4. Retry deployment

### Solution 3: Simplify Tailwind Config (If Needed)

If memory issues persist, we can reduce Tailwind's processing:

**Option A: Disable JIT in production**
```javascript
// tailwind.config.ts
module.exports = {
  mode: 'jit', // Remove this line if present
  // ... rest of config
}
```

**Option B: Reduce content scanning**
```javascript
// tailwind.config.ts
content: [
  "./src/app/**/*.{js,ts,jsx,tsx}", // More specific
  "./src/components/**/*.{js,ts,jsx,tsx}",
],
```

### Solution 4: Use Multi-Stage Build Optimization

The current Dockerfile already uses multi-stage builds, but we can optimize further:

**Current stages:**
1. `deps` - Install dependencies
2. `builder` - Build application
3. `runner` - Production runtime

This is already optimal.

### Solution 5: Build Locally and Push Image

If Docker build continues to fail on the server:

```bash
# Build locally
docker build -t smart-cost-calculator:latest .

# Tag for registry
docker tag smart-cost-calculator:latest your-registry/smart-cost-calculator:latest

# Push to registry
docker push your-registry/smart-cost-calculator:latest

# Deploy from registry in Dockploy
```

---

## Debugging Steps

### 1. Check Build Logs
Look for specific error messages:
- `JavaScript heap out of memory` → Memory issue
- `Cannot find module` → Dependency issue
- `Syntax error` → Code issue
- `ENOSPC` → Disk space issue

### 2. Verify Local Build Works
```bash
# Test build locally
npm run build

# If local build works, issue is with Docker/server resources
```

### 3. Check Server Resources
```bash
# SSH into VPS
ssh root@your-vps-ip

# Check available memory
free -h

# Check disk space
df -h

# Check Docker resources
docker system df
```

### 4. Clean Docker Cache
```bash
# Remove old images and cache
docker system prune -a

# Rebuild without cache
docker build --no-cache -t smart-cost-calculator .
```

---

## Expected Build Process

### Successful Build Timeline
```
1. Stage 1: deps (2-3 minutes)
   - Install production dependencies
   
2. Stage 2: builder (5-7 minutes)
   - Copy dependencies
   - Build Next.js
   - Process Tailwind CSS
   - Generate static files
   
3. Stage 3: runner (2-3 minutes)
   - Install Chromium
   - Copy built files
   - Set up production environment
   
Total: 10-15 minutes
```

### Build Success Indicators
```
✓ Creating an optimized production build
✓ Compiled successfully
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization
✓ Route (app)                              Size     First Load JS
✓ Ready in X seconds
```

---

## Memory Requirements by Build Stage

| Stage | Memory Usage | Notes |
|-------|--------------|-------|
| deps | 500 MB | Installing packages |
| builder | 2-4 GB | **Critical** - Webpack/CSS processing |
| runner | 500 MB | Copying files |

**Minimum VPS RAM for building**: 4 GB  
**Recommended VPS RAM**: 8 GB (allows concurrent builds)

---

## Alternative: Build on Separate Machine

If your VPS has limited resources:

### Option 1: Build on Local Machine
```bash
# Build locally
npm run build

# Create Docker image
docker build -t smart-cost-calculator .

# Export image
docker save smart-cost-calculator > smart-cost-calculator.tar

# Transfer to VPS
scp smart-cost-calculator.tar root@your-vps-ip:/tmp/

# On VPS, load image
docker load < /tmp/smart-cost-calculator.tar
```

### Option 2: Use GitHub Actions
Create `.github/workflows/docker-build.yml`:

```yaml
name: Build Docker Image

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: docker build -t smart-cost-calculator .
      
      - name: Push to registry
        run: |
          docker tag smart-cost-calculator ${{ secrets.REGISTRY }}/smart-cost-calculator
          docker push ${{ secrets.REGISTRY }}/smart-cost-calculator
```

---

## Quick Fixes Checklist

- [x] Increase Node memory limit (4GB)
- [ ] Increase Dockploy build memory (4GB+)
- [ ] Clean Docker cache
- [ ] Verify local build works
- [ ] Check VPS has 4GB+ RAM
- [ ] Check disk space (20GB+ free)
- [ ] Try building without cache
- [ ] Consider building locally

---

## Current Status

**Latest Fix**: Increased Node memory to 4GB  
**Commit**: `4954af1`  
**Next Step**: Retry deployment in Dockploy

### Expected Outcome
With 4GB Node memory allocation, the build should complete successfully. If it still fails, the VPS likely needs more RAM (upgrade to 8GB plan).

---

## Support

If issues persist after trying these solutions:

1. **Check Dockploy logs** for specific error messages
2. **Verify VPS specs** meet minimum requirements (4 vCPU, 4GB RAM)
3. **Consider upgrading VPS** to 8GB RAM plan
4. **Build locally** and deploy pre-built image

---

**Last Updated**: January 7, 2026  
**Status**: Troubleshooting in progress
