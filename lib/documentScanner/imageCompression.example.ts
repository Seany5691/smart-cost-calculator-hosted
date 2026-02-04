/**
 * Example usage of image compression and thumbnail generation
 *
 * This file demonstrates how to use the compression utilities in the
 * document scanner workflow.
 */

import {
  compressImage,
  generateThumbnail,
  needsCompression,
  getCompressionStats,
} from "./imageCompression";

/**
 * Example: Process a captured document image
 *
 * This shows the typical workflow for processing a captured image:
 * 1. Check if compression is needed
 * 2. Compress the image if necessary
 * 3. Generate a thumbnail for preview
 */
export async function processDocumentImage(capturedBlob: Blob): Promise<{
  processedBlob: Blob;
  thumbnailBlob: Blob;
  stats: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
  };
}> {
  // Step 1: Check if compression is needed
  const needsComp = await needsCompression(capturedBlob);
  console.log(`Image needs compression: ${needsComp}`);

  // Step 2: Compress the image
  let processedBlob: Blob;
  if (needsComp) {
    processedBlob = await compressImage(capturedBlob);
    console.log(
      `Compressed from ${capturedBlob.size} to ${processedBlob.size} bytes`,
    );
  } else {
    processedBlob = capturedBlob;
    console.log("Image already meets size requirements");
  }

  // Step 3: Generate thumbnail for preview grid
  const thumbnailBlob = await generateThumbnail(processedBlob);
  console.log(`Generated thumbnail: ${thumbnailBlob.size} bytes`);

  // Step 4: Get compression statistics
  const stats = await getCompressionStats(capturedBlob);
  console.log(`Compression ratio: ${stats.compressionRatio.toFixed(2)}x`);
  console.log(`Size reduction: ${stats.sizeReductionPercent.toFixed(1)}%`);

  return {
    processedBlob,
    thumbnailBlob,
    stats: {
      originalSize: stats.originalSize,
      compressedSize: stats.compressedSize,
      compressionRatio: stats.compressionRatio,
    },
  };
}

/**
 * Example: Batch process multiple document pages
 *
 * This shows how to process multiple pages efficiently:
 * 1. Process images in parallel (up to 5 at a time)
 * 2. Track progress
 * 3. Handle errors gracefully
 */
export async function batchProcessDocuments(
  capturedBlobs: Blob[],
  onProgress?: (current: number, total: number) => void,
): Promise<
  Array<{
    processedBlob: Blob;
    thumbnailBlob: Blob;
    error?: string;
  }>
> {
  const results: Array<{
    processedBlob: Blob;
    thumbnailBlob: Blob;
    error?: string;
  }> = [];

  const batchSize = 5;
  const total = capturedBlobs.length;

  for (let i = 0; i < capturedBlobs.length; i += batchSize) {
    const batch = capturedBlobs.slice(i, i + batchSize);

    // Process batch in parallel
    const batchResults = await Promise.allSettled(
      batch.map(async (blob) => {
        try {
          const processedBlob = await compressImage(blob);
          const thumbnailBlob = await generateThumbnail(processedBlob);
          return { processedBlob, thumbnailBlob };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          throw new Error(`Failed to process image: ${errorMessage}`);
        }
      }),
    );

    // Collect results
    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        // Handle error - add placeholder with error message
        results.push({
          processedBlob: new Blob(),
          thumbnailBlob: new Blob(),
          error: result.reason.message,
        });
      }
    }

    // Report progress
    if (onProgress) {
      onProgress(results.length, total);
    }

    // Small delay to allow UI updates
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return results;
}

/**
 * Example: Custom compression for specific use cases
 *
 * This shows how to use custom compression options for different scenarios:
 * - High quality for important documents
 * - Lower quality for quick previews
 * - Specific size limits for upload constraints
 */
export async function compressWithCustomOptions(
  imageBlob: Blob,
  scenario: "high-quality" | "quick-preview" | "small-upload",
): Promise<Blob> {
  switch (scenario) {
    case "high-quality":
      // Maximum quality for important documents
      return compressImage(imageBlob, {
        maxSizeMB: 2,
        maxWidthOrHeight: 2400,
        quality: 0.95,
      });

    case "quick-preview":
      // Lower quality for fast processing
      return compressImage(imageBlob, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1200,
        quality: 0.7,
      });

    case "small-upload":
      // Aggressive compression for bandwidth-constrained uploads
      return compressImage(imageBlob, {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 1000,
        quality: 0.6,
      });

    default:
      // Default compression
      return compressImage(imageBlob);
  }
}

/**
 * Example: Memory-efficient thumbnail generation
 *
 * This shows how to generate thumbnails without keeping full images in memory:
 * 1. Generate thumbnail immediately after capture
 * 2. Store only the thumbnail for preview
 * 3. Keep full image only during processing
 */
export async function generatePreviewThumbnail(capturedBlob: Blob): Promise<{
  thumbnailDataUrl: string;
  thumbnailSize: number;
}> {
  // Generate thumbnail
  const thumbnailBlob = await generateThumbnail(capturedBlob);

  // Convert to data URL for immediate display
  const thumbnailDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read thumbnail"));
    reader.readAsDataURL(thumbnailBlob);
  });

  return {
    thumbnailDataUrl,
    thumbnailSize: thumbnailBlob.size,
  };
}
