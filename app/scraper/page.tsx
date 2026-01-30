'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useScraperStore } from '@/lib/store/scraper';
import { useAuthStore } from '@/lib/store/auth-simple';
import { useScraperSSE } from '@/hooks/useScraperSSE';
import { useAutoExport } from '@/hooks/useAutoExport';
import { useToast } from '@/components/ui/Toast/useToast';
import { Loader2, FolderOpen, Gamepad2, Download, Play } from 'lucide-react';
import TownInput from '@/components/scraper/TownInput';
import IndustrySelector from '@/components/scraper/IndustrySelector';
import ConcurrencyControls from '@/components/scraper/ConcurrencyControls';
import ControlPanel from '@/components/scraper/ControlPanel';
import ProgressDisplay from '@/components/scraper/ProgressDisplay';
import LogViewer from '@/components/scraper/LogViewer';
import ProviderExport from '@/components/scraper/ProviderExport';
import ViewAllResults from '@/components/scraper/ViewAllResults';
import NumberLookup from '@/components/scraper/NumberLookup';
import BusinessLookup from '@/components/scraper/BusinessLookup';
import SessionManager from '@/components/scraper/SessionManager';
import SummaryStats from '@/components/scraper/SummaryStats';
import ClearConfirmModal from '@/components/scraper/ClearConfirmModal';
import ExportToLeadsModal from '@/components/scraper/ExportToLeadsModal';
import SessionSelector from '@/components/scraper/SessionSelector';
import ProviderLookupProgress from '@/components/scraper/ProviderLookupProgress';
import DuplicateWarningModal from '@/components/scraper/DuplicateWarningModal';
import ActiveSessionBanner from '@/components/scraper/ActiveSessionBanner';
import TemplateManager from '@/components/scraper/TemplateManager';
import ScrapingAnalytics from '@/components/scraper/ScrapingAnalytics';
import RetryFailedModal from '@/components/scraper/RetryFailedModal';
import BatchExportModal from '@/components/scraper/BatchExportModal';
import ExcelProviderLookup from '@/components/scraper/ExcelProviderLookup';

function getDefaultIndustries(): string[] {
  return [
    'Engineering Firms',
    'Pharmacies',
    'Medical Practices',
    'Dental Clinics',
    'Auto Repair Shops',
    'Law Firms',
    'Accounting Firms',
    'Financial Services',
    'Real Estate Agencies',
    'Manufacturing',
    'Construction Companies',
    'Logistics and Transportation',
    'Advertising Agencies',
    'Architecture Firms',
    'Insurance Agencies',
    'Property Management',
    'Funeral Parlours',
    'Optometrists',
    'Supermarkets',
    'Veterinary Clinics',
    'Restaurants and Cafes',
    'Hotels',
    'Fitness Centers',
    'Hair Salons and Barbershops',
    'Clothing Stores',
    'Electronics Retail Stores',
    'Educational Institutions',
    'Plumbing Companies',
    'Electrical Contractors',
    'Landscaping Services',
    'Catering Companies',
    'Travel Agencies',
    'Car Dealerships',
    'Printing and Copy Shops',
    'Wholesale Distributors',
    'Agricultural Farms and Suppliers',
    'Chiropractors',
    'Orthodontic Practices',
    'Tire Shops',
    'Tax Preparation Services',
    'Real Estate Firms',
    'Freight Companies',
    'Marketing Firms',
    'Interior Design Firms',
    'Security Services',
  ];
}

export default function ScraperPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate auth store from localStorage
  useEffect(() => {
    useAuthStore.getState().hydrate();
    setIsHydrated(true);
  }, []);

  // Redirect to login if not authenticated or unauthorized role
  useEffect(() => {
    if (isHydrated) {
      const { user } = useAuthStore.getState();
      if (!isAuthenticated) {
        router.push('/login');
      } else if (user && !['admin', 'manager', 'telesales'].includes(user.role)) {
        // Only admin, manager, and telesales can access scraper
        router.push('/');
      }
    }
  }, [isHydrated, isAuthenticated, router]);

  // Toast notifications
  const { toast } = useToast();

  // Zustand store
  const {
    status,
    sessionId,
    config,
    towns,
    industries,
    progress,
    lookupProgress,
    businesses,
    logs,
    setConfig,
    setTowns,
    setIndustries,
    startScraping,
    stopScraping,
    clearAll,
    addBusinesses, // Phase 1: For loading from database
  } = useScraperStore();

  // Connect to SSE for real-time updates
  useScraperSSE(sessionId, status === 'running');

  // Auto-export when scraping completes
  useAutoExport(status, businesses, true);

  // Local state
  const [townInput, setTownInput] = useState('');
  const [availableIndustries, setAvailableIndustries] = useState<string[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [sessionManagerOpen, setSessionManagerOpen] = useState(false);
  const [sessionManagerMode, setSessionManagerMode] = useState<'save' | 'load'>('save');
  const [sessionSelectorOpen, setSessionSelectorOpen] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showExportToLeadsPrompt, setShowExportToLeadsPrompt] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [leadListName, setLeadListName] = useState('Scraped Leads');
  
  // New Phase 3 & 4 modals
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [templateMode, setTemplateMode] = useState<'save' | 'load'>('load');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showRetryFailed, setShowRetryFailed] = useState(false);
  const [showBatchExport, setShowBatchExport] = useState(false);
  
  // Loading states for async operations
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Active session detection (Resume Viewing)
  const [activeSession, setActiveSession] = useState<any>(null);
  const [showActiveBanner, setShowActiveBanner] = useState(false);

  // Load industries from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('smart-scrape-industries');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setAvailableIndustries(parsed);
      } catch (error) {
        console.error('Error loading industries:', error);
        setAvailableIndustries(getDefaultIndustries());
      }
    } else {
      setAvailableIndustries(getDefaultIndustries());
    }

    // Load selected industries from localStorage
    const storedSelected = localStorage.getItem('smart-scrape-selected-industries');
    if (storedSelected) {
      try {
        const parsed = JSON.parse(storedSelected);
        setSelectedIndustries(parsed);
        setIndustries(parsed);
      } catch (error) {
        console.error('Error loading selected industries:', error);
      }
    }
  }, [setIndustries]);

  // Load most recent session from database on mount (CROSS-DEVICE SYNC)
  useEffect(() => {
    const loadMostRecentSession = async () => {
      try {
        const authStorage = localStorage.getItem('auth-storage');
        if (!authStorage) return;

        const authData = JSON.parse(authStorage);
        const token = authData.token;
        if (!token) return;

        // Fetch sessions from database
        const response = await fetch('/api/scraper/sessions', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) return;

        const data = await response.json();
        const sessions = data.sessions || [];

        // Find most recent completed session with businesses
        const recentSession = sessions.find(
          (s: any) => s.status === 'completed' && s.businessCount > 0
        );

        if (recentSession) {
          console.log('[Scraper] Loading most recent session from database:', recentSession.name);
          
          // Load businesses from this session
          const businessesResponse = await fetch(
            `/api/scraper/sessions/${recentSession.id}/businesses`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            }
          );

          if (businessesResponse.ok) {
            const businessesData = await businessesResponse.json();
            
            // Update store with businesses from database
            if (businessesData.businesses && businessesData.businesses.length > 0) {
              // Clear existing businesses first
              clearAll();
              // Add businesses from database
              addBusinesses(businessesData.businesses);
              
              console.log(
                `[Scraper] Loaded ${businessesData.businesses.length} businesses from session: ${businessesData.sessionName}`
              );
            }
          }
        }
      } catch (error) {
        console.error('[Scraper] Error loading recent session:', error);
        // Fail silently - not critical
      }
    };

    // Only load if authenticated and hydrated
    if (isHydrated && isAuthenticated) {
      loadMostRecentSession();
    }
  }, [isHydrated, isAuthenticated, addBusinesses, clearAll]);

  // Check for active scraping session (Resume Viewing)
  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        const authStorage = localStorage.getItem('auth-storage');
        if (!authStorage) return;

        const authData = JSON.parse(authStorage);
        const token = authData.token;
        if (!token) return;

        // Check if user has an active session
        const response = await fetch('/api/scraper/active-session', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) return;

        const data = await response.json();

        if (data.hasActiveSession && data.session) {
          console.log('[Scraper] Active session detected:', data.session.name);
          setActiveSession(data.session);
          setShowActiveBanner(true);
        }
      } catch (error) {
        console.error('[Scraper] Error checking active session:', error);
        // Fail silently
      }
    };

    // Only check if authenticated, hydrated, and not currently scraping
    if (isHydrated && isAuthenticated && status === 'idle') {
      checkActiveSession();
    }
  }, [isHydrated, isAuthenticated, status]);

  useEffect(() => {
    if (industries.length > 0) {
      setSelectedIndustries(industries);
    }
  }, [industries]);

  // Update elapsed time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'running' && progress.startTime > 0) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - progress.startTime);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, progress.startTime]);

  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    if (progress.totalTowns === 0) return 0;
    return (progress.completedTowns / progress.totalTowns) * 100;
  }, [progress.completedTowns, progress.totalTowns]);

  // Calculate estimated time remaining
  const estimatedTimeRemaining = useMemo(() => {
    if (progress.completedTowns === 0 || progress.townCompletionTimes.length === 0) {
      return null;
    }
    const avgTime =
      progress.townCompletionTimes.reduce((a, b) => a + b, 0) /
      progress.townCompletionTimes.length;
    const remaining = progress.totalTowns - progress.completedTowns;
    return avgTime * remaining;
  }, [progress.completedTowns, progress.totalTowns, progress.townCompletionTimes]);

  // Handlers
  const handleTownInputChange = (value: string) => {
    setTownInput(value);
    const townList = value
      .split('\n')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    setTowns(townList);
  };

  const handleIndustrySelectionChange = (selected: string[]) => {
    setSelectedIndustries(selected);
    setIndustries(selected);
    localStorage.setItem('smart-scrape-selected-industries', JSON.stringify(selected));
  };

  const handleAddIndustry = (industry: string) => {
    const updated = [...availableIndustries, industry];
    setAvailableIndustries(updated);
    localStorage.setItem('smart-scrape-industries', JSON.stringify(updated));
  };

  const handleRemoveIndustry = (industry: string) => {
    const updated = availableIndustries.filter((i) => i !== industry);
    const updatedSelected = selectedIndustries.filter((i) => i !== industry);
    setAvailableIndustries(updated);
    setSelectedIndustries(updatedSelected);
    localStorage.setItem('smart-scrape-industries', JSON.stringify(updated));
    localStorage.setItem('smart-scrape-selected-industries', JSON.stringify(updatedSelected));
  };

  const handleStart = async () => {
    // Phase 2: Check for duplicates before starting
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const authData = JSON.parse(authStorage);
        const token = authData.token;

        if (token) {
          const response = await fetch('/api/scraper/check-duplicates', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              towns,
              industries,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            
            if (data.hasDuplicates && data.duplicates.length > 0) {
              // Show duplicate warning modal
              setDuplicates(data.duplicates);
              setShowDuplicateWarning(true);
              return; // Don't start scraping yet
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking duplicates:', error);
      // Continue with scraping even if duplicate check fails
    }

    // No duplicates or user chose to continue
    startScraping();
  };

  const handleContinueWithDuplicates = () => {
    setShowDuplicateWarning(false);
    startScraping();
  };

  const handleLoadDuplicateSession = async (sessionId: string) => {
    setShowDuplicateWarning(false);
    // Find the session name from duplicates
    const duplicate = duplicates.find(d => d.sessionId === sessionId);
    if (duplicate) {
      await handleLoadSession(sessionId, duplicate.sessionName);
    }
  };

  const handleStop = () => {
    stopScraping();
  };

  const handleSave = () => {
    setSessionManagerMode('save');
    setSessionManagerOpen(true);
  };

  const handleLoad = () => {
    setSessionSelectorOpen(true);
  };

  const handleClear = () => {
    setShowClearConfirm(true);
  };

  const handleConfirmClear = () => {
    clearAll();
    setTownInput('');
    setShowClearConfirm(false);
    toast.success('All scraping data has been cleared');
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `businesses_${timestamp}.xlsx`;

      const response = await fetch('/api/scraper/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businesses,
          filename,
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Downloaded ${filename}`);
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportToLeads = async () => {
    if (businesses.length === 0) {
      toast.warning('No businesses to export. Please scrape some businesses first.');
      return;
    }

    setShowExportToLeadsPrompt(true);
  };

  const handleConfirmExportToLeads = async (listName: string) => {
    if (!listName || listName.trim() === '') {
      toast.warning('List name required. Please enter a name for the lead list.');
      return;
    }

    setShowExportToLeadsPrompt(false);
    setIsExporting(true);
    try {
      // Get token from auth-storage
      const authStorage = localStorage.getItem('auth-storage');
      if (!authStorage) {
        toast.error('Authentication required. Please log in to export to leads.');
        return;
      }

      const authData = JSON.parse(authStorage);
      const token = authData.token;
      
      if (!token) {
        toast.error('Authentication required. Please log in to export to leads.');
        return;
      }

      const response = await fetch('/api/leads/import/scraper-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          businesses: businesses.map(b => ({
            name: b.name,
            phone: b.phone,
            address: b.address || '',
            town: b.town,
            typeOfBusiness: b.industry,
            mapsUrl: b.website || '',
            provider: b.provider,
          })),
          listName: listName.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to export to leads');
      }

      const result = await response.json();
      toast.success(`Exported ${result.importedCount} businesses to list: ${listName}`);
      setLeadListName('Scraped Leads'); // Reset for next time
    } catch (error: any) {
      console.error('Error exporting to leads:', error);
      toast.error(`Export to leads failed: ${error.message || 'An error occurred'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveSession = async (name: string) => {
    if (!sessionId) {
      toast.warning('No active session. Please start scraping to create a session.');
      return;
    }

    setIsSaving(true);
    try {
      // Get token from auth-storage
      const authStorage = localStorage.getItem('auth-storage');
      if (!authStorage) {
        toast.error('Authentication required. Please log in to save sessions.');
        return;
      }

      const authData = JSON.parse(authStorage);
      const token = authData.token;
      
      if (!token) {
        toast.error('Authentication required. Please log in to save sessions.');
        return;
      }

      // Save session to database via API
      const response = await fetch('/api/scraper/sessions/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId,
          name: name.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save session');
      }

      const result = await response.json();
      toast.success(`Session saved: ${result.businessesCount} businesses`);
      setSessionManagerOpen(false);
    } catch (error: any) {
      console.error('Error saving session:', error);
      toast.error(`Failed to save session: ${error.message || 'An error occurred'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadSession = async (sessionId: string, sessionName: string) => {
    setIsLoading(true);
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (!authStorage) {
        toast.error('Authentication required. Please log in to load sessions.');
        return;
      }

      const authData = JSON.parse(authStorage);
      const token = authData.token;
      
      if (!token) {
        toast.error('Authentication required. Please log in to load sessions.');
        return;
      }

      // Fetch businesses from database
      const response = await fetch(`/api/scraper/sessions/${sessionId}/businesses`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to load session');
      }

      const data = await response.json();
      
      // Clear existing data and load from database
      clearAll();
      addBusinesses(data.businesses);
      
      toast.success(`Loaded ${data.businesses.length} businesses from "${sessionName}"`);
      
      setSessionSelectorOpen(false);
    } catch (error: any) {
      console.error('Error loading session:', error);
      toast.error(`Failed to load session: ${error.message || 'Please try again'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const isActive = status === 'running' || status === 'paused';
  const hasData = businesses.length > 0;

  // Handlers for active session banner
  const handleReconnect = () => {
    if (!activeSession) return;
    
    // Set session ID and status to reconnect using store actions
    useScraperStore.getState().setSessionId(activeSession.id);
    useScraperStore.getState().setStatus('running');
    setShowActiveBanner(false);
    
    toast.success(`Reconnected to scraping session: ${activeSession.name}`);
  };

  const handleDismissBanner = () => {
    setShowActiveBanner(false);
    toast.info('Banner dismissed. Scraping continues in background.');
  };

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    return {
      totalTowns: progress.completedTowns,
      totalBusinesses: businesses.length,
      totalDuration: elapsedTime,
      averageBusinessesPerTown:
        progress.completedTowns > 0 ? businesses.length / progress.completedTowns : 0,
    };
  }, [progress.completedTowns, businesses.length, elapsedTime]);

  // Show loading while checking authentication
  if (!isHydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-rose-900 to-slate-900">
        <div className="flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-rose-400 animate-spin mb-4" />
          <div className="text-white text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-rose-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Blobs - Red/Rose Theme */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-red-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 py-4 lg:py-8 px-3 lg:px-4">
        <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="glass-card p-4 lg:p-6">
          <h1 className="text-3xl lg:text-4xl font-bold mb-2 bg-gradient-to-r from-rose-400 to-red-400 bg-clip-text text-transparent">
            Smart Scrape
          </h1>
          <p className="text-gray-300">
            Scrape business data from Google Maps for multiple towns and industries
          </p>
        </div>

        {/* Active Session Banner (Resume Viewing) */}
        {showActiveBanner && activeSession && (
          <ActiveSessionBanner
            sessionName={activeSession.name}
            sessionId={activeSession.id}
            createdAt={activeSession.createdAt}
            onReconnect={handleReconnect}
            onDismiss={handleDismissBanner}
          />
        )}

        {/* Lookup Tools - Side by Side on desktop, stacked on mobile */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Number Lookup */}
          <div className="glass-card p-4 lg:p-6 w-full lg:w-1/2">
            <NumberLookup />
          </div>

          {/* Business Lookup */}
          <div className="glass-card p-4 lg:p-6 w-full lg:w-1/2">
            <BusinessLookup />
          </div>
        </div>

        {/* Excel Provider Lookup - Full Width */}
        <div className="glass-card p-4 lg:p-6">
          <ExcelProviderLookup
            onComplete={(results) => {
              console.log('[Scraper] Excel provider lookup completed:', results.length, 'businesses');
              toast.success(`Excel provider lookup completed: ${results.length} businesses processed`);
            }}
          />
        </div>

        {/* Progress & Summary Stats (Top Section) - Stacked on mobile */}
        {(isActive || status === 'completed' || status === 'stopped' || hasData) && (
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            {/* Progress Display */}
            {(isActive || status === 'completed' || status === 'stopped') && (
              <div className="glass-card p-4 lg:p-6 w-full lg:w-1/2">
                <ProgressDisplay
                  percentage={progressPercentage}
                  townsRemaining={progress.totalTowns - progress.completedTowns}
                  totalTowns={progress.totalTowns}
                  businessesScraped={businesses.length}
                  estimatedTimeRemaining={estimatedTimeRemaining}
                  elapsedTime={elapsedTime}
                />
              </div>
            )}

            {/* Summary Stats */}
            {(status === 'completed' || status === 'stopped') && hasData && (
              <div className="glass-card p-4 lg:p-6 w-full lg:w-1/2">
                <SummaryStats {...summaryStats} />
              </div>
            )}
          </div>
        )}

        {/* Provider Lookup Progress (Phase 2) */}
        {lookupProgress.isActive && (
          <ProviderLookupProgress
            completed={lookupProgress.completed}
            total={lookupProgress.total}
            percentage={lookupProgress.percentage}
            currentBatch={lookupProgress.currentBatch}
            totalBatches={lookupProgress.totalBatches}
            isActive={lookupProgress.isActive}
          />
        )}

        {/* Configuration Section - Stacked vertically on mobile, paired on desktop */}
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Row 1: Towns & Industries */}
          <div className="glass-card p-4 lg:p-6 w-full lg:w-auto">
            <TownInput
              value={townInput}
              onChange={handleTownInputChange}
              disabled={isActive}
            />
          </div>

          <div className="glass-card p-4 lg:p-6 w-full lg:w-auto">
            <IndustrySelector
              industries={availableIndustries}
              selectedIndustries={selectedIndustries}
              onSelectionChange={handleIndustrySelectionChange}
              onAddIndustry={handleAddIndustry}
              onRemoveIndustry={handleRemoveIndustry}
              disabled={isActive}
              onTemplatesClick={() => {
                setTemplateMode('load');
                setShowTemplateManager(true);
              }}
            />
          </div>

          {/* Row 2: Controls & Concurrency */}
          <div className="glass-card p-4 lg:p-6 w-full lg:w-auto">
            <ControlPanel
              status={status}
              onStart={handleStart}
              onStop={handleStop}
              onSave={handleSave}
              onLoad={handleLoad}
              onClear={handleClear}
              onExport={handleExport}
              onExportToLeads={handleExportToLeads}
              onBatchExport={() => setShowBatchExport(true)}
              hasData={hasData}
              isSaving={isSaving}
              isLoading={isLoading}
              isExporting={isExporting}
            />
          </div>

          <div className="glass-card p-4 lg:p-6 w-full lg:w-auto">
            <ConcurrencyControls
              simultaneousTowns={config.simultaneousTowns}
              simultaneousIndustries={config.simultaneousIndustries}
              simultaneousLookups={config.simultaneousLookups}
              onTownsChange={(value) => setConfig({ simultaneousTowns: value })}
              onIndustriesChange={(value) => setConfig({ simultaneousIndustries: value })}
              onLookupsChange={(value) => setConfig({ simultaneousLookups: value })}
              disabled={isActive}
            />
            
            {/* Provider Lookup Toggle */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enableProviderLookup}
                  onChange={(e) => setConfig({ enableProviderLookup: e.target.checked })}
                  disabled={isActive}
                  className="w-5 h-5 rounded border-2 border-rose-400/30 bg-slate-800/50 checked:bg-rose-500 checked:border-rose-500 focus:ring-2 focus:ring-rose-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">Enable Provider Lookups</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Automatically lookup network providers after scraping phone numbers
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Row 3: Activity Log & Provider Export */}
          <div className="glass-card p-4 lg:p-6 w-full lg:w-auto">
            <LogViewer logs={logs} autoScroll={true} />
          </div>

          {hasData ? (
            <div className="glass-card p-4 lg:p-6 w-full lg:w-auto">
              <ProviderExport businesses={businesses} />
            </div>
          ) : (
            <div className="glass-card p-4 lg:p-6 w-full lg:w-auto flex items-center justify-center">
              <p className="text-sm text-gray-400 text-center">
                Provider export will appear here after scraping
              </p>
            </div>
          )}
        </div>

        {/* View All Results (Dropdown) */}
        {hasData && (
          <div className="glass-card p-4 lg:p-6">
            <ViewAllResults businesses={businesses} />
          </div>
        )}

        {/* Analytics Card - Below View All Results */}
        {hasData && (
          <ScrapingAnalytics
            isOpen={true}
            onClose={() => {}}
            businesses={businesses}
            progress={progress}
            elapsedTime={elapsedTime}
          />
        )}

        {/* Retry Failed Button - Only show if there are failures */}
        {progress.failedTowns && progress.failedTowns.length > 0 && (
          <div className="glass-card p-4 lg:p-6">
            <button
              onClick={() => setShowRetryFailed(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition-all shadow-lg hover:shadow-orange-500/50"
            >
              <Play className="w-5 h-5" />
              <span className="font-medium">Retry Failed Towns ({progress.failedTowns.length})</span>
            </button>
          </div>
        )}
        </div>
      </div>

      {/* Session Manager Modal */}
      <SessionManager
          isOpen={sessionManagerOpen}
          mode={sessionManagerMode}
          sessions={[]}
          onClose={() => setSessionManagerOpen(false)}
          onSave={handleSaveSession}
          onLoad={(sessionId) => handleLoadSession(sessionId, '')}
        />

        {/* Session Selector Modal (Database Sessions) */}
        <SessionSelector
          isOpen={sessionSelectorOpen}
          onClose={() => setSessionSelectorOpen(false)}
          onLoadSession={handleLoadSession}
        />

        {/* Clear Confirmation Modal */}
        <ClearConfirmModal
          isOpen={showClearConfirm}
          onClose={() => setShowClearConfirm(false)}
          onConfirm={handleConfirmClear}
        />

        {/* Duplicate Warning Modal (Phase 2) */}
        <DuplicateWarningModal
          isOpen={showDuplicateWarning}
          duplicates={duplicates}
          onClose={() => setShowDuplicateWarning(false)}
          onContinue={handleContinueWithDuplicates}
          onLoadExisting={handleLoadDuplicateSession}
        />

        {/* Export to Leads Prompt Modal */}
        <ExportToLeadsModal
          isOpen={showExportToLeadsPrompt}
          onClose={() => {
            setShowExportToLeadsPrompt(false);
            setLeadListName('Scraped Leads');
          }}
          onConfirm={handleConfirmExportToLeads}
          businessCount={businesses.length}
          initialListName={leadListName}
        />

        {/* Template Manager Modal (Phase 3) */}
        <TemplateManager
          isOpen={showTemplateManager}
          mode={templateMode}
          onClose={() => setShowTemplateManager(false)}
          currentTowns={towns}
          currentIndustries={industries}
          onLoadTemplate={(loadedTowns, loadedIndustries) => {
            setTowns(loadedTowns);
            setIndustries(loadedIndustries);
            setTownInput(loadedTowns.join('\n'));
            setSelectedIndustries(loadedIndustries);
            setShowTemplateManager(false);
            toast.success('Template loaded successfully');
          }}
        />

        {/* Analytics Modal (Phase 4) */}
        <ScrapingAnalytics
          isOpen={showAnalytics}
          onClose={() => setShowAnalytics(false)}
          businesses={businesses}
          progress={progress}
          elapsedTime={elapsedTime}
        />

        {/* Retry Failed Modal (Phase 4) */}
        <RetryFailedModal
          isOpen={showRetryFailed}
          onClose={() => setShowRetryFailed(false)}
          failedTowns={progress.failedTowns || []}
          onRetry={() => {
            setShowRetryFailed(false);
            // TODO: Implement retry logic
            toast.info('Retry functionality will be implemented');
          }}
          onSkip={() => {
            setShowRetryFailed(false);
          }}
        />

        {/* Batch Export Modal (Phase 4) */}
        <BatchExportModal
          isOpen={showBatchExport}
          onClose={() => setShowBatchExport(false)}
          businesses={businesses}
          onExport={async (selectedBusinesses, listName) => {
            setShowBatchExport(false);
            // Use same export logic as handleConfirmExportToLeads
            setIsExporting(true);
            try {
              const authStorage = localStorage.getItem('auth-storage');
              if (!authStorage) {
                toast.error('Authentication required. Please log in to export to leads.');
                return;
              }

              const authData = JSON.parse(authStorage);
              const token = authData.token;
              
              if (!token) {
                toast.error('Authentication required. Please log in to export to leads.');
                return;
              }

              const response = await fetch('/api/leads/import/scraper-direct', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                  businesses: selectedBusinesses.map(b => ({
                    name: b.name,
                    phone: b.phone,
                    address: b.address || '',
                    town: b.town,
                    typeOfBusiness: b.industry,
                    mapsUrl: '',
                    provider: b.provider,
                  })),
                  listName: listName.trim(),
                }),
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to export to leads');
              }

              const result = await response.json();
              toast.success(`Batch export successful: Exported ${result.importedCount} businesses to list: ${listName}`);
            } catch (error: any) {
              console.error('Error exporting to leads:', error);
              toast.error(`Batch export failed: ${error.message || 'An error occurred'}`);
            } finally {
              setIsExporting(false);
            }
          }}
        />

        {/* CSS for blob animations */}
        <style jsx>{`
          @keyframes blob {
            0% {
              transform: translate(0px, 0px) scale(1);
            }
            33% {
              transform: translate(30px, -50px) scale(1.1);
            }
            66% {
              transform: translate(-20px, 20px) scale(0.9);
            }
            100% {
              transform: translate(0px, 0px) scale(1);
            }
          }
          .animate-blob {
            animation: blob 7s infinite;
          }
          .animation-delay-2000 {
            animation-delay: 2s;
          }
          .animation-delay-4000 {
            animation-delay: 4s;
          }
        `}</style>
    </div>
  );
}
