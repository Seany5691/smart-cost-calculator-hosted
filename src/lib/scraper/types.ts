// Core Business Data Types
export interface Business {
  id: string;
  maps_address: string;
  name: string;
  phone: string;
  provider: string;
  address: string;
  type_of_business: string;
  town: string;
  notes: string;
}

// Configuration Types
export interface ScrapingConfig {
  simultaneousTowns: number;
  simultaneousIndustries: number;
  simultaneousLookups: number;
  retryAttempts: number;
  retryDelay: number;
  browserHeadless: boolean;
  lookupBatchSize: number;
  outputFolder: string;
}

// Progress and State Types
export interface ProgressState {
  totalTowns: number;
  completedTowns: number;
  totalIndustries: number;
  completedIndustries: number;
  totalBusinesses: number;
  startTime: number;
  townCompletionTimes: number[];
}

export interface SessionSummary {
  totalTowns: number;
  completedTowns: number;
  totalLeads: number;
  totalErrors: number;
  totalDuration: number;
  averageDuration: number;
}

// Logging Types
export interface LogEntry {
  timestamp: string;
  message: string;
  level: 'info' | 'error' | 'success';
}

export interface TownLog {
  townName: string;
  startTime: number;
  endTime?: number;
  leadCount: number;
  status: 'in_progress' | 'completed' | 'error';
  errors: string[];
  industryProgress: Record<string, string>;
}

// Session Management Types
export interface SavedSession {
  id: string;
  name: string;
  data: Business[];
  fullLog: string[];
  summary: string[];
  towns: string;
  currentTowns: string[];
  currentIndustries: string[];
  exportPaths: string[];
  industries: string[];
  outputFolder: string;
  createdAt: string;
}

// Export Types
export interface ExportOptions {
  addHyperlinks: boolean;
  townAsLastColumn: boolean;
  sanitizeFilename: boolean;
}

export interface ProviderExportData {
  businesses: Business[];
  selectedProviders: string[];
  towns: string[];
  outputFolder: string;
}

// API Request/Response Types
export interface StartScrapeRequest {
  towns: string[];
  industries: string[];
  config: {
    simultaneousTowns: number;
    simultaneousIndustries: number;
    simultaneousLookups: number;
  };
}

export interface StartScrapeResponse {
  sessionId: string;
  status: 'started';
}

export interface ScrapingStatusEvent {
  type: 'progress' | 'log' | 'complete' | 'error';
  data: {
    percentage?: number;
    townsRemaining?: number;
    businessesScraped?: number;
    estimatedTime?: number;
    log?: LogEntry;
    businesses?: Business[];
    error?: string;
  };
}

export interface StopScrapeResponse {
  status: 'stopped';
  businessesCollected: number;
}

export interface PauseScrapeResponse {
  status: 'paused';
}

export interface ResumeScrapeResponse {
  status: 'resumed';
}

export interface SaveSessionRequest {
  name: string;
  businesses: Business[];
  config: ScrapingConfig;
  summary: SessionSummary;
}

export interface SaveSessionResponse {
  sessionId: string;
  success: boolean;
}

export interface ListSessionsResponse {
  sessions: SavedSession[];
}

export interface LoadSessionResponse {
  session: {
    id: string;
    name: string;
    businesses: Business[];
    config: ScrapingConfig;
    summary: SessionSummary;
    created_at: string;
  };
}

export interface ExportExcelRequest {
  businesses: Business[];
  filename: string;
  addHyperlinks?: boolean;
}

export interface ExportProvidersRequest {
  businesses: Business[];
  selectedProviders: string[];
  towns: string[];
  filename: string;
}

export interface ExportSummaryRequest {
  logs: string[];
  summary: {
    town: string;
    businessCount: number;
    status: string;
  }[];
  filename: string;
}

// Scraping Status Type
export type ScrapingStatus = 'idle' | 'running' | 'paused' | 'stopped' | 'completed' | 'error';

// Industry Management Types
export interface IndustryCategory {
  id: string;
  user_id: string | null;
  name: string;
  is_default: boolean;
  created_at: string;
}

// Component Props Types (for UI components)
export interface TownInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

export interface IndustrySelectorProps {
  industries: string[];
  selectedIndustries: string[];
  onSelectionChange: (selected: string[]) => void;
  onAddIndustry: (industry: string) => void;
  onRemoveIndustry: (industry: string) => void;
  disabled: boolean;
}

export interface ConcurrencyControlsProps {
  simultaneousTowns: number;
  simultaneousIndustries: number;
  simultaneousLookups: number;
  onTownsChange: (value: number) => void;
  onIndustriesChange: (value: number) => void;
  onLookupsChange: (value: number) => void;
  disabled: boolean;
}

export interface ControlPanelProps {
  status: ScrapingStatus;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onSave: () => void;
  onLoad: () => void;
  onClear: () => void;
  onExport: () => void;
  hasData: boolean;
}

export interface ProgressDisplayProps {
  percentage: number;
  townsRemaining: number;
  totalTowns: number;
  businessesScraped: number;
  estimatedTimeRemaining: number | null;
  elapsedTime: number;
}

export interface LogViewerProps {
  logs: LogEntry[];
  autoScroll: boolean;
}

export interface ResultsTableProps {
  businesses: Business[];
  onExport: () => void;
}

export interface SessionManagerProps {
  isOpen: boolean;
  mode: 'save' | 'load';
  sessions: SavedSession[];
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  onLoad: (sessionId: string) => Promise<void>;
}

export interface ProviderFilterProps {
  providers: string[];
  selectedProviders: string[];
  onSelectionChange: (selected: string[]) => void;
  onExport: () => void;
  visible: boolean;
}

export interface OutputFolderSelectorProps {
  currentFolder: string;
  onFolderSelect: (folder: string) => void;
  disabled: boolean;
}

export interface IndustryManagementPanelProps {
  isOpen: boolean;
  industries: string[];
  selectedIndustries: string[];
  onToggle: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onAdd: (industry: string) => void;
  onRemove: (industries: string[]) => void;
  onSelectionChange: (selected: string[]) => void;
}

export interface SummaryStatsProps {
  totalTowns: number;
  totalBusinesses: number;
  totalDuration: number;
  averageBusinessesPerTown: number;
}

// Utility Types
export type LogLevel = 'info' | 'error' | 'success' | 'warning';

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}

// Worker and Service Types
export interface WorkerConfig {
  workerId: number;
  config: ScrapingConfig;
}

export interface ScraperEventData {
  type: 'town_start' | 'town_complete' | 'industry_progress' | 'error' | 'business_found';
  town?: string;
  industry?: string;
  message?: string;
  business?: Business;
  leadCount?: number;
  duration?: number;
}

// Database Schema Types (matching PostgreSQL tables)
export interface ScrapingSessionDB {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  config: ScrapingConfig;
  summary: SessionSummary;
}

export interface ScrapedBusinessDB {
  id: string;
  session_id: string;
  maps_address: string | null;
  name: string;
  phone: string | null;
  provider: string | null;
  address: string | null;
  type_of_business: string;
  town: string;
  notes: string | null;
  created_at: string;
}
