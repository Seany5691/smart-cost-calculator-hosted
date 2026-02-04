/**
 * Unit tests for PDF Generator Module
 *
 * Tests PDF generation functionality including metadata, page creation,
 * and image embedding.
 */

import { generatePDF, estimatePDFSize, formatFileSize } from "./pdfGenerator";
import { ProcessedImage } from "./types";
import { PDFDocument } from "pdf-lib";

// Polyfill for Blob.arrayBuffer() in jsdom
if (typeof Blob.prototype.arrayBuffer === "undefined") {
  Blob.prototype.arrayBuffer = function () {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as ArrayBuffer);
      };
      reader.readAsArrayBuffer(this);
    });
  };
}

// Mock ProcessedImage for testing
function createMockProcessedImage(pageNumber: number): ProcessedImage {
  // Create a simple JPEG blob for testing without using canvas
  // This is a minimal valid JPEG header + data
  const jpegData = new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
    0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
    0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
    0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x64,
    0x00, 0x64, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x14, 0x00, 0x01,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00,
    0x3f, 0x00, 0xd2, 0xcf, 0x20, 0xff, 0xd9,
  ]);

  const blob = new Blob([jpegData], { type: "image/jpeg" });
  const dataUrl =
    "data:image/jpeg;base64," + btoa(String.fromCharCode(...jpegData));

  return {
    id: `img-${pageNumber}`,
    originalBlob: blob,
    originalDataUrl: dataUrl,
    pageNumber,
    timestamp: Date.now(),
    status: "processed",
    markedForRetake: false,
    markedForCrop: false,
    processedBlob: blob,
    processedDataUrl: dataUrl,
    thumbnailDataUrl: dataUrl,
    cropArea: { x: 0, y: 0, width: 100, height: 100 },
    fileSize: blob.size,
    processingTime: 100,
  };
}

describe("pdfGenerator", () => {
  describe("generatePDF", () => {
    it("should create a PDF with correct metadata", async () => {
      const images = [createMockProcessedImage(1)];
      const documentName = "Test Document";

      const pdfBlob = await generatePDF(images, documentName);

      // Verify it's a PDF blob
      expect(pdfBlob.type).toBe("application/pdf");
      expect(pdfBlob.size).toBeGreaterThan(0);

      // Load the PDF and verify metadata
      const pdfBytes = await pdfBlob.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);

      expect(pdfDoc.getTitle()).toBe(documentName);
      expect(pdfDoc.getCreator()).toBe("Smart Cost Calculator");
      // Note: pdf-lib may override the producer during save(), so we don't assert it
      expect(pdfDoc.getCreationDate()).toBeInstanceOf(Date);
    });

    it("should create one page per image", async () => {
      const images = [
        createMockProcessedImage(1),
        createMockProcessedImage(2),
        createMockProcessedImage(3),
      ];

      const pdfBlob = await generatePDF(images, "Multi-page Test");

      // Load the PDF and verify page count
      const pdfBytes = await pdfBlob.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);

      expect(pdfDoc.getPageCount()).toBe(3);
    });

    it("should handle single page document", async () => {
      const images = [createMockProcessedImage(1)];

      const pdfBlob = await generatePDF(images, "Single Page");

      const pdfBytes = await pdfBlob.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);

      expect(pdfDoc.getPageCount()).toBe(1);
    });

    it("should throw error for invalid image data", async () => {
      const invalidImage = {
        ...createMockProcessedImage(1),
        processedBlob: new Blob(["invalid"], { type: "text/plain" }),
      };

      await expect(
        generatePDF([invalidImage], "Invalid Test"),
      ).rejects.toThrow();
    });
  });

  describe("estimatePDFSize", () => {
    it("should estimate PDF size with overhead", () => {
      const images = [
        { ...createMockProcessedImage(1), fileSize: 100000 },
        { ...createMockProcessedImage(2), fileSize: 150000 },
      ];

      const estimate = estimatePDFSize(images);

      // Should be sum of file sizes plus ~10% overhead
      const expectedMin = 250000;
      const expectedMax = 280000;
      expect(estimate).toBeGreaterThanOrEqual(expectedMin);
      expect(estimate).toBeLessThanOrEqual(expectedMax);
    });

    it("should handle empty array", () => {
      const estimate = estimatePDFSize([]);
      expect(estimate).toBe(0);
    });
  });

  describe("formatFileSize", () => {
    it("should format bytes correctly", () => {
      expect(formatFileSize(500)).toBe("500 B");
    });

    it("should format kilobytes correctly", () => {
      expect(formatFileSize(1024)).toBe("1.0 KB");
      expect(formatFileSize(1536)).toBe("1.5 KB");
    });

    it("should format megabytes correctly", () => {
      expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
      expect(formatFileSize(2.5 * 1024 * 1024)).toBe("2.5 MB");
    });
  });
});
