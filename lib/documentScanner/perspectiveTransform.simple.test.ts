/**
 * Simple unit test for perspective transform functions
 * Testing basic functionality without complex scenarios
 */

import { describe, it, expect } from "@jest/globals";

/**
 * Helper function to create mock ImageData
 */
function createMockImageData(width: number, height: number): ImageData {
  const length = width * height * 4;
  const data = new Uint8ClampedArray(length);

  for (let i = 0; i < length; i += 4) {
    data[i] = 255; // R
    data[i + 1] = 255; // G
    data[i + 2] = 255; // B
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
 */
import {
  getPerspectiveTransform,
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

describe("Perspective Transform - Basic Tests", () => {
  it("getPerspectiveTransform should return a 9-element matrix", () => {
    const src: EdgePoints = {
      topLeft: { x: 0, y: 0 },
      topRight: { x: 100, y: 0 },
      bottomRight: { x: 100, y: 100 },
      bottomLeft: { x: 0, y: 100 },
    };

    const dst: EdgePoints = {
      topLeft: { x: 0, y: 0 },
      topRight: { x: 100, y: 0 },
      bottomRight: { x: 100, y: 100 },
      bottomLeft: { x: 0, y: 100 },
    };

    const matrix = getPerspectiveTransform(src, dst);

    expect(matrix).toHaveLength(9);
    expect(matrix[8]).toBe(1);
  });

  it("applyPerspectiveTransform should produce valid output dimensions", () => {
    const imageData = createMockImageData(400, 300);

    const edges: EdgePoints = {
      topLeft: { x: 50, y: 50 },
      topRight: { x: 350, y: 60 },
      bottomRight: { x: 340, y: 250 },
      bottomLeft: { x: 60, y: 240 },
    };

    const result = applyPerspectiveTransform(imageData, edges);

    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    expect(result.data.length).toBe(result.width * result.height * 4);
  });

  it("applyPerspectiveTransform should calculate reasonable dimensions", () => {
    const imageData = createMockImageData(800, 600);

    // Define document corners with known dimensions
    const edges: EdgePoints = {
      topLeft: { x: 100, y: 100 },
      topRight: { x: 700, y: 100 }, // Top edge = 600 pixels
      bottomRight: { x: 700, y: 500 }, // Right edge = 400 pixels
      bottomLeft: { x: 100, y: 500 }, // Bottom edge = 600 pixels, Left edge = 400 pixels
    };

    const result = applyPerspectiveTransform(imageData, edges);

    // Width should be around 600 (average of top and bottom)
    expect(result.width).toBeGreaterThan(550);
    expect(result.width).toBeLessThan(650);

    // Height should be around 400 (average of left and right)
    expect(result.height).toBeGreaterThan(350);
    expect(result.height).toBeLessThan(450);
  });
});
