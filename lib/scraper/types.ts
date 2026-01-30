/**
 * Type definitions for the scraper service
 */

export interface ScrapeConfig {
  towns: string[];
  industries: string[];
  simultaneousTowns: number;
  simultaneousIndustries: number;
  simultaneousLookups: number;
  enableProviderLookup?: boolean; // Toggle to enable/disable provider lookups
}

export interface ScrapedBusiness {
  maps_address: string;
  name: string;
  phone: string;
  provider: string;
  address: string;
  type_of_business: string;
  town: string;
}

export interface SessionStatus {
  sessionId: string;
  status: 'running' | 'paused' | 'stopped' | 'completed' | 'error';
  progress: number;
  townsRemaining: number;
  businessesScraped: number;
  estimatedTimeRemaining: number;
  logs: LogEntry[];
  currentTown?: string;
  currentIndustry?: string;
}

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

export interface SessionSummary {
  totalTowns: number;
  completedTowns: number;
  totalLeads: number;
  totalErrors: number;
  totalDuration: number;
  averageDuration: number;
}

export interface ScrapingSession {
  id: string;
  userId: string;
  name: string;
  config: ScrapeConfig;
  status: 'running' | 'paused' | 'stopped' | 'completed' | 'error';
  progress: number;
  summary?: {
    totalBusinesses: number;
    townsCompleted: number;
    errors: number;
  };
  state?: {
    currentTownIndex: number;
    currentIndustryIndex: number;
    completedTowns: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ProviderInfo {
  provider: 'Telkom' | 'Vodacom' | 'MTN' | 'Cell C' | 'Other';
  confidence: number;
}
