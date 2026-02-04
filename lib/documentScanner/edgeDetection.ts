/**
 * Edge Detection Module for Document Scanner
 *
 * This module implements the Canny edge detection algorithm for automatically
 * detecting document boundaries in captured images. The Canny algorithm is
 * a multi-stage process that produces clean, well-defined edges suitable for
 * contour detection and document cropping.
 *
 * The Canny edge detection pipeline consists of:
 * 1. Gaussian blur - Reduce noise to prevent false edge detection
 * 2. Gradient calculation - Find edge strength and direction using Sobel operator
 * 3. Non-maximum suppression - Thin edges to single-pixel width
 * 4. Double threshold - Classify edges as strong, weak, or non-edges
 * 5. Edge tracking by hysteresis - Connect weak edges to strong edges
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import { clamp } from "./imageProcessing";

/**
 * Apply Gaussian blur to reduce image noise
 *
 * Gaussian blur is the first step in Canny edge detection. It smooths the image
 * to reduce noise and prevent false edge detection from random pixel variations.
 * The Gaussian kernel gives more weight to nearby pixels and less to distant ones,
 * creating a natural-looking blur that preserves important edges while removing noise.
 *
 * The 5x5 Gaussian kernel used here provides a good balance between:
 * - Noise reduction (larger kernel = more smoothing)
 * - Edge preservation (smaller kernel = sharper edges)
 * - Performance (larger kernel = slower processing)
 *
 * The kernel values are normalized so they sum to 1, ensuring the overall
 * brightness of the image is preserved.
 *
 * @param imageData - ImageData to blur (should be grayscale)
 * @returns New ImageData with Gaussian blur applied
 *
 * Requirements: 6.1
 */
export function gaussianBlur(imageData: ImageData): ImageData {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;

  // 5x5 Gaussian kernel (sigma ≈ 1.4)
  // Values are normalized so they sum to 1
  const kernel = [
    [2, 4, 5, 4, 2],
    [4, 9, 12, 9, 4],
    [5, 12, 15, 12, 5],
    [4, 9, 12, 9, 4],
    [2, 4, 5, 4, 2],
  ];

  // Kernel sum for normalization
  const kernelSum = 159; // Sum of all values in the kernel

  // Create output buffer
  const outputData = new Uint8ClampedArray(width * height * 4);
  const output = new ImageData(outputData, width, height);

  const kernelSize = 5;
  const radius = 2; // (5 - 1) / 2

  // Apply Gaussian blur
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;

      // Apply kernel to neighborhood
      for (let ky = 0; ky < kernelSize; ky++) {
        for (let kx = 0; kx < kernelSize; kx++) {
          const pixelY = clamp(y + ky - radius, 0, height - 1);
          const pixelX = clamp(x + kx - radius, 0, width - 1);

          const pixelIndex = (pixelY * width + pixelX) * 4;
          const pixelValue = data[pixelIndex]; // Use red channel (grayscale)

          sum += pixelValue * kernel[ky][kx];
        }
      }

      // Normalize and write to output
      const result = Math.round(sum / kernelSum);
      const outputIndex = (y * width + x) * 4;

      // Set RGB channels to same value (grayscale)
      outputData[outputIndex] = result;
      outputData[outputIndex + 1] = result;
      outputData[outputIndex + 2] = result;
      outputData[outputIndex + 3] = 255; // Alpha
    }
  }

  return output;
}

/**
 * Gradient magnitude and direction data
 */
interface GradientData {
  magnitude: Float32Array;
  direction: Float32Array;
  width: number;
  height: number;
}

/**
 * Calculate image gradients using Sobel operator
 *
 * The Sobel operator detects edges by calculating the gradient (rate of change)
 * of pixel intensities. It uses two 3x3 kernels to detect horizontal and vertical
 * edges separately, then combines them to get the overall edge strength and direction.
 *
 * Sobel X kernel (detects vertical edges):
 * ```
 * -1  0  1
 * -2  0  2
 * -1  0  1
 * ```
 *
 * Sobel Y kernel (detects horizontal edges):
 * ```
 * -1 -2 -1
 *  0  0  0
 *  1  2  1
 * ```
 *
 * For each pixel:
 * - Gradient magnitude = sqrt(Gx² + Gy²) - indicates edge strength
 * - Gradient direction = atan2(Gy, Gx) - indicates edge orientation
 *
 * The magnitude tells us how strong an edge is at each pixel.
 * The direction tells us which way the edge is oriented (0°, 45°, 90°, 135°).
 *
 * @param imageData - Blurred ImageData (should be grayscale)
 * @returns GradientData containing magnitude and direction arrays
 *
 * Requirements: 6.2
 */
export function calculateGradients(imageData: ImageData): GradientData {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;

  // Sobel kernels for edge detection
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

  // Create output arrays
  const magnitude = new Float32Array(width * height);
  const direction = new Float32Array(width * height);

  // Calculate gradients for each pixel
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;

      // Apply Sobel kernels
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pixelIndex = ((y + ky) * width + (x + kx)) * 4;
          const pixelValue = data[pixelIndex]; // Red channel (grayscale)

          gx += pixelValue * sobelX[ky + 1][kx + 1];
          gy += pixelValue * sobelY[ky + 1][kx + 1];
        }
      }

      // Calculate magnitude and direction
      const index = y * width + x;
      magnitude[index] = Math.sqrt(gx * gx + gy * gy);
      direction[index] = Math.atan2(gy, gx);
    }
  }

  return { magnitude, direction, width, height };
}

/**
 * Apply non-maximum suppression to thin edges
 *
 * Non-maximum suppression thins edges to single-pixel width by suppressing
 * (setting to zero) pixels that are not local maxima in the gradient direction.
 * This ensures we get clean, thin edges rather than thick blurry ones.
 *
 * The algorithm works by:
 * 1. For each pixel, look at its gradient direction
 * 2. Round the direction to one of 4 angles: 0°, 45°, 90°, 135°
 * 3. Compare the pixel's magnitude with its two neighbors along that direction
 * 4. If the pixel is not the maximum, suppress it (set to 0)
 * 5. If the pixel is the maximum, keep it
 *
 * For example, if the gradient points horizontally (0°), we compare with
 * the left and right neighbors. If the gradient points vertically (90°),
 * we compare with the top and bottom neighbors.
 *
 * This step is crucial for getting precise edge locations and clean contours.
 *
 * @param gradientData - Gradient magnitude and direction from calculateGradients
 * @returns New Float32Array with suppressed (thinned) edges
 *
 * Requirements: 6.3
 */
export function nonMaximumSuppression(
  gradientData: GradientData,
): Float32Array {
  const { magnitude, direction, width, height } = gradientData;
  const suppressed = new Float32Array(width * height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = y * width + x;
      const angle = direction[index];
      const mag = magnitude[index];

      // Convert angle to degrees and normalize to 0-180
      let angleDeg = ((angle * 180) / Math.PI + 180) % 180;

      // Determine which neighbors to compare based on gradient direction
      let neighbor1, neighbor2;

      if (
        (angleDeg >= 0 && angleDeg < 22.5) ||
        (angleDeg >= 157.5 && angleDeg <= 180)
      ) {
        // Horizontal edge (0°) - compare left and right
        neighbor1 = magnitude[y * width + (x - 1)];
        neighbor2 = magnitude[y * width + (x + 1)];
      } else if (angleDeg >= 22.5 && angleDeg < 67.5) {
        // Diagonal edge (45°) - compare top-right and bottom-left
        neighbor1 = magnitude[(y - 1) * width + (x + 1)];
        neighbor2 = magnitude[(y + 1) * width + (x - 1)];
      } else if (angleDeg >= 67.5 && angleDeg < 112.5) {
        // Vertical edge (90°) - compare top and bottom
        neighbor1 = magnitude[(y - 1) * width + x];
        neighbor2 = magnitude[(y + 1) * width + x];
      } else {
        // Diagonal edge (135°) - compare top-left and bottom-right
        neighbor1 = magnitude[(y - 1) * width + (x - 1)];
        neighbor2 = magnitude[(y + 1) * width + (x + 1)];
      }

      // Keep pixel only if it's a local maximum
      if (mag >= neighbor1 && mag >= neighbor2) {
        suppressed[index] = mag;
      } else {
        suppressed[index] = 0;
      }
    }
  }

  return suppressed;
}

/**
 * Edge classification result from double thresholding
 */
interface ThresholdResult {
  edges: Uint8Array;
  width: number;
  height: number;
}

/**
 * Apply double threshold to classify edges
 *
 * Double thresholding classifies pixels into three categories:
 * - Strong edges (magnitude >= highThreshold): Definitely part of an edge
 * - Weak edges (lowThreshold <= magnitude < highThreshold): Possibly part of an edge
 * - Non-edges (magnitude < lowThreshold): Not an edge
 *
 * The thresholds are chosen based on the gradient magnitude distribution:
 * - Low threshold (50): Captures potential edges with moderate gradient
 * - High threshold (150): Captures only strong, definite edges
 *
 * Strong edges are marked with value 255 (white).
 * Weak edges are marked with value 128 (gray).
 * Non-edges are marked with value 0 (black).
 *
 * The next step (hysteresis) will connect weak edges to strong edges,
 * keeping only weak edges that are part of continuous edge chains.
 *
 * @param suppressed - Edge magnitudes after non-maximum suppression
 * @param width - Image width
 * @param height - Image height
 * @param lowThreshold - Low threshold value (default 50)
 * @param highThreshold - High threshold value (default 150)
 * @returns ThresholdResult with classified edges
 *
 * Requirements: 6.3
 */
export function doubleThreshold(
  suppressed: Float32Array,
  width: number,
  height: number,
  lowThreshold: number = 50,
  highThreshold: number = 150,
): ThresholdResult {
  const edges = new Uint8Array(width * height);

  for (let i = 0; i < suppressed.length; i++) {
    const magnitude = suppressed[i];

    if (magnitude >= highThreshold) {
      edges[i] = 255; // Strong edge
    } else if (magnitude >= lowThreshold) {
      edges[i] = 128; // Weak edge
    } else {
      edges[i] = 0; // Non-edge
    }
  }

  return { edges, width, height };
}

/**
 * Edge tracking by hysteresis to connect weak edges
 *
 * Hysteresis is the final step of Canny edge detection. It connects weak edges
 * to strong edges, keeping only weak edges that are part of continuous edge chains.
 * This eliminates isolated weak edges (noise) while preserving weak edges that
 * are connected to strong edges (real edge continuations).
 *
 * The algorithm works by:
 * 1. Start with all strong edges (value 255)
 * 2. For each strong edge pixel, recursively check its 8 neighbors
 * 3. If a neighbor is a weak edge (value 128), promote it to strong (255)
 * 4. Continue recursively from the newly promoted edge
 * 5. After processing all strong edges, discard remaining weak edges
 *
 * This produces clean, continuous edges that accurately represent document
 * boundaries while eliminating noise and false edges.
 *
 * The result is a binary edge map where:
 * - 255 = edge pixel
 * - 0 = non-edge pixel
 *
 * @param thresholdResult - Classified edges from doubleThreshold
 * @returns Final binary edge map as ImageData
 *
 * Requirements: 6.4
 */
export function hysteresis(thresholdResult: ThresholdResult): ImageData {
  const { edges, width, height } = thresholdResult;

  // Create a copy to modify
  const finalEdges = new Uint8Array(edges);

  // Recursive function to trace edges
  function traceEdge(x: number, y: number) {
    // Check bounds
    if (x < 0 || x >= width || y < 0 || y >= height) {
      return;
    }

    const index = y * width + x;

    // If this is a weak edge, promote it to strong
    if (finalEdges[index] === 128) {
      finalEdges[index] = 255;

      // Recursively check all 8 neighbors
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          traceEdge(x + dx, y + dy);
        }
      }
    }
  }

  // Start from all strong edges and trace connected weak edges
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if (finalEdges[index] === 255) {
        // This is a strong edge, trace its neighbors
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            traceEdge(x + dx, y + dy);
          }
        }
      }
    }
  }

  // Discard remaining weak edges (not connected to strong edges)
  for (let i = 0; i < finalEdges.length; i++) {
    if (finalEdges[i] === 128) {
      finalEdges[i] = 0;
    }
  }

  // Convert to ImageData
  const outputData = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < finalEdges.length; i++) {
    const value = finalEdges[i];
    outputData[i * 4] = value; // R
    outputData[i * 4 + 1] = value; // G
    outputData[i * 4 + 2] = value; // B
    outputData[i * 4 + 3] = 255; // A
  }

  return {
    width,
    height,
    data: outputData,
    colorSpace: "srgb" as PredefinedColorSpace,
  };
}

/**
 * Contour point in the edge map
 */
interface ContourPoint {
  x: number;
  y: number;
}

/**
 * A contour is a sequence of connected edge points
 */
interface Contour {
  points: ContourPoint[];
  area: number;
}

/**
 * Find contours in the edge map
 *
 * Contours are continuous sequences of edge pixels that form closed shapes.
 * This function uses a flood-fill approach to trace connected edge pixels
 * and group them into contours.
 *
 * The algorithm:
 * 1. Scan the edge map for unvisited edge pixels (value 255)
 * 2. When found, start a new contour and flood-fill to find all connected pixels
 * 3. Mark visited pixels to avoid processing them again
 * 4. Calculate the contour area using the shoelace formula
 * 5. Return all contours sorted by area (largest first)
 *
 * For document detection, we're primarily interested in the largest contour,
 * which typically represents the document boundary.
 *
 * @param edgeMap - Binary edge map from Canny edge detection
 * @returns Array of contours sorted by area (largest first)
 *
 * Requirements: 6.4
 */
export function findContours(edgeMap: ImageData): Contour[] {
  const { width, height, data } = edgeMap;
  const visited = new Uint8Array(width * height);
  const contours: Contour[] = [];

  // Helper function to check if a pixel is an edge
  function isEdge(x: number, y: number): boolean {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    const index = y * width + x;
    return data[index * 4] === 255 && visited[index] === 0;
  }

  // Flood fill to trace a contour
  function traceContour(startX: number, startY: number): ContourPoint[] {
    const points: ContourPoint[] = [];
    const queue: ContourPoint[] = [{ x: startX, y: startY }];

    while (queue.length > 0) {
      const point = queue.shift()!;
      const { x, y } = point;

      // Check if already visited
      const index = y * width + x;
      if (visited[index] === 1) continue;

      // Mark as visited
      visited[index] = 1;
      points.push(point);

      // Check 8-connected neighbors
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (isEdge(nx, ny)) {
            queue.push({ x: nx, y: ny });
          }
        }
      }
    }

    return points;
  }

  // Calculate contour area using shoelace formula
  function calculateArea(points: ContourPoint[]): number {
    if (points.length < 3) return 0;

    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    return Math.abs(area) / 2;
  }

  // Find all contours
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isEdge(x, y)) {
        const points = traceContour(x, y);
        if (points.length >= 4) {
          // Need at least 4 points for a valid contour
          const area = calculateArea(points);
          contours.push({ points, area });
        }
      }
    }
  }

  // Sort by area (largest first)
  contours.sort((a, b) => b.area - a.area);

  return contours;
}

/**
 * Find the largest rectangular contour representing the document boundary
 *
 * This function analyzes contours to find the one most likely to represent
 * a document. It looks for the largest contour that can be approximated as
 * a quadrilateral (4-sided polygon).
 *
 * The algorithm:
 * 1. Take the largest contours (by area)
 * 2. For each contour, approximate it as a polygon with fewer vertices
 * 3. Check if the approximation has 4 vertices (quadrilateral)
 * 4. Verify the area is large enough (>= 10000 pixels)
 * 5. Return the corner points ordered correctly
 *
 * The Douglas-Peucker algorithm is used to simplify contours by reducing
 * the number of points while preserving the overall shape. This helps
 * identify rectangular shapes even if the edges are slightly curved or noisy.
 *
 * If no valid rectangular contour is found (e.g., no document in frame,
 * poor lighting, complex background), the function returns null, and the
 * caller should use the full image dimensions instead.
 *
 * @param contours - Array of contours from findContours
 * @param minArea - Minimum area threshold (default 10000 pixels)
 * @returns EdgePoints defining the document corners, or null if not found
 *
 * Requirements: 6.5, 6.6, 6.7
 */
export function findLargestRectangle(
  contours: Contour[],
  minArea: number = 10000,
): {
  topLeft: ContourPoint;
  topRight: ContourPoint;
  bottomRight: ContourPoint;
  bottomLeft: ContourPoint;
} | null {
  // Try the largest contours first
  for (const contour of contours) {
    // Skip if area is too small
    if (contour.area < minArea) continue;

    // Approximate the contour as a polygon with fewer vertices
    const approx = approximatePolygon(contour.points, 0.02 * contour.area);

    // Check if it's a quadrilateral (4 vertices)
    if (approx.length === 4) {
      // Order the corners correctly
      return orderCorners(approx);
    }
  }

  // No valid rectangle found
  return null;
}

/**
 * Approximate a polygon using Douglas-Peucker algorithm
 *
 * The Douglas-Peucker algorithm simplifies a polygon by reducing the number
 * of points while preserving its overall shape. It works by:
 * 1. Drawing a line from the first to the last point
 * 2. Finding the point farthest from this line
 * 3. If the distance is greater than epsilon, split at that point and recurse
 * 4. If the distance is less than epsilon, remove all intermediate points
 *
 * This is useful for converting noisy edge contours into clean polygons.
 * For document detection, it helps identify rectangular shapes even when
 * the edges are slightly curved or have small irregularities.
 *
 * @param points - Array of contour points
 * @param epsilon - Distance threshold for simplification
 * @returns Simplified array of points
 */
function approximatePolygon(
  points: ContourPoint[],
  epsilon: number,
): ContourPoint[] {
  if (points.length <= 2) return points;

  // Find the point with maximum distance from the line segment
  let maxDistance = 0;
  let maxIndex = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], start, end);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  // If max distance is greater than epsilon, recursively simplify
  if (maxDistance > epsilon) {
    // Recursive call on both segments
    const left = approximatePolygon(points.slice(0, maxIndex + 1), epsilon);
    const right = approximatePolygon(points.slice(maxIndex), epsilon);

    // Combine results (remove duplicate point at maxIndex)
    return [...left.slice(0, -1), ...right];
  } else {
    // All points are close to the line, return just the endpoints
    return [start, end];
  }
}

/**
 * Calculate perpendicular distance from a point to a line segment
 *
 * Uses the cross product formula to calculate the shortest distance
 * from a point to a line defined by two other points.
 *
 * @param point - Point to measure distance from
 * @param lineStart - Start of line segment
 * @param lineEnd - End of line segment
 * @returns Perpendicular distance
 */
function perpendicularDistance(
  point: ContourPoint,
  lineStart: ContourPoint,
  lineEnd: ContourPoint,
): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;

  // Handle degenerate case where line segment is a point
  if (dx === 0 && dy === 0) {
    return Math.sqrt(
      Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2),
    );
  }

  // Calculate perpendicular distance using cross product
  const numerator = Math.abs(
    dy * point.x -
      dx * point.y +
      lineEnd.x * lineStart.y -
      lineEnd.y * lineStart.x,
  );
  const denominator = Math.sqrt(dx * dx + dy * dy);

  return numerator / denominator;
}

/**
 * Order corner points in consistent order: top-left, top-right, bottom-right, bottom-left
 *
 * Given 4 corner points in arbitrary order, this function sorts them into
 * a consistent clockwise order starting from the top-left corner. This is
 * essential for perspective transformation, which requires corners in a
 * specific order.
 *
 * The algorithm:
 * 1. Find the centroid (center point) of the 4 corners
 * 2. Calculate the angle from the centroid to each corner
 * 3. Sort corners by angle (clockwise from top-left)
 * 4. Identify which corner is which based on position relative to centroid
 *
 * The ordering ensures that:
 * - Top-left has smallest x+y sum
 * - Top-right has largest x-y difference
 * - Bottom-right has largest x+y sum
 * - Bottom-left has smallest x-y difference
 *
 * @param corners - Array of 4 corner points in arbitrary order
 * @returns Ordered corners as EdgePoints
 *
 * Requirements: 6.7
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

  // Calculate centroid
  const centroidX = corners.reduce((sum, p) => sum + p.x, 0) / 4;
  const centroidY = corners.reduce((sum, p) => sum + p.y, 0) / 4;

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
 * Detect document edges using Canny edge detection
 *
 * This is the main entry point for edge detection. It runs the complete
 * Canny edge detection pipeline and attempts to find the document boundary.
 *
 * Pipeline:
 * 1. Gaussian blur - Reduce noise
 * 2. Calculate gradients - Find edge strength and direction
 * 3. Non-maximum suppression - Thin edges
 * 4. Double threshold - Classify edges
 * 5. Hysteresis - Connect weak edges to strong edges
 * 6. Find contours - Group connected edge pixels
 * 7. Find largest rectangle - Identify document boundary
 *
 * @param imageData - Grayscale ImageData to process
 * @returns EdgePoints defining document corners, or null if not found
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */
export function detectDocumentEdges(imageData: ImageData): {
  topLeft: ContourPoint;
  topRight: ContourPoint;
  bottomRight: ContourPoint;
  bottomLeft: ContourPoint;
} | null {
  // Step 1: Gaussian blur to reduce noise
  const blurred = gaussianBlur(imageData);

  // Step 2: Calculate gradients using Sobel operator
  const gradients = calculateGradients(blurred);

  // Step 3: Non-maximum suppression to thin edges
  const suppressed = nonMaximumSuppression(gradients);

  // Step 4: Double threshold to classify edges
  const thresholded = doubleThreshold(
    suppressed,
    imageData.width,
    imageData.height,
    50,
    150,
  );

  // Step 5: Edge tracking by hysteresis
  const edgeMap = hysteresis(thresholded);

  // Step 6: Find contours in the edge map
  const contours = findContours(edgeMap);

  // Step 7: Find the largest rectangular contour
  const rectangle = findLargestRectangle(contours, 10000);

  return rectangle;
}
