/**
 * Unit tests for perspective transform functions
 *
 * Tests the perspective transformation functions that straighten
 * skewed documents by applying homography transformations.
 *
 * Requirements: 5.6
 */

import { describe, it, expect } from "@jest/globals";

/**
 * Helper function to create mock ImageData
 */
function createMockImageData(
  width: number,
  height: number,
  fillValue: number = 255,
): ImageData {
  const length = width * height * 4;
  const data = new Uint8ClampedArray(length);

  for (let i = 0; i < length; i += 4) {
    data[i] = fillValue; // R
    data[i + 1] = fillValue; // G
    data[i + 2] = fillValue; // B
    data[i + 3] = 255; // A
  }

  return {
    width,
    height,
    data,
    colorSpace: "srgb" as PredefinedColorSpace,
  };
}

/**
 * Import the functions we're testing
 * Note: We need to import from the implementation file
 */
import {
  getPerspectiveTransform,
  warpPerspective,
  applyPerspectiveTransform,
} from "./imageProcessing";

/**
 * EdgePoints interface for testing
 */
interface EdgePoints {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
}

/**
 * Tests for getPerspectiveTransform
 */
describe("getPerspectiveTransform", () => {
  it("should return a 9-element homography matrix", () => {
    const src: EdgePoints = {
      topLeft: { x: 100, y: 50 },
      topRight: { x: 500, y: 80 },
      bottomRight: { x: 480, y: 600 },
      bottomLeft: { x: 120, y: 580 },
    };

    const dst: EdgePoints = {
      topLeft: { x: 0, y: 0 },
      topRight: { x: 400, y: 0 },
      bottomRight: { x: 400, y: 550 },
      bottomLeft: { x: 0, y: 550 },
    };

    const matrix = getPerspectiveTransform(src, dst);

    expect(matrix).toHaveLength(9);
    expect(matrix[8]).toBe(1); // h33 should always be 1
  });

  it("should handle identity transformation (no change)", () => {
    // When source and destination are the same, should produce identity-like matrix
    const corners: EdgePoints = {
      topLeft: { x: 0, y: 0 },
      topRight: { x: 100, y: 0 },
      bottomRight: { x: 100, y: 100 },
      bottomLeft: { x: 0, y: 100 },
    };

    const matrix = getPerspectiveTransform(corners, corners);

    expect(matrix).toHaveLength(9);
    // For identity transformation, diagonal elements should be close to 1
    // and off-diagonal elements close to 0
    expect(Math.abs(matrix[0] - 1)).toBeLessThan(0.01); // h11 ≈ 1
    expect(Math.abs(matrix[4] - 1)).toBeLessThan(0.01); // h22 ≈ 1
    expect(Math.abs(matrix[8] - 1)).toBeLessThan(0.01); // h33 = 1
  });

  it("should produce valid matrix for typical document corners", () => {
    // Simulate a document photographed at an angle
    const src: EdgePoints = {
      topLeft: { x: 150, y: 100 },
      topRight: { x: 650, y: 120 },
      bottomRight: { x: 630, y: 800 },
      bottomLeft: { x: 170, y: 780 },
    };

    // Target rectangle
    const dst: EdgePoints = {
      topLeft: { x: 0, y: 0 },
      topRight: { x: 500, y: 0 },
      bottomRight: { x: 500, y: 700 },
      bottomLeft: { x: 0, y: 700 },
    };

    const matrix = getPerspectiveTransform(src, dst);

    // Matrix should contain finite numbers
    for (const value of matrix) {
      expect(isFinite(value)).toBe(true);
      expect(isNaN(value)).toBe(false);
    }
  });
});

/**
 * Tests for warpPerspective
 */
describe("warpPerspective", () => {
  it("should create output image with specified dimensions", () => {
    const imageData = createMockImageData(100, 100, 128);

    // Identity-like transformation
    const matrix = [1, 0, 0, 0, 1, 0, 0, 0, 1];

    const result = warpPerspective(imageData, matrix, 200, 150);

    expect(result.width).toBe(200);
    expect(result.height).toBe(150);
    expect(result.data.length).toBe(200 * 150 * 4);
  });

  it("should handle identity transformation correctly", () => {
    // Create a small test image with a pattern
    const imageData = createMockImageData(2, 2, 0);
    // Set specific pixel values
    imageData.data[0] = 100; // Top-left pixel R
    imageData.data[4] = 200; // Top-right pixel R

    // Identity matrix
    const matrix = [1, 0, 0, 0, 1, 0, 0, 0, 1];

    const result = warpPerspective(imageData, matrix, 2, 2);

    // With identity transformation, pixels should be approximately the same
    // (may have slight differences due to interpolation)
    expect(result.data[0]).toBeGreaterThanOrEqual(90);
    expect(result.data[0]).toBeLessThanOrEqual(110);
  });

  it("should fill out-of-bounds areas with white", () => {
    const imageData = createMockImageData(10, 10, 128);

    // Translation matrix that moves image out of bounds
    const matrix = [1, 0, 100, 0, 1, 100, 0, 0, 1];

    const result = warpPerspective(imageData, matrix, 20, 20);

    // Most pixels should be white (255) since source is out of bounds
    let whitePixelCount = 0;
    for (let i = 0; i < result.data.length; i += 4) {
      if (
        result.data[i] === 255 &&
        result.data[i + 1] === 255 &&
        result.data[i + 2] === 255
      ) {
        whitePixelCount++;
      }
    }

    // Expect most pixels to be white
    expect(whitePixelCount).toBeGreaterThan(result.width * result.height * 0.8);
  });

  it("should throw error for singular matrix", () => {
    const imageData = createMockImageData(10, 10, 128);

    // Singular matrix (determinant = 0)
    const singularMatrix = [1, 0, 0, 0, 0, 0, 0, 0, 1];

    expect(() => {
      warpPerspective(imageData, singularMatrix, 10, 10);
    }).toThrow("Matrix is singular");
  });
});

/**
 * Tests for applyPerspectiveTransform
 */
describe("applyPerspectiveTransform", () => {
  it("should calculate target dimensions maintaining aspect ratio", () => {
    const imageData = createMockImageData(800, 600, 200);

    // Define document corners (slightly skewed rectangle)
    const edges: EdgePoints = {
      topLeft: { x: 100, y: 50 },
      topRight: { x: 700, y: 60 }, // Top edge ≈ 600 pixels
      bottomRight: { x: 690, y: 550 }, // Right edge ≈ 490 pixels
      bottomLeft: { x: 110, y: 540 }, // Bottom edge ≈ 580 pixels, Left edge ≈ 490 pixels
    };

    const result = applyPerspectiveTransform(imageData, edges);

    // Width should be average of top and bottom edges
    // Top: sqrt((700-100)^2 + (60-50)^2) ≈ 600
    // Bottom: sqrt((690-110)^2 + (550-540)^2) ≈ 580
    // Average: ≈ 590
    expect(result.width).toBeGreaterThan(570);
    expect(result.width).toBeLessThan(610);

    // Height should be average of left and right edges
    // Left: sqrt((110-100)^2 + (540-50)^2) ≈ 490
    // Right: sqrt((690-700)^2 + (550-60)^2) ≈ 490
    // Average: ≈ 490
    expect(result.height).toBeGreaterThan(470);
    expect(result.height).toBeLessThan(510);
  });

  it("should produce rectangular output from skewed input", () => {
    const imageData = createMockImageData(800, 600, 200);

    // Define skewed document corners
    const edges: EdgePoints = {
      topLeft: { x: 150, y: 100 },
      topRight: { x: 650, y: 120 },
      bottomRight: { x: 630, y: 500 },
      bottomLeft: { x: 170, y: 480 },
    };

    const result = applyPerspectiveTransform(imageData, edges);

    // Result should be a valid ImageData
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    expect(result.data.length).toBe(result.width * result.height * 4);

    // All pixel values should be valid (0-255)
    for (let i = 0; i < result.data.length; i++) {
      expect(result.data[i]).toBeGreaterThanOrEqual(0);
      expect(result.data[i]).toBeLessThanOrEqual(255);
    }
  });

  it("should handle perfect rectangle (no transformation needed)", () => {
    const imageData = createMockImageData(400, 300, 150);

    // Define perfect rectangle corners
    const edges: EdgePoints = {
      topLeft: { x: 0, y: 0 },
      topRight: { x: 400, y: 0 },
      bottomRight: { x: 400, y: 300 },
      bottomLeft: { x: 0, y: 300 },
    };

    const result = applyPerspectiveTransform(imageData, edges);

    // Dimensions should match the input rectangle
    expect(result.width).toBe(400);
    expect(result.height).toBe(300);
  });

  it("should preserve image data through transformation", () => {
    const imageData = createMockImageData(200, 200, 128);

    // Set a specific pattern in the center
    const centerIdx = (100 * 200 + 100) * 4;
    imageData.data[centerIdx] = 255; // R
    imageData.data[centerIdx + 1] = 0; // G
    imageData.data[centerIdx + 2] = 0; // B

    // Define corners (slight skew)
    const edges: EdgePoints = {
      topLeft: { x: 10, y: 10 },
      topRight: { x: 190, y: 15 },
      bottomRight: { x: 185, y: 190 },
      bottomLeft: { x: 15, y: 185 },
    };

    const result = applyPerspectiveTransform(imageData, edges);

    // Result should contain some non-white pixels (data was preserved)
    let nonWhitePixels = 0;
    for (let i = 0; i < result.data.length; i += 4) {
      if (
        result.data[i] !== 255 ||
        result.data[i + 1] !== 255 ||
        result.data[i + 2] !== 255
      ) {
        nonWhitePixels++;
      }
    }

    expect(nonWhitePixels).toBeGreaterThan(0);
  });

  it("should handle document with different aspect ratios", () => {
    // Test with a wide document (landscape)
    const wideImageData = createMockImageData(1000, 400, 200);
    const wideEdges: EdgePoints = {
      topLeft: { x: 50, y: 50 },
      topRight: { x: 950, y: 60 },
      bottomRight: { x: 940, y: 350 },
      bottomLeft: { x: 60, y: 340 },
    };

    const wideResult = applyPerspectiveTransform(wideImageData, wideEdges);

    // Should maintain wide aspect ratio
    expect(wideResult.width).toBeGreaterThan(wideResult.height);

    // Test with a tall document (portrait)
    const tallImageData = createMockImageData(400, 1000, 200);
    const tallEdges: EdgePoints = {
      topLeft: { x: 50, y: 50 },
      topRight: { x: 350, y: 60 },
      bottomRight: { x: 340, y: 950 },
      bottomLeft: { x: 60, y: 940 },
    };

    const tallResult = applyPerspectiveTransform(tallImageData, tallEdges);

    // Should maintain tall aspect ratio
    expect(tallResult.height).toBeGreaterThan(tallResult.width);
  });
});

/**
 * Integration test: Complete perspective correction workflow
 */
describe("Integration: Perspective correction workflow", () => {
  it("should straighten a skewed document image", () => {
    // Create a test image representing a document
    const imageData = createMockImageData(800, 600, 240);

    // Add some "text" (dark pixels) to the image
    for (let y = 100; y < 500; y += 50) {
      for (let x = 100; x < 700; x++) {
        const idx = (y * 800 + x) * 4;
        imageData.data[idx] = 50; // Dark text
        imageData.data[idx + 1] = 50;
        imageData.data[idx + 2] = 50;
      }
    }

    // Define skewed document corners (photographed at an angle)
    const edges: EdgePoints = {
      topLeft: { x: 150, y: 100 },
      topRight: { x: 650, y: 120 },
      bottomRight: { x: 630, y: 500 },
      bottomLeft: { x: 170, y: 480 },
    };

    // Apply perspective transform
    const result = applyPerspectiveTransform(imageData, edges);

    // Verify result is valid
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    expect(result.data.length).toBe(result.width * result.height * 4);

    // Verify aspect ratio is reasonable for a document
    const aspectRatio = result.width / result.height;
    expect(aspectRatio).toBeGreaterThan(0.5); // Not too tall
    expect(aspectRatio).toBeLessThan(2.0); // Not too wide

    // Verify some dark pixels exist (text was preserved)
    let darkPixels = 0;
    for (let i = 0; i < result.data.length; i += 4) {
      if (result.data[i] < 100) {
        darkPixels++;
      }
    }
    expect(darkPixels).toBeGreaterThan(0);
  });
});
