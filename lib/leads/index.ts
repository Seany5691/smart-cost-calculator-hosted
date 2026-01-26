/**
 * Leads Management System - Core Module
 * 
 * Central export point for all leads-related types, utilities, and functions.
 * This module provides a clean API for importing leads functionality throughout
 * the application.
 * 
 * Usage:
 *   import { Lead, LeadStatus, saveStartingPoint, parseApiError } from '@/lib/leads';
 */

// =====================================================
// Type Exports
// =====================================================

export type {
  // Core types
  Lead,
  LeadStatus,
  LeadNote,
  LeadReminder,
  ReminderStatus,
  LeadAttachment,
  Route,
  RouteStatus,
  ImportSession,
  ImportSourceType,
  ImportStatus,
  
  // Filter and sort types
  LeadFilters,
  LeadSortField,
  SortDirection,
  LeadSort,
  
  // Pagination types
  PaginationParams,
  PaginatedResponse,
  
  // API request/response types
  CreateLeadRequest,
  UpdateLeadRequest,
  BulkUpdateRequest,
  BulkDeleteRequest,
  CreateNoteRequest,
  UpdateNoteRequest,
  CreateReminderRequest,
  UpdateReminderRequest,
  CreateRouteRequest,
  ImportScraperRequest,
  ImportExcelRequest,
  ColumnMapping,
  
  // Dashboard types
  DashboardStats,
  CalendarDate,
  RecentActivity,
  ActivityType,
  
  // Validation types
  ValidationError as ValidationErrorType,
  ValidationResult,
  
  // Utility types
  Coordinates,
  GoogleMapsUrlParts,
} from './types';

export {
  // Constants
  LEAD_STATUSES,
  WORKING_AREA_LIMIT,
  LEADS_PER_PAGE,
  MAX_ROUTE_WAYPOINTS,
  MAX_FILE_SIZE,
  ALLOWED_FILE_TYPES,
  PROVIDER_COLORS,
  
  // Type guards
  isLeadStatus,
  isReminderStatus,
  isRouteStatus,
  isImportSourceType,
  isImportStatus,
} from './types';

// =====================================================
// Storage Utility Exports
// =====================================================

export {
  // Storage keys
  STORAGE_KEYS,
  
  // Core storage functions
  isStorageAvailable,
  setItem,
  getItem,
  removeItem,
  clear,
  getAllKeys,
  hasItem,
  
  // Specialized storage functions
  saveStartingPoint,
  getStartingPoint,
  saveLastUsedList,
  getLastUsedList,
  saveViewMode,
  getViewMode,
  saveTabIndex,
  getTabIndex,
  saveFilters,
  getFilters,
  saveSortPreferences,
  getSortPreferences,
  
  // Batch operations
  setItems,
  getItems,
  removeItems,
  
  // Cleanup functions
  cleanupExpiredItems,
  getStorageInfo,
  
  // Migration helpers
  migrateStorageKeys,
  exportStorage,
  importStorage,
} from './storage-utils';

export type { StorageOptions } from './storage-utils';

// =====================================================
// Error Handling Exports
// =====================================================

export {
  // Error parsing
  parseApiError,
  parseNetworkError,
  parseValidationError,
  
  // Error formatting
  formatErrorMessage,
  formatValidationErrors,
  getUserFriendlyMessage,
  
  // Error handling utilities
  handleFetchError,
  safeAsync,
  retryAsync,
  
  // Validation helpers
  validateRequired,
  validateEmail,
  validatePhone,
  validateUrl,
  validateDate,
  validateFutureDate,
  validateFileSize,
  validateFileType,
  
  // Error boundary helpers
  isRecoverableError,
  getRecoverySuggestion,
  
  // Logging helpers
  logError,
  reportError,
} from './error-handlers';

export type {
  ErrorSeverity,
  DisplayError,
} from './error-handlers';

// =====================================================
// Re-export Server-Side Error Classes
// =====================================================

export {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BusinessLogicError,
  DatabaseError,
  ErrorCode,
  handleApiError,
  validateRequiredFields,
  validateField,
  validateEnum,
} from '../errors';

export type { ErrorResponse } from '../errors';
