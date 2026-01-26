/**
 * Performance Tests
 * 
 * Tests memory usage and response times for key operations
 * Target: <512MB RAM per container under normal load
 * 
 * Requirements: 14.4
 * 
 * NOTE: These tests require a running PostgreSQL database.
 * Set DATABASE_URL environment variable to run these tests.
 * 
 * To run manually:
 * 1. Ensure PostgreSQL is running
 * 2. Set DATABASE_URL in .env.test
 * 3. Run: npm test -- performance.test.ts
 */

import { pool, query, healthCheck } from '@/lib/db';

// Skip tests if database is not available
const isDatabaseAvailable = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgresql');

describe.skip('Performance Tests', () => {
  describe('Memory Usage', () => {
    it('should track memory usage during database operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform multiple database operations
      const operations = [];
      for (let i = 0; i < 100; i++) {
        operations.push(
          query('SELECT 1 as test')
        );
      }
      
      await Promise.all(operations);
      
      const finalMemory = process.memoryUsage();
      const memoryIncreaseMB = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
      
      // Log memory usage for monitoring
      console.log('Memory increase after 100 queries:', memoryIncreaseMB.toFixed(2), 'MB');
      console.log('Total heap used:', (finalMemory.heapUsed / 1024 / 1024).toFixed(2), 'MB');
      console.log('Heap total:', (finalMemory.heapTotal / 1024 / 1024).toFixed(2), 'MB');
      console.log('RSS:', (finalMemory.rss / 1024 / 1024).toFixed(2), 'MB');
      
      // Memory increase should be reasonable (< 50MB for 100 queries)
      expect(memoryIncreaseMB).toBeLessThan(50);
      
      // Total memory should stay under 512MB target
      expect(finalMemory.rss / 1024 / 1024).toBeLessThan(512);
    });

    it('should not leak memory with repeated operations', async () => {
      const measurements = [];
      
      // Run 5 batches of operations
      for (let batch = 0; batch < 5; batch++) {
        const beforeBatch = process.memoryUsage();
        
        // Perform operations
        const operations = [];
        for (let i = 0; i < 50; i++) {
          operations.push(query('SELECT $1 as value', [i]));
        }
        await Promise.all(operations);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        const afterBatch = process.memoryUsage();
        measurements.push({
          batch,
          heapUsed: afterBatch.heapUsed / 1024 / 1024,
          rss: afterBatch.rss / 1024 / 1024
        });
      }
      
      // Log measurements
      console.log('Memory measurements across batches:', measurements);
      
      // Memory should not grow significantly across batches (indicating no leak)
      const firstBatchMemory = measurements[0].heapUsed;
      const lastBatchMemory = measurements[4].heapUsed;
      const memoryGrowth = lastBatchMemory - firstBatchMemory;
      
      console.log('Memory growth from first to last batch:', memoryGrowth.toFixed(2), 'MB');
      
      // Memory growth should be minimal (< 20MB)
      expect(memoryGrowth).toBeLessThan(20);
    });
  });

  describe('Response Times', () => {
    it('should complete health check quickly', async () => {
      const start = Date.now();
      const result = await healthCheck();
      const duration = Date.now() - start;
      
      console.log('Health check duration:', duration, 'ms');
      
      expect(result).toBe(true);
      expect(duration).toBeLessThan(100); // Should complete in < 100ms
    });

    it('should handle concurrent queries efficiently', async () => {
      const start = Date.now();
      
      // Run 50 concurrent queries
      const queries = [];
      for (let i = 0; i < 50; i++) {
        queries.push(
          query('SELECT $1 as id, $2 as name', [i, `Test ${i}`])
        );
      }
      
      const results = await Promise.all(queries);
      const duration = Date.now() - start;
      
      console.log('50 concurrent queries duration:', duration, 'ms');
      console.log('Average per query:', (duration / 50).toFixed(2), 'ms');
      
      expect(results).toHaveLength(50);
      expect(duration).toBeLessThan(1000); // Should complete in < 1 second
    });

    it('should handle sequential queries efficiently', async () => {
      const start = Date.now();
      
      // Run 50 sequential queries
      for (let i = 0; i < 50; i++) {
        await query('SELECT $1 as id', [i]);
      }
      
      const duration = Date.now() - start;
      
      console.log('50 sequential queries duration:', duration, 'ms');
      console.log('Average per query:', (duration / 50).toFixed(2), 'ms');
      
      expect(duration).toBeLessThan(2000); // Should complete in < 2 seconds
    });

    it('should handle complex queries efficiently', async () => {
      // Create a test table with some data
      await query(`
        CREATE TEMP TABLE IF NOT EXISTS perf_test (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255),
          value INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Insert test data
      for (let i = 0; i < 100; i++) {
        await query(
          'INSERT INTO perf_test (name, value) VALUES ($1, $2)',
          [`Test ${i}`, i]
        );
      }
      
      // Test complex query performance
      const start = Date.now();
      const result = await query(`
        SELECT 
          name,
          value,
          COUNT(*) OVER() as total_count,
          AVG(value) OVER() as avg_value
        FROM perf_test
        WHERE value > 10
        ORDER BY value DESC
        LIMIT 20
      `);
      const duration = Date.now() - start;
      
      console.log('Complex query duration:', duration, 'ms');
      console.log('Rows returned:', result.rows.length);
      
      expect(result.rows.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(100); // Should complete in < 100ms
      
      // Cleanup
      await query('DROP TABLE IF EXISTS perf_test');
    });
  });

  describe('Connection Pool Performance', () => {
    it('should handle connection pool efficiently', async () => {
      const start = Date.now();
      
      // Request more connections than pool max (10)
      const operations = [];
      for (let i = 0; i < 20; i++) {
        operations.push(
          query('SELECT pg_sleep(0.1), $1 as id', [i])
        );
      }
      
      await Promise.all(operations);
      const duration = Date.now() - start;
      
      console.log('20 concurrent operations (pool max 10) duration:', duration, 'ms');
      
      // Should queue and handle efficiently
      // With 0.1s sleep and max 10 connections, should take ~200ms (2 batches)
      expect(duration).toBeLessThan(500);
    });

    it('should reuse connections efficiently', async () => {
      const iterations = 100;
      const start = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        await query('SELECT 1');
      }
      
      const duration = Date.now() - start;
      const avgPerQuery = duration / iterations;
      
      console.log(`${iterations} queries with connection reuse:`, duration, 'ms');
      console.log('Average per query:', avgPerQuery.toFixed(2), 'ms');
      
      // Connection reuse should be fast (< 10ms per query on average)
      expect(avgPerQuery).toBeLessThan(10);
    });
  });

  describe('Resource Cleanup', () => {
    it('should clean up resources properly', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform operations that create temporary resources
      const operations = [];
      for (let i = 0; i < 50; i++) {
        operations.push(
          query('SELECT $1::text as data', ['x'.repeat(1000)])
        );
      }
      
      await Promise.all(operations);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
      
      console.log('Memory increase after cleanup:', memoryIncrease.toFixed(2), 'MB');
      
      // Memory increase should be minimal after cleanup
      expect(memoryIncrease).toBeLessThan(10);
    });
  });
});
