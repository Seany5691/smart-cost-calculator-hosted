# Document Scanner Performance Benchmarks

This document describes the performance requirements and testing procedures for the document scanner feature.

## Performance Requirements

### Requirement 19.1: Single Image Processing
- **Target**: Process a single image within 2 seconds
- **Validates**: Core processing pipeline efficiency
- **Test**: `performance.test.ts` - "should process a single image within 2 seconds"

### Requirement 19.2: Batch Processing (50 Images)
- **Target**: Process 50 images within 100 seconds total
- **Average**: ~2 seconds per image
- **Validates**: Batch processing with memory management
- **Test**: `performance.test.ts` - "should process 50 images within 100 seconds total"

### Requirement 19.3: PDF Generation
- **Target**: Generate PDF from 50 pages within 10 seconds
- **Validates**: PDF generation efficiency
- **Test**: `performance.test.ts` - "should generate PDF from 50 pages within 10 seconds"

### Requirements 9.1-9.5: Memory Management
- **Target**: Efficient memory usage and cleanup
- **Validates**: 
  - Memory released after processing
  - No memory leaks in batch processing
  - Original images released after processing
- **Tests**: Multiple tests in `performance.test.ts` under "Memory Usage"

### Requirement 10.7: PDF File Sizes
- **Target**: 0.5-1 MB per page (reasonable for upload)
- **Validates**: Compression and quality balance
- **Test**: `performance.test.ts` - "should verify file sizes are reasonable"

## Running Performance Tests

### Option 1: Browser Console (Recommended for Manual Testing)

The performance tests require a real browser environment with canvas support. To run them manually:

1. Open the document scanner in a browser
2. Open the browser console (F12)
3. Run the following test code:

```javascript
// Test single image processing
async function testSingleImagePerformance() {
  const { processImage } = await import('./lib/documentScanner/imageProcessing');
  
  // Create test image
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 1000;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
  const dataUrl = await new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
  
  const image = {
    id: 'test-1',
    originalBlob: blob,
    originalDataUrl: dataUrl,
    pageNumber: 1,
    timestamp: Date.now(),
    status: 'captured',
    markedForRetake: false,
    markedForCrop: false
  };
  
  const startTime = performance.now();
  const result = await processImage(image);
  const endTime = performance.now();
  
  const processingTime = (endTime - startTime) / 1000;
  console.log(`Processing time: ${processingTime.toFixed(3)}s`);
  console.log(`Target: < 2s`);
  console.log(`Result: ${processingTime < 2 ? 'PASS' : 'FAIL'}`);
  
  return result;
}

// Run the test
testSingleImagePerformance();
```

### Option 2: Playwright/Cypress (Automated Browser Testing)

For automated testing in a real browser environment:

1. Install Playwright: `npm install -D @playwright/test`
2. Create a Playwright test file
3. Run tests with: `npx playwright test`

Example Playwright test:

```typescript
import { test, expect } from '@playwright/test';

test('document scanner performance', async ({ page }) => {
  await page.goto('http://localhost:3000/leads');
  
  // Open scanner and run performance tests
  // ... test implementation
});
```

### Option 3: Jest with jsdom (Limited)

The current Jest setup uses jsdom which has limited canvas support. Performance tests will be skipped automatically in this environment. To see the skip message:

```bash
npm test -- --testPathPattern=performance
```

## Performance Test Results

### Expected Results

Based on the implementation and requirements:

| Test | Target | Expected Result |
|------|--------|-----------------|
| Single image processing | < 2s | ~0.5-1.5s |
| 10 images batch | < 20s | ~5-15s |
| 50 images batch | < 100s | ~25-75s |
| PDF generation (50 pages) | < 10s | ~3-8s |
| Memory increase (50 pages) | < 50 MB | ~20-40 MB |
| PDF size per page | 0.5-1 MB | ~0.6-0.9 MB |

### Actual Results (To be filled in after testing)

| Test | Target | Actual Result | Status |
|------|--------|---------------|--------|
| Single image processing | < 2s | ___ | ___ |
| 10 images batch | < 20s | ___ | ___ |
| 50 images batch | < 100s | ___ | ___ |
| PDF generation (50 pages) | < 10s | ___ | ___ |
| Memory increase (50 pages) | < 50 MB | ___ | ___ |
| PDF size per page | 0.5-1 MB | ___ | ___ |

## Performance Optimization Notes

### Current Optimizations

1. **Batch Processing**: Images processed in batches of 5 to balance parallelism and memory
2. **Memory Management**: Original blobs released after processing
3. **Compression**: Images compressed to ~1MB target size
4. **Thumbnail Generation**: Low-res thumbnails (200x300) for preview grid
5. **Web Workers**: Processing offloaded to prevent UI blocking (via browser-image-compression)

### Potential Future Optimizations

If performance targets are not met:

1. **Adjust batch size**: Increase from 5 to 10 for faster processing (if memory allows)
2. **Reduce image resolution**: Lower max dimensions from 1920px
3. **Adjust compression quality**: Lower from 0.85 to 0.75
4. **Optimize edge detection**: Use faster algorithms or skip for some images
5. **Progressive processing**: Start PDF generation while still processing images

## Monitoring Performance in Production

### Browser Performance API

The implementation uses `performance.now()` to track processing times. Monitor these metrics:

```javascript
// In production, log performance metrics
const processingTime = result.processingTime; // milliseconds
console.log(`Image processed in ${processingTime}ms`);

// Track average over session
const avgTime = totalTime / imageCount;
if (avgTime > 2000) {
  console.warn('Processing slower than target');
}
```

### Memory Monitoring

```javascript
// Check memory usage (Chrome only)
if (performance.memory) {
  const usedMB = performance.memory.usedJSHeapSize / (1024 * 1024);
  const limitMB = performance.memory.jsHeapSizeLimit / (1024 * 1024);
  const percentUsed = (usedMB / limitMB) * 100;
  
  console.log(`Memory: ${usedMB.toFixed(2)} MB / ${limitMB.toFixed(2)} MB (${percentUsed.toFixed(1)}%)`);
  
  if (percentUsed > 90) {
    console.warn('Memory usage high - consider processing current batch');
  }
}
```

## Troubleshooting Performance Issues

### Slow Processing

**Symptoms**: Processing takes longer than 2 seconds per image

**Possible Causes**:
- Large image dimensions (> 2000px)
- Slow device/browser
- Complex edge detection
- Memory pressure

**Solutions**:
- Reduce max image dimensions
- Simplify edge detection algorithm
- Increase batch processing delays
- Reduce compression quality

### High Memory Usage

**Symptoms**: Memory warnings, browser slowdown, crashes

**Possible Causes**:
- Too many images in memory
- Blob URLs not revoked
- Large batch size
- Memory leaks

**Solutions**:
- Reduce batch size from 5 to 3
- Ensure all blob URLs are revoked
- Force garbage collection between batches
- Process in smaller sessions (< 30 pages)

### Large PDF Files

**Symptoms**: PDF files > 1.5 MB per page

**Possible Causes**:
- High compression quality
- Large image dimensions
- Insufficient compression

**Solutions**:
- Lower compression quality (0.85 → 0.75)
- Reduce max dimensions (1920 → 1600)
- Use more aggressive compression

## Conclusion

The document scanner is designed to meet all performance requirements specified in the design document. Regular performance testing ensures the implementation maintains these standards across different devices and browsers.

For questions or issues with performance testing, refer to the main design document or contact the development team.
