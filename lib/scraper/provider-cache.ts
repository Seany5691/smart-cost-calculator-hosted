/**
 * Provider Lookup Cache
 * Caches provider lookup results to avoid redundant API calls
 * TTL: 30 days
 */

import { getPool } from '@/lib/db';

export class ProviderCache {
  /**
   * Get provider from cache
   * @param phoneNumber - Phone number to lookup
   * @returns Provider name or null if not in cache
   */
  static async get(phoneNumber: string): Promise<string | null> {
    try {
      const pool = getPool();
      const result = await pool.query(
        `SELECT provider, last_checked 
         FROM provider_lookup_cache 
         WHERE phone_number = $1 
         AND last_checked > NOW() - INTERVAL '30 days'`,
        [phoneNumber]
      );

      if (result.rows.length > 0) {
        console.log(`[ProviderCache] Cache HIT for ${phoneNumber}: ${result.rows[0].provider}`);
        return result.rows[0].provider;
      }

      console.log(`[ProviderCache] Cache MISS for ${phoneNumber}`);
      return null;
    } catch (error) {
      console.error('[ProviderCache] Error reading from cache:', error);
      return null; // Fail gracefully
    }
  }

  /**
   * Get multiple providers from cache
   * @param phoneNumbers - Array of phone numbers
   * @returns Map of phone number to provider (only cached entries)
   */
  static async getMany(phoneNumbers: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    if (phoneNumbers.length === 0) {
      return results;
    }

    try {
      const pool = getPool();
      const result = await pool.query(
        `SELECT phone_number, provider 
         FROM provider_lookup_cache 
         WHERE phone_number = ANY($1) 
         AND last_checked > NOW() - INTERVAL '30 days'`,
        [phoneNumbers]
      );

      for (const row of result.rows) {
        results.set(row.phone_number, row.provider);
      }

      console.log(`[ProviderCache] Batch lookup: ${results.size}/${phoneNumbers.length} found in cache`);
      return results;
    } catch (error) {
      console.error('[ProviderCache] Error reading batch from cache:', error);
      return results; // Return empty map on error
    }
  }

  /**
   * Set provider in cache
   * @param phoneNumber - Phone number
   * @param provider - Provider name
   */
  static async set(phoneNumber: string, provider: string): Promise<void> {
    try {
      const pool = getPool();
      await pool.query(
        `INSERT INTO provider_lookup_cache (phone_number, provider, last_checked)
         VALUES ($1, $2, NOW())
         ON CONFLICT (phone_number) 
         DO UPDATE SET provider = $2, last_checked = NOW()`,
        [phoneNumber, provider]
      );

      console.log(`[ProviderCache] Cached ${phoneNumber}: ${provider}`);
    } catch (error) {
      console.error('[ProviderCache] Error writing to cache:', error);
      // Fail gracefully - caching is optional
    }
  }

  /**
   * Set multiple providers in cache (batch operation)
   * @param providerMap - Map of phone number to provider
   */
  static async setMany(providerMap: Map<string, string>): Promise<void> {
    if (providerMap.size === 0) {
      return;
    }

    try {
      const pool = getPool();
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Batch insert with ON CONFLICT
        const values: any[] = [];
        const placeholders: string[] = [];
        let paramIndex = 1;

        for (const [phone, provider] of providerMap.entries()) {
          placeholders.push(`($${paramIndex}, $${paramIndex + 1}, NOW())`);
          values.push(phone, provider);
          paramIndex += 2;
        }

        const query = `
          INSERT INTO provider_lookup_cache (phone_number, provider, last_checked)
          VALUES ${placeholders.join(', ')}
          ON CONFLICT (phone_number) 
          DO UPDATE SET provider = EXCLUDED.provider, last_checked = NOW()
        `;

        await client.query(query, values);
        await client.query('COMMIT');

        console.log(`[ProviderCache] Batch cached ${providerMap.size} providers`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('[ProviderCache] Error batch writing to cache:', error);
      // Fail gracefully - caching is optional
    }
  }

  /**
   * Clean up old cache entries (older than 30 days)
   * @returns Number of entries deleted
   */
  static async cleanup(): Promise<number> {
    try {
      const pool = getPool();
      const result = await pool.query('SELECT cleanup_old_provider_cache()');
      const deletedCount = result.rows[0].cleanup_old_provider_cache;
      
      console.log(`[ProviderCache] Cleanup: Removed ${deletedCount} old entries`);
      return deletedCount;
    } catch (error) {
      console.error('[ProviderCache] Error during cleanup:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   * @returns Cache stats (total entries, oldest entry, newest entry)
   */
  static async getStats(): Promise<{
    totalEntries: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  }> {
    try {
      const pool = getPool();
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total,
          MIN(last_checked) as oldest,
          MAX(last_checked) as newest
        FROM provider_lookup_cache
      `);

      return {
        totalEntries: parseInt(result.rows[0].total),
        oldestEntry: result.rows[0].oldest,
        newestEntry: result.rows[0].newest,
      };
    } catch (error) {
      console.error('[ProviderCache] Error getting stats:', error);
      return {
        totalEntries: 0,
        oldestEntry: null,
        newestEntry: null,
      };
    }
  }
}
