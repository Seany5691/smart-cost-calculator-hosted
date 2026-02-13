/**
 * Core Data Types for Leads Management System
 * 
 * Defines TypeScript interfaces for all data models used in the leads system.
 * These types ensure type safety across the application and match the database schema.
 * 
 * Validates: Requirements 14.1-14.24
 */

// =====================================================
// Lead Status Type
// =====================================================

export type LeadStatus = 'new' | 'leads' | 'working' | 'proposal' | 'later' | 'bad' | 'signed';

export const LEAD_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'leads', label: 'Leads' },
  { value: 'working', label: 'Working On' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'later', label: 'Later Stage' },
  { value: 'bad', label: 'Bad Leads' },
  { value: 'signed', label: 'Signed' },
] as const;

// =====================================================
// Lead Interface
// =====================================================

export interface Lead {
  id: string;
  number: number;
  name: string;
  phone?: string;
  address?: string;
  town?: string;
  contact_person?: string;
  provider?: string;
  type_of_business?: string;
  maps_address?: string;
  status: LeadStatus;
  list_name?: string;
  background_color?: string;
  notes?: string;
  date_to_call_back?: string;
  date_signed?: string;
  date_proposal_created?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

// =====================================================
// Lead Note Interface
// =====================================================

export interface LeadNote {
  id: string;
  lead_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  // User information (joined from users table)
  user_name?: string;
  username?: string;
}

// =====================================================
// Lead Reminder Interface
// =====================================================

export type ReminderStatus = 'pending' | 'completed' | 'snoozed';
export type ReminderType = 'call' | 'email' | 'meeting' | 'task' | 'followup' | 'quote' | 'document';
export type ReminderPriority = 'high' | 'medium' | 'low';

export interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly';
  interval: number; // Every X days/weeks/months
  days?: number[]; // For weekly: [0=Sun, 1=Mon, etc.]
  endDate?: string; // Optional end date
}

export interface LeadReminder {
  id: string;
  lead_id: string | null; // Nullable for standalone reminders
  user_id: string;
  route_id?: string | null; // For route-linked reminders
  title?: string | null; // For standalone reminders
  description?: string | null; // Additional details
  reminder_date: string;
  reminder_time?: string | null; // "HH:MM" format (24-hour)
  is_all_day: boolean;
  reminder_type: ReminderType;
  priority: ReminderPriority;
  message: string; // Kept for backward compatibility
  note?: string; // Alternative to message
  status: ReminderStatus;
  completed: boolean;
  is_recurring: boolean;
  recurrence_pattern?: RecurrencePattern | null;
  parent_reminder_id?: string | null; // Links to parent for recurring instances
  created_at: string;
  updated_at?: string;
  // User information (joined from users table)
  user_name?: string;
  username?: string;
  // Sharing information
  is_shared?: boolean; // True if reminder belongs to someone else and is shared with you
}

// =====================================================
// Calendar Event Interface
// =====================================================

export type CalendarEventType = 'event' | 'appointment' | 'meeting' | 'deadline' | 'reminder' | 'other';

export interface CalendarEvent {
  id: string;
  user_id: string; // Owner of the event (whose calendar it appears on)
  title: string;
  description?: string | null;
  event_date: string; // Date in YYYY-MM-DD format
  event_time?: string | null; // Time in HH:MM format (24-hour)
  is_all_day: boolean;
  event_type: CalendarEventType;
  priority: ReminderPriority; // Reuse same priority type
  location?: string | null;
  created_by: string; // User who created the event (may differ from owner if shared)
  created_at: string;
  updated_at: string;
}

// =====================================================
// Calendar Share Interface
// =====================================================

export interface CalendarShare {
  id: string;
  owner_user_id: string; // User who owns the calendar
  shared_with_user_id: string; // User who can view the calendar
  can_add_events: boolean; // Whether sharee can add events
  can_edit_events: boolean; // Whether sharee can edit events
  created_at: string;
  updated_at: string;
}

// =====================================================
// Calendar Share with User Info
// =====================================================

export interface CalendarShareWithUser extends CalendarShare {
  owner_username?: string;
  owner_email?: string;
  shared_with_username?: string;
  shared_with_email?: string;
}

// =====================================================
// Lead Attachment Interface
// =====================================================

export interface LeadAttachment {
  id: string;
  lead_id: string;
  user_id: string;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

// =====================================================
// Route Interface
// =====================================================

export type RouteStatus = 'active' | 'completed';

export interface Route {
  id: string;
  name: string;
  google_maps_url: string;
  stop_count: number;
  lead_ids: string[];
  status: RouteStatus;
  user_id: string;
  created_at: string;
}

// =====================================================
// Import Session Interface
// =====================================================

export type ImportSourceType = 'scraper' | 'excel';
export type ImportStatus = 'pending' | 'completed' | 'failed';

export interface ImportSession {
  id: string;
  user_id: string;
  source_type: ImportSourceType;
  list_name: string;
  imported_records: number;
  status: ImportStatus;
  created_at: string;
}

// =====================================================
// Filter and Sort Types
// =====================================================

export interface LeadFilters {
  status?: LeadStatus[];
  provider?: string[];
  town?: string[];
  list_name?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  callback_date_from?: string;
  callback_date_to?: string;
}

export type LeadSortField = 'number' | 'name' | 'provider' | 'town' | 'date';
export type SortDirection = 'asc' | 'desc';

export interface LeadSort {
  field: LeadSortField;
  direction: SortDirection;
}

// =====================================================
// Pagination Types
// =====================================================

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// =====================================================
// API Request/Response Types
// =====================================================

export interface CreateLeadRequest {
  name: string;
  phone?: string;
  address?: string;
  town?: string;
  provider?: string;
  type_of_business?: string;
  maps_address?: string;
  status?: LeadStatus;
  list_name?: string;
  background_color?: string;
  notes?: string;
  date_to_call_back?: string;
  date_signed?: string;
}

export interface UpdateLeadRequest {
  name?: string;
  phone?: string;
  address?: string;
  town?: string;
  provider?: string;
  type_of_business?: string;
  maps_address?: string;
  status?: LeadStatus;
  list_name?: string;
  background_color?: string;
  notes?: string;
  date_to_call_back?: string;
  date_signed?: string;
}

export interface BulkUpdateRequest {
  lead_ids: string[];
  updates: UpdateLeadRequest;
}

export interface BulkDeleteRequest {
  lead_ids: string[];
}

export interface CreateNoteRequest {
  content: string;
}

export interface UpdateNoteRequest {
  content: string;
}

export interface CreateReminderRequest {
  lead_id?: string | null;
  route_id?: string | null;
  title?: string | null;
  description?: string | null;
  reminder_date: string;
  reminder_time?: string | null;
  is_all_day?: boolean;
  reminder_type?: ReminderType;
  priority?: ReminderPriority;
  message: string;
  note?: string;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern | null;
}

export interface UpdateReminderRequest {
  lead_id?: string | null;
  route_id?: string | null;
  title?: string | null;
  description?: string | null;
  reminder_date?: string;
  reminder_time?: string | null;
  is_all_day?: boolean;
  reminder_type?: ReminderType;
  priority?: ReminderPriority;
  message?: string;
  note?: string;
  status?: ReminderStatus;
  completed?: boolean;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern | null;
}

export interface CreateRouteRequest {
  starting_point: string;
  lead_ids: string[];
}

export interface ImportScraperRequest {
  session_ids: string[];
  list_name: string;
}

export interface ImportExcelRequest {
  list_name: string;
  data: any[][];
  column_mappings: ColumnMapping[];
}

export interface ColumnMapping {
  excel_column: string;
  lead_field: keyof Lead;
}

// =====================================================
// Dashboard Statistics Types
// =====================================================

export interface DashboardStats {
  total_leads: number;
  active_leads: number;
  working_leads: number;
  later_stage_leads: number;
  signed_leads: number;
  bad_leads: number;
  total_routes: number;
  recent_imports: number;
}

// =====================================================
// Calendar Types
// =====================================================

export interface CalendarDate {
  date: Date;
  is_current_month: boolean;
  is_today: boolean;
  leads: Lead[];
}

// =====================================================
// Activity Types
// =====================================================

export type ActivityType = 'import' | 'route';

export interface RecentActivity {
  type: ActivityType;
  title: string;
  subtitle: string;
  timestamp: Date;
  status: string;
}

// =====================================================
// Validation Types
// =====================================================

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// =====================================================
// Utility Types
// =====================================================

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GoogleMapsUrlParts {
  origin: string;
  destination: string;
  waypoints: string[];
}

// =====================================================
// Type Guards
// =====================================================

export function isLeadStatus(value: string): value is LeadStatus {
  return ['new', 'leads', 'working', 'proposal', 'later', 'bad', 'signed'].includes(value);
}

export function isReminderStatus(value: string): value is ReminderStatus {
  return ['pending', 'completed', 'snoozed'].includes(value);
}

export function isRouteStatus(value: string): value is RouteStatus {
  return ['active', 'completed'].includes(value);
}

export function isImportSourceType(value: string): value is ImportSourceType {
  return ['scraper', 'excel'].includes(value);
}

export function isImportStatus(value: string): value is ImportStatus {
  return ['pending', 'completed', 'failed'].includes(value);
}

// =====================================================
// Constants
// =====================================================

export const WORKING_AREA_LIMIT = 9;
export const LEADS_PER_PAGE = 50;
export const MAX_ROUTE_WAYPOINTS = 25;
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export const PROVIDER_COLORS: Record<string, string> = {
  'Telkom': 'blue',
  'Vodacom': 'red',
  'MTN': 'yellow',
  'Cell C': 'purple',
};


// =====================================================
// Reminder Helper Functions
// =====================================================

export function getReminderTypeIcon(type: ReminderType): string {
  const icons: Record<ReminderType, string> = {
    call: '📞',
    email: '📧',
    meeting: '📅',
    task: '📝',
    followup: '🔔',
    quote: '💰',
    document: '📄',
  };
  return icons[type] || '📝';
}

export function getReminderTypeLabel(type: ReminderType): string {
  const labels: Record<ReminderType, string> = {
    call: 'Phone Call',
    email: 'Email',
    meeting: 'Meeting',
    task: 'Task',
    followup: 'Follow-up',
    quote: 'Quote',
    document: 'Document',
  };
  return labels[type] || 'Task';
}

export function getReminderPriorityColor(priority: ReminderPriority): string {
  const colors: Record<ReminderPriority, string> = {
    high: 'red',
    medium: 'yellow',
    low: 'green',
  };
  return colors[priority] || 'gray';
}

export function getReminderPriorityLabel(priority: ReminderPriority): string {
  const labels: Record<ReminderPriority, string> = {
    high: 'High Priority',
    medium: 'Medium Priority',
    low: 'Low Priority',
  };
  return labels[priority] || 'Medium Priority';
}

export function formatReminderTime(time: string | null | undefined, isAllDay: boolean): string {
  if (isAllDay || !time) return 'All Day';
  
  // Convert 24-hour time to 12-hour format
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}
