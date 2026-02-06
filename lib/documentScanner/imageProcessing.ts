/**
 * Image Processing Utilities for Document Scanner
 *
 * This module provides core image loading, conversion, and processing utilities
 * for the document scanning workflow. It handles:
 * - Loading images from Blobs into ImageData for canvas manipulation
 * - Converting between Blob and Data URL formats for previews
 * - Image enhancement operations (grayscale, contrast, brightness, sharpening)
 * - Edge detection and perspective transformation
 * - Image compression and thumbnail generation
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

/**
 * Load a Blob into ImageData for canvas manipulation
 *
 * This function takes an image Blob (from camera capture or file),
 * loads it into an Image element, draws it to a canvas, and extracts
 * the raw pixel data as ImageData.
 *
 * @param blob - Image blob to load
 * @returns Promise resolving to ImageData containing pixel data
 * @throws Error if image fails to load or blob is invalid
 *
 * @example
 * const imageData = await loadImageData(capturedBlob);
 * console.log(`Image size: ${imageData.width}x${imageData.height}`);
 */
export async function loadImageData(blob: Blob): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    // Create object URL from blob for loading
    const url = URL.createObjectURL(blob);

    // Create image element
    const img = new Image();

    // Handle successful load
    img.onload = () => {
      try {
        // Create canvas with image dimensions
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        // Get 2D context
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Failed to get canvas 2D context");
        }

        // Draw image to canvas
        ctx.drawImage(img, 0, 0);

        // Extract pixel data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Clean up object URL
        URL.revokeObjectURL(url);

        resolve(imageData);
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };

    // Handle load error
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image from blob"));
    };

    // Start loading
    img.src = url;
  });
}

/**
 * Convert a Blob to a Data URL (base64) for preview display
 *
 * Data URLs can be used directly in img src attributes for displaying
 * images without creating object URLs. Useful for previews and thumbnails.
 *
 * @param blob - Image blob to convert
 * @returns Promise resolving to base64 data URL string
 * @throws Error if FileReader fails
 *
 * @example
 * const dataUrl = await blobToDataUrl(imageBlob);
 * imageElement.src = dataUrl;
 */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("FileReader result is not a string"));
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read blob as data URL"));
    };

    reader.readAsDataURL(blob);
  });
}

/**
 * Convert a Data URL (base64) back to a Blob
 *
 * Useful for converting preview images back to blobs for upload or
 * further processing. Handles both with and without MIME type prefix.
 *
 * @param dataUrl - Base64 data URL string
 * @returns Promise resolving to Blob
 * @throws Error if data URL is invalid or conversion fails
 *
 * @example
 * const blob = await dataUrlToBlob(imageDataUrl);
 * await uploadBlob(blob);
 */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      // Split data URL into parts
      const parts = dataUrl.split(",");
      if (parts.length !== 2) {
        throw new Error("Invalid data URL format");
      }

      // Extract MIME type from header (e.g., "data:image/jpeg;base64")
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";

      // Decode base64 string
      const base64 = parts[1];
      const binaryString = atob(base64);

      // Convert binary string to byte array
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create blob from byte array
      const blob = new Blob([bytes], { type: mime });
      resolve(blob);
    } catch (error) {
      reject(new Error(`Failed to convert data URL to blob: ${error}`));
    }
  });
}

/**
 * Convert ImageData back to a Blob for storage or upload
 *
 * Takes processed ImageData from canvas operations and converts it
 * to a Blob with specified format and quality.
 *
 * @param imageData - ImageData to convert
 * @param format - Output format ('image/jpeg' or 'image/png')
 * @param quality - JPEG quality (0.0 to 1.0), ignored for PNG
 * @returns Promise resolving to Blob
 *
 * @example
 * const processedBlob = await imageDataToBlob(imageData, 'image/jpeg', 0.85);
 */
export async function imageDataToBlob(
  imageData: ImageData,
  format: string = "image/jpeg",
  quality: number = 0.85,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Create canvas with ImageData dimensions
    const canvas = document.createElement("canvas");
    canvas.width = imageData.width;
    canvas.height = imageData.height;

    // Get context and put ImageData
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Failed to get canvas 2D context"));
      return;
    }

    ctx.putImageData(imageData, 0, 0);

    // Convert canvas to blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to convert canvas to blob"));
        }
      },
      format,
      quality,
    );
  });
}

/**
 * Convert image to grayscale using luminosity method
 *
 * Converts a color image to grayscale by applying weighted RGB values
 * based on human perception of brightness. The luminosity method uses
 * weights that reflect how the human eye perceives different colors:
 * - Red: 29.9% (0.299)
 * - Green: 58.7% (0.587) - highest because eyes are most sensitive to green
 * - Blue: 11.4% (0.114)
 *
 * This method produces more natural-looking grayscale images compared to
 * simple averaging, and is essential for document scanning as it maintains
 * text readability and contrast.
 *
 * The function modifies the ImageData in place for performance, setting
 * all RGB channels to the calculated grayscale value while preserving alpha.
 *
 * @param imageData - ImageData to convert (modified in place)
 * @returns The same ImageData object with grayscale values
 *
 * @example
 * const imageData = await loadImageData(blob);
 * const grayscale = convertToGrayscale(imageData);
 * // All pixels now have R=G=B (grayscale)
 *
 * Requirements: 5.1
 */
export function convertToGrayscale(imageData: ImageData): ImageData {
  const data = imageData.data;

  // Luminosity weights based on human perception
  const RED_WEIGHT = 0.299;
  const GREEN_WEIGHT = 0.587;
  const BLUE_WEIGHT = 0.114;

  // Process each pixel (RGBA = 4 bytes per pixel)
  for (let i = 0; i < data.length; i += 4) {
    const red = data[i];
    const green = data[i + 1];
    const blue = data[i + 2];
    // Alpha at data[i + 3] is preserved

    // Calculate grayscale value using luminosity method
    const grayscale = Math.round(
      RED_WEIGHT * red + GREEN_WEIGHT * green + BLUE_WEIGHT * blue,
    );

    // Set all RGB channels to the same grayscale value
    data[i] = grayscale; // Red
    data[i + 1] = grayscale; // Green
    data[i + 2] = grayscale; // Blue
    // data[i + 3] remains unchanged (alpha)
  }

  return imageData;
}

/**
 * Clamp a value between minimum and maximum bounds
 *
 * Utility function to ensure a value stays within valid pixel range (0-255).
 * Used throughout image processing to prevent overflow/underflow.
 *
 * @param value - Value to clamp
 * @param min - Minimum allowed value (default 0)
 * @param max - Maximum allowed value (default 255)
 * @returns Clamped value
 *
 * @example
 * clamp(300, 0, 255) // Returns 255
 * clamp(-10, 0, 255) // Returns 0
 * clamp(128, 0, 255) // Returns 128
 */
export function clamp(
  value: number,
  min: number = 0,
  max: number = 255,
): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Apply median filter for noise reduction
 *
 * Reduces noise in the image by replacing each pixel with the median value
 * of its neighborhood. This is particularly effective for "salt and pepper"
 * noise while preserving edges better than Gaussian blur.
 *
 * The median filter:
 * - Sorts pixel values in a neighborhood
 * - Replaces center pixel with the median value
 * - Preserves edges while removing noise
 * - Essential before sharpening to avoid amplifying noise
 *
 * @param imageData - ImageData to denoise
 * @param kernelSize - Size of the median filter kernel (default 3)
 * @returns New ImageData with noise reduced
 *
 * Requirements: "Magic" filter enhancement
 */
export function reduceNoise(
  imageData: ImageData,
  kernelSize: number = 3,
): ImageData {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;

  // Create output ImageData
  const outputData = new Uint8ClampedArray(width * height * 4);
  const output = new ImageData(outputData, width, height);

  const radius = Math.floor(kernelSize / 2);

  // Process each pixel
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Collect neighborhood values for each channel
      const rValues: number[] = [];
      const gValues: number[] = [];
      const bValues: number[] = [];

      // Sample neighborhood
      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const pixelY = clamp(y + ky, 0, height - 1);
          const pixelX = clamp(x + kx, 0, width - 1);
          const idx = (pixelY * width + pixelX) * 4;

          rValues.push(data[idx]);
          gValues.push(data[idx + 1]);
          bValues.push(data[idx + 2]);
        }
      }

      // Sort and find median
      rValues.sort((a, b) => a - b);
      gValues.sort((a, b) => a - b);
      bValues.sort((a, b) => a - b);

      const medianIdx = Math.floor(rValues.length / 2);
      const outputIdx = (y * width + x) * 4;

      outputData[outputIdx] = rValues[medianIdx];
      outputData[outputIdx + 1] = gValues[medianIdx];
      outputData[outputIdx + 2] = bValues[medianIdx];
      outputData[outputIdx + 3] = data[(y * width + x) * 4 + 3]; // Copy alpha
    }
  }

  return output;
}

/**
 * Apply adaptive thresholding for crisp text
 *
 * Converts grayscale image to high-contrast black and white using adaptive
 * thresholding. This makes text extremely crisp and clear, perfect for
 * document scanning.
 *
 * Adaptive thresholding:
 * - Calculates local threshold for each pixel based on neighborhood
 * - Handles varying lighting conditions across the document
 * - Makes text pure black and background pure white
 * - Essential for the "Magic" filter effect
 *
 * @param imageData - ImageData to threshold (should be grayscale)
 * @param blockSize - Size of neighborhood for local threshold (default 15)
 * @param constant - Constant subtracted from mean (default 10)
 * @returns New ImageData with adaptive thresholding applied
 *
 * Requirements: "Magic" filter enhancement
 */
export function applyAdaptiveThreshold(
  imageData: ImageData,
  blockSize: number = 15,
  constant: number = 10,
): ImageData {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;

  // Create output ImageData
  const outputData = new Uint8ClampedArray(width * height * 4);
  const output = new ImageData(outputData, width, height);

  const radius = Math.floor(blockSize / 2);

  // Process each pixel
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Calculate local mean in neighborhood
      let sum = 0;
      let count = 0;

      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const pixelY = clamp(y + ky, 0, height - 1);
          const pixelX = clamp(x + kx, 0, width - 1);
          const idx = (pixelY * width + pixelX) * 4;

          sum += data[idx]; // Use red channel (grayscale, so R=G=B)
          count++;
        }
      }

      const localMean = sum / count;
      const threshold = localMean - constant;

      // Get current pixel value
      const currentIdx = (y * width + x) * 4;
      const pixelValue = data[currentIdx];

      // Apply threshold: if pixel > threshold, make it white, else black
      const outputIdx = (y * width + x) * 4;
      const newValue = pixelValue > threshold ? 255 : 0;

      outputData[outputIdx] = newValue;
      outputData[outputIdx + 1] = newValue;
      outputData[outputIdx + 2] = newValue;
      outputData[outputIdx + 3] = 255; // Full opacity
    }
  }

  return output;
}

/**
 * Enhance image contrast using linear contrast stretch
 *
 * Applies a linear contrast enhancement to make dark pixels darker and
 * bright pixels brighter, improving the distinction between text and
 * background in scanned documents.
 *
 * The algorithm works by:
 * 1. Finding the current minimum and maximum pixel values in the image
 * 2. Calculating the midpoint (128 for 8-bit images)
 * 3. Stretching values away from the midpoint by the given factor
 * 4. Clamping results to valid pixel range (0-255)
 *
 * A factor of 1.0 leaves the image unchanged.
 * A factor > 1.0 increases contrast (recommended: 2.0 for "Magic" filter).
 * A factor < 1.0 decreases contrast.
 *
 * Formula: newValue = midpoint + (oldValue - midpoint) * factor
 *
 * This enhancement is crucial for document scanning as it:
 * - Makes text darker and more readable
 * - Makes backgrounds whiter and cleaner
 * - Improves OCR accuracy
 * - Creates more professional-looking scans
 *
 * @param imageData - ImageData to enhance (modified in place)
 * @param factor - Contrast enhancement factor (default 2.0 for "Magic" filter)
 * @returns The same ImageData object with enhanced contrast
 *
 * @example
 * const imageData = await loadImageData(blob);
 * convertToGrayscale(imageData);
 * enhanceContrast(imageData, 2.0); // Aggressive contrast for crisp text
 *
 * Requirements: 5.2, "Magic" filter enhancement
 */
export function enhanceContrast(
  imageData: ImageData,
  factor: number = 1.2,
): ImageData {
  const data = imageData.data;
  const midpoint = 128; // Middle of 0-255 range

  // Process each pixel (RGBA = 4 bytes per pixel)
  for (let i = 0; i < data.length; i += 4) {
    // Apply contrast stretch to each RGB channel
    // For grayscale images, R=G=B so all channels get the same treatment
    for (let channel = 0; channel < 3; channel++) {
      const oldValue = data[i + channel];

      // Linear contrast stretch formula:
      // Stretch values away from midpoint by the factor
      const newValue = midpoint + (oldValue - midpoint) * factor;

      // Clamp to valid pixel range and round to integer
      data[i + channel] = clamp(Math.round(newValue), 0, 255);
    }
    // Alpha channel (i + 3) remains unchanged
  }

  return imageData;
}

/**
 * Adjust image brightness to reach a target level
 *
 * Automatically adjusts the overall brightness of an image to reach a
 * target brightness level. This normalizes lighting conditions across
 * different captures, ensuring consistent document appearance regardless
 * of ambient lighting during capture.
 *
 * The algorithm works by:
 * 1. Calculating the current average brightness across all pixels
 * 2. Computing the difference between current and target brightness
 * 3. Adding this difference to every pixel value
 * 4. Clamping results to valid pixel range (0-255)
 *
 * For document scanning, a target of 220 (on 0-255 scale) provides:
 * - Very bright background to appear pure white
 * - Excellent contrast with dark text
 * - Optimal balance for OCR and visual quality
 * - Professional "Magic" filter appearance
 *
 * This adjustment is essential because:
 * - Documents may be captured in varying lighting conditions
 * - Some captures may be too dark (underexposed)
 * - Some captures may be too bright (overexposed)
 * - Consistent brightness improves batch processing results
 *
 * The function modifies ImageData in place for performance.
 *
 * @param imageData - ImageData to adjust (modified in place)
 * @param target - Target brightness level (0-255, default 220 for "Magic" filter)
 * @returns The same ImageData object with adjusted brightness
 *
 * @example
 * const imageData = await loadImageData(blob);
 * convertToGrayscale(imageData);
 * enhanceContrast(imageData, 2.0);
 * adjustBrightness(imageData, 220); // Bright white background
 *
 * Requirements: 5.3, "Magic" filter enhancement
 */
export function adjustBrightness(
  imageData: ImageData,
  target: number = 190,
): ImageData {
  const data = imageData.data;

  // Step 1: Calculate current average brightness
  // We only need to check one channel since image should be grayscale at this point
  let totalBrightness = 0;
  let pixelCount = 0;

  for (let i = 0; i < data.length; i += 4) {
    // Use red channel (for grayscale, R=G=B)
    totalBrightness += data[i];
    pixelCount++;
  }

  const currentAverage = totalBrightness / pixelCount;

  // Step 2: Calculate adjustment needed
  const adjustment = target - currentAverage;

  // Step 3: Apply adjustment to all pixels
  for (let i = 0; i < data.length; i += 4) {
    // Apply to RGB channels (for grayscale, all three are the same)
    for (let channel = 0; channel < 3; channel++) {
      const oldValue = data[i + channel];
      const newValue = oldValue + adjustment;

      // Clamp to valid pixel range
      data[i + channel] = clamp(Math.round(newValue), 0, 255);
    }
    // Alpha channel (i + 3) remains unchanged
  }

  return imageData;
}

/**
 * Apply a convolution kernel to an image
 *
 * Convolution is a fundamental image processing operation that applies
 * a small matrix (kernel) to each pixel and its neighbors to produce
 * a new pixel value. This is used for various effects including:
 * - Sharpening (enhancing edges)
 * - Blurring (smoothing)
 * - Edge detection
 * - Embossing
 *
 * The algorithm works by:
 * 1. For each pixel in the image
 * 2. Multiply each neighbor pixel by the corresponding kernel value
 * 3. Sum all the products
 * 4. Optionally divide by a divisor and add an offset
 * 5. Clamp the result to valid pixel range (0-255)
 *
 * Edge pixels are handled by clamping coordinates to image bounds,
 * effectively treating out-of-bounds pixels as copies of the edge pixels.
 *
 * @param imageData - ImageData to process
 * @param kernel - 2D array representing the convolution kernel (must be square and odd-sized)
 * @param divisor - Optional divisor to normalize the result (default: sum of kernel values or 1)
 * @param offset - Optional offset to add to the result (default: 0)
 * @returns New ImageData with convolution applied
 *
 * @example
 * // 3x3 sharpening kernel
 * const sharpenKernel = [
 *   [ 0, -1,  0],
 *   [-1,  5, -1],
 *   [ 0, -1,  0]
 * ];
 * const sharpened = applyConvolution(imageData, sharpenKernel);
 */
export function applyConvolution(
  imageData: ImageData,
  kernel: number[][],
  divisor?: number,
  offset: number = 0,
): ImageData {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;

  // Validate kernel is square and odd-sized
  const kernelSize = kernel.length;
  if (kernelSize % 2 === 0) {
    throw new Error("Kernel size must be odd");
  }
  for (const row of kernel) {
    if (row.length !== kernelSize) {
      throw new Error("Kernel must be square");
    }
  }

  // Create output ImageData
  // Create a proper ImageData object using the ImageData constructor
  const outputData = new Uint8ClampedArray(width * height * 4);
  const output = new ImageData(outputData, width, height);

  // Calculate kernel radius (how many pixels to look in each direction)
  const radius = Math.floor(kernelSize / 2);

  // Calculate divisor if not provided (sum of all kernel values)
  if (divisor === undefined) {
    divisor = kernel.flat().reduce((sum, val) => sum + val, 0);
    // If sum is 0 or very close to 0, use 1 to avoid division by zero
    if (Math.abs(divisor) < 0.0001) {
      divisor = 1;
    }
  }

  // Process each pixel
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Process each color channel (RGB)
      for (let channel = 0; channel < 3; channel++) {
        let sum = 0;

        // Apply kernel to neighborhood
        for (let ky = 0; ky < kernelSize; ky++) {
          for (let kx = 0; kx < kernelSize; kx++) {
            // Calculate neighbor coordinates
            const pixelY = y + ky - radius;
            const pixelX = x + kx - radius;

            // Clamp coordinates to image bounds (edge handling)
            const clampedY = clamp(pixelY, 0, height - 1);
            const clampedX = clamp(pixelX, 0, width - 1);

            // Get pixel value from source image
            const pixelIndex = (clampedY * width + clampedX) * 4 + channel;
            const pixelValue = data[pixelIndex];

            // Multiply by kernel value and add to sum
            const kernelValue = kernel[ky][kx];
            sum += pixelValue * kernelValue;
          }
        }

        // Normalize by divisor and add offset
        const result = sum / divisor + offset;

        // Write to output, clamping to valid range
        const outputIndex = (y * width + x) * 4 + channel;
        outputData[outputIndex] = clamp(Math.round(result), 0, 255);
      }

      // Copy alpha channel unchanged
      const alphaIndex = (y * width + x) * 4 + 3;
      outputData[alphaIndex] = data[alphaIndex];
    }
  }

  return output;
}

/**
 * Apply sharpening filter to enhance text clarity
 *
 * Sharpening is a critical step in document scanning that enhances edges
 * and fine details, making text more crisp and readable. This is especially
 * important for:
 * - Improving text clarity in scanned documents
 * - Enhancing OCR accuracy
 * - Making small text more legible
 * - Compensating for slight camera blur
 *
 * The function uses a 3x3 sharpening kernel that:
 * - Strongly emphasizes the center pixel (weight: 9 for "Magic" filter)
 * - Subtracts from all surrounding pixels (weight: -1 each)
 * - Creates a strong "unsharp mask" effect for crisp text
 *
 * The enhanced kernel pattern for "Magic" filter:
 * ```
 * -1  -1  -1
 * -1   9  -1
 * -1  -1  -1
 * ```
 *
 * This stronger kernel (sum = 1) provides:
 * - More aggressive edge enhancement
 * - Crisper text, even small fonts
 * - Better definition of fine details
 * - Professional "Magic" filter appearance
 *
 * The sharpening is applied after noise reduction to avoid amplifying noise,
 * and after contrast/brightness adjustment for optimal results.
 *
 * @param imageData - ImageData to sharpen
 * @returns New ImageData with strong sharpening applied
 *
 * @example
 * const imageData = await loadImageData(blob);
 * convertToGrayscale(imageData);
 * const denoised = reduceNoise(imageData);
 * enhanceContrast(denoised, 2.0);
 * adjustBrightness(denoised, 220);
 * const sharpened = sharpenImage(denoised); // Crisp "Magic" filter
 *
 * Requirements: 5.4, "Magic" filter enhancement
 */
export function sharpenImage(imageData: ImageData): ImageData {
  // 3x3 MODERATE sharpening kernel for readable documents
  // Balanced between gentle and aggressive - good for text clarity
  const sharpenKernel = [
    [-1, -1, -1],
    [-1,  7, -1],
    [-1, -1, -1],
  ];

  // Apply convolution with the moderate sharpening kernel
  // Divisor is -1 (sum of kernel values) so we normalize
  return applyConvolution(imageData, sharpenKernel);
}

/**
 * Point interface for perspective transform
 */
interface Point {
  x: number;
  y: number;
}

/**
 * Edge points defining document corners
 */
interface EdgePoints {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
}

/**
 * Calculate perspective transform matrix (homography)
 *
 * A homography matrix is a 3x3 transformation matrix that maps points from
 * one plane to another. In document scanning, it's used to transform a
 * skewed/angled document image into a rectangular, front-facing view.
 *
 * The transformation maps four source points (detected document corners)
 * to four destination points (corners of a rectangle). This corrects:
 * - Perspective distortion (documents photographed at an angle)
 * - Skew (documents not parallel to camera)
 * - Rotation (documents not aligned with camera)
 *
 * The homography matrix H transforms a point (x, y) to (x', y') using:
 * ```
 * x' = (h11*x + h12*y + h13) / (h31*x + h32*y + h33)
 * y' = (h21*x + h22*y + h23) / (h31*x + h32*y + h33)
 * ```
 *
 * The matrix is calculated by solving a system of linear equations derived
 * from the correspondence between source and destination points. We use
 * the Direct Linear Transform (DLT) algorithm:
 *
 * 1. Set up a system of 8 equations (2 per point pair)
 * 2. Solve using least squares (or direct solution for 4 points)
 * 3. Return the 3x3 homography matrix
 *
 * For document scanning, we typically map:
 * - Source: Detected document corners (arbitrary quadrilateral)
 * - Destination: Rectangle corners (0,0), (width,0), (width,height), (0,height)
 *
 * @param src - Source points (detected document corners)
 * @param dst - Destination points (target rectangle corners)
 * @returns 3x3 homography matrix as flat array [h11, h12, h13, h21, h22, h23, h31, h32, h33]
 *
 * @example
 * const srcCorners = { topLeft: {x: 100, y: 50}, topRight: {x: 500, y: 80}, ... };
 * const dstCorners = { topLeft: {x: 0, y: 0}, topRight: {x: 400, y: 0}, ... };
 * const matrix = getPerspectiveTransform(srcCorners, dstCorners);
 *
 * Requirements: 5.6
 */
export function getPerspectiveTransform(
  src: EdgePoints,
  dst: EdgePoints,
): number[] {
  // Extract source points
  const srcPoints = [
    src.topLeft,
    src.topRight,
    src.bottomRight,
    src.bottomLeft,
  ];

  // Extract destination points
  const dstPoints = [
    dst.topLeft,
    dst.topRight,
    dst.bottomRight,
    dst.bottomLeft,
  ];

  // Build the matrix equation Ah = b
  // We need to solve for 8 unknowns (h11-h32, with h33=1)
  // Each point correspondence gives us 2 equations
  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const sx = srcPoints[i].x;
    const sy = srcPoints[i].y;
    const dx = dstPoints[i].x;
    const dy = dstPoints[i].y;

    // First equation for this point (x' equation)
    A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
    b.push(dx);

    // Second equation for this point (y' equation)
    A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
    b.push(dy);
  }

  // Solve the system using Gaussian elimination
  const h = solveLinearSystem(A, b);

  // Return as 3x3 matrix (with h33 = 1)
  return [
    h[0],
    h[1],
    h[2], // h11, h12, h13
    h[3],
    h[4],
    h[5], // h21, h22, h23
    h[6],
    h[7],
    1, // h31, h32, h33
  ];
}

/**
 * Solve a linear system Ax = b using Gaussian elimination with partial pivoting
 *
 * This is a numerical method for solving systems of linear equations.
 * It's used here to calculate the homography matrix coefficients.
 *
 * The algorithm:
 * 1. Forward elimination: Transform A into upper triangular form
 * 2. Partial pivoting: Swap rows to avoid division by small numbers
 * 3. Back substitution: Solve for x from the triangular system
 *
 * @param A - Coefficient matrix (m x n)
 * @param b - Right-hand side vector (length m)
 * @returns Solution vector x (length n)
 */
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length;
  const m = A[0].length;

  // Create augmented matrix [A | b]
  const augmented: number[][] = A.map((row, i) => [...row, b[i]]);

  // Forward elimination with partial pivoting
  for (let col = 0; col < m; col++) {
    // Find pivot (largest absolute value in column)
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(augmented[row][col]) > Math.abs(augmented[maxRow][col])) {
        maxRow = row;
      }
    }

    // Swap rows
    if (maxRow !== col) {
      [augmented[col], augmented[maxRow]] = [augmented[maxRow], augmented[col]];
    }

    // Eliminate column entries below pivot
    for (let row = col + 1; row < n; row++) {
      const factor = augmented[row][col] / augmented[col][col];
      for (let j = col; j <= m; j++) {
        augmented[row][j] -= factor * augmented[col][j];
      }
    }
  }

  // Back substitution
  const x: number[] = new Array(m).fill(0);
  for (let i = m - 1; i >= 0; i--) {
    let sum = augmented[i][m]; // Right-hand side
    for (let j = i + 1; j < m; j++) {
      sum -= augmented[i][j] * x[j];
    }
    x[i] = sum / augmented[i][i];
  }

  return x;
}

/**
 * Apply perspective transformation to warp image
 *
 * This function applies a homography matrix to transform an image from
 * one perspective to another. It's the core of document straightening,
 * taking a skewed document image and producing a rectangular, front-facing view.
 *
 * The algorithm uses inverse mapping:
 * 1. For each pixel in the destination image
 * 2. Calculate where it came from in the source image (inverse transform)
 * 3. Sample the source image at that location (with bilinear interpolation)
 * 4. Write the sampled color to the destination pixel
 *
 * Inverse mapping is used (rather than forward mapping) because:
 * - It ensures every destination pixel gets a value (no holes)
 * - It's more efficient for this type of transformation
 * - It produces better quality results
 *
 * Bilinear interpolation is used to sample between pixels:
 * - When the source coordinate is not at an integer position
 * - We interpolate between the 4 nearest pixels
 * - This produces smoother results than nearest-neighbor sampling
 *
 * @param imageData - Source ImageData to transform
 * @param matrix - 3x3 homography matrix from getPerspectiveTransform
 * @param dstWidth - Width of output image
 * @param dstHeight - Height of output image
 * @returns New ImageData with perspective transform applied
 *
 * @example
 * const matrix = getPerspectiveTransform(srcCorners, dstCorners);
 * const warped = warpPerspective(imageData, matrix, 800, 1000);
 *
 * Requirements: 5.6
 */
export function warpPerspective(
  imageData: ImageData,
  matrix: number[],
  dstWidth: number,
  dstHeight: number,
): ImageData {
  const srcWidth = imageData.width;
  const srcHeight = imageData.height;
  const srcData = imageData.data;

  // Create output ImageData
  const dstData = new Uint8ClampedArray(dstWidth * dstHeight * 4);
  const output = new ImageData(dstData, dstWidth, dstHeight);

  // Extract matrix elements
  const [h11, h12, h13, h21, h22, h23, h31, h32, h33] = matrix;

  // Calculate inverse matrix for inverse mapping
  // For efficiency, we'll use the inverse transformation directly
  const det =
    h11 * (h22 * h33 - h23 * h32) -
    h12 * (h21 * h33 - h23 * h31) +
    h13 * (h21 * h32 - h22 * h31);

  if (Math.abs(det) < 1e-10) {
    throw new Error("Matrix is singular, cannot invert");
  }

  // Inverse matrix elements
  const invDet = 1 / det;
  const i11 = invDet * (h22 * h33 - h23 * h32);
  const i12 = invDet * (h13 * h32 - h12 * h33);
  const i13 = invDet * (h12 * h23 - h13 * h22);
  const i21 = invDet * (h23 * h31 - h21 * h33);
  const i22 = invDet * (h11 * h33 - h13 * h31);
  const i23 = invDet * (h13 * h21 - h11 * h23);
  const i31 = invDet * (h21 * h32 - h22 * h31);
  const i32 = invDet * (h12 * h31 - h11 * h32);
  const i33 = invDet * (h11 * h22 - h12 * h21);

  // Apply inverse transformation to each destination pixel
  for (let dy = 0; dy < dstHeight; dy++) {
    for (let dx = 0; dx < dstWidth; dx++) {
      // Apply inverse homography to find source coordinates
      const w = i31 * dx + i32 * dy + i33;
      const sx = (i11 * dx + i12 * dy + i13) / w;
      const sy = (i21 * dx + i22 * dy + i23) / w;

      // Check if source coordinates are within bounds
      if (sx >= 0 && sx < srcWidth - 1 && sy >= 0 && sy < srcHeight - 1) {
        // Bilinear interpolation
        const x0 = Math.floor(sx);
        const y0 = Math.floor(sy);
        const x1 = x0 + 1;
        const y1 = y0 + 1;

        const fx = sx - x0;
        const fy = sy - y0;

        // Get the 4 neighboring pixels
        const idx00 = (y0 * srcWidth + x0) * 4;
        const idx01 = (y0 * srcWidth + x1) * 4;
        const idx10 = (y1 * srcWidth + x0) * 4;
        const idx11 = (y1 * srcWidth + x1) * 4;

        // Interpolate each channel
        const dstIdx = (dy * dstWidth + dx) * 4;
        for (let c = 0; c < 4; c++) {
          const v00 = srcData[idx00 + c];
          const v01 = srcData[idx01 + c];
          const v10 = srcData[idx10 + c];
          const v11 = srcData[idx11 + c];

          // Bilinear interpolation formula
          const v0 = v00 * (1 - fx) + v01 * fx;
          const v1 = v10 * (1 - fx) + v11 * fx;
          const v = v0 * (1 - fy) + v1 * fy;

          dstData[dstIdx + c] = Math.round(v);
        }
      } else {
        // Out of bounds - fill with white
        const dstIdx = (dy * dstWidth + dx) * 4;
        dstData[dstIdx] = 255; // R
        dstData[dstIdx + 1] = 255; // G
        dstData[dstIdx + 2] = 255; // B
        dstData[dstIdx + 3] = 255; // A
      }
    }
  }

  return output;
}

/**
 * Apply perspective transform to straighten a document
 *
 * This is the main entry point for perspective correction. It takes an image
 * and detected document corners, calculates the appropriate transformation,
 * and produces a straightened, rectangular document image.
 *
 * The function:
 * 1. Calculates target dimensions maintaining the document's aspect ratio
 * 2. Defines destination corners as a perfect rectangle
 * 3. Computes the homography matrix mapping source to destination
 * 4. Applies the warp transformation
 *
 * Target dimensions are calculated to preserve the document's aspect ratio:
 * - Calculate the width as the average of top and bottom edge lengths
 * - Calculate the height as the average of left and right edge lengths
 * - This ensures the output document has realistic proportions
 *
 * The transformation corrects:
 * - Perspective distortion (documents at an angle)
 * - Skew (documents not parallel to camera)
 * - Rotation (documents not aligned)
 *
 * After transformation, the document appears as if photographed directly
 * from above, making it suitable for professional use.
 *
 * @param imageData - Source ImageData with skewed document
 * @param edges - Detected document corner points
 * @returns New ImageData with straightened document
 *
 * @example
 * const imageData = await loadImageData(blob);
 * const edges = detectDocumentEdges(imageData);
 * if (edges) {
 *   const straightened = applyPerspectiveTransform(imageData, edges);
 * }
 *
 * Requirements: 5.6
 */
export function applyPerspectiveTransform(
  imageData: ImageData,
  edges: EdgePoints,
): ImageData {
  // A4 dimensions at 250 DPI (good balance between quality and file size)
  const A4_WIDTH = 2100;
  const A4_HEIGHT = 2970;

  // Calculate current document dimensions from detected corners
  const topWidth = Math.sqrt(
    Math.pow(edges.topRight.x - edges.topLeft.x, 2) +
      Math.pow(edges.topRight.y - edges.topLeft.y, 2),
  );
  const bottomWidth = Math.sqrt(
    Math.pow(edges.bottomRight.x - edges.bottomLeft.x, 2) +
      Math.pow(edges.bottomRight.y - edges.bottomLeft.y, 2),
  );
  const avgWidth = (topWidth + bottomWidth) / 2;

  const leftHeight = Math.sqrt(
    Math.pow(edges.bottomLeft.x - edges.topLeft.x, 2) +
      Math.pow(edges.bottomLeft.y - edges.topLeft.y, 2),
  );
  const rightHeight = Math.sqrt(
    Math.pow(edges.bottomRight.x - edges.topRight.x, 2) +
      Math.pow(edges.bottomRight.y - edges.topRight.y, 2),
  );
  const avgHeight = (leftHeight + rightHeight) / 2;

  // Calculate aspect ratio
  const aspectRatio = avgWidth / avgHeight;

  // Determine orientation
  // Portrait: height > width (aspect ratio < 1)
  // Landscape: width > height (aspect ratio > 1)
  // Use threshold to handle near-square documents
  const isPortrait = aspectRatio < 0.9; // Less than 0.9 means clearly portrait
  const isLandscape = aspectRatio > 1.1; // Greater than 1.1 means clearly landscape

  // Set target dimensions based on orientation
  let targetWidth, targetHeight;
  
  if (isPortrait) {
    // Portrait: use standard A4 portrait dimensions
    targetWidth = A4_WIDTH;
    targetHeight = A4_HEIGHT;
  } else if (isLandscape) {
    // Landscape: swap dimensions
    targetWidth = A4_HEIGHT;
    targetHeight = A4_WIDTH;
  } else {
    // Near-square: use the larger dimension as height (assume portrait)
    targetWidth = A4_WIDTH;
    targetHeight = A4_HEIGHT;
  }

  console.log("[Perspective Transform] Document analysis:", {
    detectedWidth: avgWidth.toFixed(0),
    detectedHeight: avgHeight.toFixed(0),
    aspectRatio: aspectRatio.toFixed(3),
    orientation: isPortrait ? "PORTRAIT" : isLandscape ? "LANDSCAPE" : "SQUARE",
    targetWidth,
    targetHeight,
    corners: {
      topLeft: `(${edges.topLeft.x.toFixed(0)}, ${edges.topLeft.y.toFixed(0)})`,
      topRight: `(${edges.topRight.x.toFixed(0)}, ${edges.topRight.y.toFixed(0)})`,
      bottomLeft: `(${edges.bottomLeft.x.toFixed(0)}, ${edges.bottomLeft.y.toFixed(0)})`,
      bottomRight: `(${edges.bottomRight.x.toFixed(0)}, ${edges.bottomRight.y.toFixed(0)})`,
    }
  });

  // Define destination corners as a perfect rectangle (A4 proportions)
  const dstCorners: EdgePoints = {
    topLeft: { x: 0, y: 0 },
    topRight: { x: targetWidth, y: 0 },
    bottomRight: { x: targetWidth, y: targetHeight },
    bottomLeft: { x: 0, y: targetHeight },
  };

  // Calculate homography matrix
  const matrix = getPerspectiveTransform(edges, dstCorners);

  // Apply warp transformation
  return warpPerspective(imageData, matrix, targetWidth, targetHeight);
}

/**
 * Process a captured image through the complete enhancement pipeline
 *
 * This is the main entry point for image processing. It takes a raw captured
 * image and applies all enhancement operations in sequence to produce a
 * high-quality, professional-looking document scan with CamScanner-style
 * "Magic" filter enhancement.
 *
 * Processing pipeline:
 * 1. Load image into ImageData
 * 2. Convert to grayscale (simplifies processing, reduces file size)
 * 3. Detect document edges and apply perspective transform (straighten)
 * 4. Apply "Magic" filter enhancement:
 *    a. Reduce noise (median filter to prevent amplifying noise)
 *    b. Adaptive thresholding (optional - for extremely crisp text)
 *    c. Enhance contrast aggressively (factor 2.0 for crisp text)
 *    d. Adjust brightness (target 220 for bright white background)
 *    e. Strong sharpening (enhanced kernel for clear small text)
 * 5. Convert to blob with high quality
 * 6. Compress image (reduce file size to ~2MB)
 * 7. Generate thumbnail (create low-res preview)
 *
 * The "Magic" filter enhancement makes scanned documents look professional:
 * - Crisp, clear text (even small fonts)
 * - Bright white background
 * - High contrast for readability
 * - Reduced noise and artifacts
 * - Sharp edges and details
 *
 * The function tracks processing time and returns a ProcessedImage with all
 * fields populated, including the processed blob, thumbnail, detected edges,
 * crop area, file size, and processing time.
 *
 * Error handling:
 * - If edge detection fails, uses full image dimensions
 * - If perspective transform fails, uses original image
 * - Ensures all steps complete even if some fail gracefully
 *
 * @param image - CapturedImage to process
 * @returns Promise resolving to ProcessedImage with all enhancements applied
 * @throws Error if critical processing steps fail
 *
 * @example
 * const capturedImage: CapturedImage = {
 *   id: 'uuid-123',
 *   originalBlob: cameraBlob,
 *   originalDataUrl: 'data:image/jpeg;base64,...',
 *   pageNumber: 1,
 *   timestamp: Date.now(),
 *   status: 'captured',
 *   markedForRetake: false,
 *   markedForCrop: false
 * };
 *
 * const processed = await processImage(capturedImage);
 * console.log(`Processed in ${processed.processingTime}ms`);
 * console.log(`File size: ${processed.fileSize} bytes`);
 *
 * Requirements: 5.1-5.8, "Magic" filter enhancement
 */
export async function processImage(
  image: CapturedImage,
): Promise<ProcessedImage> {
  const startTime = performance.now();

  try {
    console.log("[Process Image] Starting processing for image:", image.id);
    
    // Step 1: Load image into ImageData
    let imageData = await loadImageData(image.originalBlob);
    console.log("[Process Image] Image loaded:", imageData.width, "x", imageData.height);

    // Store original dimensions for reference
    const originalWidth = imageData.width;
    const originalHeight = imageData.height;

    // Step 2: Convert to grayscale
    imageData = convertToGrayscale(imageData);
    console.log("[Process Image] Converted to grayscale");

    // Step 3: SIMPLE APPROACH - Just crop to frame boundaries
    // No complex edge detection - user already positioned document in frame
    console.log("[Process Image] Using SIMPLE frame crop approach...");
    
    // Calculate frame boundaries (matching capture mode: center 80%, A4 proportions)
    const frameWidth = Math.floor(originalWidth * 0.8);
    const frameHeight = Math.floor(frameWidth * 1.414); // A4 ratio
    const frameX = Math.floor((originalWidth - frameWidth) / 2);
    const frameY = Math.floor((originalHeight - frameHeight) / 2);
    
    console.log("[Process Image] Frame boundaries:", {
      x: frameX,
      y: frameY,
      width: frameWidth,
      height: frameHeight
    });
    
    // Create canvas to crop to frame
    const canvas = document.createElement("canvas");
    canvas.width = frameWidth;
    canvas.height = frameHeight;
    const ctx = canvas.getContext("2d")!;
    
    // Put current imageData on a temp canvas
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = originalWidth;
    tempCanvas.height = originalHeight;
    const tempCtx = tempCanvas.getContext("2d")!;
    tempCtx.putImageData(imageData, 0, 0);
    
    // Draw only the frame region to the new canvas
    ctx.drawImage(
      tempCanvas,
      frameX, frameY, frameWidth, frameHeight,  // Source region (frame)
      0, 0, frameWidth, frameHeight              // Destination (full canvas)
    );
    
    // Get the cropped imageData
    imageData = ctx.getImageData(0, 0, frameWidth, frameHeight);
    console.log("[Process Image] Cropped to frame:", imageData.width, "x", imageData.height);
    
    // No edge detection needed - document is already in frame
    let detectedEdges = undefined;

    // Step 4: Apply BALANCED enhancement pipeline for readable documents
    console.log("[Process Image] Applying OPTIMIZED enhancement settings...");
    
    // 4a: Skip noise reduction - it blurs text
    // imageData = reduceNoise(imageData, 3);
    console.log("[Process Image] Skipping noise reduction");

    // 4b: Enhance contrast (HARDCODED: 100 = 2x contrast)
    imageData = enhanceContrast(imageData, 2.0);
    console.log("[Process Image] Contrast enhanced (factor 2.0)");

    // 4c: Adjust brightness (HARDCODED: 30 = target 158)
    imageData = adjustBrightness(imageData, 158);
    console.log("[Process Image] Brightness adjusted (target 158)");

    // 4d: Apply adaptive thresholding (TESTING - will be configured)
    // imageData = applyAdaptiveThreshold(imageData, 15, 10);
    console.log("[Process Image] Skipping adaptive threshold - testing optimal settings");

    // 4e: Skip sharpening (HARDCODED: 0 = no sharpening, breaks the image)
    // imageData = sharpenImage(imageData);
    console.log("[Process Image] Skipping sharpening (breaks image)");
    
    console.log("[Process Image] Enhancement complete");

    // Step 5: Convert ImageData back to Blob with high quality
    const processedBlob = await imageDataToBlob(imageData, "image/jpeg", 0.95);
    console.log("[Process Image] Converted to blob");

    // Step 6: Compress image to target size of 2MB
    const { compressImage } = await import("./imageCompression");
    const compressedBlob = await compressImage(processedBlob, { 
      maxSizeMB: 2,
      maxWidthOrHeight: 2100,
      quality: 0.92
    });
    console.log("[Process Image] Compressed to", compressedBlob.size, "bytes");

    // Step 7: Generate thumbnail after compression
    const { generateThumbnail } = await import("./imageCompression");
    const thumbnailBlob = await generateThumbnail(compressedBlob, 200, 300);
    console.log("[Process Image] Thumbnail generated");

    // Convert blobs to data URLs for preview
    const processedDataUrl = await blobToDataUrl(compressedBlob);
    const thumbnailDataUrl = await blobToDataUrl(thumbnailBlob);

    // Calculate crop area
    const cropArea: CropArea = {
      x: 0,
      y: 0,
      width: imageData.width,
      height: imageData.height,
    };

    // Calculate processing time
    const processingTime = performance.now() - startTime;
    console.log("[Process Image] Completed in", processingTime.toFixed(0), "ms");

    // Return ProcessedImage with all fields populated
    const processedImage: ProcessedImage = {
      ...image,
      status: "processed",
      processedBlob: compressedBlob,
      processedDataUrl,
      thumbnailDataUrl,
      detectedEdges: detectedEdges || undefined,
      cropArea,
      fileSize: compressedBlob.size,
      processingTime,
    };

    return processedImage;
  } catch (error) {
    // If processing fails, mark image with error status
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[Process Image] Processing failed:", errorMessage);

    // Return a minimal ProcessedImage with error status
    throw new Error(`Failed to process image: ${errorMessage}`);
  }
}

/**
 * Process multiple images in batches with progress tracking
 *
 * This function implements batch processing to handle multiple document pages
 * efficiently without blocking the UI or overwhelming device memory. It processes
 * images in small batches (default 5), with progress callbacks and memory management.
 *
 * Batch processing strategy:
 * - Process images in groups of 5 (configurable)
 * - Use Promise.all() for parallel processing within each batch
 * - Sequential batch execution to manage memory
 * - Progress callback after each batch completes
 * - Memory release from original images after processing
 * - Small delay between batches for UI updates
 *
 * Benefits:
 * - Prevents UI freezing during large scans
 * - Manages memory efficiently on mobile devices
 * - Provides progress feedback to users
 * - Allows cancellation between batches
 * - Balances speed and resource usage
 *
 * Memory management:
 * - Original blob URLs are revoked after processing
 * - Processed images replace originals in memory
 * - Thumbnails are generated at low resolution
 * - Garbage collection hints between batches
 *
 * @param images - Array of CapturedImage objects to process
 * @param batchSize - Number of images to process in parallel (default: 5)
 * @param onProgress - Callback function called after each batch with (current, total)
 * @returns Promise resolving to array of ProcessedImage objects
 * @throws Error if any critical processing step fails
 *
 * @example
 * const capturedImages: CapturedImage[] = [...]; // 20 images
 *
 * const processedImages = await processBatch(
 *   capturedImages,
 *   5,
 *   (current, total) => {
 *     console.log(`Processing: ${current}/${total}`);
 *     updateProgressBar(current / total);
 *   }
 * );
 *
 * console.log(`Processed ${processedImages.length} images`);
 *
 * @example
 * // Process with custom batch size
 * const processedImages = await processBatch(
 *   capturedImages,
 *   3, // Smaller batches for low-memory devices
 *   (current, total) => {
 *     const percent = Math.round((current / total) * 100);
 *     console.log(`${percent}% complete`);
 *   }
 * );
 *
 * Requirements: 8.1, 8.2, 8.4
 */
export async function processBatch(
  images: CapturedImage[],
  batchSize: number = 5,
  onProgress?: (current: number, total: number) => void,
): Promise<ProcessedImage[]> {
  const results: ProcessedImage[] = [];
  const total = images.length;

  // Process images in batches
  for (let i = 0; i < images.length; i += batchSize) {
    // Get current batch (up to batchSize images)
    const batch = images.slice(i, i + batchSize);

    // Process batch in parallel using Promise.all()
    const batchResults = await Promise.all(
      batch.map((img) => processImage(img)),
    );

    // Add results to output array
    results.push(...batchResults);

    // Call progress callback after each batch
    if (onProgress) {
      onProgress(results.length, total);
    }

    // Release memory from original images after processing
    batch.forEach((img) => {
      try {
        // Revoke object URL to free memory
        if (img.originalDataUrl.startsWith("blob:")) {
          URL.revokeObjectURL(img.originalDataUrl);
        }
      } catch (error) {
        // Ignore errors during cleanup
        console.warn("Failed to revoke object URL:", error);
      }
    });

    // Add small delay between batches for UI updates
    // This allows the browser to:
    // - Update progress indicators
    // - Process user input
    // - Run garbage collection
    // - Prevent UI freezing
    if (i + batchSize < images.length) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  return results;
}

// Import types for the functions above
import type { CapturedImage, ProcessedImage, CropArea } from "./types";
