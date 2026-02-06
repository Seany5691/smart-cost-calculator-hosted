/**
 * Color-Based Document Segmentation
 * 
 * Fast method for detecting white/light documents on dark backgrounds.
 * Perfect for real-time detection in camera view.
 * 
 * Algorithm:
 * 1. Analyze image colors to find document vs background
 * 2. Create binary mask based on color similarity
 * 3. Find largest connected component (the document)
 * 4. Extract 4 corner points
 * 
 * Performance: ~100-200ms (fast enough for 10 FPS)
 */

interface Point {
  x: number;
  y: number;
}

interface EdgePoints {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
}

/**
 * Detect document using color segmentation
 * Optimized for white/light documents on dark backgrounds
 */
export function detectDocumentByColor(imageData: ImageData): EdgePoints | null {
  console.log("[Color Segmentation] Starting detection...");
  const startTime = performance.now();

  const { width, height, data } = imageData;

  // Step 1: Analyze image to find document color vs background color
  const colorAnalysis = analyzeColors(data, width, height);
  
  if (!colorAnalysis) {
    console.log("[Color Segmentation] Could not determine document color");
    return null;
  }

  console.log("[Color Segmentation] Document color:", colorAnalysis.documentColor);
  console.log("[Color Segmentation] Background color:", colorAnalysis.backgroundColor);

  // Step 2: Create binary mask (document = white, background = black)
  const mask = createColorMask(data, width, height, colorAnalysis.documentColor, colorAnalysis.threshold);

  // Step 3: Apply morphological operations to clean up mask
  const cleanedMask = cleanMask(mask, width, height);

  // Step 4: Find largest connected component (the document)
  const documentMask = findLargestComponent(cleanedMask, width, height);

  if (!documentMask) {
    console.log("[Color Segmentation] No document found");
    return null;
  }

  // Step 5: Find convex hull of document
  const documentPoints = maskToPoints(documentMask, width, height);
  
  if (documentPoints.length < 4) {
    console.log("[Color Segmentation] Not enough points for document");
    return null;
  }

  const hull = convexHull(documentPoints);

  // Step 6: Extract 4 extreme points as corners
  const corners = findExtremePoints(hull);

  // Step 7: Order corners properly
  const orderedCorners = orderCorners(corners);

  // Validate corners
  if (!validateCorners(orderedCorners, width, height)) {
    console.log("[Color Segmentation] Invalid corners detected");
    return null;
  }

  const elapsed = performance.now() - startTime;
  console.log(`[Color Segmentation] Completed in ${elapsed.toFixed(0)}ms`);

  return orderedCorners;
}

/**
 * Analyze image colors to determine document vs background
 */
function analyzeColors(data: Uint8ClampedArray, width: number, height: number): {
  documentColor: number;
  backgroundColor: number;
  threshold: number;
} | null {
  // Sample pixels from different regions
  const samples: number[] = [];
  const sampleSize = 100; // Sample 100 pixels

  // Sample from center (likely document)
  const centerSamples: number[] = [];
  for (let i = 0; i < sampleSize / 2; i++) {
    const x = Math.floor(width * 0.3 + Math.random() * width * 0.4);
    const y = Math.floor(height * 0.3 + Math.random() * height * 0.4);
    const idx = (y * width + x) * 4;
    const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
    centerSamples.push(brightness);
  }

  // Sample from edges (likely background)
  const edgeSamples: number[] = [];
  for (let i = 0; i < sampleSize / 2; i++) {
    let x, y;
    const edge = Math.floor(Math.random() * 4);
    if (edge === 0) { // Top
      x = Math.floor(Math.random() * width);
      y = Math.floor(Math.random() * height * 0.1);
    } else if (edge === 1) { // Right
      x = Math.floor(width * 0.9 + Math.random() * width * 0.1);
      y = Math.floor(Math.random() * height);
    } else if (edge === 2) { // Bottom
      x = Math.floor(Math.random() * width);
      y = Math.floor(height * 0.9 + Math.random() * height * 0.1);
    } else { // Left
      x = Math.floor(Math.random() * width * 0.1);
      y = Math.floor(Math.random() * height);
    }
    const idx = (y * width + x) * 4;
    const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
    edgeSamples.push(brightness);
  }

  // Calculate average brightness for each region
  const centerAvg = centerSamples.reduce((a, b) => a + b, 0) / centerSamples.length;
  const edgeAvg = edgeSamples.reduce((a, b) => a + b, 0) / edgeSamples.length;

  // Document should be brighter than background
  if (centerAvg <= edgeAvg + 20) {
    // Not enough contrast
    return null;
  }

  // Threshold is midpoint between document and background
  const threshold = (centerAvg + edgeAvg) / 2;

  return {
    documentColor: centerAvg,
    backgroundColor: edgeAvg,
    threshold,
  };
}

/**
 * Create binary mask based on color similarity to document color
 */
function createColorMask(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  documentColor: number,
  threshold: number
): Uint8Array {
  const mask = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

      // Pixel is part of document if brightness is above threshold
      mask[y * width + x] = brightness >= threshold ? 255 : 0;
    }
  }

  return mask;
}

/**
 * Clean mask using morphological operations
 */
function cleanMask(mask: Uint8Array, width: number, height: number): Uint8Array {
  // Apply erosion to remove noise
  let cleaned = erode(mask, width, height, 2);
  
  // Apply dilation to restore size
  cleaned = dilate(cleaned, width, height, 3);

  return cleaned;
}

/**
 * Morphological erosion
 */
function erode(mask: Uint8Array, width: number, height: number, iterations: number): Uint8Array {
  let result = new Uint8Array(mask);

  for (let iter = 0; iter < iterations; iter++) {
    const temp = new Uint8Array(width * height);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;

        // Check 3x3 neighborhood
        let allWhite = true;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nIdx = (y + dy) * width + (x + dx);
            if (result[nIdx] === 0) {
              allWhite = false;
              break;
            }
          }
          if (!allWhite) break;
        }

        temp[idx] = allWhite ? 255 : 0;
      }
    }

    result = temp;
  }

  return result;
}

/**
 * Morphological dilation
 */
function dilate(mask: Uint8Array, width: number, height: number, iterations: number): Uint8Array {
  let result = new Uint8Array(mask);

  for (let iter = 0; iter < iterations; iter++) {
    const temp = new Uint8Array(width * height);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;

        // Check 3x3 neighborhood
        let anyWhite = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nIdx = (y + dy) * width + (x + dx);
            if (result[nIdx] === 255) {
              anyWhite = true;
              break;
            }
          }
          if (anyWhite) break;
        }

        temp[idx] = anyWhite ? 255 : 0;
      }
    }

    result = temp;
  }

  return result;
}

/**
 * Find largest connected component in mask
 */
function findLargestComponent(mask: Uint8Array, width: number, height: number): Uint8Array | null {
  const visited = new Uint8Array(width * height);
  let largestComponent: Uint8Array | null = null;
  let largestSize = 0;

  // Flood fill to find connected components
  function floodFill(startX: number, startY: number): Uint8Array {
    const component = new Uint8Array(width * height);
    const stack: Point[] = [{ x: startX, y: startY }];
    let size = 0;

    while (stack.length > 0) {
      const { x, y } = stack.pop()!;
      const idx = y * width + x;

      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (visited[idx] || mask[idx] === 0) continue;

      visited[idx] = 1;
      component[idx] = 255;
      size++;

      // Check 4-connected neighbors
      stack.push({ x: x + 1, y });
      stack.push({ x: x - 1, y });
      stack.push({ x, y: y + 1 });
      stack.push({ x, y: y - 1 });
    }

    return size > 0 ? component : new Uint8Array(0);
  }

  // Find all components
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (mask[idx] === 255 && !visited[idx]) {
        const component = floodFill(x, y);
        const size = component.reduce((sum, val) => sum + (val === 255 ? 1 : 0), 0);

        if (size > largestSize) {
          largestSize = size;
          largestComponent = component;
        }
      }
    }
  }

  // Component must be at least 20% of image
  const minSize = width * height * 0.2;
  if (largestSize < minSize) {
    return null;
  }

  return largestComponent;
}

/**
 * Convert mask to array of points
 */
function maskToPoints(mask: Uint8Array, width: number, height: number): Point[] {
  const points: Point[] = [];

  // Sample points from mask (not all, too many)
  const step = 5; // Sample every 5th pixel
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      if (mask[y * width + x] === 255) {
        points.push({ x, y });
      }
    }
  }

  return points;
}

/**
 * Calculate convex hull using Graham scan
 */
function convexHull(points: Point[]): Point[] {
  if (points.length < 3) return points;

  // Find bottom-most point (or left-most if tie)
  let start = points[0];
  for (const p of points) {
    if (p.y > start.y || (p.y === start.y && p.x < start.x)) {
      start = p;
    }
  }

  // Sort points by polar angle
  const sorted = [...points].sort((a, b) => {
    const angleA = Math.atan2(a.y - start.y, a.x - start.x);
    const angleB = Math.atan2(b.y - start.y, b.x - start.x);
    return angleA - angleB;
  });

  const hull: Point[] = [sorted[0], sorted[1]];

  for (let i = 2; i < sorted.length; i++) {
    while (hull.length >= 2) {
      const p1 = hull[hull.length - 2];
      const p2 = hull[hull.length - 1];
      const p3 = sorted[i];

      const cross = (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);

      if (cross > 0) break;
      hull.pop();
    }

    hull.push(sorted[i]);
  }

  return hull;
}

/**
 * Find 4 extreme points from convex hull
 */
function findExtremePoints(hull: Point[]): Point[] {
  let topLeft = hull[0];
  let topRight = hull[0];
  let bottomLeft = hull[0];
  let bottomRight = hull[0];

  for (const p of hull) {
    // Top-left: minimize x + y
    if (p.x + p.y < topLeft.x + topLeft.y) topLeft = p;

    // Top-right: maximize x - y
    if (p.x - p.y > topRight.x - topRight.y) topRight = p;

    // Bottom-left: minimize x - y
    if (p.x - p.y < bottomLeft.x - bottomLeft.y) bottomLeft = p;

    // Bottom-right: maximize x + y
    if (p.x + p.y > bottomRight.x + bottomRight.y) bottomRight = p;
  }

  return [topLeft, topRight, bottomRight, bottomLeft];
}

/**
 * Order corners as top-left, top-right, bottom-right, bottom-left
 */
function orderCorners(points: Point[]): EdgePoints {
  if (points.length !== 4) {
    throw new Error("orderCorners requires exactly 4 points");
  }

  // Sort by y-coordinate
  const sorted = [...points].sort((a, b) => a.y - b.y);

  // Top two points
  const topPoints = sorted.slice(0, 2);
  topPoints.sort((a, b) => a.x - b.x);

  // Bottom two points
  const bottomPoints = sorted.slice(2, 4);
  bottomPoints.sort((a, b) => a.x - b.x);

  return {
    topLeft: topPoints[0],
    topRight: topPoints[1],
    bottomRight: bottomPoints[1],
    bottomLeft: bottomPoints[0],
  };
}

/**
 * Validate that corners form a reasonable document shape
 */
function validateCorners(corners: EdgePoints, width: number, height: number): boolean {
  // Calculate distances
  const topWidth = distance(corners.topLeft, corners.topRight);
  const bottomWidth = distance(corners.bottomLeft, corners.bottomRight);
  const leftHeight = distance(corners.topLeft, corners.bottomLeft);
  const rightHeight = distance(corners.topRight, corners.bottomRight);

  // Check if dimensions are reasonable
  const minDim = Math.min(width, height) * 0.3;
  const maxDim = Math.max(width, height) * 1.2;

  if (topWidth < minDim || bottomWidth < minDim || leftHeight < minDim || rightHeight < minDim) {
    return false;
  }

  if (topWidth > maxDim || bottomWidth > maxDim || leftHeight > maxDim || rightHeight > maxDim) {
    return false;
  }

  // Check aspect ratio (documents are roughly rectangular)
  const avgWidth = (topWidth + bottomWidth) / 2;
  const avgHeight = (leftHeight + rightHeight) / 2;
  const aspectRatio = Math.max(avgWidth, avgHeight) / Math.min(avgWidth, avgHeight);

  // Aspect ratio should be between 1:1 and 2:1 (reasonable for documents)
  if (aspectRatio > 2.5) {
    return false;
  }

  return true;
}

/**
 * Calculate Euclidean distance between two points
 */
function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}
