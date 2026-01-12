/**
 * Server-side Dashboard Statistics Utility
 * 
 * Provides functions to calculate statistics for the dashboard (server-side only)
 */

import { getActivityLogs } from './activityLogger';
import { databaseHelpers } from './databaseAdapter';

// Cache for statistics with 5-minute TTL
const statsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached statistics or calculate fresh ones
 */
function getCachedOrFresh<T>(key: string, calculator: () => Promise<T>): Promise<T> {
  const cached = statsCache.get(key);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return Promise.resolve(cached.data);
  }
  
  return calculator().then(data => {
    statsCache.set(key, { data, timestamp: now });
    return data;
  });
}

/**
 * Calculate total calculations (deal saves + loads) from activity log (async version with PostgreSQL)
 * For admin, counts all users' calculations. For other users, counts only their calculations.
 * 
 * @param userId - Current user ID
 * @param isAdmin - Whether the user is an admin
 * @returns Promise<number> - Total number of calculations
 */
export async function getTotalCalculations(userId: string, isAdmin = false): Promise<number> {
  return getCachedOrFresh(`calculations_${userId}_${isAdmin}`, async () => {
    try {
      // Get activity logs from PostgreSQL
      const logs = isAdmin 
        ? await databaseHelpers.getActivityLogs(undefined, 1000)
        : await databaseHelpers.getActivityLogs(userId, 1000);
      
      // Count deal_saved and deal_loaded activities
      const calculationLogs = logs.filter((log: any) => 
        log.activity_type === 'deal_saved' || 
        log.activity_type === 'deal_loaded'
      );
      
      return calculationLogs.length;
    } catch (error) {
      console.error('Error fetching total calculations:', error);
      return 0;
    }
  });
}

/**
 * Get recent activity logs for the dashboard
 * @param userId - Current user ID
 * @param isAdmin - Whether the user is an admin
 * @param limit - Maximum number of logs to return
 * @returns Promise<Array> - Recent activity logs
 */
export async function getRecentActivity(userId: string, isAdmin = false, limit = 10): Promise<any[]> {
  return getCachedOrFresh(`activity_${userId}_${isAdmin}_${limit}`, async () => {
    try {
      // Get activity logs from PostgreSQL
      const logs = isAdmin 
        ? await databaseHelpers.getActivityLogs(undefined, limit)
        : await databaseHelpers.getActivityLogs(userId, limit);
      
      return logs.map((log: any) => ({
        id: log.id,
        type: log.activity_type,
        message: getActivityMessage(log),
        timestamp: log.timestamp,
        user: log.username,
        dealId: log.deal_id,
        dealName: log.deal_name
      }));
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
  });
}

/**
 * Get user-friendly message for activity log
 */
function getActivityMessage(log: any): string {
  switch (log.activity_type) {
    case 'deal_saved':
      return `Saved deal: ${log.deal_name || 'Unknown'}`;
    case 'deal_loaded':
      return `Loaded deal: ${log.deal_name || 'Unknown'}`;
    case 'deal_updated':
      return `Updated deal: ${log.deal_name || 'Unknown'}`;
    case 'deal_deleted':
      return `Deleted deal: ${log.deal_name || 'Unknown'}`;
    default:
      return log.activity_type || 'Unknown activity';
  }
}

/**
 * Clear statistics cache (useful for testing or when data changes)
 */
export function clearStatsCache(): void {
  statsCache.clear();
}

/**
 * Get dashboard statistics for a user
 * @param userId - Current user ID
 * @param isAdmin - Whether the user is an admin
 * @returns Promise<Object> - Dashboard statistics
 */
export async function getDashboardStats(userId: string, isAdmin = false): Promise<{
  totalCalculations: number;
  recentActivity: any[];
  lastUpdated: string;
}> {
  const [totalCalculations, recentActivity] = await Promise.all([
    getTotalCalculations(userId, isAdmin),
    getRecentActivity(userId, isAdmin)
  ]);

  return {
    totalCalculations,
    recentActivity,
    lastUpdated: new Date().toISOString()
  };
}
