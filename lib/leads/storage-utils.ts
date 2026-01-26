/**
 * LocalStorage Utility Module
 * 
 * Provides type-safe localStorage operations for the leads management system.
 * Handles serialization, deserialization, and error handling for browser storage.
 * 
 * Validates: Requirements 26.1-26.25
 */

// =====================================================
// Storage Keys
// =====================================================

export const STORAGE_KEYS = {
  STARTING_POINT: 'leads_starting_point',
  LAST_USED_LIST: 'last_used_list',
  VIEW_MODE: 'leads-view-mode',
  TAB_INDEX: 'leads_tab_index',
  FILTERS: 'leads_filters',
  SORT_PREFERENCES: 'leads_sort_preferences',
} as const;

// =====================================================
// Storage Interface
// =====================================================

export interface StorageOptions {
  expiresIn?: number; // Time in milliseconds
}

interface StorageItem<T> {
  value: T;
  timestamp: number;
  expiresAt?: number;
}

// =====================================================
// Core Storage Functions
// =====================================================

/**
 * Check if localStorage is available
 */
export function isStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Set item in localStorage with optional expiration
 */
export function setItem<T>(
  key: string,
  value: T,
  options?: StorageOptions
): boolean {
  if (!isStorageAvailable()) {
    console.warn('localStorage is not available');
    return false;
  }

  try {
    const item: StorageItem<T> = {
      value,
      timestamp: Date.now(),
      expiresAt: options?.expiresIn ? Date.now() + options.expiresIn : undefined,
    };

    localStorage.setItem(key, JSON.stringify(item));
    return true;
  } catch (error) {
    console.error(`Error setting localStorage item "${key}":`, error);
    return false;
  }
}

/**
 * Get item from localStorage with expiration check
 */
export function getItem<T>(key: string, defaultValue?: T): T | null {
  if (!isStorageAvailable()) {
    return defaultValue ?? null;
  }

  try {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) {
      return defaultValue ?? null;
    }

    const item: StorageItem<T> = JSON.parse(itemStr);

    // Check if item has expired
    if (item.expiresAt && Date.now() > item.expiresAt) {
      localStorage.removeItem(key);
      return defaultValue ?? null;
    }

    return item.value;
  } catch (error) {
    console.error(`Error getting localStorage item "${key}":`, error);
    return defaultValue ?? null;
  }
}

/**
 * Remove item from localStorage
 */
export function removeItem(key: string): boolean {
  if (!isStorageAvailable()) {
    return false;
  }

  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing localStorage item "${key}":`, error);
    return false;
  }
}

/**
 * Clear all items from localStorage
 */
export function clear(): boolean {
  if (!isStorageAvailable()) {
    return false;
  }

  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    return false;
  }
}

/**
 * Get all keys from localStorage
 */
export function getAllKeys(): string[] {
  if (!isStorageAvailable()) {
    return [];
  }

  try {
    return Object.keys(localStorage);
  } catch (error) {
    console.error('Error getting localStorage keys:', error);
    return [];
  }
}

/**
 * Check if key exists in localStorage
 */
export function hasItem(key: string): boolean {
  if (!isStorageAvailable()) {
    return false;
  }

  try {
    return localStorage.getItem(key) !== null;
  } catch (error) {
    console.error(`Error checking localStorage item "${key}":`, error);
    return false;
  }
}

// =====================================================
// Specialized Storage Functions
// =====================================================

/**
 * Save starting point for route generation
 */
export function saveStartingPoint(startingPoint: string): boolean {
  return setItem(STORAGE_KEYS.STARTING_POINT, startingPoint);
}

/**
 * Get saved starting point
 */
export function getStartingPoint(): string | null {
  return getItem<string>(STORAGE_KEYS.STARTING_POINT);
}

/**
 * Save last used list filter
 */
export function saveLastUsedList(listName: string): boolean {
  return setItem(STORAGE_KEYS.LAST_USED_LIST, listName);
}

/**
 * Get last used list filter
 */
export function getLastUsedList(): string | null {
  return getItem<string>(STORAGE_KEYS.LAST_USED_LIST);
}

/**
 * Save view mode preference (grid or table)
 */
export function saveViewMode(mode: 'grid' | 'table'): boolean {
  return setItem(STORAGE_KEYS.VIEW_MODE, mode);
}

/**
 * Get view mode preference
 */
export function getViewMode(): 'grid' | 'table' {
  return getItem<'grid' | 'table'>(STORAGE_KEYS.VIEW_MODE, 'table') ?? 'table';
}

/**
 * Save current tab index
 */
export function saveTabIndex(index: number): boolean {
  return setItem(STORAGE_KEYS.TAB_INDEX, index);
}

/**
 * Get saved tab index
 */
export function getTabIndex(): number | null {
  return getItem<number>(STORAGE_KEYS.TAB_INDEX);
}

/**
 * Save filter preferences
 */
export function saveFilters(filters: Record<string, any>): boolean {
  return setItem(STORAGE_KEYS.FILTERS, filters);
}

/**
 * Get saved filters
 */
export function getFilters(): Record<string, any> | null {
  return getItem<Record<string, any>>(STORAGE_KEYS.FILTERS);
}

/**
 * Save sort preferences
 */
export function saveSortPreferences(sort: {
  field: string;
  direction: 'asc' | 'desc';
}): boolean {
  return setItem(STORAGE_KEYS.SORT_PREFERENCES, sort);
}

/**
 * Get saved sort preferences
 */
export function getSortPreferences(): {
  field: string;
  direction: 'asc' | 'desc';
} | null {
  return getItem<{ field: string; direction: 'asc' | 'desc' }>(
    STORAGE_KEYS.SORT_PREFERENCES
  );
}

// =====================================================
// Batch Operations
// =====================================================

/**
 * Save multiple items at once
 */
export function setItems(items: Record<string, any>): boolean {
  if (!isStorageAvailable()) {
    return false;
  }

  try {
    Object.entries(items).forEach(([key, value]) => {
      setItem(key, value);
    });
    return true;
  } catch (error) {
    console.error('Error setting multiple localStorage items:', error);
    return false;
  }
}

/**
 * Get multiple items at once
 */
export function getItems<T extends Record<string, any>>(
  keys: string[]
): Partial<T> {
  if (!isStorageAvailable()) {
    return {};
  }

  try {
    const result: Partial<T> = {};
    keys.forEach((key) => {
      const value = getItem(key);
      if (value !== null) {
        result[key as keyof T] = value as T[keyof T];
      }
    });
    return result;
  } catch (error) {
    console.error('Error getting multiple localStorage items:', error);
    return {};
  }
}

/**
 * Remove multiple items at once
 */
export function removeItems(keys: string[]): boolean {
  if (!isStorageAvailable()) {
    return false;
  }

  try {
    keys.forEach((key) => {
      localStorage.removeItem(key);
    });
    return true;
  } catch (error) {
    console.error('Error removing multiple localStorage items:', error);
    return false;
  }
}

// =====================================================
// Cleanup Functions
// =====================================================

/**
 * Remove expired items from localStorage
 */
export function cleanupExpiredItems(): number {
  if (!isStorageAvailable()) {
    return 0;
  }

  let removedCount = 0;

  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();

    keys.forEach((key) => {
      try {
        const itemStr = localStorage.getItem(key);
        if (!itemStr) return;

        const item: StorageItem<any> = JSON.parse(itemStr);
        if (item.expiresAt && now > item.expiresAt) {
          localStorage.removeItem(key);
          removedCount++;
        }
      } catch {
        // Skip invalid items
      }
    });
  } catch (error) {
    console.error('Error cleaning up expired items:', error);
  }

  return removedCount;
}

/**
 * Get storage usage information
 */
export function getStorageInfo(): {
  used: number;
  available: number;
  percentage: number;
} | null {
  if (!isStorageAvailable()) {
    return null;
  }

  try {
    let used = 0;
    const keys = Object.keys(localStorage);

    keys.forEach((key) => {
      const value = localStorage.getItem(key);
      if (value) {
        used += key.length + value.length;
      }
    });

    // Most browsers have a 5-10MB limit for localStorage
    const available = 5 * 1024 * 1024; // Assume 5MB
    const percentage = (used / available) * 100;

    return {
      used,
      available,
      percentage,
    };
  } catch (error) {
    console.error('Error getting storage info:', error);
    return null;
  }
}

// =====================================================
// Migration Helpers
// =====================================================

/**
 * Migrate old storage keys to new format
 */
export function migrateStorageKeys(
  migrations: Record<string, string>
): boolean {
  if (!isStorageAvailable()) {
    return false;
  }

  try {
    Object.entries(migrations).forEach(([oldKey, newKey]) => {
      const value = localStorage.getItem(oldKey);
      if (value !== null) {
        localStorage.setItem(newKey, value);
        localStorage.removeItem(oldKey);
      }
    });
    return true;
  } catch (error) {
    console.error('Error migrating storage keys:', error);
    return false;
  }
}

/**
 * Export all localStorage data
 */
export function exportStorage(): Record<string, any> | null {
  if (!isStorageAvailable()) {
    return null;
  }

  try {
    const data: Record<string, any> = {};
    const keys = Object.keys(localStorage);

    keys.forEach((key) => {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          data[key] = JSON.parse(value);
        } catch {
          data[key] = value;
        }
      }
    });

    return data;
  } catch (error) {
    console.error('Error exporting storage:', error);
    return null;
  }
}

/**
 * Import localStorage data
 */
export function importStorage(data: Record<string, any>): boolean {
  if (!isStorageAvailable()) {
    return false;
  }

  try {
    Object.entries(data).forEach(([key, value]) => {
      const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, valueStr);
    });
    return true;
  } catch (error) {
    console.error('Error importing storage:', error);
    return false;
  }
}
