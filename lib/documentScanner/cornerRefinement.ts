/**
 * Corner Refinement Module
 * 
 * Refines rough corner positions to pixel-perfect accuracy.
 * Uses Canny edge detection + corner detection in small windows around each corner.
 * 
 * This is called AFTER capture, so it can be slower (100-200ms per corner is fine).
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
 * Refine all 4 corners for pixel-perfect accuracy
 */
export async function refineCorners(
  imageData: ImageData,
  roughCorners: EdgePoints
): Promise<EdgePoints> {
  console.log("[Corner Refinement] Starting refinement...");
  const startTime = performance.now();

  // Refine each corner independently
  const refinedTopLeft = await refineCorner(imageData, roughCorners.topLeft, 'topLeft');
  const refinedTopRight = await refineCorner(imageData, roughCorners.topRight, 'topRight');
  const refinedBottomRight = await refineCorner(imageData, roughCorners.bottomRight, 'bottomRight');
  const refinedBottomLeft = await refineCorner(imageData, roughCorners.bottomLeft, 'bottomLeft');

  const elapsed = performance.now() - startTime;
  console.log(`[Corner Refinement] Completed in ${elapsed.toFixed(0)}ms`);

  return {
    topLeft: refinedTopLeft || roughCorners.topLeft,
    topRight: refinedTopRight || roughCorners.topRight,
    bottomRight: refinedBottomRight || roughCorners.bottomRight,
    bottomLeft: refinedBottomLeft || roughCorners.bottomLeft,
  };
}

/**
 * Refine a single corner position
 */
async function refineCorner(
  imageData: ImageData,
  roughCorner: Point,
  cornerType: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'
): Promise<Point | null> {
  const windowSize = 100; // 100x100 pixel window around corner
  const halfWindow = windowSize / 2;

  // Extract window around rough corner
  const window = extractWindow(
    imageData,
    roughCorner.x,
    roughCorner.y,
    windowSize
  );

  if (!window) {
    console.log(`[Corner Refinement] Could not extract window for ${cornerType}`);
    return null;
  }

  // Apply Canny edge detection in window
  const edges = cannyEdgeDetection(window);

  // Find corner in edge image
  const localCorner = findCornerInWindow(edges, windowSize, cornerType);

  if (!localCorner) {
    console.log(`[Corner Refinement] Could not find corner in window for ${cornerType}`);
    return null;
  }

  // Convert local coordinates back to image coordinates
  const refinedCorner = {
    x: roughCorner.x - halfWindow + localCorner.x,
    y: roughCorner.y - halfWindow + localCorner.y,
  };

  // Clamp to image bounds
  refinedCorner.x = Math.max(0, Math.min(imageData.width - 1, refinedCorner.x));
  refinedCorner.y = Math.max(0, Math.min(imageData.height - 1, refinedCorner.y));

  console.log(`[Corner Refinement] ${cornerType}: (${roughCorner.x}, ${roughCorner.y}) → (${refinedCorner.x}, ${refinedCorner.y})`);

  return refinedCorner;
}

/**
 * Extract a window from image around a point
 */
function extractWindow(
  imageData: ImageData,
  centerX: number,
  centerY: number,
  windowSize: number
): ImageData | null {
  const halfWindow = windowSize / 2;
  const startX = Math.floor(centerX - halfWindow);
  const startY = Math.floor(centerY - halfWindow);

  // Check bounds
  if (
    startX < 0 ||
    startY < 0 ||
    startX + windowSize > imageData.width ||
    startY + windowSize > imageData.height
  ) {
    return null;
  }

  // Create canvas for window
  const canvas = document.createElement('canvas');
  canvas.width = windowSize;
  canvas.height = windowSize;
  const ctx = canvas.getContext('2d')!;

  // Draw window from original image
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.putImageData(imageData, 0, 0);

  ctx.drawImage(
    tempCanvas,
    startX,
    startY,
    windowSize,
    windowSize,
    0,
    0,
    windowSize,
    windowSize
  );

  return ctx.getImageData(0, 0, windowSize, windowSize);
}

/**
 * Simple Canny edge detection
 */
function cannyEdgeDetection(imageData: ImageData): Uint8Array {
  const { width, height, data } = imageData;
  const edges = new Uint8Array(width * height);

  // Convert to grayscale
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    gray[i] = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
  }

  // Apply Sobel operator
  const sobelX = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1],
  ];
  const sobelY = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1],
  ];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pixel = gray[(y + ky) * width + (x + kx)];
          gx += pixel * sobelX[ky + 1][kx + 1];
          gy += pixel * sobelY[ky + 1][kx + 1];
        }
      }

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edges[y * width + x] = magnitude > 50 ? 255 : 0; // Threshold
    }
  }

  return edges;
}

/**
 * Find corner in edge-detected window
 */
function findCornerInWindow(
  edges: Uint8Array,
  windowSize: number,
  cornerType: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'
): Point | null {
  // Use Harris corner detector or simple approach
  // For simplicity, we'll find the edge pixel closest to the expected corner position

  let bestPoint: Point | null = null;
  let bestScore = -Infinity;

  // Expected corner position in window (based on corner type)
  let expectedX: number, expectedY: number;

  switch (cornerType) {
    case 'topLeft':
      expectedX = windowSize * 0.3;
      expectedY = windowSize * 0.3;
      break;
    case 'topRight':
      expectedX = windowSize * 0.7;
      expectedY = windowSize * 0.3;
      break;
    case 'bottomLeft':
      expectedX = windowSize * 0.3;
      expectedY = windowSize * 0.7;
      break;
    case 'bottomRight':
      expectedX = windowSize * 0.7;
      expectedY = windowSize * 0.7;
      break;
  }

  // Find edge pixel closest to expected position with high corner response
  for (let y = 10; y < windowSize - 10; y++) {
    for (let x = 10; x < windowSize - 10; x++) {
      const idx = y * windowSize + x;

      if (edges[idx] === 255) {
        // Calculate corner response (how "corner-like" this point is)
        const cornerResponse = calculateCornerResponse(edges, x, y, windowSize);

        // Distance to expected position (closer is better)
        const dx = x - expectedX;
        const dy = y - expectedY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Score combines corner response and proximity to expected position
        const score = cornerResponse - distance * 0.5;

        if (score > bestScore) {
          bestScore = score;
          bestPoint = { x, y };
        }
      }
    }
  }

  return bestPoint;
}

/**
 * Calculate corner response (how "corner-like" a point is)
 * Uses a simplified Harris corner detector
 */
function calculateCornerResponse(
  edges: Uint8Array,
  x: number,
  y: number,
  width: number
): number {
  let response = 0;

  // Check 3x3 neighborhood
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;

      const nx = x + dx;
      const ny = y + dy;
      const idx = ny * width + nx;

      if (edges[idx] === 255) {
        response++;
      }
    }
  }

  // A corner should have edges in multiple directions
  // Check if edges exist in at least 2 perpendicular directions
  const hasTop = edges[(y - 1) * width + x] === 255;
  const hasBottom = edges[(y + 1) * width + x] === 255;
  const hasLeft = edges[y * width + (x - 1)] === 255;
  const hasRight = edges[y * width + (x + 1)] === 255;

  const verticalEdge = hasTop || hasBottom;
  const horizontalEdge = hasLeft || hasRight;

  if (verticalEdge && horizontalEdge) {
    response += 10; // Bonus for perpendicular edges (corner-like)
  }

  return response;
}
