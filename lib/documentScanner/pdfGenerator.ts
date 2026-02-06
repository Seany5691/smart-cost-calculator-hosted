/**
 * PDF Generator Module
 *
 * Generates PDF documents from processed images using pdf-lib.
 * Creates multi-page PDFs with proper metadata and embedded JPEG images.
 *
 * Requirements: 10.1-10.6
 */

import { PDFDocument } from "pdf-lib";
import { ProcessedImage } from "./types";

/**
 * Apply crop area to an image blob
 *
 * Creates a new image with only the cropped region
 *
 * @param blob - Image blob to crop
 * @param cropArea - Crop region {x, y, width, height}
 * @returns Cropped image as a new blob
 */
async function applyCropToBlob(
  blob: Blob,
  cropArea: { x: number; y: number; width: number; height: number },
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      try {
        // Create canvas with crop dimensions
        const canvas = document.createElement("canvas");
        canvas.width = cropArea.width;
        canvas.height = cropArea.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Failed to get canvas context");
        }

        // Draw cropped region
        ctx.drawImage(
          img,
          cropArea.x,
          cropArea.y,
          cropArea.width,
          cropArea.height,
          0,
          0,
          cropArea.width,
          cropArea.height,
        );

        // Convert to blob with maximum quality
        canvas.toBlob(
          (croppedBlob) => {
            URL.revokeObjectURL(url);
            if (croppedBlob) {
              resolve(croppedBlob);
            } else {
              reject(new Error("Failed to create cropped blob"));
            }
          },
          "image/jpeg",
          0.98, // Maximum quality for PDF
        );
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

/**
 * Generate a PDF document from processed images
 *
 * Creates a PDF with:
 * - Metadata (title, creator, producer, creation date)
 * - One page per image with dimensions matching the image
 * - Images embedded as JPEG at full page size
 * - Applies crop areas if specified
 *
 * @param images - Array of processed images to include in PDF
 * @param documentName - Name for the PDF document (used in metadata)
 * @returns PDF as a Blob ready for upload
 *
 * @example
 * const pdfBlob = await generatePDF(processedImages, "Contract - John Doe");
 * // Upload pdfBlob to server
 */
export async function generatePDF(
  images: ProcessedImage[],
  documentName: string,
): Promise<Blob> {
  // Create new PDF document
  const pdfDoc = await PDFDocument.create();

  // Set PDF metadata (Requirements 10.2, 10.3)
  pdfDoc.setTitle(documentName);
  pdfDoc.setCreator("Smart Cost Calculator");
  pdfDoc.setProducer("Document Scanner");
  pdfDoc.setCreationDate(new Date());

  // Add each image as a page (Requirements 10.4, 10.5, 10.6)
  for (const image of images) {
    try {
      // Apply crop area if specified and not full image
      let imageToEmbed = image.processedBlob;
      
      if (image.cropArea) {
        // Always apply crop if cropArea exists (it may have been manually adjusted)
        imageToEmbed = await applyCropToBlob(image.processedBlob, image.cropArea);
      }

      // Convert processed blob to array buffer
      const imageBytes = await imageToEmbed.arrayBuffer();

      // Embed image as JPEG (Requirement 10.4)
      const embeddedImage = await pdfDoc.embedJpg(imageBytes);

      // Get image dimensions (Requirement 10.5)
      const { width, height } = embeddedImage.scale(1);

      // Create A4 page (standard size) instead of image dimensions
      // A4 at 72 DPI: 595 x 842 points (portrait)
      const A4_WIDTH = 595;
      const A4_HEIGHT = 842;
      
      // Determine if image is portrait or landscape
      const isPortrait = height > width;
      const pageWidth = isPortrait ? A4_WIDTH : A4_HEIGHT;
      const pageHeight = isPortrait ? A4_HEIGHT : A4_WIDTH;

      // Create page with A4 dimensions (Requirement 10.5)
      const page = pdfDoc.addPage([pageWidth, pageHeight]);

      // Draw image stretched to FULL PAGE (Requirement 10.6)
      // This ensures the image fills the entire PDF page from corner to corner
      page.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight,
      });
    } catch (error) {
      console.error(`Failed to add page ${image.pageNumber} to PDF:`, error);
      throw new Error(
        `Failed to process page ${image.pageNumber}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // Save PDF and return as Blob (Requirement 10.1)
  const pdfBytes = await pdfDoc.save();
  // Convert to standard Uint8Array to ensure compatibility
  const standardBytes = new Uint8Array(pdfBytes);
  return new Blob([standardBytes], { type: "application/pdf" });
}

/**
 * Estimate the size of a PDF that would be generated from the given images
 *
 * Provides a rough estimate based on the sum of processed image sizes
 * plus overhead for PDF structure (~10% overhead)
 *
 * @param images - Array of processed images
 * @returns Estimated PDF size in bytes
 */
export function estimatePDFSize(images: ProcessedImage[]): number {
  const totalImageSize = images.reduce((sum, img) => sum + img.fileSize, 0);
  // Add ~10% overhead for PDF structure
  return Math.ceil(totalImageSize * 1.1);
}

/**
 * Format file size in human-readable format
 *
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
