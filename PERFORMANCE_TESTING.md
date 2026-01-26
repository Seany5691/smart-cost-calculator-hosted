# Performance Testing Guide

This document describes how to run performance tests for the Smart Cost Calculator application.

## Overview

Performance tests validate that the application meets the resource optimization requirements:
- Memory usage stays under 512MB per container under normal load
- Database queries complete within acceptable timeframes
- Connection pooling works efficiently
- No memory leaks occur during extended operation

## Prerequisites

1. **PostgreSQL Database**: A running PostgreSQL instance
2. **Environment Variables**: Properly configured DATABASE_URL
3. **Node.js**: Version 18 or higher

## Running Performance Tests

### 1. Set Up Test Environment

Create a `.env.test` file with your database connection:

```bash
DATABASE_URL=postgresql://username:password@localhost:5432/test_database
```

### 2. Run Tests

```bash
# Run all performance tests
npm test -- performance.test.ts

# Run with detailed output
npm test -- performance.test.ts --verbose

# Run with open handles detection
npm test -- performance.test.ts --detectOpenHandles
```

### 3. Enable Garbage Collection Monitoring

For more accurate memory leak detection, run tests with garbage collection exposed:

```bash
node --expose-gc node_modules/.bin/jest performance.test.ts
```

## Test Categories

### Memory Usage Tests

**Test: Track memory usage during database operations**
- Performs 100 concurrent database queries
- Measures memory increase
- Validates total memory stays under 512MB
- Expected: Memory increase < 50MB

**Test: Memory leak detection**
- Runs 5 batches of 50 queries each
- Measures memory after each batch
- Validates no significant memory growth
- Expected: Memory growth < 20MB across batches

### Response Time Tests

**Test: Health check performance**
- Validates database connectivity
- Expected: < 100ms

**Test: Concurrent query performance**
- Runs 50 concurrent queries
- Expected: < 1 second total

**Test: Sequential query performance**
- Runs 50 sequential queries
- Expected: < 2 seconds total

**Test: Complex query performance**
- Creates temp table with 100 rows
- Runs complex query with window functions
- Expected: < 100ms

### Connection Pool Tests

**Test: Connection pool efficiency**
- Requests 20 concurrent connections (pool max is 10)
- Validates queuing and handling
- Expected: < 500ms with proper queuing

**Test: Connection reuse**
- Runs 100 sequential queries
- Validates connection reuse is efficient
- Expected: < 10ms average per query

### Resource Cleanup Tests

**Test: Resource cleanup**
- Performs operations creating temporary resources
- Forces garbage collection
- Validates memory is properly released
- Expected: Memory increase < 10MB after cleanup

## Interpreting Results

### Memory Usage

Monitor these metrics:
- **Heap Used**: Active memory usage
- **Heap Total**: Total allocated heap
- **RSS (Resident Set Size)**: Total memory used by process

Target: RSS should stay under 512MB under normal load (100 concurrent users)

### Response Times

Acceptable ranges:
- Simple queries: < 10ms
- Complex queries: < 100ms
- Concurrent operations: < 1s for 50 queries
- Health checks: < 100ms

### Memory Leaks

Signs of memory leaks:
- Heap used grows significantly across batches
- Memory not released after garbage collection
- RSS continues to grow over time

## Performance Optimization Tips

### Database Queries

1. **Use Indexes**: Ensure all frequently queried columns have indexes
2. **Limit Results**: Always use LIMIT for list queries
3. **Prepared Statements**: Use parameterized queries for better performance
4. **Connection Pooling**: Reuse connections (already configured: min 2, max 10)

### Memory Management

1. **Avoid Large Objects**: Don't load entire datasets into memory
2. **Stream Large Results**: Use streaming for large query results
3. **Clean Up Resources**: Close connections and clear references
4. **Monitor Heap**: Use `process.memoryUsage()` to track memory

### Code Optimization

1. **Code Splitting**: Use dynamic imports for heavy components (already implemented)
2. **Tree Shaking**: Remove unused code (configured in next.config.js)
3. **Bundle Size**: Monitor and optimize bundle sizes
4. **Caching**: Use caching for frequently accessed data (5-minute TTL configured)

## Continuous Monitoring

### Production Monitoring

Set up monitoring for:
- Memory usage over time
- Response times for key endpoints
- Database connection pool utilization
- Error rates and slow queries

### Tools

Recommended monitoring tools:
- **PM2**: Process manager with monitoring
- **New Relic**: Application performance monitoring
- **DataDog**: Infrastructure and application monitoring
- **PostgreSQL pg_stat_statements**: Query performance analysis

## Troubleshooting

### High Memory Usage

1. Check for memory leaks using the leak detection test
2. Review recent code changes for large object allocations
3. Monitor database query result sizes
4. Check for unclosed connections or file handles

### Slow Queries

1. Use `EXPLAIN ANALYZE` to analyze query plans
2. Check if indexes are being used
3. Review connection pool settings
4. Monitor database server resources

### Connection Pool Issues

1. Verify pool configuration (min: 2, max: 10)
2. Check for connection leaks (unclosed connections)
3. Monitor active connections: `SELECT count(*) FROM pg_stat_activity`
4. Review timeout settings (idle: 30s, connection: 5s)

## Benchmarking

### Load Testing

For comprehensive load testing, use tools like:
- **Apache JMeter**: HTTP load testing
- **Artillery**: Modern load testing toolkit
- **k6**: Developer-centric load testing

Example k6 script:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 100, // 100 virtual users
  duration: '5m', // 5 minutes
};

export default function () {
  const res = http.get('http://localhost:3000/api/health');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  sleep(1);
}
```

### Stress Testing

Test limits by gradually increasing load:
1. Start with 10 concurrent users
2. Increase by 10 every minute
3. Monitor memory and response times
4. Identify breaking point

Target: Handle 100 concurrent users with < 512MB RAM

## Reporting

Document performance test results:
- Date and time of test
- Environment (dev/staging/production)
- Test results (pass/fail)
- Memory usage metrics
- Response time metrics
- Any anomalies or issues

Keep a performance log to track trends over time.
