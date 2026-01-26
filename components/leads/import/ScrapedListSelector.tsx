'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Database, Calendar, MapPin, Building2, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

// Helper function to get auth token from localStorage
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const data = JSON.parse(stored);
      return data.state?.token || data.token || null;
    }
  } catch (error) {
    console.error('[SCRAPED_LIST_SELECTOR] Error reading auth token from localStorage:', error);
  }
  return null;
}

interface ScraperSession {
  id: string;
  name: string;
  createdAt: string;
  businessCount: number;
  townsCompleted: number;
  status: 'completed' | 'running' | 'paused' | 'stopped' | 'error';
}

interface ScrapedListSelectorProps {
  onImportComplete?: () => void;
  onCancel?: () => void;
}

export default function ScrapedListSelector({ onImportComplete, onCancel }: ScrapedListSelectorProps) {
  const [sessions, setSessions] = useState<ScraperSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ScraperSession | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [listName, setListName] = useState<string>('');
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [step, setStep] = useState<'select' | 'preview' | 'importing'>('select');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Fetch scraper sessions
  const fetchScraperSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    setValidationErrors([]);
    
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/scraper/sessions', { headers });
      
      if (!response.ok) {
        throw new Error('Failed to fetch scraper sessions');
      }
      
      const data = await response.json();
      
      if (data.sessions && Array.isArray(data.sessions)) {
        setSessions(data.sessions);
      } else {
        setValidationErrors(['No scraper sessions available']);
      }
    } catch (err: any) {
      setValidationErrors([err.message || 'Failed to load scraper sessions']);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  // Load sessions on mount
  useEffect(() => {
    fetchScraperSessions();
  }, [fetchScraperSessions]);

  // Handle session selection
  const handleSessionSelect = useCallback(async (session: ScraperSession) => {
    setSelectedSession(session);
    setIsLoadingPreview(true);
    setValidationErrors([]);
    
    // Auto-fill list name from session name
    const autoName = session.name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    setListName(autoName);
    
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/scraper/sessions/${session.id}`, { headers });
      
      if (!response.ok) {
        throw new Error('Failed to fetch session data');
      }
      
      const data = await response.json();
      
      if (!data.businesses || !Array.isArray(data.businesses)) {
        throw new Error('Invalid session data');
      }
      
      // Map businesses to the format expected by the preview
      const mappedResults = data.businesses.map((business: any) => ({
        name: business.name,
        phone: business.phone,
        provider: business.provider,
        address: business.address,
        typeOfBusiness: business.type_of_business,
        mapsUrl: business.maps_address
      }));
      
      // Show preview (first 5 items)
      setPreviewData(mappedResults.slice(0, 5));
      setStep('preview');
    } catch (err: any) {
      setValidationErrors([err.message || 'Failed to load session preview']);
    } finally {
      setIsLoadingPreview(false);
    }
  }, []);

  // Handle import
  const handleImport = useCallback(async () => {
    if (!selectedSession) return;
    
    // Validate list name
    if (!listName || listName.trim() === '') {
      setValidationErrors(['Please enter a list name']);
      return;
    }
    
    setStep('importing');
    setIsImporting(true);
    
    try {
      const token = getAuthToken();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/leads/import/scraper', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionIds: [selectedSession.id],
          listName: listName.trim()
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Import failed');
      }
      
      setImportProgress(100);
      setTimeout(() => {
        onImportComplete?.();
      }, 500);
    } catch (err: any) {
      setValidationErrors([err.message || 'Import failed']);
      setStep('preview');
    } finally {
      setIsImporting(false);
    }
  }, [selectedSession, listName, onImportComplete]);

  // Reset to selection step
  const handleReset = useCallback(() => {
    setSelectedSession(null);
    setPreviewData([]);
    setListName('');
    setValidationErrors([]);
    setStep('select');
  }, []);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Render session selection step
  if (step === 'select') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">Import from Scraper</h3>
            <p className="text-emerald-200 text-sm">
              Select a scraped list from Smart Cost Calculator to import
            </p>
          </div>
          <button
            onClick={fetchScraperSessions}
            disabled={isLoadingSessions}
            className="p-2 text-emerald-200 hover:text-white transition-colors disabled:opacity-50"
            title="Refresh sessions"
          >
            <RefreshCw className={`w-5 h-5 ${isLoadingSessions ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Loading state */}
        {isLoadingSessions && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
        )}

        {/* Sessions list */}
        {!isLoadingSessions && sessions.length > 0 && (
          <div className="space-y-3">
            {sessions.map(session => (
              <button
                key={session.id}
                onClick={() => handleSessionSelect(session)}
                disabled={session.status !== 'completed'}
                className={`
                  w-full text-left p-4 rounded-xl border transition-all
                  ${session.status === 'completed'
                    ? 'bg-white/5 border-emerald-500/30 hover:border-emerald-500 hover:bg-white/10'
                    : 'bg-white/5 border-emerald-500/10 opacity-50 cursor-not-allowed'
                  }
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className={`
                      p-2 rounded-lg
                      ${session.status === 'completed' ? 'bg-green-500/20' : 'bg-white/10'}
                    `}>
                      <Database className={`
                        w-5 h-5
                        ${session.status === 'completed' ? 'text-green-400' : 'text-emerald-300'}
                      `} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium mb-1">{session.name}</h4>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-emerald-200">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(session.createdAt)}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <Building2 className="w-4 h-4" />
                          <span>{session.businessCount} results</span>
                        </div>
                        
                        {session.townsCompleted > 0 && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-4 h-4" />
                            <span>{session.townsCompleted} towns</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-3">
                    {session.status === 'completed' && (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    )}
                    {(session.status === 'running' || session.status === 'paused') && (
                      <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                    )}
                    {(session.status === 'error' || session.status === 'stopped') && (
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoadingSessions && sessions.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 mb-4">
              <Database className="w-8 h-8 text-emerald-300" />
            </div>
            <h4 className="text-white font-medium mb-2">No Scraper Sessions Found</h4>
            <p className="text-emerald-200 text-sm mb-4">
              No scraped lists are available from Smart Cost Calculator
            </p>
            <button
              onClick={fetchScraperSessions}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>
        )}

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-400 font-medium mb-1">Error</p>
                <ul className="text-sm text-red-300 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Cancel button */}
        {onCancel && (
          <div className="flex justify-end pt-4 border-t border-emerald-500/20">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-emerald-200 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    );
  }

  // Render preview step
  if (step === 'preview') {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">Preview Scraped Data</h3>
          <p className="text-emerald-200 text-sm">
            Review the data before importing
          </p>
        </div>

        {/* Session info */}
        {selectedSession && (
          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Database className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium mb-1">{selectedSession.name}</h4>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-emerald-200">
                  <span>{selectedSession.businessCount} leads</span>
                  <span>•</span>
                  <span>{formatDate(selectedSession.createdAt)}</span>
                  {selectedSession.townsCompleted > 0 && (
                    <>
                      <span>•</span>
                      <span>{selectedSession.townsCompleted} towns</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* List name input */}
        <div className="space-y-2">
          <label className="text-white font-medium">
            List Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder="e.g., Potchefstroom, Klerksdorp, Rustenburg..."
            className="w-full px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
          <p className="text-sm text-emerald-300/70">
            Auto-filled from scraper session. Edit to change the list name.
          </p>
        </div>

        {/* Loading preview */}
        {isLoadingPreview && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
        )}

        {/* Preview data */}
        {!isLoadingPreview && previewData.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-white font-medium">Data Preview (First 5 leads)</h4>
            
            <div className="space-y-3">
              {previewData.map((lead, index) => (
                <div key={index} className="bg-white/5 rounded-lg p-4 border border-emerald-500/20">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-emerald-200">Name:</span>
                      <span className="text-white ml-2">{lead.name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-emerald-200">Phone:</span>
                      <span className="text-white ml-2">{lead.phone || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-emerald-200">Provider:</span>
                      <span className="text-white ml-2">{lead.provider || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-emerald-200">Business Type:</span>
                      <span className="text-white ml-2">{lead.typeOfBusiness || 'N/A'}</span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-emerald-200">Address:</span>
                      <span className="text-white ml-2">{lead.address || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-400 font-medium mb-1">Validation Errors</p>
                <ul className="text-sm text-red-300 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-emerald-500/20">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-emerald-200 hover:text-white transition-colors"
          >
            Choose Different Session
          </button>
          
          <div className="flex space-x-3">
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 text-emerald-200 hover:text-white transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleImport}
              disabled={validationErrors.length > 0 || isLoadingPreview}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              Import Leads
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render importing step
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-white mb-2">Importing Leads</h3>
        <p className="text-emerald-200 text-sm">
          Please wait while we import your leads from the scraper...
        </p>
      </div>

      {/* Progress indicator */}
      <div className="space-y-4">
        <div className="flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-emerald-200">Progress</span>
            <span className="text-white font-medium">{importProgress}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${importProgress}%` }}
            />
          </div>
        </div>
        
        {selectedSession && (
          <div className="text-center text-sm text-emerald-200">
            Importing {selectedSession.businessCount} leads from {selectedSession.name}
          </div>
        )}
      </div>

      {/* Error display */}
      {validationErrors.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-400 font-medium mb-1">Import Error</p>
              <p className="text-sm text-red-300">{validationErrors[0]}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
