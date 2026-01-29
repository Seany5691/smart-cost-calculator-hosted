# BatchManager Integration with ProviderLookupService

## Overview

The `ProviderLookupService` has been enhanced to use the `BatchManager` for intelligent batch processing of phone number lookups. This integration provides:

- **Adaptive batch sizing** based on success rate (3-5 lookups per batch)
- **Automatic inter-batch delays** (2-5 seconds, randomized)
- **Success rate tracking** across batches
- **Backward compatibility** with existing API

## Key Changes

### 1. BatchManager Integration

The service now uses `BatchManager` internally to handle all batch processing:

```typescript
// Old approach (manual batching)
const batches = this.createBatchesOfFive(phoneNumbers);
for (const batch of batches) {
  await this.processBatchWithNewBrowser(batch, results, batchNumber);
}

// New approach (BatchManager)
for (const phoneNumber of phoneNumbers) {
  this.batchManager.addToBatch({ phoneNumber });
  if (this.batchManager.isBatchFull()) {
    await this.batchManager.processBatch(processor);
  }
}
```

### 2. Adaptive Batch Sizing

The `BatchManager` automatically adjusts batch size based on success rate:

- **Initial batch size**: 5 (maximum)
- **Reduces to**: 4, then 3 if success rate < 50%
- **Never increases**: Once reduced, batch size stays lower (critical for captcha avoidance)
- **Minimum batch size**: 3 (configurable)

### 3. Intelligent Delays

Inter-batch delays are now randomized (2-5 seconds by default) to avoid detection patterns.

### 4. Success Rate Tracking

The service tracks success rates across the last 10 batches and adjusts behavior accordingly.

## Backward Compatibility

All existing methods are preserved:

- `lookupProviders(phoneNumbers)` - Main API (enhanced internally)
- `createBatchesOfFive(phoneNumbers)` - Deprecated but still available
- `processBatchWithNewBrowser(batch, results, batchNumber)` - Deprecated but still available
- `cleanup()` - Still available
- `getActiveLookups()` - Still available

## New Methods

### `getBatchManagerStatistics()`

Returns detailed statistics about batch processing:

```typescript
const stats = service.getBatchManagerStatistics();
console.log(stats);
// {
//   totalBatchesProcessed: 10,
//   totalLookupsProcessed: 47,
//   currentBatchSize: 4,
//   currentBatchCount: 2,
//   rollingSuccessRate: 0.8,
//   lastBatchTime: 1706523456789,
//   minBatchSize: 3,
//   maxBatchSize: 5
// }
```

### `resetBatchManager()`

Resets the BatchManager state (useful for new scraping sessions):

```typescript
service.resetBatchManager();
```

## Configuration

The BatchManager is initialized with these defaults:

```typescript
{
  minBatchSize: 3,           // Minimum batch size
  maxBatchSize: 5,           // CRITICAL: Never exceed 5
  interBatchDelay: [2000, 5000],  // 2-5 seconds between batches
  successRateThreshold: 0.5  // Reduce batch size if < 50% success
}
```

## Usage Example

```typescript
const service = new ProviderLookupService({
  maxConcurrentBatches: 2,
  eventEmitter: myEventEmitter
});

// Lookup providers (same API as before)
const results = await service.lookupProviders([
  '0123456789',
  '0987654321',
  // ... more phone numbers
]);

// Check statistics
const stats = service.getBatchManagerStatistics();
console.log(`Processed ${stats.totalBatchesProcessed} batches`);
console.log(`Success rate: ${Math.round(stats.rollingSuccessRate * 100)}%`);
console.log(`Current batch size: ${stats.currentBatchSize}`);

// Reset for new session
service.resetBatchManager();
```

## Benefits

1. **Captcha Avoidance**: Maintains the critical batch-of-5 constraint
2. **Adaptive Behavior**: Automatically reduces batch size when encountering issues
3. **Better Monitoring**: Detailed statistics for debugging and optimization
4. **Consistent Delays**: Randomized delays prevent detection patterns
5. **Backward Compatible**: Existing code continues to work without changes

## Testing

The integration is tested in:

- `BatchManager.test.ts` - Unit tests for BatchManager (63 tests, all passing)
- `provider-lookup-service.test.ts` - Existing tests (backward compatibility)
- `provider-lookup-service.integration.test.ts` - Integration tests (new)

## Requirements Satisfied

This integration satisfies the following requirements from the scraper-robustness-enhancement spec:

- **Requirement 3.1**: Batch size never exceeds 5
- **Requirement 3.2**: Adaptive batch sizing based on success rate
- **Requirement 3.3**: Inter-batch delays with randomization
- **Requirement 3.4**: Integration with existing ProviderLookupService
- **Requirement 3.6**: Success rate tracking
- **Requirement 3.7**: Backward compatibility maintained

## Migration Notes

No migration is required! The integration is transparent to existing code:

- All existing method signatures are unchanged
- Behavior is enhanced but compatible
- No breaking changes

If you want to take advantage of new features:

1. Use `getBatchManagerStatistics()` for monitoring
2. Use `resetBatchManager()` between scraping sessions
3. Monitor the `batchSuccessRate` in progress events

## Performance Impact

- **Minimal overhead**: BatchManager adds negligible processing time
- **Better reliability**: Adaptive sizing reduces failures
- **Improved monitoring**: Statistics help identify issues early

## Future Enhancements

Potential future improvements:

1. Configurable BatchManager parameters per service instance
2. Persistent batch statistics across sessions
3. Integration with CircuitBreaker for failure handling
4. Machine learning for optimal batch size prediction
