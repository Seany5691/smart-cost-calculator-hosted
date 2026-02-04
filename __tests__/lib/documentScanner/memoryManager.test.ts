/**
 * Unit tests for Memory Manager
 * 
 * Tests the memory monitoring and management utilities.
 */

import { checkMemoryAvailable, getMemoryStats, hintGarbageCollection } from '@/lib/documentScanner/memoryManager';

// Mock window.performance for tests
const mockPerformance = (memoryConfig?: { usedJSHeapSize: number; jsHeapSizeLimit: number } | null) => {
  if (memoryConfig === null) {
    // No memory API available
    Object.defineProperty(window, 'performance', {
      writable: true,
      configurable: true,
      value: {}
    });
  } else if (memoryConfig) {
    // Memory API available with specific values
    Object.defineProperty(window, 'performance', {
      writable: true,
      configurable: true,
      value: {
        memory: memoryConfig
      }
    });
  }
};

describe('Memory Manager', () => {
  describe('checkMemoryAvailable', () => {
    it('should return true when performance.memory is not available', () => {
      mockPerformance(null);
      
      const result = checkMemoryAvailable();
      
      expect(result).toBe(true);
    });

    it('should return true when memory usage is below 90%', () => {
      mockPerformance({
        usedJSHeapSize: 50 * 1024 * 1024, // 50 MB
        jsHeapSizeLimit: 100 * 1024 * 1024 // 100 MB (50% usage)
      });
      
      const result = checkMemoryAvailable();
      
      expect(result).toBe(true);
    });

    it('should return false when memory usage exceeds 90%', () => {
      mockPerformance({
        usedJSHeapSize: 95 * 1024 * 1024, // 95 MB
        jsHeapSizeLimit: 100 * 1024 * 1024 // 100 MB (95% usage)
      });
      
      const result = checkMemoryAvailable();
      
      expect(result).toBe(false);
    });

    it('should return true on error (fail open)', () => {
      // Mock performance.memory that throws error
      Object.defineProperty(window, 'performance', {
        writable: true,
        configurable: true,
        value: {
          memory: {
            get usedJSHeapSize() {
              throw new Error('Test error');
            },
            jsHeapSizeLimit: 100 * 1024 * 1024
          }
        }
      });
      
      const result = checkMemoryAvailable();
      
      expect(result).toBe(true);
    });
  });

  describe('getMemoryStats', () => {
    it('should return null when performance.memory is not available', () => {
      mockPerformance(null);
      
      const result = getMemoryStats();
      
      expect(result).toBeNull();
    });

    it('should return memory statistics when available', () => {
      mockPerformance({
        usedJSHeapSize: 50 * 1024 * 1024, // 50 MB
        jsHeapSizeLimit: 100 * 1024 * 1024 // 100 MB
      });
      
      const result = getMemoryStats();
      
      expect(result).not.toBeNull();
      expect(result?.usedMB).toBeCloseTo(50, 1);
      expect(result?.limitMB).toBeCloseTo(100, 1);
      expect(result?.percentage).toBeCloseTo(50, 1);
    });

    it('should return null on error', () => {
      // Mock performance.memory that throws error
      Object.defineProperty(window, 'performance', {
        writable: true,
        configurable: true,
        value: {
          memory: {
            get usedJSHeapSize() {
              throw new Error('Test error');
            },
            jsHeapSizeLimit: 100 * 1024 * 1024
          }
        }
      });
      
      const result = getMemoryStats();
      
      expect(result).toBeNull();
    });
  });

  describe('hintGarbageCollection', () => {
    it('should not throw error when called', () => {
      expect(() => hintGarbageCollection()).not.toThrow();
    });
  });
});
