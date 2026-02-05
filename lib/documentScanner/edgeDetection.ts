/**
 * Edge Detection Module for Document Scanner
 *
 * OPTIMIZED FOR WHITE DOCUMENTS ON DARK BACKGROUNDS
 *
 * This module implements a specialized edge detection algorithm designed
 * specifically for scanning white/light-colored documents on dark backgrounds.
 * Instead of using traditional Canny edge detection, we use a brightness-based
 * approach that scans from the corners inward to find document edges.
 *
 * Algorithm:
 * 1. Scan from each corner toward the center
 * 2. Find the first bright pixel (document edge)
 * 3. Add safety margins to avoid cutting off content
 * 4. Validate the detected area makes sense
 * 5. Return corner points for cropping
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

/**
 * Contour point in the image
 */
interface ContourPoint {
  x: number;
  y: number;
}

/**
 * Check if a pixel is bright (likely part of a white document)
 *
 * @param data - ImageData pixel array
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param width - Image width
 * @param threshold - Brightness threshold (0-255)
 * @returns True if pixel is bright enough
 */
function isBrightPixel(
  data: Uint8ClampedArray,
  x: number,
  y: number,
  width: number,
  threshold: number = 180, // Lowered from 200 for better detection
): boolean {
  const index = (y * width + x) * 4;
  const r = data[index];
  const g = data[index + 1];
  const b = data[index + 2];

  // Calculate brightness (average of RGB)
  const brightness = (r + g + b) / 3;

  return brightness >= threshold;
}

/**
 * Scan from a corner toward the center to find the document edge
 *
 * @param data - ImageData pixel array
 * @param width - Image width
 * @param height - Image height
 * @param startX - Starting X coordinate (corner)
 * @param startY - Starting Y coordinate (corner)
 * @param dirX - Direction to scan in X (-1, 0, or 1)
 * @param dirY - Direction to scan in Y (-1, 0, or 1)
 * @param maxSteps - Maximum steps to scan
 * @returns Point where document edge was found, or null
 */
function scanForEdge(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  dirX: number,
  dirY: number,
  maxSteps: number,
): ContourPoint | null {
  let x = startX;
  let y = startY;
  let consecutiveBright = 0;
  const requiredConsecutive = 5; // Need 5 consecutive bright pixels to confirm edge

  for (let step = 0; step < maxSteps; step++) {
    // Check bounds
    if (x < 0 || x >= width || y < 0 || y >= height) {
      break;
    }

    // Check if pixel is bright
    if (isBrightPixel(data, x, y, width)) {
      consecutiveBright++;

      // If we found enough consecutive bright pixels, this is the edge
      if (consecutiveBright >= requiredConsecutive) {
        // Return the first bright pixel position (subtract the consecutive count)
        return {
          x: x - dirX * (consecutiveBright - 1),
          y: y - dirY * (consecutiveBright - 1),
        };
      }
    } else {
      // Reset counter if we hit a dark pixel
      consecutiveBright = 0;
    }

    // Move in the scan direction
    x += dirX;
    y += dirY;
  }

  return null;
}

/**
 * Detect document edges by scanning from corners inward
 *
 * This algorithm is specifically designed for white documents on dark backgrounds.
 * It scans from each corner toward the center to find where the document begins.
 *
 * Process:
 * 1. Scan from top-left corner diagonally toward center
 * 2. Scan from top-right corner diagonally toward center
 * 3. Scan from bottom-left corner diagonally toward center
 * 4. Scan from bottom-right corner diagonally toward center
 * 5. Add safety margins to avoid cutting off content
 * 6. Validate the detected area is reasonable
 *
 * @param imageData - ImageData to process
 * @returns EdgePoints defining document corners, or null if not found
 */
export function detectDocumentEdges(imageData: ImageData): {
  topLeft: ContourPoint;
  topRight: ContourPoint;
  bottomRight: ContourPoint;
  bottomLeft: ContourPoint;
} | null {
  const { width, height, data } = imageData;

  // Calculate maximum scan distance (diagonal from corner to center)
  const maxScanDistance = Math.floor(
    Math.sqrt(width * width + height * height) / 2,
  );

  // Scan from each corner toward the center
  console.log("[Edge Detection] Scanning for document edges...");

  // Top-left corner: scan diagonally toward center (right and down)
  const topLeftEdge = scanForEdge(
    data,
    width,
    height,
    0,
    0,
    1,
    1,
    maxScanDistance,
  );

  // Top-right corner: scan diagonally toward center (left and down)
  const topRightEdge = scanForEdge(
    data,
    width,
    height,
    width - 1,
    0,
    -1,
    1,
    maxScanDistance,
  );

  // Bottom-left corner: scan diagonally toward center (right and up)
  const bottomLeftEdge = scanForEdge(
    data,
    width,
    height,
    0,
    height - 1,
    1,
    -1,
    maxScanDistance,
  );

  // Bottom-right corner: scan diagonally toward center (left and up)
  const bottomRightEdge = scanForEdge(
    data,
    width,
    height,
    width - 1,
    height - 1,
    -1,
    -1,
    maxScanDistance,
  );

  console.log("[Edge Detection] Scan results:", {
    topLeft: topLeftEdge,
    topRight: topRightEdge,
    bottomLeft: bottomLeftEdge,
    bottomRight: bottomRightEdge,
  });

  // If we couldn't find all four edges, try a more aggressive scan
  if (!topLeftEdge || !topRightEdge || !bottomLeftEdge || !bottomRightEdge) {
    console.log(
      "[Edge Detection] Initial scan failed, trying edge-based scan...",
    );
    return scanFromEdges(imageData);
  }

  // Add safety margins to avoid cutting off content (10 pixels inward from detected edge)
  const margin = 10;

  const topLeft = {
    x: Math.max(0, topLeftEdge.x - margin),
    y: Math.max(0, topLeftEdge.y - margin),
  };

  const topRight = {
    x: Math.min(width - 1, topRightEdge.x + margin),
    y: Math.max(0, topRightEdge.y - margin),
  };

  const bottomLeft = {
    x: Math.max(0, bottomLeftEdge.x - margin),
    y: Math.min(height - 1, bottomLeftEdge.y + margin),
  };

  const bottomRight = {
    x: Math.min(width - 1, bottomRightEdge.x + margin),
    y: Math.min(height - 1, bottomRightEdge.y + margin),
  };

  // Validate the detected area
  const detectedWidth = topRight.x - topLeft.x;
  const detectedHeight = bottomLeft.y - topLeft.y;
  const detectedArea = detectedWidth * detectedHeight;
  const imageArea = width * height;
  const areaRatio = detectedArea / imageArea;

  console.log("[Edge Detection] Detected area:", {
    width: detectedWidth,
    height: detectedHeight,
    area: detectedArea,
    ratio: areaRatio,
  });

  // Area should be at least 10% of image and at most 95% (to ensure we detected something)
  if (areaRatio < 0.1 || areaRatio > 0.95) {
    console.log(
      "[Edge Detection] Detected area is invalid, using fallback...",
    );
    return scanFromEdges(imageData);
  }

  // Ensure the detected rectangle is reasonably shaped (not too narrow or too wide)
  const aspectRatio = detectedWidth / detectedHeight;
  if (aspectRatio < 0.3 || aspectRatio > 3.0) {
    console.log(
      "[Edge Detection] Aspect ratio is invalid, using fallback...",
    );
    return scanFromEdges(imageData);
  }

  console.log("[Edge Detection] Successfully detected document edges");

  return {
    topLeft,
    topRight,
    bottomRight,
    bottomLeft,
  };
}

/**
 * Fallback method: Scan from edges inward (horizontal and vertical)
 *
 * This method scans from the edges of the image inward to find the document.
 * It's more reliable than diagonal scanning for documents that are well-aligned.
 *
 * @param imageData - ImageData to process
 * @returns EdgePoints defining document corners, or null if not found
 */
function scanFromEdges(imageData: ImageData): {
  topLeft: ContourPoint;
  topRight: ContourPoint;
  bottomRight: ContourPoint;
  bottomLeft: ContourPoint;
} | null {
  const { width, height, data } = imageData;

  console.log("[Edge Detection] Using edge-based scanning...");

  // Find top edge: scan from top down in the middle
  let topY = 0;
  const midX = Math.floor(width / 2);
  for (let y = 0; y < height; y++) {
    if (isBrightPixel(data, midX, y, width, 150)) {
      // Lower threshold for fallback
      topY = y;
      break;
    }
  }

  // Find bottom edge: scan from bottom up in the middle
  let bottomY = height - 1;
  for (let y = height - 1; y >= 0; y--) {
    if (isBrightPixel(data, midX, y, width, 150)) {
      bottomY = y;
      break;
    }
  }

  // Find left edge: scan from left to right in the middle
  let leftX = 0;
  const midY = Math.floor(height / 2);
  for (let x = 0; x < width; x++) {
    if (isBrightPixel(data, x, midY, width, 150)) {
      leftX = x;
      break;
    }
  }

  // Find right edge: scan from right to left in the middle
  let rightX = width - 1;
  for (let x = width - 1; x >= 0; x--) {
    if (isBrightPixel(data, x, midY, width, 150)) {
      rightX = x;
      break;
    }
  }

  console.log("[Edge Detection] Edge scan results:", {
    top: topY,
    bottom: bottomY,
    left: leftX,
    right: rightX,
  });

  // Add safety margins
  const margin = 15; // Slightly larger margin for fallback method

  const topLeft = {
    x: Math.max(0, leftX - margin),
    y: Math.max(0, topY - margin),
  };

  const topRight = {
    x: Math.min(width - 1, rightX + margin),
    y: Math.max(0, topY - margin),
  };

  const bottomLeft = {
    x: Math.max(0, leftX - margin),
    y: Math.min(height - 1, bottomY + margin),
  };

  const bottomRight = {
    x: Math.min(width - 1, rightX + margin),
    y: Math.min(height - 1, bottomY + margin),
  };

  // Validate the detected area
  const detectedWidth = rightX - leftX;
  const detectedHeight = bottomY - topY;
  const detectedArea = detectedWidth * detectedHeight;
  const imageArea = width * height;
  const areaRatio = detectedArea / imageArea;

  console.log("[Edge Detection] Fallback detected area:", {
    width: detectedWidth,
    height: detectedHeight,
    area: detectedArea,
    ratio: areaRatio,
  });

  // If the detected area is too small or too large, return null (use full image)
  if (areaRatio < 0.1 || areaRatio > 0.95) {
    console.log(
      "[Edge Detection] Fallback detection failed, will use full image",
    );
    return null;
  }

  console.log("[Edge Detection] Fallback detection successful");

  return {
    topLeft,
    topRight,
    bottomRight,
    bottomLeft,
  };
}

/**
 * Order corner points in consistent order: top-left, top-right, bottom-right, bottom-left
 *
 * Given 4 corner points in arbitrary order, this function sorts them into
 * a consistent clockwise order starting from the top-left corner.
 *
 * @param corners - Array of 4 corner points in arbitrary order
 * @returns Ordered corners
 */
export function orderCorners(corners: ContourPoint[]): {
  topLeft: ContourPoint;
  topRight: ContourPoint;
  bottomRight: ContourPoint;
  bottomLeft: ContourPoint;
} {
  if (corners.length !== 4) {
    throw new Error("orderCorners requires exactly 4 points");
  }

  // Sort by sum of coordinates (top-left will have smallest sum)
  const sorted = [...corners].sort((a, b) => {
    const sumA = a.x + a.y;
    const sumB = b.x + b.y;
    return sumA - sumB;
  });

  // Top-left: smallest x+y sum
  const topLeft = sorted[0];

  // Bottom-right: largest x+y sum
  const bottomRight = sorted[3];

  // For the remaining two points, determine which is top-right and bottom-left
  // Top-right will have larger x value, bottom-left will have smaller x value
  const remaining = [sorted[1], sorted[2]];
  const topRight =
    remaining[0].x > remaining[1].x ? remaining[0] : remaining[1];
  const bottomLeft =
    remaining[0].x > remaining[1].x ? remaining[1] : remaining[0];

  return {
    topLeft,
    topRight,
    bottomRight,
    bottomLeft,
  };
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
