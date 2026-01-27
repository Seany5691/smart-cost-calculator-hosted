'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useScraperStore } from '@/lib/store/scraper';
import { useAuthStore } from '@/lib/store/auth-simple';
import { useScraperSSE } from '@/hooks/useScraperSSE';
import { useAutoExport } from '@/hooks/useAutoExport';
import { useToast } from '@/components/ui/Toast/useToast';
import { Loader2 } from 'lucide-react';
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
    toast.success('Data cleared', {
      message: 'All scraping data has been cleared',
      section: 'scraper'
    });
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
      
      toast.success('Export successful', {
        message: `Downloaded ${filename}`,
        section: 'scraper'
      });
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Export failed', {
        message: 'Failed to export data. Please try again.',
        section: 'scraper'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportToLeads = async () => {
    if (businesses.length === 0) {
      toast.warning('No businesses to export', {
        message: 'Please scrape some businesses first',
        section: 'scraper'
      });
      return;
    }

    setShowExportToLeadsPrompt(true);
  };

  const handleConfirmExportToLeads = async () => {
    if (!leadListName || leadListName.trim() === '') {
      toast.warning('List name required', {
        message: 'Please enter a name for the lead list',
        section: 'scraper'
      });
      return;
    }

    setShowExportToLeadsPrompt(false);
    setIsExporting(true);
    try {
      // Get token from auth-storage
      const authStorage = localStorage.getItem('auth-storage');
      if (!authStorage) {
        toast.error('Authentication required', {
          message: 'Please log in to export to leads',
          section: 'scraper'
        });
        return;
      }

      const authData = JSON.parse(authStorage);
      const token = authData.token;
      
      if (!token) {
        toast.error('Authentication required', {
          message: 'Please log in to export to leads',
          section: 'scraper'
        });
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
            mapsUrl: '',
            provider: b.provider,
          })),
          listName: leadListName.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to export to leads');
      }

      const result = await response.json();
      toast.success('Export to leads successful', {
        message: `Exported ${result.importedCount} businesses to list: ${leadListName}`,
        section: 'scraper'
      });
      setLeadListName('Scraped Leads'); // Reset for next time
    } catch (error: any) {
      console.error('Error exporting to leads:', error);
      toast.error('Export to leads failed', {
        message: error.message || 'An error occurred',
        section: 'scraper'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveSession = async (name: string) => {
    if (!sessionId) {
      toast.warning('No active session', {
        message: 'Please start scraping to create a session',
        section: 'scraper'
      });
      return;
    }

    setIsSaving(true);
    try {
      // Get token from auth-storage
      const authStorage = localStorage.getItem('auth-storage');
      if (!authStorage) {
        toast.error('Authentication required', {
          message: 'Please log in to save sessions',
          section: 'scraper'
        });
        return;
      }

      const authData = JSON.parse(authStorage);
      const token = authData.token;
      
      if (!token) {
        toast.error('Authentication required', {
          message: 'Please log in to save sessions',
          section: 'scraper'
        });
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
      toast.success('Session saved', {
        message: `Saved ${result.businessesCount} businesses`,
        section: 'scraper'
      });
      setSessionManagerOpen(false);
    } catch (error: any) {
      console.error('Error saving session:', error);
      toast.error('Failed to save session', {
        message: error.message || 'An error occurred',
        section: 'scraper'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadSession = async (sessionId: string, sessionName: string) => {
    setIsLoading(true);
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (!authStorage) {
        toast.error('Authentication required', {
          message: 'Please log in to load sessions',
          section: 'scraper'
        });
        return;
      }

      const authData = JSON.parse(authStorage);
      const token = authData.token;
      
      if (!token) {
        toast.error('Authentication required', {
          message: 'Please log in to load sessions',
          section: 'scraper'
        });
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
      
      toast.success('Session loaded', {
        message: `Loaded ${data.businesses.length} businesses from "${sessionName}"`,
        section: 'scraper'
      });
      
      setSessionSelectorOpen(false);
    } catch (error: any) {
      console.error('Error loading session:', error);
      toast.error('Failed to load session', {
        message: error.message || 'Please try again',
        section: 'scraper'
      });
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
    
    toast.success('Reconnected to scraping session', {
      message: `Viewing live progress for: ${activeSession.name}`,
      section: 'scraper'
    });
  };

  const handleDismissBanner = () => {
    setShowActiveBanner(false);
    toast.info('Banner dismissed', {
      message: 'Scraping continues in background. You can reconnect anytime.',
      section: 'scraper'
    });
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-teal-900 to-slate-900">
        <div className="flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-teal-400 animate-spin mb-4" />
          <div className="text-white text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-900 to-slate-900 py-4 lg:py-8 px-3 lg:px-4">
      <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="glass-card p-4 lg:p-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-1 lg:mb-2">
            Smart Scrape
          </h1>
          <p className="text-xs lg:text-sm text-gray-300">
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
      </div>
    </div>
  );
}
