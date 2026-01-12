/**
 * Batch Operations Utility
 * 
 * Provides utilities for batching database operations to improve performance
 * and avoid hitting database limits.
 */

import type { Business } from './types';

/**
 * Batch insert businesses into PostgreSQL
 * Splits large arrays into chunks of 100 to avoid hitting database limits
 */
export async function batchInsertBusinesses(
  postgresClient: any,
  sessionId: string,
  businesses: Business[]
): Promise<void> {
  const BATCH_SIZE = 100;
  const batches: Business[][] = [];

  // Split businesses into batches
  for (let i = 0; i < businesses.length; i += BATCH_SIZE) {
    batches.push(businesses.slice(i, i + BATCH_SIZE));
  }

  // Insert each batch sequentially
  for (const batch of batches) {
    const businessRecords = batch.map((business) => ({
      session_id: sessionId,
      maps_address: business.maps_address,
      name: business.name,
      phone: business.phone,
      provider: business.provider,
      address: business.address,
      type_of_business: business.type_of_business,
      town: business.town,
      notes: business.notes,
    }));

    const { error } = await postgresClient
      .from('scraped_businesses')
      .insert(businessRecords);

    if (error) {
      throw new Error(`Failed to insert batch: ${error.message}`);
    }
  }
}

/**
 * Batch update businesses in PostgreSQL
 * Useful for updating provider information after lookup
 */
export async function batchUpdateBusinesses(
  postgresClient: any,
  updates: Array<{ id: string; provider: string }>
): Promise<void> {
  const BATCH_SIZE = 100;
  const batches: Array<{ id: string; provider: string }>[] = [];

  // Split updates into batches
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    batches.push(updates.slice(i, i + BATCH_SIZE));
  }

  // Update each batch sequentially
  for (const batch of batches) {
    // Use Promise.all for parallel updates within a batch
    await Promise.all(
      batch.map((update) =>
        postgresClient
          .from('scraped_businesses')
          .update({ provider: update.provider })
          .eq('id', update.id)
      )
    );
  }
}

/**
 * Batch delete businesses by session ID
 * Used when deleting a session
 */
export async function batchDeleteBusinesses(
  postgresClient: any,
  sessionId: string
): Promise<void> {
  // PostgreSQL handles this automatically with CASCADE delete
  // But we can also do it explicitly if needed
  const { error } = await postgresClient
    .from('scraped_businesses')
    .delete()
    .eq('session_id', sessionId);

  if (error) {
    throw new Error(`Failed to delete businesses: ${error.message}`);
  }
}

/**
 * Generic batch operation utility
 * Executes a function on batches of items
 */
export async function executeBatchOperation<T>(
  items: T[],
  batchSize: number,
  operation: (batch: T[]) => Promise<void>
): Promise<void> {
  const batches: T[][] = [];

  // Split items into batches
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  // Execute operation on each batch
  for (const batch of batches) {
    await operation(batch);
  }
}
