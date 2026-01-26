// Cache invalidation and broadcast utilities

export type CacheKey = 'hardware' | 'connectivity' | 'licensing' | 'factors' | 'scales' | 'all';

/**
 * Invalidate cache on the client side by broadcasting an event
 * This uses the BroadcastChannel API for same-origin communication
 */
export function broadcastCacheInvalidation(cacheKey: CacheKey): void {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      const channel = new BroadcastChannel('config-updates');
      channel.postMessage({
        type: 'cache-invalidation',
        cacheKey,
        timestamp: Date.now(),
      });
      channel.close();
    } catch (error) {
      console.error('Error broadcasting cache invalidation:', error);
    }
  }
}

/**
 * Listen for cache invalidation broadcasts
 * Returns a cleanup function to stop listening
 */
export function listenForCacheInvalidation(
  callback: (cacheKey: CacheKey) => void
): () => void {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
    return () => {}; // No-op cleanup function
  }

  try {
    const channel = new BroadcastChannel('config-updates');
    
    const handler = (event: MessageEvent) => {
      if (event.data.type === 'cache-invalidation') {
        callback(event.data.cacheKey);
      }
    };

    channel.addEventListener('message', handler);

    // Return cleanup function
    return () => {
      channel.removeEventListener('message', handler);
      channel.close();
    };
  } catch (error) {
    console.error('Error setting up cache invalidation listener:', error);
    return () => {}; // No-op cleanup function
  }
}

/**
 * Server-side cache invalidation helper
 * This can be extended to use Redis or other caching mechanisms
 */
export async function invalidateServerCache(cacheKey: CacheKey): Promise<void> {
  // For now, this is a placeholder for future Redis integration
  // In the current implementation, we rely on the Zustand store's TTL
  console.log(`Server cache invalidated for: ${cacheKey}`);
  
  // If using Redis in the future:
  // await redis.del(`config:${cacheKey}`);
}

/**
 * Trigger cache invalidation on both server and client
 */
export async function invalidateCache(cacheKey: CacheKey): Promise<void> {
  // Invalidate server-side cache
  await invalidateServerCache(cacheKey);
  
  // Broadcast to clients (if in browser context)
  if (typeof window !== 'undefined') {
    broadcastCacheInvalidation(cacheKey);
  }
}

/**
 * Hook to set up cache invalidation listener in React components
 */
export function useCacheInvalidationListener(
  onInvalidate: (cacheKey: CacheKey) => void
): void {
  if (typeof window === 'undefined') return;

  // Set up listener on mount
  const cleanup = listenForCacheInvalidation(onInvalidate);

  // Clean up on unmount
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', cleanup);
  }
}

/**
 * Client-side API to trigger cache refresh
 */
export async function triggerCacheRefresh(cacheKey: CacheKey): Promise<void> {
  try {
    const response = await fetch('/api/config/invalidate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cacheKey }),
    });

    if (!response.ok) {
      throw new Error('Failed to invalidate cache');
    }

    // Broadcast to other tabs/windows
    broadcastCacheInvalidation(cacheKey);
  } catch (error) {
    console.error('Error triggering cache refresh:', error);
    throw error;
  }
}
