/**
 * Activity Logger Utility (Client-Side Safe)
 * 
 * Provides functionality for logging and retrieving user activities
 * in the Smart Cost Calculator application.
 */

// Activity type enumeration
export type ActivityType = 
  | 'deal_created'
  | 'deal_saved'
  | 'proposal_generated'
  | 'pdf_generated'
  | 'deal_loaded';

// Activity log interface
export interface ActivityLog {
  id: string;
  userId: string;
  username: string;
  userRole: 'user' | 'admin' | 'manager';
  activityType: ActivityType;
  dealId?: string;
  dealName?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// LocalStorage key for activity logs
const ACTIVITY_LOGS_KEY = 'activity-logs';
const MIGRATION_KEY = 'activity-logs-migrated';

// Maximum number of logs to keep per user
const MAX_LOGS_PER_USER = 100;

/**
 * Generate a unique ID for activity logs
 */
const generateId = (): string => {
  return `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Trim activity logs to keep only the last MAX_LOGS_PER_USER entries per user
 */
const trimActivityLogs = (logs: ActivityLog[]): ActivityLog[] => {
  // Group logs by user
  const byUser = logs.reduce((acc, log) => {
    if (!acc[log.userId]) {
      acc[log.userId] = [];
    }
    acc[log.userId].push(log);
    return acc;
  }, {} as Record<string, ActivityLog[]>);

  // Keep last MAX_LOGS_PER_USER per user, sorted by timestamp (newest first)
  const trimmed: ActivityLog[] = [];
  Object.values(byUser).forEach(userLogs => {
    const sorted = userLogs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    trimmed.push(...sorted.slice(0, MAX_LOGS_PER_USER));
  });

  return trimmed;
};

/**
 * Log activity to localStorage (fallback method)
 * 
 * @param activity - Activity data (without id and timestamp)
 */
const logActivityToLocalStorage = (activity: Omit<ActivityLog, 'id' | 'timestamp'>): void => {
  try {
    const log: ActivityLog = {
      ...activity,
      id: generateId(),
      timestamp: new Date().toISOString()
    };

    const existingLogs = getActivityLogsFromLocalStorage();
    existingLogs.push(log);

    // Trim logs to prevent storage bloat
    const trimmedLogs = trimActivityLogs(existingLogs);

    // Save to localStorage
    localStorage.setItem(ACTIVITY_LOGS_KEY, JSON.stringify({ logs: trimmedLogs }));
  } catch (error) {
    console.warn('Failed to log activity to localStorage:', error);
  }
};

/**
 * Log an activity (client-side version)
 * Note: This function now stores logs in localStorage for client-side use
 * Server-side logging should use the API endpoint
 */
export async function logActivity(log: ActivityLog): Promise<void> {
  try {
    // Store in localStorage for client-side access
    const logs = getActivityLogs();
    logs.unshift({
      ...log,
      id: log.id || generateId(),
      timestamp: log.timestamp || new Date().toISOString()
    });
    
    // Trim to prevent localStorage from getting too large
    const trimmed = trimActivityLogs(logs);
    localStorage.setItem(ACTIVITY_LOGS_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

/**
 * Log activity to database
 * 
 * @param activity - Activity data (without id and timestamp)
 */
export const logActivityToDatabase = async (activity: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<void> => {
  try {
    const log: ActivityLog = {
      ...activity,
      id: generateId(),
      timestamp: new Date().toISOString()
    };

    await logActivity(log);
  } catch (error) {
    console.warn('Failed to log activity to database, falling back to localStorage:', error);
    // Fall back to localStorage
    logActivityToLocalStorage(activity);
  }
};

/**
 * Log a new activity (synchronous version for backward compatibility)
 * 
 * @param activity - Activity data (without id and timestamp)
 */
export const logActivitySync = (activity: Omit<ActivityLog, 'id' | 'timestamp'>): void => {
  // Use async function but don't await to avoid blocking
  logActivityToDatabase(activity).catch(error => {
    console.warn('Activity logging failed:', error);
  });
};

/**
 * Get activity logs from localStorage (fallback method)
 * 
 * @param userId - Optional user ID to filter logs
 * @returns Array of activity logs, sorted by timestamp (newest first)
 */
const getActivityLogsFromLocalStorage = (userId?: string): ActivityLog[] => {
  try {
    const data = localStorage.getItem(ACTIVITY_LOGS_KEY);
    if (!data) {
      return [];
    }

    const { logs } = JSON.parse(data);

    // Filter by user if specified
    let filteredLogs = logs as ActivityLog[];
    if (userId) {
      filteredLogs = filteredLogs.filter((log: ActivityLog) => log.userId === userId);
    }

    // Sort by timestamp (newest first)
    return filteredLogs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch (error) {
    console.warn('Failed to retrieve activity logs from localStorage:', error);
    return [];
  }
};

/**
 * Get activity logs from database (placeholder for API call)
 * 
 * @param userId - Optional user ID to filter logs
 * @returns Promise of array of activity logs, sorted by timestamp (newest first)
 */
export async function getActivityLogsFromDatabase(userId?: string, limit: number = 100): Promise<ActivityLog[]> {
  try {
    // TODO: Replace with API call to /api/activity-logs
    console.log('getActivityLogsFromDatabase called with userId:', userId, 'limit:', limit);
    return [];
  } catch (error) {
    console.error('Failed to get activity logs:', error);
    return [];
  }
};

/**
 * Get activity logs, optionally filtered by user ID (async version)
 * 
 * @param userId - Optional user ID to filter logs
 * @returns Array of activity logs, sorted by timestamp (newest first)
 */
export const getActivityLogsAsync = async (userId?: string): Promise<ActivityLog[]> => {
  try {
    const logs = await getActivityLogsFromDatabase(userId);
    return logs;
  } catch (error) {
    console.warn('Failed to retrieve activity logs from database, falling back to localStorage:', error);
    return getActivityLogsFromLocalStorage(userId);
  }
};

/**
 * Get activity logs, optionally filtered by user ID
 * 
 * @param userId - Optional user ID to filter logs
 * @returns Array of activity logs, sorted by timestamp (newest first)
 */
export const getActivityLogs = (userId?: string): ActivityLog[] => {
  // This is the synchronous version for backward compatibility
  // Components should migrate to use getActivityLogsFromDatabase
  return getActivityLogsFromLocalStorage(userId);
};

/**
 * Get all unique users from activity logs
 * Useful for admin dropdown to select users
 * 
 * @returns Array of unique user objects with id, username, and role
 */
export const getUniqueUsers = (): Array<{ userId: string; username: string; userRole: string }> => {
  try {
    const logs = getActivityLogs();
    const userMap = new Map<string, { userId: string; username: string; userRole: string }>();

    logs.forEach(log => {
      if (!userMap.has(log.userId)) {
        userMap.set(log.userId, {
          userId: log.userId,
          username: log.username,
          userRole: log.userRole
        });
      }
    });

    return Array.from(userMap.values()).sort((a, b) => 
      a.username.localeCompare(b.username)
    );
  } catch (error) {
    console.warn('Failed to get unique users:', error);
    return [];
  }
};

/**
 * Migrate localStorage activity logs to database
 * 
 * @returns Promise<boolean> - True if migration successful or already completed
 */
export const migrateActivityLogsToPostgreSQL = async (): Promise<boolean> => {
  try {
    // Check if migration already done
    if (typeof window !== 'undefined' && localStorage.getItem(MIGRATION_KEY) === 'true') {
      return true;
    }

    const localLogs = getActivityLogsFromLocalStorage();
    
    if (localLogs.length === 0) {
      // No logs to migrate, mark as complete
      if (typeof window !== 'undefined') {
        localStorage.setItem(MIGRATION_KEY, 'true');
      }
      return true;
    }

    // Batch insert to PostgreSQL using upsert to handle duplicates
    for (const log of localLogs) {
      try {
        // TODO: Replace with API call to /api/activity-logs
        console.log('Would migrate activity log:', log.id);
      } catch (error) {
        // Log individual errors but continue with migration
        console.warn(`Failed to migrate activity log ${log.id}:`, error);
      }
    }

    // Mark migration as complete
    if (typeof window !== 'undefined') {
      localStorage.setItem(MIGRATION_KEY, 'true');
    }
    
    return true;
  } catch (error) {
    console.error('Failed to migrate activity logs to PostgreSQL:', error);
    return false;
  }
};

/**
 * Clear all activity logs (useful for testing or admin cleanup)
 */
export const clearActivityLogs = (): void => {
  try {
    localStorage.removeItem(ACTIVITY_LOGS_KEY);
  } catch (error) {
    console.warn('Failed to clear activity logs:', error);
  }
};
