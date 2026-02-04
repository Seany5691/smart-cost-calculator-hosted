/**
 * Memory Management Utilities for Document Scanner
 *
 * Provides memory monitoring and management functions to prevent
 * device crashes during large scanning sessions.
 *
 * Requirements:
 * - 9.1: Display warning when memory usage exceeds 90%
 * - 9.2: Prevent capturing additional pages when memory is low
 * - 15.6: Suggest processing current pages when memory is critically low
 */

/**
 * Check if sufficient memory is available for capturing more pages
 *
 * Uses the performance.memory API (Chrome/Edge) to monitor heap usage.
 * Returns false if memory usage exceeds 90% of the heap limit.
 *
 * Note: performance.memory is only available in Chrome/Edge browsers.
 * For other browsers, this function will always return true (no memory check).
 *
 * @returns {boolean} True if memory is available, false if memory is low
 *
 * Requirements: 9.1, 9.2
 */
export function checkMemoryAvailable(): boolean {
  // Check if performance.memory API is available (Chrome/Edge only)
  const performance = window.performance as any;

  if (!performance || !performance.memory) {
    // API not available (Firefox, Safari, etc.)
    // Return true to allow capture (no memory check possible)
    return true;
  }

  try {
    const { usedJSHeapSize, jsHeapSizeLimit } = performance.memory;

    // Calculate memory usage percentage
    const usagePercentage = (usedJSHeapSize / jsHeapSizeLimit) * 100;

    // Log memory stats for debugging
    console.log("[Memory Manager] Memory usage:", {
      used: `${(usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
      limit: `${(jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`,
      percentage: `${usagePercentage.toFixed(2)}%`,
    });

    // Return false if usage exceeds 90%
    return usagePercentage < 90;
  } catch (error) {
    console.error("[Memory Manager] Error checking memory:", error);
    // On error, return true to allow capture (fail open)
    return true;
  }
}

/**
 * Get current memory usage statistics
 *
 * Returns detailed memory usage information for monitoring and debugging.
 * Returns null if the performance.memory API is not available.
 *
 * @returns {object | null} Memory statistics or null if unavailable
 */
export function getMemoryStats(): {
  usedMB: number;
  limitMB: number;
  percentage: number;
} | null {
  const performance = window.performance as any;

  if (!performance || !performance.memory) {
    return null;
  }

  try {
    const { usedJSHeapSize, jsHeapSizeLimit } = performance.memory;

    return {
      usedMB: usedJSHeapSize / 1024 / 1024,
      limitMB: jsHeapSizeLimit / 1024 / 1024,
      percentage: (usedJSHeapSize / jsHeapSizeLimit) * 100,
    };
  } catch (error) {
    console.error("[Memory Manager] Error getting memory stats:", error);
    return null;
  }
}

/**
 * Force garbage collection hint
 *
 * Attempts to hint the browser to run garbage collection.
 * Note: This is only a hint and may not actually trigger GC.
 * The browser decides when to run garbage collection.
 */
export function hintGarbageCollection(): void {
  // Create and immediately discard a large array to hint GC
  // This is a common pattern to encourage garbage collection
  try {
    const temp = new Array(1000000);
    temp.fill(null);
    // Let it go out of scope
  } catch (error) {
    console.error("[Memory Manager] Error hinting GC:", error);
  }
}
