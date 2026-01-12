// TypeScript types and interfaces for List App React

// =====================================================
// CORE DATA TYPES
// =====================================================

export type LeadStatus = 'new' | 'leads' | 'working' | 'bad' | 'later' | 'signed';
export type ImportSourceType = 'scraper' | 'excel';
export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ReminderStatus = 'today' | 'tomorrow' | 'upcoming' | 'overdue' | 'future';

// Lead status options for dropdowns
export const LEAD_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'New (Main Sheet)' },
  { value: 'leads', label: 'Leads' },
  { value: 'working', label: 'Working On' },
  { value: 'later', label: 'Later Stage' },
  { value: 'bad', label: 'Bad Leads' },
  { value: 'signed', label: 'Signed' },
];

// Status colors for UI
export const STATUS_COLORS: Record<LeadStatus, string> = {
  new: 'gray',
  leads: 'blue',
  working: 'purple',
  later: 'orange',
  bad: 'red',
  signed: 'green',
};

// =====================================================
// DATABASE INTERFACES
// =====================================================

export interface Lead {
  id: string;
  maps_address: string;
  number: number;
  name: string;
  phone: string | null;
  provider: string | null;
  address: string | null;
  town: string | null; // NEW: Town/City field
  contact_person: string | null; // NEW: Contact person name
  type_of_business: string | null;
  status: LeadStatus;
  notes: string | null;
  date_to_call_back: string | null; // ISO date string
  dateSigned: string | null; // NEW: Date when lead was signed (ISO date string) - matches DB column "dateSigned"
  coordinates: Coordinates | null;
  background_color: string | null; // For "No Good" marking
  list_name: string | null; // NEW: List name for multi-list management (e.g., "Potchefstroom", "Klerksdorp")
  attachments?: LeadAttachment[]; // NEW: File attachments
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
  user_id: string;
  import_session_id: string | null;
}

export interface Route {
  id: string;
  name: string;
  route_url: string;
  stop_count: number;
  lead_ids: string[]; // Array of lead UUIDs
  starting_point?: string; // NEW: Starting point for route
  notes?: string; // NEW: Route notes
  created_at: string; // ISO datetime string
  user_id: string;
}

export interface LeadAttachment {
  id: string;
  lead_id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string; // Path in PostgreSQL Storage
  description?: string;
  created_at: string;
}

export interface ImportSession {
  id: string;
  source_type: ImportSourceType;
  source_id: string | null; // Scraper session ID
  file_name: string | null;
  list_name: string | null; // NEW: Name of the list being imported (e.g., "Potchefstroom")
  total_records: number;
  imported_records: number;
  failed_records: number;
  status: ImportStatus;
  error_log: ImportError[] | null;
  created_at: string; // ISO datetime string
  user_id: string;
}

export interface LeadNote {
  id: string;
  lead_id: string;
  user_id: string;
  content: string;
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
}

export type InteractionType = 
  | 'status_change' 
  | 'note_added' 
  | 'note_updated' 
  | 'note_deleted'
  | 'lead_created' 
  | 'lead_updated' 
  | 'callback_scheduled' 
  | 'callback_completed';

export interface LeadInteraction {
  id: string;
  lead_id: string;
  user_id: string;
  interaction_type: InteractionType;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, any> | null;
  created_at: string; // ISO datetime string
}

// =====================================================
// UTILITY INTERFACES
// =====================================================

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ImportError {
  row: number;
  field: string;
  value: any;
  error: string;
  timestamp: string;
}

export interface LeadStats {
  user_id: string;
  total_leads: number;
  leads_count: number;
  working_count: number;
  bad_count: number;
  later_count: number;
  signed_count: number;
  callbacks_today: number;
  callbacks_upcoming: number;
}

export interface RouteStats {
  total_routes: number;
  total_stops: number;
  avg_stops_per_route: number;
  routes_this_month: number;
}

export interface CallbackReminder extends Lead {
  reminder_status: ReminderStatus;
}

// =====================================================
// FORM AND INPUT INTERFACES
// =====================================================

export interface LeadFormData {
  maps_address: string;
  name: string;
  phone?: string;
  provider?: string;
  address?: string;
  type_of_business?: string;
  status?: LeadStatus;
  notes?: string;
  date_to_call_back?: string;
}

export interface RouteFormData {
  name: string;
  lead_ids: string[];
}

export interface ImportFormData {
  source_type: ImportSourceType;
  source_id?: string;
  file?: File;
}

export interface NoteFormData {
  content: string;
  lead_id: string;
}

// =====================================================
// SEARCH AND FILTER INTERFACES
// =====================================================

export interface LeadSearchFilters {
  searchTerm?: string;
  status?: LeadStatus;
  provider?: string;
  business_type?: string;
  date_from?: string;
  date_to?: string;
  callback_date_from?: string;
  callback_date_to?: string;
  list_name?: string; // NEW: Filter by list name
}

export interface LeadSortOptions {
  field: keyof Lead;
  direction: 'asc' | 'desc';
}

// =====================================================
// API RESPONSE INTERFACES
// =====================================================

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface LeadBulkActionResult {
  successful: string[]; // Lead IDs
  failed: Array<{
    id: string;
    error: string;
  }>;
}

// =====================================================
// COMPONENT PROP INTERFACES
// =====================================================

export interface LeadCardProps {
  lead: Lead;
  onStatusChange: (leadId: string, status: LeadStatus) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (leadId: string) => void;
  isSelected?: boolean;
  onSelect?: (leadId: string) => void;
  showActions?: boolean;
}

export interface LeadTableProps {
  leads: Lead[];
  onStatusChange: (leadId: string, status: LeadStatus) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (leadId: string) => void;
  onBulkAction: (leadIds: string[], action: string) => void;
  sortOptions: LeadSortOptions;
  onSort: (options: LeadSortOptions) => void;
  selectedLeads?: string[];
  onSelectionChange?: (leadIds: string[]) => void;
}

export interface StatusManagerProps {
  lead: Lead;
  onStatusChange: (leadId: string, status: LeadStatus, additionalData?: any) => void;
  disabled?: boolean;
}

export interface RouteGeneratorProps {
  leads: Lead[];
  onRouteGenerated: (route: Route) => void;
  maxLeads?: number;
}

export interface ImportPreviewProps {
  data: any[];
  fieldMapping: Record<string, string>;
  onFieldMappingChange: (mapping: Record<string, string>) => void;
  onImport: () => void;
  onCancel: () => void;
  isImporting?: boolean;
}

export interface NotesListProps {
  leadId: string;
  notes: LeadNote[];
  onAddNote: (content: string) => Promise<void>;
  onUpdateNote: (noteId: string, content: string) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  isLoading?: boolean;
}

export interface InteractionHistoryProps {
  leadId: string;
  interactions: LeadInteraction[];
  isLoading?: boolean;
}

// =====================================================
// STORE INTERFACES (Zustand)
// =====================================================

export interface LeadsStore {
  leads: Lead[];
  workingLeads: Lead[];
  selectedLeads: string[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchLeads: (filters?: LeadSearchFilters) => Promise<void>;
  fetchLeadsByStatus: (status: LeadStatus) => Promise<void>;
  createLead: (leadData: LeadFormData) => Promise<Lead>;
  updateLead: (leadId: string, updates: Partial<Lead>) => Promise<Lead>;
  deleteLead: (leadId: string) => Promise<void>;
  bulkUpdateLeads: (leadIds: string[], updates: Partial<Lead>) => Promise<LeadBulkActionResult>;
  changeLeadStatus: (leadId: string, status: LeadStatus, additionalData?: any) => Promise<void>;
  selectLead: (leadId: string) => void;
  deselectLead: (leadId: string) => void;
  clearSelection: () => void;
  searchLeads: (filters: LeadSearchFilters) => Promise<void>;
  renumberLeads: (status: LeadStatus) => Promise<void>;
}

export interface RoutesStore {
  routes: Route[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchRoutes: () => Promise<void>;
  createRoute: (routeData: RouteFormData) => Promise<Route>;
  deleteRoute: (routeId: string) => Promise<void>;
  generateRouteFromLeads: (leads: Lead[]) => Promise<Route>;
}

export interface ImportStore {
  sessions: ImportSession[];
  currentSession: ImportSession | null;
  isImporting: boolean;
  error: string | null;
  
  // Actions
  fetchImportSessions: () => Promise<void>;
  createImportSession: (sessionData: ImportFormData) => Promise<ImportSession>;
  updateImportSession: (sessionId: string, updates: Partial<ImportSession>) => Promise<void>;
  importFromExcel: (file: File, fieldMapping: Record<string, string>) => Promise<ImportSession>;
  importFromScraper: (scraperId: string) => Promise<ImportSession>;
  getImportProgress: (sessionId: string) => Promise<ImportSession>;
}

// =====================================================
// UTILITY TYPE HELPERS
// =====================================================

export type CreateLeadInput = Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'number'>;
export type UpdateLeadInput = Partial<Omit<Lead, 'id' | 'created_at' | 'user_id'>>;

export type CreateRouteInput = Omit<Route, 'id' | 'created_at' | 'user_id'>;
export type UpdateRouteInput = Partial<Omit<Route, 'id' | 'created_at' | 'user_id'>>;

export type CreateImportSessionInput = Omit<ImportSession, 'id' | 'created_at' | 'user_id' | 'imported_records' | 'failed_records'>;
export type UpdateImportSessionInput = Partial<Omit<ImportSession, 'id' | 'created_at' | 'user_id'>>;

// =====================================================
// VALIDATION SCHEMAS (for use with validation libraries)
// =====================================================

export interface LeadValidationRules {
  maps_address: {
    required: boolean;
    minLength?: number;
    pattern?: RegExp;
  };
  name: {
    required: boolean;
    minLength: number;
    maxLength: number;
  };
  phone: {
    required: boolean;
    pattern?: RegExp;
  };
  provider: {
    required: boolean;
    allowedValues?: string[];
  };
  status: {
    required: boolean;
    allowedValues: LeadStatus[];
  };
  date_to_call_back: {
    required: boolean;
    minDate?: Date;
  };
}

// =====================================================
// CONSTANTS
// =====================================================

export const IMPORT_SOURCE_TYPES: ImportSourceType[] = ['scraper', 'excel'];

export const IMPORT_STATUSES: ImportStatus[] = ['pending', 'processing', 'completed', 'failed'];

export const PROVIDER_PRIORITY: Record<string, number> = {
  'Telkom': 1,
  'Vodacom': 2,
  'MTN': 3,
  'Cell C': 4,
  'Other': 5
};

export const REMINDER_COLORS: Record<ReminderStatus, string> = {
  'today': 'green',
  'tomorrow': 'blue',
  'upcoming': 'blue',
  'overdue': 'red',
  'future': 'gray'
};

// =====================================================
// ERROR TYPES
// =====================================================

export class LeadValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: any
  ) {
    super(message);
    this.name = 'LeadValidationError';
  }
}

export class RouteGenerationError extends Error {
  constructor(
    message: string,
    public leads: Lead[],
    public reason: string
  ) {
    super(message);
    this.name = 'RouteGenerationError';
  }
}

export class ImportError extends Error {
  constructor(
    message: string,
    public sessionId: string,
    public errors: ImportError[]
  ) {
    super(message);
    this.name = 'ImportError';
  }
}