/**
 * Batch Operations Utility - Database batch operations for large datasets
 * 
 * This module provides utilities for batching database operations to avoid
 * hitting database limits when working with large datasets. Operations are
 * batched in groups of 100 records.
 * 
 * Requirements: 30.1, 30.2, 30.3, 30.4, 30.5
 */

import { pool } from '../db';
import type { PoolClient } from 'pg';

/**
 * Business data structure for batch operations
 */
export interface BusinessData {
  session_id: string;
  maps_address?: string;
  name: string;
  phone?: string;
  provider?: string;
  address?: string;
  town?: string;
  type_of_business?: string;
}

/**
 * Batch size for database operations
 */
const BATCH_SIZE = 100;

/**
 * Generic batch operation executor
 * Processes items in batches and executes the provided operation for each batch
 * 
 * @param items - Array of items to process
 * @param batchSize - Size of each batch
 * @param operation - Async function to execute for each batch
 * @returns Promise that resolves when all batches are processed
 */
export async function executeBatchOperation<T>(
  items: T[],
  batchSize: number,
  operation: (batch: T[]) => Promise<void>
): Promise<void> {
  try {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await operation(batch);
    }
  } catch (error) {
    throw new Error(
      `Batch operation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Batch insert businesses into the database
 * Inserts businesses in groups of 100 to avoid database limits
 * 
 * @param client - Database client or pool to use for the operation
 * @param sessionId - Session ID to associate businesses with
 * @param businesses - Array of business data to insert
 * @returns Promise that resolves when all businesses are inserted
 */
export async function batchInsertBusinesses(
  client: PoolClient | typeof pool,
  sessionId: string,
  businesses: Array<{
    maps_address?: string;
    name: string;
    phone?: string;
    provider?: string;
    address?: string;
    town?: string;
    type_of_business?: string;
  }>
): Promise<void> {
  if (businesses.length === 0) {
    return;
  }

  await executeBatchOperation(businesses, BATCH_SIZE, async (batch) => {
    // Build the VALUES clause for batch insert
    const values: any[] = [];
    const placeholders: string[] = [];
    
    batch.forEach((business, index) => {
      const offset = index * 8;
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`
      );
      
      values.push(
        sessionId,
        business.maps_address || null,
        business.name,
        business.phone || null,
        business.provider || null,
        business.address || null,
        business.town || null,
        business.type_of_business || null
      );
    });

    const query = `
      INSERT INTO scraped_businesses (
        session_id, maps_address, name, phone, provider, address, town, type_of_business
      )
      VALUES ${placeholders.join(', ')}
    `;

    await client.query(query, values);
  });
}

/**
 * Batch update businesses in the database
 * Updates businesses in groups of 100 to avoid database limits
 * 
 * @param updates - Array of objects with id and fields to update
 * @returns Promise that resolves when all businesses are updated
 */
export async function batchUpdateBusinesses(
  updates: Array<{ id: string; fields: Partial<BusinessData> }>
): Promise<void> {
  if (updates.length === 0) {
    return;
  }

  await executeBatchOperation(updates, BATCH_SIZE, async (batch) => {
    // Execute updates sequentially within the batch
    for (const update of batch) {
      const fields = update.fields;
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Build SET clause dynamically based on provided fields
      if (fields.maps_address !== undefined) {
        setClauses.push(`maps_address = $${paramIndex++}`);
        values.push(fields.maps_address);
      }
      if (fields.name !== undefined) {
        setClauses.push(`name = $${paramIndex++}`);
        values.push(fields.name);
      }
      if (fields.phone !== undefined) {
        setClauses.push(`phone = $${paramIndex++}`);
        values.push(fields.phone);
      }
      if (fields.provider !== undefined) {
        setClauses.push(`provider = $${paramIndex++}`);
        values.push(fields.provider);
      }
      if (fields.address !== undefined) {
        setClauses.push(`address = $${paramIndex++}`);
        values.push(fields.address);
      }
      if (fields.town !== undefined) {
        setClauses.push(`town = $${paramIndex++}`);
        values.push(fields.town);
      }
      if (fields.type_of_business !== undefined) {
        setClauses.push(`type_of_business = $${paramIndex++}`);
        values.push(fields.type_of_business);
      }

      if (setClauses.length === 0) {
        continue; // Skip if no fields to update
      }

      values.push(update.id);

      const query = `
        UPDATE scraped_businesses
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex}
      `;

      await pool.query(query, values);
    }
  });
}

/**
 * Batch delete businesses by session ID
 * Uses CASCADE delete from the foreign key constraint
 * 
 * @param sessionId - The session ID to delete businesses for
 * @returns Promise that resolves when businesses are deleted
 */
export async function batchDeleteBusinesses(sessionId: string): Promise<void> {
  // Single DELETE with session_id filter
  // The CASCADE delete on the foreign key will handle cleanup
  const query = `
    DELETE FROM scraped_businesses
    WHERE session_id = $1
  `;

  await pool.query(query, [sessionId]);
}

/**
 * Get batch size (for testing)
 * @returns The batch size used for operations
 */
export function getBatchSize(): number {
  return BATCH_SIZE;
}
