/**
 * Dashboard Statistics Utility
 * 
 * Provides functions to calculate statistics for the dashboard
 */

import { getActivityLogs } from './activityLogger';

// Cache for statistics with 5-minute TTL
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Dashboard stats interface
export interface DashboardStats {
  totalDeals: number;
  activeProjects: number;
  calculations: number;
}

// Cache entry for dashboard stats with expiry
interface DashboardStatsCacheEntry {
  data: DashboardStats;
  timestamp: number;
  expiresAt: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const LOCALSTORAGE_TTL = 15 * 60 * 1000; // 15 minutes in milliseconds
const LOCALSTORAGE_KEY = 'dashboard-stats-cache';

const statsCache = new Map<string, CacheEntry<number>>();
let dashboardStatsMemoryCache: DashboardStatsCacheEntry | null = null;

/**
 * Get cached value or fetch new data
 */
const getCachedOrFetch = async <T>(
  cacheKey: string,
  fetchFn: () => Promise<T>
): Promise<T> => {
  const cached = statsCache.get(cacheKey);
  const now = Date.now();

  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.data as T;
  }

  const data = await fetchFn();
  statsCache.set(cacheKey, { data: data as number, timestamp: now });
  return data;
};

/**
 * Get dashboard stats from localStorage cache
 */
const getLocalStorageCache = (): DashboardStatsCacheEntry | null => {
  try {
    const cached = localStorage.getItem(LOCALSTORAGE_KEY);
    if (!cached) return null;

    const entry: DashboardStatsCacheEntry = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid
    if (now < entry.expiresAt) {
      return entry;
    }

    // Cache expired, remove it
    localStorage.removeItem(LOCALSTORAGE_KEY);
    return null;
  } catch (error) {
    console.warn('Failed to read dashboard stats from localStorage:', error);
    return null;
  }
};

/**
 * Save dashboard stats to localStorage cache
 */
const setLocalStorageCache = (data: DashboardStats) => {
  try {
    const now = Date.now();
    const entry: DashboardStatsCacheEntry = {
      data,
      timestamp: now,
      expiresAt: now + LOCALSTORAGE_TTL
    };
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(entry));
  } catch (error) {
    console.warn('Failed to save dashboard stats to localStorage:', error);
  }
};

/**
 * Invalidate cache for a specific key or all keys
 */
export const invalidateStatsCache = (cacheKey?: string) => {
  if (cacheKey) {
    statsCache.delete(cacheKey);
  } else {
    statsCache.clear();
  }
  
  // Also clear dashboard stats caches
  dashboardStatsMemoryCache = null;
  try {
    localStorage.removeItem(LOCALSTORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear localStorage cache:', error);
  }
};

/**
 * Calculate total deals for a user (async version with PostgreSQL)
 * For admin, counts all deals. For other users, counts only their deals.
 * 
 * @param userId - Current user ID
 * @param isAdmin - Whether the user is an admin
 * @returns Promise<Total number of deals>
 */
export const getTotalDealsAsync = async (userId: string, isAdmin: boolean): Promise<number> => {
  const cacheKey = `total-deals-${isAdmin ? 'admin' : userId}`;
  
  return getCachedOrFetch(cacheKey, async () => {
    try {
      // Fall back to localStorage since database is not available
      const dealsData = localStorage.getItem('deals-storage');
      if (!dealsData) return 0;

      const deals = JSON.parse(dealsData);
      
      if (isAdmin) {
        return deals.length;
      } else {
        return deals.filter((deal: any) => deal.userId === userId).length;
      }
    } catch (error) {
      console.warn('Failed to fetch deals from database, falling back to localStorage:', error);
      // Fall back to localStorage
      const dealsData = localStorage.getItem('deals-storage');
      if (!dealsData) return 0;

      const deals = JSON.parse(dealsData);
      
      if (isAdmin) {
        return deals.length;
      } else {
        return deals.filter((deal: any) => deal.userId === userId).length;
      }
    }
  });
};

/**
 * Calculate active projects (deals modified in last 30 days) (async version with PostgreSQL)
 * For admin, counts all active deals. For other users, counts only their active deals.
 * 
 * @param userId - Current user ID
 * @param isAdmin - Whether the user is an admin
 * @returns Promise<Number of active projects>
 */
export const getActiveProjectsAsync = async (userId: string, isAdmin: boolean): Promise<number> => {
  const cacheKey = `active-projects-${isAdmin ? 'admin' : userId}`;
  
  return getCachedOrFetch(cacheKey, async () => {
    try {
      // Fall back to localStorage since database is not available
      const dealsData = localStorage.getItem('deals-storage');
      if (!dealsData) return 0;

      const deals = JSON.parse(dealsData);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let filteredDeals = deals;
      
      if (!isAdmin) {
        filteredDeals = deals.filter((deal: any) => deal.userId === userId);
      }

      return filteredDeals.filter((deal: any) => {
        const updatedAt = new Date(deal.updatedAt);
        return updatedAt >= thirtyDaysAgo;
      }).length;
    } catch (error) {
      console.warn('Failed to fetch deals from database, falling back to localStorage:', error);
      // Fall back to localStorage
      const dealsData = localStorage.getItem('deals-storage');
      if (!dealsData) return 0;

      const deals = JSON.parse(dealsData);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let filteredDeals = deals;
      
      if (!isAdmin) {
        filteredDeals = deals.filter((deal: any) => deal.userId === userId);
      }

      return filteredDeals.filter((deal: any) => {
        const updatedAt = new Date(deal.updatedAt);
        return updatedAt >= thirtyDaysAgo;
      }).length;
    }
  });
};

/**
 * Calculate total calculations (deal saves + loads) from activity log (async version with PostgreSQL)
 * For admin, counts all users' calculations. For other users, counts only their calculations.
 * 
 * @param userId - Current user ID
 * @param isAdmin - Whether the user is an admin
 * @returns Promise<Total number of calculations>
 */
export const getTotalCalculationsAsync = async (userId: string, isAdmin: boolean): Promise<number> => {
  const cacheKey = `total-calculations-${isAdmin ? 'admin' : userId}`;
  
  return getCachedOrFetch(cacheKey, async () => {
    try {
      // Fall back to localStorage since database is not available
      const logs = isAdmin ? getActivityLogs() : getActivityLogs(userId);
      
      // Count deal_created, deal_saved, and deal_loaded activities
      return logs.filter((log: any) => 
        log.activityType === 'deal_created' || 
        log.activityType === 'deal_saved' || 
        log.activityType === 'deal_loaded'
      ).length;
    } catch (error) {
      console.warn('Failed to fetch activity logs from database, falling back to localStorage:', error);
      // Fall back to localStorage
      const logs = isAdmin ? getActivityLogs() : getActivityLogs(userId);
      
      return logs.filter((log: any) => 
        log.activityType === 'deal_created' || 
        log.activityType === 'deal_saved' || 
        log.activityType === 'deal_loaded'
      ).length;
    }
  });
};

/**
 * Get all dashboard statistics in a single optimized query
 * Uses device-aware strategy: single RPC call for mobile, multiple queries for desktop
 * Implements two-tier caching: 5-minute memory cache and 15-minute localStorage cache
 * 
 * @param userId - Current user ID
 * @param isAdmin - Whether the user is an admin
 * @param isMobile - Whether the device is mobile (triggers optimized query)
 * @returns Promise<Dashboard statistics object>
 */
export const getDashboardStatsOptimized = async (
  userId: string,
  isAdmin: boolean,
  isMobile: boolean = false
): Promise<DashboardStats> => {
  const now = Date.now();

  // Check memory cache first (5-minute TTL)
  if (dashboardStatsMemoryCache && (now - dashboardStatsMemoryCache.timestamp) < CACHE_TTL) {
    return dashboardStatsMemoryCache.data;
  }

  // Check localStorage cache (15-minute TTL)
  const localStorageCache = getLocalStorageCache();
  if (localStorageCache) {
    // Update memory cache
    dashboardStatsMemoryCache = localStorageCache;
    return localStorageCache.data;
  }

  try {
    let stats: DashboardStats;

    if (isMobile) {
      // Mobile: Use individual calls (no RPC in PostgreSQL)
      const [totalDeals, activeProjects, calculations] = await Promise.all([
        getTotalDealsAsync(userId, isAdmin),
        getActiveProjectsAsync(userId, isAdmin),
        getTotalCalculationsAsync(userId, isAdmin)
      ]);

      stats = {
        totalDeals: totalDeals || 0,
        activeProjects: activeProjects || 0,
        calculations: calculations || 0
      };
    } else {
      // Desktop: Use existing multi-query approach
      const [totalDeals, activeProjects, calculations] = await Promise.all([
        getTotalDealsAsync(userId, isAdmin),
        getActiveProjectsAsync(userId, isAdmin),
        getTotalCalculationsAsync(userId, isAdmin)
      ]);

      stats = {
        totalDeals,
        activeProjects,
        calculations
      };
    }

    // Update both caches
    dashboardStatsMemoryCache = {
      data: stats,
      timestamp: now,
      expiresAt: now + CACHE_TTL
    };
    setLocalStorageCache(stats);

    return stats;
  } catch (error) {
    console.warn('Failed to fetch dashboard stats from database:', error);

    // Try to fall back to localStorage cache even if expired
    const expiredCache = getLocalStorageCache();
    if (expiredCache) {
      console.log('Using expired localStorage cache as fallback');
      return expiredCache.data;
    }

    // Last resort: try to fetch from localStorage deals and activity logs
    try {
      const dealsData = localStorage.getItem('deals-storage');
      const deals = dealsData ? JSON.parse(dealsData) : [];
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let filteredDeals = deals;
      if (!isAdmin) {
        filteredDeals = deals.filter((deal: any) => deal.userId === userId);
      }

      const totalDeals = filteredDeals.length;
      const activeProjects = filteredDeals.filter((deal: any) => {
        const updatedAt = new Date(deal.updatedAt);
        return updatedAt >= thirtyDaysAgo;
      }).length;

      // Get calculations from activity logs
      const logs = isAdmin ? getActivityLogs() : getActivityLogs(userId);
      const calculations = logs.filter(log => 
        log.activityType === 'deal_created' || 
        log.activityType === 'deal_saved' || 
        log.activityType === 'deal_loaded'
      ).length;

      const fallbackStats: DashboardStats = {
        totalDeals,
        activeProjects,
        calculations
      };

      // Cache the fallback data
      setLocalStorageCache(fallbackStats);

      return fallbackStats;
    } catch (fallbackError) {
      console.error('Failed to fetch dashboard stats from fallback:', fallbackError);
      
      // Return zeros as last resort
      return {
        totalDeals: 0,
        activeProjects: 0,
        calculations: 0
      };
    }
  }
};

/**
 * Calculate total deals for a user (sync version - deprecated, use getTotalDealsAsync)
 * For admin, counts all deals. For other users, counts only their deals.
 * 
 * @param userId - Current user ID
 * @param isAdmin - Whether the user is an admin
 * @returns Total number of deals
 * @deprecated Use getTotalDealsAsync instead
 */
export const getTotalDeals = (userId: string, isAdmin: boolean): number => {
  try {
    const dealsData = localStorage.getItem('deals-storage');
    if (!dealsData) {
      return 0;
    }

    const deals = JSON.parse(dealsData);
    
    if (isAdmin) {
      // Admin sees all deals
      return deals.length;
    } else {
      // Non-admin sees only their own deals
      return deals.filter((deal: any) => deal.userId === userId).length;
    }
  } catch (error) {
    console.warn('Failed to calculate total deals:', error);
    return 0;
  }
};

/**
 * Calculate active projects (deals modified in last 30 days) (sync version - deprecated)
 * For admin, counts all active deals. For other users, counts only their active deals.
 * 
 * @param userId - Current user ID
 * @param isAdmin - Whether the user is an admin
 * @returns Number of active projects
 * @deprecated Use getActiveProjectsAsync instead
 */
export const getActiveProjects = (userId: string, isAdmin: boolean): number => {
  try {
    const dealsData = localStorage.getItem('deals-storage');
    if (!dealsData) {
      return 0;
    }

    const deals = JSON.parse(dealsData);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let filteredDeals = deals;
    
    // Filter by user if not admin
    if (!isAdmin) {
      filteredDeals = deals.filter((deal: any) => deal.userId === userId);
    }

    // Count deals modified in last 30 days
    return filteredDeals.filter((deal: any) => {
      const updatedAt = new Date(deal.updatedAt);
      return updatedAt >= thirtyDaysAgo;
    }).length;
  } catch (error) {
    console.warn('Failed to calculate active projects:', error);
    return 0;
  }
};

/**
 * Calculate total calculations (deal saves + loads) from activity log (sync version - deprecated)
 * For admin, counts all users' calculations. For other users, counts only their calculations.
 * 
 * @param userId - Current user ID
 * @param isAdmin - Whether the user is an admin
 * @returns Total number of calculations
 * @deprecated Use getTotalCalculationsAsync instead
 */
export const getTotalCalculations = (userId: string, isAdmin: boolean): number => {
  try {
    const logs = isAdmin ? getActivityLogs() : getActivityLogs(userId);
    
    // Count deal_created, deal_saved, and deal_loaded activities
    return logs.filter(log => 
      log.activityType === 'deal_created' || 
      log.activityType === 'deal_saved' || 
      log.activityType === 'deal_loaded'
    ).length;
  } catch (error) {
    console.warn('Failed to calculate total calculations:', error);
    return 0;
  }
};
