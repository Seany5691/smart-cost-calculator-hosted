/**
 * Image Compression Utilities for Document Scanner
 *
 * This module provides image compression functionality using browser-image-compression
 * library with Web Worker support for non-blocking compression operations.
 *
 * The compression is optimized for document scanning with settings that balance
 * file size and quality:
 * - Maximum file size: 1MB per image
 * - Maximum dimensions: 1920px (width or height)
 * - JPEG quality: 0.85 (85%)
 * - Web Worker: Enabled for background processing
 *
 * Requirements: 5.7
 */

import imageCompression from "browser-image-compression";

/**
 * Compression options for document images
 *
 * These settings are optimized for scanned documents:
 * - maxSizeMB: 1 - Keeps file size reasonable for upload and storage
 * - maxWidthOrHeight: 1920 - Maintains quality while reducing very large images
 * - quality: 0.85 - Good balance between quality and compression
 * - useWebWorker: true - Prevents UI blocking during compression
 * - fileType: 'image/jpeg' - Best format for document photos (smaller than PNG)
 */
const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  quality: 0.85,
  useWebWorker: true,
  fileType: "image/jpeg" as const,
};

/**
 * Compress an image to meet document scanner requirements
 *
 * This function takes a processed image (after enhancement and perspective
 * correction) and compresses it to reduce file size while maintaining
 * sufficient quality for document readability.
 *
 * The compression uses Web Workers to avoid blocking the UI thread, which is
 * essential for maintaining responsiveness during batch processing of multiple
 * document pages.
 *
 * Compression benefits:
 * - Reduces storage requirements
 * - Speeds up upload times
 * - Reduces bandwidth usage
 * - Maintains document readability
 *
 * The function handles both Blob and File inputs, making it flexible for
 * different use cases in the scanning workflow.
 *
 * @param imageBlob - Image blob to compress (can be Blob or File)
 * @param options - Optional compression options (defaults to COMPRESSION_OPTIONS)
 * @returns Promise resolving to compressed image blob
 * @throws Error if compression fails
 *
 * @example
 * // Compress a processed image
 * const processedBlob = await imageDataToBlob(processedImageData);
 * const compressedBlob = await compressImage(processedBlob);
 * console.log(`Original: ${processedBlob.size} bytes`);
 * console.log(`Compressed: ${compressedBlob.size} bytes`);
 *
 * @example
 * // Compress with custom options
 * const compressedBlob = await compressImage(imageBlob, {
 *   maxSizeMB: 0.5,
 *   maxWidthOrHeight: 1600,
 *   quality: 0.8
 * });
 *
 * Requirements: 5.7
 */
export async function compressImage(
  imageBlob: Blob | File,
  options: Partial<typeof COMPRESSION_OPTIONS> = {},
): Promise<Blob> {
  try {
    // Merge custom options with defaults
    const compressionOptions = {
      ...COMPRESSION_OPTIONS,
      ...options,
    };

    // Convert Blob to File if needed (browser-image-compression expects File)
    let imageFile: File;
    if (imageBlob instanceof File) {
      imageFile = imageBlob;
    } else {
      // Create a File from Blob with a temporary filename
      imageFile = new File([imageBlob], "document.jpg", {
        type: imageBlob.type || "image/jpeg",
      });
    }

    // Compress the image using browser-image-compression
    // This will use a Web Worker if available, preventing UI blocking
    const compressedFile = await imageCompression(
      imageFile,
      compressionOptions,
    );

    // Return as Blob (File extends Blob, so this is safe)
    return compressedFile as Blob;
  } catch (error) {
    // Provide detailed error message for debugging
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to compress image: ${errorMessage}`);
  }
}

/**
 * Get compression statistics for an image
 *
 * This utility function compresses an image and returns statistics about
 * the compression, including original size, compressed size, and compression
 * ratio. Useful for testing and optimization.
 *
 * @param imageBlob - Image blob to analyze
 * @returns Promise resolving to compression statistics
 *
 * @example
 * const stats = await getCompressionStats(imageBlob);
 * console.log(`Compression ratio: ${stats.compressionRatio.toFixed(2)}x`);
 * console.log(`Size reduction: ${stats.sizeReductionPercent.toFixed(1)}%`);
 */
export async function getCompressionStats(imageBlob: Blob): Promise<{
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  sizeReductionPercent: number;
}> {
  const originalSize = imageBlob.size;
  const compressedBlob = await compressImage(imageBlob);
  const compressedSize = compressedBlob.size;

  const compressionRatio = originalSize / compressedSize;
  const sizeReductionPercent =
    ((originalSize - compressedSize) / originalSize) * 100;

  return {
    originalSize,
    compressedSize,
    compressionRatio,
    sizeReductionPercent,
  };
}

/**
 * Check if an image needs compression
 *
 * Determines whether an image blob exceeds the size or dimension limits
 * and needs compression. This can be used to skip compression for images
 * that are already small enough.
 *
 * @param imageBlob - Image blob to check
 * @param maxSizeMB - Maximum size in megabytes (default: 1)
 * @returns Promise resolving to true if compression is needed
 *
 * @example
 * if (await needsCompression(imageBlob)) {
 *   imageBlob = await compressImage(imageBlob);
 * }
 */
export async function needsCompression(
  imageBlob: Blob,
  maxSizeMB: number = 1,
): Promise<boolean> {
  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (imageBlob.size > maxSizeBytes) {
    return true;
  }

  // Check dimensions by loading the image
  try {
    const url = URL.createObjectURL(imageBlob);
    const img = new Image();

    const dimensions = await new Promise<{ width: number; height: number }>(
      (resolve, reject) => {
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve({ width: img.width, height: img.height });
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("Failed to load image"));
        };
        img.src = url;
      },
    );

    // Check if either dimension exceeds the limit
    if (
      dimensions.width > COMPRESSION_OPTIONS.maxWidthOrHeight ||
      dimensions.height > COMPRESSION_OPTIONS.maxWidthOrHeight
    ) {
      return true;
    }

    return false;
  } catch (error) {
    // If we can't determine dimensions, assume compression is needed
    return true;
  }
}

/**
 * Generate a low-resolution thumbnail for preview display
 *
 * Creates a thumbnail image with maximum dimensions of 200x300 pixels while
 * maintaining the original aspect ratio. Thumbnails are used in the preview
 * grid to reduce memory usage and improve rendering performance.
 *
 * The function:
 * 1. Loads the image into a canvas
 * 2. Calculates scaled dimensions maintaining aspect ratio
 * 3. Draws the scaled image to a smaller canvas
 * 4. Converts to a compressed JPEG blob
 *
 * Benefits of thumbnails:
 * - Reduced memory usage (important for mobile devices)
 * - Faster rendering in preview grid
 * - Smoother scrolling with many pages
 * - Lower bandwidth for preview display
 *
 * The thumbnail quality is set lower (0.7) than full images since they're
 * only used for preview purposes and small display sizes.
 *
 * @param imageBlob - Full-size image blob to create thumbnail from
 * @param maxWidth - Maximum thumbnail width in pixels (default: 200)
 * @param maxHeight - Maximum thumbnail height in pixels (default: 300)
 * @returns Promise resolving to thumbnail blob
 * @throws Error if thumbnail generation fails
 *
 * @example
 * // Generate standard thumbnail
 * const thumbnail = await generateThumbnail(processedBlob);
 *
 * @example
 * // Generate custom size thumbnail
 * const thumbnail = await generateThumbnail(processedBlob, 150, 200);
 *
 * Requirements: 9.4
 */
export async function generateThumbnail(
  imageBlob: Blob,
  maxWidth: number = 200,
  maxHeight: number = 300,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      // Create object URL from blob
      const url = URL.createObjectURL(imageBlob);
      const img = new Image();

      img.onload = () => {
        try {
          // Calculate scaled dimensions maintaining aspect ratio
          let width = img.width;
          let height = img.height;

          // Calculate scale factor to fit within max dimensions
          const widthScale = maxWidth / width;
          const heightScale = maxHeight / height;
          const scale = Math.min(widthScale, heightScale, 1); // Don't upscale

          // Apply scale
          width = Math.round(width * scale);
          height = Math.round(height * scale);

          // Create canvas with thumbnail dimensions
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          // Get 2D context
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            throw new Error("Failed to get canvas 2D context");
          }

          // Draw scaled image
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob with lower quality for thumbnails
          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(url);
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error("Failed to convert thumbnail canvas to blob"));
              }
            },
            "image/jpeg",
            0.7, // Lower quality for thumbnails
          );
        } catch (error) {
          URL.revokeObjectURL(url);
          reject(error);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image for thumbnail generation"));
      };

      img.src = url;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      reject(new Error(`Failed to generate thumbnail: ${errorMessage}`));
    }
  });
}

/**
 * Generate thumbnail with specific dimensions (no aspect ratio preservation)
 *
 * Creates a thumbnail with exact dimensions by cropping/stretching the image.
 * This is useful when you need thumbnails of a specific size for layout purposes.
 *
 * The image is scaled to cover the target dimensions and centered, with any
 * overflow cropped. This ensures the thumbnail fills the entire target area.
 *
 * @param imageBlob - Full-size image blob
 * @param width - Exact thumbnail width in pixels
 * @param height - Exact thumbnail height in pixels
 * @returns Promise resolving to thumbnail blob
 *
 * @example
 * // Generate square thumbnail
 * const squareThumbnail = await generateThumbnailExact(imageBlob, 150, 150);
 */
export async function generateThumbnailExact(
  imageBlob: Blob,
  width: number,
  height: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const url = URL.createObjectURL(imageBlob);
      const img = new Image();

      img.onload = () => {
        try {
          // Create canvas with exact dimensions
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            throw new Error("Failed to get canvas 2D context");
          }

          // Calculate scale to cover the target dimensions
          const scaleX = width / img.width;
          const scaleY = height / img.height;
          const scale = Math.max(scaleX, scaleY);

          // Calculate scaled dimensions
          const scaledWidth = img.width * scale;
          const scaledHeight = img.height * scale;

          // Calculate offset to center the image
          const offsetX = (width - scaledWidth) / 2;
          const offsetY = (height - scaledHeight) / 2;

          // Draw scaled and centered image
          ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);

          // Convert to blob
          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(url);
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error("Failed to convert thumbnail canvas to blob"));
              }
            },
            "image/jpeg",
            0.7,
          );
        } catch (error) {
          URL.revokeObjectURL(url);
          reject(error);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image for thumbnail generation"));
      };

      img.src = url;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      reject(new Error(`Failed to generate exact thumbnail: ${errorMessage}`));
    }
  });
}
