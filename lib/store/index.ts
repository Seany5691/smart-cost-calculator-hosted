/**
 * Store Index
 * 
 * Central export point for all Zustand stores
 */

export { useLeadsStore } from './leads';
export { useRoutesStore } from './routes';
export { useRemindersStore } from './reminders';
export { useImportStore } from './import';

// Re-export types for convenience
export type { Lead, LeadStatus, LeadFilters, UpdateLeadRequest } from '@/lib/leads/types';
export type { Route, RouteStatus } from '@/lib/leads/types';
export type { LeadReminder, ReminderStatus, CreateReminderRequest, UpdateReminderRequest } from '@/lib/leads/types';
export type { ImportSession, ImportSourceType, ImportStatus } from '@/lib/leads/types';
