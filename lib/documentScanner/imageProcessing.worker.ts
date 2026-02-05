/**
 * Web Worker for Image Processing
 * 
 * Phase 3: Advanced Optimizations
 * 
 * This worker handles heavy image processing in a separate thread,
 * keeping the main thread responsive and enabling parallel processing
 * of multiple images.
 */

// Import processing functions
import { processImage } from './imageProcessing';
import type { CapturedImage, ProcessedImage } from './types';

// Listen for messages from main thread
self.onmessage = async (e: MessageEvent) => {
  const { type, data } = e.data;

  try {
    switch (type) {
      case 'PROCESS_IMAGE':
        // Process a single image
        const image: CapturedImage = data.image;
        const processed = await processImage(image);
        
        self.postMessage({
          type: 'PROCESS_COMPLETE',
          data: { processed, imageId: image.id }
        });
        break;

      case 'PROCESS_BATCH':
        // Process multiple images in parallel
        const images: CapturedImage[] = data.images;
        const batchSize: number = data.batchSize || 3;
        
        const results: ProcessedImage[] = [];
        
        // Process in batches
        for (let i = 0; i < images.length; i += batchSize) {
          const batch = images.slice(i, i + batchSize);
          
          // Process batch in parallel
          const batchResults = await Promise.all(
            batch.map(img => processImage(img))
          );
          
          results.push(...batchResults);
          
          // Report progress
          self.postMessage({
            type: 'PROGRESS',
            data: {
              current: results.length,
              total: images.length
            }
          });
        }
        
        self.postMessage({
          type: 'BATCH_COMPLETE',
          data: { results }
        });
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      data: {
        error: error instanceof Error ? error.message : 'Unknown error',
        imageId: data.image?.id
      }
    });
  }
};

// Export empty object for TypeScript
export {};
