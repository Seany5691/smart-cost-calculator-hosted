# Document Scanner - Final Polish Implementation Plan

## Overview
4 critical improvements to make the scanner work perfectly like CamScanner.

---

## Issue 1: Lock Should Stay Locked ✅ IN PROGRESS
**Problem**: Lock engages but continues searching, corners can change
**Solution**: Once locked with all 4 corners validated, stay locked until document completely removed

### Implementation:
- ✅ Improved `validateBackgroundAroundCorners()` to check INSIDE (white) and OUTSIDE (dark) of each corner
- ✅ Requires ALL 4 corners to have:
  - Inside brightness > 150 (white document)
  - Outside brightness < 100 (dark background)
  - Contrast > 80 between inside/outside
- ✅ Simplified `validateLockedCorners()` to only check if document center is still bright
- ✅ Only unlocks if center brightness < 100 (document removed)

### Status: COMPLETE - Testing needed

---

## Issue 2: Post-Processing Crop Refinement
**Problem**: Need secondary crop after processing to remove any remaining background
**Solution**: Add intelligent background removal in processing pipeline

### Implementation Plan:
1. After initial crop on capture, apply secondary edge detection during processing
2. Find document edges by detecting white-to-dark transitions
3. Crop inward until hitting white pixels (document edge)
4. Be conservative - only crop obvious background, not document content
5. Add safety margin (5-10px) to avoid cropping document

### Files to Modify:
- `lib/documentScanner/imageProcessing.ts` - Add `refineDocumentCrop()` function
- Call after perspective transform, before enhancement

### Algorithm:
```typescript
function refineDocumentCrop(imageData: ImageData): ImageData {
  // 1. Convert to grayscale
  // 2. Find edges using brightness threshold (< 150 = background)
  // 3. Scan inward from each edge until hitting white
  // 4. Apply crop with 10px safety margin
  // 5. Return cropped ImageData
}
```

---

## Issue 3: Image Quality Enhancement ("Magic" Filter)
**Problem**: Scanned images are fuzzy, small text not clear
**Solution**: Implement CamScanner-style "Magic" enhancement

### Implementation Plan:
1. Increase contrast more aggressively (factor 2.0 instead of 1.6)
2. Apply adaptive thresholding for text clarity
3. Increase sharpening strength
4. Add noise reduction before sharpening
5. Adjust brightness to optimal level (220 instead of 210)

### Files to Modify:
- `lib/documentScanner/imageProcessing.ts`:
  - Update `enhanceContrast()` - increase factor to 2.0
  - Update `adjustBrightness()` - target 220
  - Add `applyAdaptiveThreshold()` - for crisp text
  - Update `sharpenImage()` - stronger kernel
  - Add `reduceNoise()` - before sharpening

### Enhancement Pipeline:
```
1. Grayscale conversion
2. Noise reduction (median filter)
3. Adaptive thresholding (for text)
4. Contrast enhancement (factor 2.0)
5. Brightness adjustment (target 220)
6. Strong sharpening (enhanced kernel)
```

---

## Issue 4: Manual Crop Improvements
**Problem**: 
- Crop handles outside frame, can't tap/drag
- Need corner-based cropping (quadrilateral)
- Should straighten after manual crop

### Implementation Plan:
1. **Larger Touch Targets**: Make corner handles 60x60px with visible circles
2. **Corner-Based Cropping**: Use 4 draggable corners instead of box
3. **Perspective Correction**: After manual crop, apply perspective transform
4. **Better Visibility**: 
   - Larger corner circles (30px radius)
   - Bright colors (white with colored border)
   - Always visible on screen

### Files to Modify:
- `components/leads/DocumentScanner/CropAdjustment.tsx`:
  - Replace box crop with 4-corner quadrilateral
  - Increase touch target size to 60x60px
  - Add perspective transform after crop
  - Improve corner visibility

### UI Changes:
```typescript
// Current: Rectangle crop box
// New: 4 independent corner points

interface CropCorners {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
}

// Corner handle: 60x60px touch area, 30px visible circle
// After drag: Apply perspective transform to straighten
```

---

## Implementation Order:
1. ✅ Issue 1: Lock improvements (DONE)
2. Issue 3: Image quality enhancement (CRITICAL - do this next)
3. Issue 2: Post-processing crop refinement
4. Issue 4: Manual crop improvements

---

## Testing Checklist:
- [ ] Lock stays locked when camera moves slightly
- [ ] Lock only unlocks when document completely removed
- [ ] All 4 corners validated before locking
- [ ] Processed images have crisp, clear text
- [ ] Small writing is readable
- [ ] Background fully removed in processing
- [ ] Manual crop corners are easy to drag
- [ ] Manual crop applies perspective correction
- [ ] Final images look professional (like CamScanner)

---

## Success Criteria:
✅ Lock is stable and predictable
✅ Text is crisp and clear (even small text)
✅ No background visible in final images
✅ Manual crop is easy to use
✅ Output quality matches CamScanner

