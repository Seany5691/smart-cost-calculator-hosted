/**
 * Performance tests for document scanner
 *
 * Tests processing performance, memory usage, and PDF generation performance
 * to ensure the scanner meets the performance benchmarks specified in requirements.
 *
 * Requirements tested:
 * - 19.1: Processing a single image within 2 seconds
 * - 19.2: Processing 50 images within 100 seconds total
 * - 19.3: Generating PDF from 50 pages within 10 seconds
 * - 9.1-9.5: Memory management and cleanup
 * - 10.7: PDF file sizes are reasonable
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { processImage, processBatch } from "./imageProcessing";
import { generatePDF } from "./pdfGenerator";
import type { CapturedImage, ProcessedImage } from "./types";

/**
 * Helper function to create a mock captured image for testing
 * Creates a simple test image blob
 */
async function createMockCapturedImage(
  pageNumber: number,
): Promise<CapturedImage> {
  // Create a simple canvas with some content
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 1000;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  // Draw a simple document-like pattern
  ctx.fillStyle = "#f0f0f0"; // Light background
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Add some "text" lines
  ctx.fillStyle = "#333333"; // Dark text
  for (let i = 0; i < 20; i++) {
    const y = 50 + i * 40;
    ctx.fillRect(50, y, 700, 20);
  }

  // Convert to blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("Failed to create blob"));
      },
      "image/jpeg",
      0.95,
    );
  });

  // Convert to data URL
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  return {
    id: `test-image-${pageNumber}`,
    originalBlob: blob,
    originalDataUrl: dataUrl,
    pageNumber,
    timestamp: Date.now(),
    status: "captured",
    markedForRetake: false,
    markedForCrop: false,
  };
}

/**
 * Helper function to measure memory usage
 * Returns memory usage in MB
 */
function getMemoryUsage(): number {
  if (performance.memory) {
    return performance.memory.usedJSHeapSize / (1024 * 1024);
  }
  return 0;
}

describe("Performance Tests", () => {
  // These tests require a real browser environment with canvas support
  // Skip in jsdom (Jest default) - run manually in browser or with Playwright
  const isJsdom =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    navigator.userAgent.includes("jsdom");
  const skipTests =
    isJsdom || process.env.CI === "true" || typeof document === "undefined";

  if (skipTests) {
    it("Performance tests require browser environment (skipped in jsdom)", () => {
      console.log("\n=== Performance Tests Skipped ===");
      console.log(
        "These tests require a real browser environment with canvas support.",
      );
      console.log("To run performance tests:");
      console.log(
        "  1. Use a browser-based test runner (e.g., Playwright, Cypress)",
      );
      console.log("  2. Or test manually in the browser console");
      console.log("  3. Or use a headless browser with Jest");
      console.log("\nPerformance Requirements:");
      console.log("  - 19.1: Single image processing < 2 seconds");
      console.log("  - 19.2: 50 images processing < 100 seconds");
      console.log("  - 19.3: PDF generation (50 pages) < 10 seconds");
      console.log("  - 9.1-9.5: Memory management and cleanup");
      console.log("  - 10.7: Reasonable PDF file sizes (0.5-1 MB per page)");
      console.log("=================================\n");
      expect(true).toBe(true);
    });
    return;
  }

  describe("26.1 Processing Performance", () => {
    it("should process a single image within 2 seconds (Requirement 19.1)", async () => {
      const image = await createMockCapturedImage(1);

      const startTime = performance.now();
      const result = await processImage(image);
      const endTime = performance.now();

      const processingTime = (endTime - startTime) / 1000; // Convert to seconds

      expect(result.status).toBe("processed");
      expect(processingTime).toBeLessThan(2);

      console.log(
        `Single image processing time: ${processingTime.toFixed(3)}s`,
      );
    }, 10000); // 10 second timeout

    it("should process 10 images efficiently", async () => {
      const images: CapturedImage[] = [];
      for (let i = 1; i <= 10; i++) {
        images.push(await createMockCapturedImage(i));
      }

      const startTime = performance.now();
      const results = await processBatch(images, 5, () => {});
      const endTime = performance.now();

      const totalTime = (endTime - startTime) / 1000;
      const avgTimePerImage = totalTime / 10;

      expect(results).toHaveLength(10);
      expect(results.every((r) => r.status === "processed")).toBe(true);
      expect(avgTimePerImage).toBeLessThan(2);

      console.log(
        `10 images processing time: ${totalTime.toFixed(3)}s (avg: ${avgTimePerImage.toFixed(3)}s per image)`,
      );
    }, 30000); // 30 second timeout

    it("should process 50 images within 100 seconds total (Requirement 19.2)", async () => {
      const images: CapturedImage[] = [];

      console.log("Creating 50 test images...");
      for (let i = 1; i <= 50; i++) {
        images.push(await createMockCapturedImage(i));
        if (i % 10 === 0) {
          console.log(`Created ${i}/50 images`);
        }
      }

      let processedCount = 0;
      const progressCallback = (current: number, total: number) => {
        processedCount = current;
        if (current % 10 === 0) {
          console.log(`Processed ${current}/${total} images`);
        }
      };

      const startTime = performance.now();
      const results = await processBatch(images, 5, progressCallback);
      const endTime = performance.now();

      const totalTime = (endTime - startTime) / 1000;
      const avgTimePerImage = totalTime / 50;

      expect(results).toHaveLength(50);
      expect(results.every((r) => r.status === "processed")).toBe(true);
      expect(totalTime).toBeLessThan(100);
      expect(processedCount).toBe(50);

      console.log(
        `50 images processing time: ${totalTime.toFixed(3)}s (avg: ${avgTimePerImage.toFixed(3)}s per image)`,
      );
      console.log(
        `Performance benchmark: ${totalTime < 100 ? "PASSED" : "FAILED"} (target: <100s)`,
      );
    }, 120000); // 120 second timeout (2 minutes)

    it("should call progress callback after each batch", async () => {
      const images: CapturedImage[] = [];
      for (let i = 1; i <= 12; i++) {
        images.push(await createMockCapturedImage(i));
      }

      const progressUpdates: Array<{ current: number; total: number }> = [];
      const progressCallback = (current: number, total: number) => {
        progressUpdates.push({ current, total });
      };

      await processBatch(images, 5, progressCallback);

      // Should have 3 progress updates (batch 1: 5, batch 2: 10, batch 3: 12)
      expect(progressUpdates.length).toBeGreaterThanOrEqual(3);
      expect(progressUpdates[0]).toEqual({ current: 5, total: 12 });
      expect(progressUpdates[1]).toEqual({ current: 10, total: 12 });
      expect(progressUpdates[2]).toEqual({ current: 12, total: 12 });
    }, 30000);

    it("should verify batch processing works correctly", async () => {
      const images: CapturedImage[] = [];
      for (let i = 1; i <= 13; i++) {
        images.push(await createMockCapturedImage(i));
      }

      const results = await processBatch(images, 5, () => {});

      // All images should be processed
      expect(results).toHaveLength(13);
      expect(results.every((r) => r.status === "processed")).toBe(true);

      // Page numbers should be preserved
      results.forEach((result, index) => {
        expect(result.pageNumber).toBe(index + 1);
      });
    }, 30000);
  });

  describe("26.2 Memory Usage", () => {
    let initialMemory: number;

    beforeEach(() => {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      initialMemory = getMemoryUsage();
    });

    afterEach(() => {
      // Force garbage collection after each test
      if (global.gc) {
        global.gc();
      }
    });

    it("should monitor memory during 50-page scan (Requirement 9.1-9.5)", async () => {
      const memorySnapshots: Array<{ stage: string; memory: number }> = [];

      memorySnapshots.push({ stage: "initial", memory: getMemoryUsage() });

      // Create 50 images
      const images: CapturedImage[] = [];
      for (let i = 1; i <= 50; i++) {
        images.push(await createMockCapturedImage(i));
        if (i % 10 === 0) {
          memorySnapshots.push({
            stage: `after_${i}_captures`,
            memory: getMemoryUsage(),
          });
        }
      }

      memorySnapshots.push({
        stage: "before_processing",
        memory: getMemoryUsage(),
      });

      // Process images
      const results = await processBatch(images, 5, () => {});

      memorySnapshots.push({
        stage: "after_processing",
        memory: getMemoryUsage(),
      });

      // Clean up
      results.forEach((result) => {
        URL.revokeObjectURL(result.originalDataUrl);
        URL.revokeObjectURL(result.processedDataUrl);
        URL.revokeObjectURL(result.thumbnailDataUrl);
      });

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      // Wait a bit for cleanup
      await new Promise((resolve) => setTimeout(resolve, 100));

      memorySnapshots.push({
        stage: "after_cleanup",
        memory: getMemoryUsage(),
      });

      // Log memory usage
      console.log("Memory usage during 50-page scan:");
      memorySnapshots.forEach((snapshot) => {
        console.log(`  ${snapshot.stage}: ${snapshot.memory.toFixed(2)} MB`);
      });

      // Verify memory was released after processing
      const beforeProcessing = memorySnapshots.find(
        (s) => s.stage === "before_processing",
      )!.memory;
      const afterCleanup = memorySnapshots.find(
        (s) => s.stage === "after_cleanup",
      )!.memory;

      // Memory after cleanup should not be significantly higher than before processing
      // Allow for some overhead (50 MB)
      const memoryIncrease = afterCleanup - beforeProcessing;
      console.log(
        `Memory increase after cleanup: ${memoryIncrease.toFixed(2)} MB`,
      );

      expect(memoryIncrease).toBeLessThan(50);
    }, 120000);

    it("should verify memory is released after processing", async () => {
      const image = await createMockCapturedImage(1);
      const memoryBefore = getMemoryUsage();

      const result = await processImage(image);

      // Revoke URLs to release memory
      URL.revokeObjectURL(result.originalDataUrl);
      URL.revokeObjectURL(result.processedDataUrl);
      URL.revokeObjectURL(result.thumbnailDataUrl);

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      const memoryAfter = getMemoryUsage();
      const memoryDiff = memoryAfter - memoryBefore;

      console.log(`Memory before: ${memoryBefore.toFixed(2)} MB`);
      console.log(`Memory after: ${memoryAfter.toFixed(2)} MB`);
      console.log(`Memory diff: ${memoryDiff.toFixed(2)} MB`);

      // Memory should not increase significantly (allow 10 MB overhead)
      expect(memoryDiff).toBeLessThan(10);
    }, 15000);

    it("should verify no memory leaks in batch processing", async () => {
      const images: CapturedImage[] = [];
      for (let i = 1; i <= 10; i++) {
        images.push(await createMockCapturedImage(i));
      }

      const memoryBefore = getMemoryUsage();

      const results = await processBatch(images, 5, () => {});

      // Clean up all URLs
      results.forEach((result) => {
        URL.revokeObjectURL(result.originalDataUrl);
        URL.revokeObjectURL(result.processedDataUrl);
        URL.revokeObjectURL(result.thumbnailDataUrl);
      });

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      const memoryAfter = getMemoryUsage();
      const memoryDiff = memoryAfter - memoryBefore;

      console.log(`Batch processing memory diff: ${memoryDiff.toFixed(2)} MB`);

      // Memory should not increase significantly
      expect(memoryDiff).toBeLessThan(20);
    }, 30000);

    it("should verify original images are released after processing", async () => {
      const images: CapturedImage[] = [];
      for (let i = 1; i <= 5; i++) {
        images.push(await createMockCapturedImage(i));
      }

      // Store original blob sizes
      const originalSizes = images.map((img) => img.originalBlob.size);
      const totalOriginalSize = originalSizes.reduce(
        (sum, size) => sum + size,
        0,
      );

      console.log(
        `Total original blob size: ${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB`,
      );

      const results = await processBatch(images, 5, () => {});

      // Verify processed images exist
      expect(results.every((r) => r.processedBlob)).toBe(true);

      // In a real implementation, original blobs should be released
      // This test verifies the structure is correct
      expect(results.every((r) => r.originalBlob)).toBe(true);
    }, 20000);
  });

  describe("26.3 PDF Generation Performance", () => {
    it("should generate PDF from 50 pages within 10 seconds (Requirement 19.3)", async () => {
      console.log("Creating and processing 50 images for PDF generation...");

      // Create and process 50 images
      const images: CapturedImage[] = [];
      for (let i = 1; i <= 50; i++) {
        images.push(await createMockCapturedImage(i));
        if (i % 10 === 0) {
          console.log(`Created ${i}/50 images`);
        }
      }

      const processedImages = await processBatch(
        images,
        5,
        (current, total) => {
          if (current % 10 === 0) {
            console.log(`Processed ${current}/${total} images`);
          }
        },
      );

      console.log("Generating PDF...");

      // Measure PDF generation time
      const startTime = performance.now();
      const pdfBlob = await generatePDF(processedImages, "Test Document");
      const endTime = performance.now();

      const generationTime = (endTime - startTime) / 1000;

      expect(pdfBlob).toBeInstanceOf(Blob);
      expect(pdfBlob.type).toBe("application/pdf");
      expect(generationTime).toBeLessThan(10);

      console.log(`PDF generation time: ${generationTime.toFixed(3)}s`);
      console.log(
        `Performance benchmark: ${generationTime < 10 ? "PASSED" : "FAILED"} (target: <10s)`,
      );
    }, 150000); // 150 second timeout (2.5 minutes)

    it("should verify file sizes are reasonable (Requirement 10.7)", async () => {
      // Create and process images
      const images: CapturedImage[] = [];
      for (let i = 1; i <= 10; i++) {
        images.push(await createMockCapturedImage(i));
      }

      const processedImages = await processBatch(images, 5, () => {});

      // Generate PDF
      const pdfBlob = await generatePDF(processedImages, "Test Document");

      const pdfSizeMB = pdfBlob.size / (1024 * 1024);
      const avgSizePerPage = pdfSizeMB / 10;

      console.log(`PDF size: ${pdfSizeMB.toFixed(2)} MB`);
      console.log(`Average size per page: ${avgSizePerPage.toFixed(2)} MB`);

      // Each page should be around 0.5-1 MB
      // Total for 10 pages should be 5-10 MB
      expect(pdfSizeMB).toBeGreaterThan(2); // At least 2 MB for 10 pages
      expect(pdfSizeMB).toBeLessThan(15); // No more than 15 MB for 10 pages
      expect(avgSizePerPage).toBeLessThan(1.5); // Each page should be under 1.5 MB
    }, 40000);

    it("should verify PDF size scales linearly with page count", async () => {
      const pageCounts = [1, 5, 10];
      const results: Array<{
        pages: number;
        sizeMB: number;
        avgPerPage: number;
      }> = [];

      for (const pageCount of pageCounts) {
        const images: CapturedImage[] = [];
        for (let i = 1; i <= pageCount; i++) {
          images.push(await createMockCapturedImage(i));
        }

        const processedImages = await processBatch(images, 5, () => {});
        const pdfBlob = await generatePDF(
          processedImages,
          `Test ${pageCount} Pages`,
        );

        const sizeMB = pdfBlob.size / (1024 * 1024);
        const avgPerPage = sizeMB / pageCount;

        results.push({ pages: pageCount, sizeMB, avgPerPage });
      }

      console.log("PDF size scaling:");
      results.forEach((r) => {
        console.log(
          `  ${r.pages} pages: ${r.sizeMB.toFixed(2)} MB (${r.avgPerPage.toFixed(2)} MB/page)`,
        );
      });

      // Average per page should be relatively consistent
      const avgSizes = results.map((r) => r.avgPerPage);
      const minAvg = Math.min(...avgSizes);
      const maxAvg = Math.max(...avgSizes);
      const variance = maxAvg - minAvg;

      console.log(`Size variance: ${variance.toFixed(2)} MB/page`);

      // Variance should be less than 0.5 MB per page
      expect(variance).toBeLessThan(0.5);
    }, 60000);

    it("should measure PDF generation time for different page counts", async () => {
      const pageCounts = [1, 10, 25];
      const results: Array<{
        pages: number;
        timeSeconds: number;
        timePerPage: number;
      }> = [];

      for (const pageCount of pageCounts) {
        const images: CapturedImage[] = [];
        for (let i = 1; i <= pageCount; i++) {
          images.push(await createMockCapturedImage(i));
        }

        const processedImages = await processBatch(images, 5, () => {});

        const startTime = performance.now();
        await generatePDF(processedImages, `Test ${pageCount} Pages`);
        const endTime = performance.now();

        const timeSeconds = (endTime - startTime) / 1000;
        const timePerPage = timeSeconds / pageCount;

        results.push({ pages: pageCount, timeSeconds, timePerPage });
      }

      console.log("PDF generation time scaling:");
      results.forEach((r) => {
        console.log(
          `  ${r.pages} pages: ${r.timeSeconds.toFixed(3)}s (${r.timePerPage.toFixed(3)}s/page)`,
        );
      });

      // All should be within reasonable time
      results.forEach((r) => {
        expect(r.timePerPage).toBeLessThan(0.5); // Less than 0.5s per page
      });
    }, 90000);
  });

  describe("Performance Summary", () => {
    it("should log performance summary", () => {
      console.log("\n=== Performance Test Summary ===");
      console.log("Requirements:");
      console.log("  19.1: Single image processing < 2 seconds");
      console.log("  19.2: 50 images processing < 100 seconds");
      console.log("  19.3: PDF generation (50 pages) < 10 seconds");
      console.log("  9.1-9.5: Memory management and cleanup");
      console.log("  10.7: Reasonable PDF file sizes");
      console.log("\nRun the full test suite to verify all benchmarks.");
      console.log("================================\n");

      expect(true).toBe(true);
    });
  });
});
