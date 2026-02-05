/**
 * Web Worker Manager for Image Processing
 * 
 * Phase 3: Advanced Optimizations
 * 
 * Manages Web Workers for parallel image processing.
 * Automatically detects device capabilities and adjusts worker count.
 */

import type { CapturedImage, ProcessedImage } from './types';

class WorkerManager {
  private workers: Worker[] = [];
  private workerCount: number = 0;
  private taskQueue: Array<{
    image: CapturedImage;
    resolve: (result: ProcessedImage) => void;
    reject: (error: Error) => void;
  }> = [];
  private busyWorkers: Set<number> = new Set();

  constructor() {
    this.detectOptimalWorkerCount();
  }

  /**
   * Detect optimal number of workers based on device capabilities
   * Phase 3: Adaptive quality settings
   */
  private detectOptimalWorkerCount() {
    // Check if Web Workers are supported
    if (typeof Worker === 'undefined') {
      console.warn('[Worker Manager] Web Workers not supported');
      this.workerCount = 0;
      return;
    }

    // Get number of CPU cores (if available)
    const cores = navigator.hardwareConcurrency || 4;

    // Detect device tier based on memory and cores
    const memory = (performance as any).memory?.jsHeapSizeLimit || 0;
    const memoryGB = memory / (1024 * 1024 * 1024);

    let workerCount: number;

    if (cores >= 8 && memoryGB >= 4) {
      // High-end device: Use 4 workers
      workerCount = 4;
      console.log('[Worker Manager] High-end device detected');
    } else if (cores >= 4 && memoryGB >= 2) {
      // Mid-range device: Use 2 workers
      workerCount = 2;
      console.log('[Worker Manager] Mid-range device detected');
    } else {
      // Low-end device: Use 1 worker
      workerCount = 1;
      console.log('[Worker Manager] Low-end device detected');
    }

    this.workerCount = workerCount;
    console.log(`[Worker Manager] Using ${workerCount} workers (${cores} cores, ${memoryGB.toFixed(1)}GB memory)`);
  }

  /**
   * Initialize workers
   */
  private initializeWorkers() {
    if (this.workers.length > 0) return; // Already initialized

    for (let i = 0; i < this.workerCount; i++) {
      try {
        const worker = new Worker(
          new URL('./imageProcessing.worker.ts', import.meta.url),
          { type: 'module' }
        );

        worker.onmessage = (e) => this.handleWorkerMessage(i, e);
        worker.onerror = (e) => this.handleWorkerError(i, e);

        this.workers.push(worker);
      } catch (error) {
        console.error(`[Worker Manager] Failed to create worker ${i}:`, error);
      }
    }
  }

  /**
   * Handle message from worker
   */
  private handleWorkerMessage(workerId: number, e: MessageEvent) {
    const { type, data } = e.data;

    switch (type) {
      case 'PROCESS_COMPLETE':
        // Mark worker as available
        this.busyWorkers.delete(workerId);
        
        // Process next task in queue
        this.processNextTask();
        break;

      case 'ERROR':
        console.error(`[Worker ${workerId}] Error:`, data.error);
        this.busyWorkers.delete(workerId);
        this.processNextTask();
        break;
    }
  }

  /**
   * Handle worker error
   */
  private handleWorkerError(workerId: number, error: ErrorEvent) {
    console.error(`[Worker ${workerId}] Error:`, error);
    this.busyWorkers.delete(workerId);
    this.processNextTask();
  }

  /**
   * Process next task in queue
   */
  private processNextTask() {
    if (this.taskQueue.length === 0) return;

    // Find available worker
    const availableWorkerId = this.workers.findIndex(
      (_, id) => !this.busyWorkers.has(id)
    );

    if (availableWorkerId === -1) return; // No workers available

    // Get next task
    const task = this.taskQueue.shift();
    if (!task) return;

    // Mark worker as busy
    this.busyWorkers.add(availableWorkerId);

    // Send task to worker
    this.workers[availableWorkerId].postMessage({
      type: 'PROCESS_IMAGE',
      data: { image: task.image }
    });
  }

  /**
   * Process a single image using worker pool
   */
  async processImage(image: CapturedImage): Promise<ProcessedImage> {
    // Initialize workers if needed
    if (this.workers.length === 0) {
      this.initializeWorkers();
    }

    // If no workers available, fall back to main thread
    if (this.workers.length === 0) {
      const { processImage } = await import('./imageProcessing');
      return processImage(image);
    }

    return new Promise((resolve, reject) => {
      // Add to queue
      this.taskQueue.push({ image, resolve, reject });

      // Try to process immediately
      this.processNextTask();
    });
  }

  /**
   * Process multiple images in parallel
   */
  async processBatch(
    images: CapturedImage[],
    onProgress?: (current: number, total: number) => void
  ): Promise<ProcessedImage[]> {
    // Initialize workers if needed
    if (this.workers.length === 0) {
      this.initializeWorkers();
    }

    // If no workers available, fall back to main thread
    if (this.workers.length === 0) {
      const { processBatch } = await import('./imageProcessing');
      return processBatch(images, 3, onProgress);
    }

    const results: ProcessedImage[] = [];
    let completed = 0;

    // Process all images using worker pool
    const promises = images.map(async (image) => {
      const result = await this.processImage(image);
      completed++;
      
      if (onProgress) {
        onProgress(completed, images.length);
      }
      
      return result;
    });

    return Promise.all(promises);
  }

  /**
   * Terminate all workers
   */
  terminate() {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.busyWorkers.clear();
    this.taskQueue = [];
  }
}

// Singleton instance
let workerManager: WorkerManager | null = null;

export function getWorkerManager(): WorkerManager {
  if (!workerManager) {
    workerManager = new WorkerManager();
  }
  return workerManager;
}

export function terminateWorkers() {
  if (workerManager) {
    workerManager.terminate();
    workerManager = null;
  }
}
