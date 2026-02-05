/**
 * Advanced Edge Detection Module for Document Scanner
 *
 * This module implements a sophisticated corner detection algorithm that:
 * 1. Finds each of the 4 corners individually with high precision
 * 2. Uses Canny edge detection to find edges
 * 3. Uses Hough line detection to find document edges
 * 4. Calculates corner intersections from detected lines
 * 5. Applies perspective transformation to straighten the document
 * 6. Resizes to A4 proportions for professional output
 *
 * The algorithm is designed to work with white documents on any background,
 * and can handle skewed, rotated, or perspective-distorted documents.
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
 * Apply Gaussian blur to reduce noise before edge detection
 */
function gaussianBlur(imageData: ImageData, radius: number = 2): ImageData {
  const { width, height, data } = imageData;
  const output = new ImageData(width, height);
  const outData = output.data;

  // Create Gaussian kernel
  const size = radius * 2 + 1;
  const kernel: number[] = [];
  let sum = 0;

  for (let i = 0; i < size; i++) {
    const x = i - radius;
    const value = Math.exp(-(x * x) / (2 * radius * radius));
    kernel.push(value);
    sum += value;
  }

  // Normalize kernel
  for (let i = 0; i < kernel.length; i++) {
    kernel[i] /= sum;
  }

  // Apply horizontal blur
  const temp = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;

      for (let i = 0; i < size; i++) {
        const sx = Math.min(Math.max(x + i - radius, 0), width - 1);
        const idx = (y * width + sx) * 4;
        const weight = kernel[i];

        r += data[idx] * weight;
        g += data[idx + 1] * weight;
        b += data[idx + 2] * weight;
        a += data[idx + 3] * weight;
      }

      const idx = (y * width + x) * 4;
      temp[idx] = r;
      temp[idx + 1] = g;
      temp[idx + 2] = b;
      temp[idx + 3] = a;
    }
  }

  // Apply vertical blur
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;

      for (let i = 0; i < size; i++) {
        const sy = Math.min(Math.max(y + i - radius, 0), height - 1);
        const idx = (sy * width + x) * 4;
        const weight = kernel[i];

        r += temp[idx] * weight;
        g += temp[idx + 1] * weight;
        b += temp[idx + 2] * weight;
        a += temp[idx + 3] * weight;
      }

      const idx = (y * width + x) * 4;
      outData[idx] = r;
      outData[idx + 1] = g;
      outData[idx + 2] = b;
      outData[idx + 3] = a;
    }
  }

  return output;
}

/**
 * Calculate gradient magnitude and direction using Sobel operator
 */
function calculateGradients(imageData: ImageData): {
  magnitude: Float32Array;
  direction: Float32Array;
} {
  const { width, height, data } = imageData;
  const magnitude = new Float32Array(width * height);
  const direction = new Float32Array(width * height);

  // Sobel kernels
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0,
        gy = 0;

      // Apply Sobel kernels
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const gray = data[idx]; // Use red channel (grayscale)
          const kernelIdx = (ky + 1) * 3 + (kx + 1);

          gx += gray * sobelX[kernelIdx];
          gy += gray * sobelY[kernelIdx];
        }
      }

      const idx = y * width + x;
      magnitude[idx] = Math.sqrt(gx * gx + gy * gy);
      direction[idx] = Math.atan2(gy, gx);
    }
  }

  return { magnitude, direction };
}

/**
 * Apply non-maximum suppression to thin edges
 */
function nonMaximumSuppression(
  magnitude: Float32Array,
  direction: Float32Array,
  width: number,
  height: number,
): Float32Array {
  const output = new Float32Array(width * height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const angle = direction[idx];
      const mag = magnitude[idx];

      // Determine gradient direction (0, 45, 90, 135 degrees)
      let angle_deg = (angle * 180) / Math.PI;
      if (angle_deg < 0) angle_deg += 180;

      let neighbor1 = 0,
        neighbor2 = 0;

      // Horizontal edge (0 degrees)
      if (
        (angle_deg >= 0 && angle_deg < 22.5) ||
        (angle_deg >= 157.5 && angle_deg <= 180)
      ) {
        neighbor1 = magnitude[y * width + (x + 1)];
        neighbor2 = magnitude[y * width + (x - 1)];
      }
      // Diagonal edge (45 degrees)
      else if (angle_deg >= 22.5 && angle_deg < 67.5) {
        neighbor1 = magnitude[(y + 1) * width + (x - 1)];
        neighbor2 = magnitude[(y - 1) * width + (x + 1)];
      }
      // Vertical edge (90 degrees)
      else if (angle_deg >= 67.5 && angle_deg < 112.5) {
        neighbor1 = magnitude[(y + 1) * width + x];
        neighbor2 = magnitude[(y - 1) * width + x];
      }
      // Diagonal edge (135 degrees)
      else {
        neighbor1 = magnitude[(y - 1) * width + (x - 1)];
        neighbor2 = magnitude[(y + 1) * width + (x + 1)];
      }

      // Keep only local maxima
      if (mag >= neighbor1 && mag >= neighbor2) {
        output[idx] = mag;
      }
    }
  }

  return output;
}

/**
 * Apply double threshold and edge tracking by hysteresis
 */
function doubleThreshold(
  edges: Float32Array,
  width: number,
  height: number,
  lowThreshold: number,
  highThreshold: number,
): Uint8Array {
  const output = new Uint8Array(width * height);

  // First pass: classify pixels
  for (let i = 0; i < edges.length; i++) {
    if (edges[i] >= highThreshold) {
      output[i] = 255; // Strong edge
    } else if (edges[i] >= lowThreshold) {
      output[i] = 128; // Weak edge
    }
  }

  // Second pass: edge tracking by hysteresis
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;

      if (output[idx] === 128) {
        // Check if connected to strong edge
        let hasStrongNeighbor = false;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nIdx = (y + dy) * width + (x + dx);
            if (output[nIdx] === 255) {
              hasStrongNeighbor = true;
              break;
            }
          }
          if (hasStrongNeighbor) break;
        }

        output[idx] = hasStrongNeighbor ? 255 : 0;
      }
    }
  }

  // Clean up weak edges
  for (let i = 0; i < output.length; i++) {
    if (output[i] === 128) output[i] = 0;
  }

  return output;
}

/**
 * Canny edge detection
 */
function cannyEdgeDetection(imageData: ImageData): Uint8Array {
  console.log("[Canny] Starting edge detection...");

  // Step 1: Apply Gaussian blur
  const blurred = gaussianBlur(imageData, 2);

  // Step 2: Calculate gradients
  const { magnitude, direction } = calculateGradients(blurred);

  // Step 3: Non-maximum suppression
  const suppressed = nonMaximumSuppression(
    magnitude,
    direction,
    imageData.width,
    imageData.height,
  );

  // Step 4: Double threshold and hysteresis
  // Calculate thresholds based on gradient statistics
  let maxGrad = 0;
  for (let i = 0; i < suppressed.length; i++) {
    if (suppressed[i] > maxGrad) maxGrad = suppressed[i];
  }

  const highThreshold = maxGrad * 0.15; // 15% of max
  const lowThreshold = highThreshold * 0.4; // 40% of high threshold

  console.log("[Canny] Thresholds:", { low: lowThreshold, high: highThreshold });

  const edges = doubleThreshold(
    suppressed,
    imageData.width,
    imageData.height,
    lowThreshold,
    highThreshold,
  );

  console.log("[Canny] Edge detection complete");

  return edges;
}

/**
 * Find lines using Hough transform
 */
interface Line {
  rho: number; // Distance from origin
  theta: number; // Angle in radians
  votes: number; // Number of edge pixels supporting this line
}

function houghLines(
  edges: Uint8Array,
  width: number,
  height: number,
  threshold: number = 100,
): Line[] {
  console.log("[Hough] Starting line detection...");

  const diagonal = Math.sqrt(width * width + height * height);
  const rhoMax = Math.ceil(diagonal);
  const thetaSteps = 180;
  const rhoSteps = rhoMax * 2;

  // Create accumulator
  const accumulator = new Uint32Array(thetaSteps * rhoSteps);

  // Vote for lines
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (edges[y * width + x] === 255) {
        // Edge pixel
        for (let thetaIdx = 0; thetaIdx < thetaSteps; thetaIdx++) {
          const theta = (thetaIdx * Math.PI) / thetaSteps;
          const rho = x * Math.cos(theta) + y * Math.sin(theta);
          const rhoIdx = Math.round(rho + rhoMax);

          if (rhoIdx >= 0 && rhoIdx < rhoSteps) {
            accumulator[thetaIdx * rhoSteps + rhoIdx]++;
          }
        }
      }
    }
  }

  // Find peaks in accumulator
  const lines: Line[] = [];
  for (let thetaIdx = 0; thetaIdx < thetaSteps; thetaIdx++) {
    for (let rhoIdx = 0; rhoIdx < rhoSteps; rhoIdx++) {
      const votes = accumulator[thetaIdx * rhoSteps + rhoIdx];

      if (votes >= threshold) {
        const theta = (thetaIdx * Math.PI) / thetaSteps;
        const rho = rhoIdx - rhoMax;

        lines.push({ rho, theta, votes });
      }
    }
  }

  // Sort by votes (strongest lines first)
  lines.sort((a, b) => b.votes - a.votes);

  console.log(`[Hough] Found ${lines.length} lines`);

  return lines;
}

/**
 * Find intersection point of two lines
 */
function lineIntersection(line1: Line, line2: Line): Point | null {
  const { rho: rho1, theta: theta1 } = line1;
  const { rho: rho2, theta: theta2 } = line2;

  const cos1 = Math.cos(theta1);
  const sin1 = Math.sin(theta1);
  const cos2 = Math.cos(theta2);
  const sin2 = Math.sin(theta2);

  const det = cos1 * sin2 - sin1 * cos2;

  if (Math.abs(det) < 0.001) {
    // Lines are parallel
    return null;
  }

  const x = (sin2 * rho1 - sin1 * rho2) / det;
  const y = (-cos2 * rho1 + cos1 * rho2) / det;

  return { x, y };
}

/**
 * Group lines by orientation (horizontal vs vertical)
 */
function groupLinesByOrientation(lines: Line[]): {
  horizontal: Line[];
  vertical: Line[];
} {
  const horizontal: Line[] = [];
  const vertical: Line[] = [];

  for (const line of lines) {
    const angle = (line.theta * 180) / Math.PI;

    // Horizontal lines: 0° or 180° (±20°)
    if (
      (angle >= 0 && angle < 20) ||
      (angle >= 160 && angle < 180)
    ) {
      horizontal.push(line);
    }
    // Vertical lines: 90° (±20°)
    else if (angle >= 70 && angle < 110) {
      vertical.push(line);
    }
  }

  console.log(`[Grouping] Horizontal: ${horizontal.length}, Vertical: ${vertical.length}`);

  return { horizontal, vertical };
}

/**
 * Find the 4 corners of the document by detecting lines and finding their intersections
 */
export function detectDocumentEdges(imageData: ImageData): EdgePoints | null {
  console.log("[Edge Detection] Starting advanced corner detection...");

  const { width, height } = imageData;

  // Step 1: Canny edge detection
  const edges = cannyEdgeDetection(imageData);

  // Step 2: Hough line detection
  const allLines = houghLines(edges, width, height, Math.min(width, height) * 0.15);

  if (allLines.length < 4) {
    console.log("[Edge Detection] Not enough lines detected");
    return null;
  }

  // Step 3: Group lines by orientation
  const { horizontal, vertical } = groupLinesByOrientation(allLines);

  if (horizontal.length < 2 || vertical.length < 2) {
    console.log("[Edge Detection] Need at least 2 horizontal and 2 vertical lines");
    return null;
  }

  // Step 4: Find the top and bottom horizontal lines
  const topLine = horizontal.reduce((prev, curr) =>
    Math.abs(curr.rho) < Math.abs(prev.rho) ? curr : prev
  );
  const bottomLine = horizontal.reduce((prev, curr) =>
    Math.abs(curr.rho) > Math.abs(prev.rho) ? curr : prev
  );

  // Step 5: Find the left and right vertical lines
  const leftLine = vertical.reduce((prev, curr) =>
    Math.abs(curr.rho) < Math.abs(prev.rho) ? curr : prev
  );
  const rightLine = vertical.reduce((prev, curr) =>
    Math.abs(curr.rho) > Math.abs(prev.rho) ? curr : prev
  );

  console.log("[Edge Detection] Found document edges:", {
    top: topLine,
    bottom: bottomLine,
    left: leftLine,
    right: rightLine,
  });

  // Step 6: Calculate corner intersections
  const topLeft = lineIntersection(topLine, leftLine);
  const topRight = lineIntersection(topLine, rightLine);
  const bottomLeft = lineIntersection(bottomLine, leftLine);
  const bottomRight = lineIntersection(bottomLine, rightLine);

  if (!topLeft || !topRight || !bottomLeft || !bottomRight) {
    console.log("[Edge Detection] Failed to calculate corner intersections");
    return null;
  }

  // Clamp corners to image bounds
  const clamp = (val: number, min: number, max: number) =>
    Math.max(min, Math.min(max, val));

  const corners: EdgePoints = {
    topLeft: {
      x: clamp(topLeft.x, 0, width - 1),
      y: clamp(topLeft.y, 0, height - 1),
    },
    topRight: {
      x: clamp(topRight.x, 0, width - 1),
      y: clamp(topRight.y, 0, height - 1),
    },
    bottomLeft: {
      x: clamp(bottomLeft.x, 0, width - 1),
      y: clamp(bottomLeft.y, 0, height - 1),
    },
    bottomRight: {
      x: clamp(bottomRight.x, 0, width - 1),
      y: clamp(bottomRight.y, 0, height - 1),
    },
  };

  console.log("[Edge Detection] Detected corners:", corners);

  // Validate corners form a reasonable quadrilateral
  const docWidth = Math.max(
    distance(corners.topLeft, corners.topRight),
    distance(corners.bottomLeft, corners.bottomRight)
  );
  const docHeight = Math.max(
    distance(corners.topLeft, corners.bottomLeft),
    distance(corners.topRight, corners.bottomRight)
  );

  const area = docWidth * docHeight;
  const imageArea = width * height;
  const areaRatio = area / imageArea;

  console.log("[Edge Detection] Document dimensions:", {
    width: docWidth,
    height: docHeight,
    area,
    areaRatio,
  });

  // Document should be at least 20% of image
  if (areaRatio < 0.2) {
    console.log("[Edge Detection] Detected area too small");
    return null;
  }

  console.log("[Edge Detection] Successfully detected all 4 corners");

  return corners;
}

/**
 * Calculate Euclidean distance between two points
 */
function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Order corner points in consistent order: top-left, top-right, bottom-right, bottom-left
 */
export function orderCorners(corners: Point[]): EdgePoints {
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

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
