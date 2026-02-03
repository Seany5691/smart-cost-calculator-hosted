'use client';

import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { 
  ArrowLeft, 
  MapPin, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  XCircle,
  Plus,
  Trash2,
  ExternalLink,
  Square,
  CheckSquare,
  Filter,
  ArrowUpDown,
  X,
  FolderOpen,
  ChevronDown,
  FileUp,
  Database
} from 'lucide-react';
import { useLeadsStore } from '@/lib/store/leads';
import type { Lead } from '@/lib/leads/types';
import { storage } from '@/lib/localStorage';
import ConfirmModal from '@/components/leads/ConfirmModal';
import { extractCoordinatesFromMapsUrl, generateRouteUrl, calculateStopCount } from '@/lib/routes';
import ExcelImporter from '@/components/leads/import/ExcelImporter';
import ScrapedListSelector from '@/components/leads/import/ScrapedListSelector';

const ROUTE_GENERATION_LIMIT = 9;

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
    console.error('[MAIN_SHEET] Error reading auth token from localStorage:', error);
  }
  return null;
}

export default function MainSheetPage() {
  const { leads, loading, setLeads, setLoading } = useLeadsStore();
  
  const [workingLeads, setWorkingLeads] = useState<Lead[]>([]);
  const [availableLeads, setAvailableLeads] = useState<Lead[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [startingPoint, setStartingPoint] = useState<string>('');
  const [selectedAvailableLeads, setSelectedAvailableLeads] = useState<string[]>([]);
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [filterListName, setFilterListName] = useState<string>('');
  const [sortBy, setSortBy] = useState<'number' | 'name' | 'provider'>('number');
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedImportMethod, setSelectedImportMethod] = useState<'scraper' | 'excel' | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [leadsPerPage] = useState(50);
  const [isMounted, setIsMounted] = useState(false);
  const [deleteListConfirm, setDeleteListConfirm] = useState<string | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [allListNames, setAllListNames] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showMoveToDropdown, setShowMoveToDropdown] = useState(false);

  // Track if component is mounted (client-side)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch list names on mount
  useEffect(() => {
    const fetchListNames = async () => {
      try {
        const token = getAuthToken();
        const headers: HeadersInit = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch('/api/leads/lists', { headers });
        
        if (response.ok) {
          const data = await response.json();
          setAllListNames(data.listNames || []);
        }
      } catch (error) {
        console.error('Error fetching list names:', error);
      }
    };
    
    if (isMounted) {
      fetchListNames();
    }
  }, [isMounted]);

  // Initialize with last used list or first available list
  useEffect(() => {
    if (filterListName === '' && allListNames.length >= 0) {
      const lastUsedList = storage.get<string>('last_used_list');
      if (lastUsedList && allListNames.includes(lastUsedList)) {
        setFilterListName(lastUsedList);
      } else if (allListNames.length > 0) {
        setFilterListName(allListNames[0]);
      } else {
        setFilterListName('all');
      }
    }
  }, [filterListName, allListNames]);

  // Fetch leads when list filter changes
  useEffect(() => {
    if (filterListName !== '') {
      fetchLeadsData();
      setCurrentPage(1);
      
      // Load saved starting point
      const savedStartingPoint = storage.get<string>('leads_starting_point');
      if (savedStartingPoint) {
        setStartingPoint(savedStartingPoint);
      }
    }
  }, [filterListName]);

  // Save starting point to localStorage
  useEffect(() => {
    if (startingPoint) {
      storage.set('leads_starting_point', startingPoint);
    }
  }, [startingPoint]);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch leads data
  const fetchLeadsData = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      
      // Fetch ALL leads by setting a very high limit to bypass API pagination
      // The frontend will handle pagination client-side
      let url = '/api/leads?status=new&limit=100000';
      if (filterListName !== 'all') {
        url += `&listName=${encodeURIComponent(filterListName)}`;
        storage.set('last_used_list', filterListName);
      }
      
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        throw new Error('Failed to fetch leads');
      }
      
      const data = await response.json();
      console.log('[MAIN_SHEET] Fetched leads from API:', data.leads?.length || 0);
      setLeads(data.leads || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  // Get unique providers
  const uniqueProviders = useMemo(() => {
    const providers = new Set<string>();
    leads.forEach(lead => {
      if (lead.provider) {
        providers.add(lead.provider);
      }
    });
    return Array.from(providers).sort();
  }, [leads]);

  // Calculate available leads with filtering and sorting
  const filteredAndSortedLeads = useMemo(() => {
    const workingLeadIds = workingLeads.map(wl => wl.id);
    
    let available = leads.filter(lead => 
      lead.status === 'new' && !workingLeadIds.includes(lead.id)
    );
    
    console.log('[FILTER DEBUG]', {
      totalLeads: leads.length,
      newStatusLeads: leads.filter(l => l.status === 'new').length,
      workingLeadsCount: workingLeads.length,
      availableAfterFilter: available.length,
      filterProvider,
      filterListName
    });
    
    if (filterProvider !== 'all') {
      available = available.filter(lead => lead.provider === filterProvider);
    }
    
    available.sort((a, b) => {
      const aIsNoGood = a.background_color === '#FF0000';
      const bIsNoGood = b.background_color === '#FF0000';
      
      if (aIsNoGood && !bIsNoGood) return 1;
      if (!aIsNoGood && bIsNoGood) return -1;
      
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      } else if (sortBy === 'provider') {
        return (a.provider || '').localeCompare(b.provider || '');
      } else {
        return (a.number || 0) - (b.number || 0);
      }
    });
    
    console.log('[FILTER DEBUG] Final available count:', available.length);
    
    return available;
  }, [leads, workingLeads, filterProvider, sortBy, filterListName]);

  // Paginate leads for all cases
  const paginatedLeads = useMemo(() => {
    if (filteredAndSortedLeads.length > leadsPerPage) {
      const startIndex = (currentPage - 1) * leadsPerPage;
      const endIndex = startIndex + leadsPerPage;
      return filteredAndSortedLeads.slice(startIndex, endIndex);
    }
    return filteredAndSortedLeads;
  }, [filteredAndSortedLeads, currentPage, leadsPerPage]);

  const totalPages = useMemo(() => {
    const pages = Math.ceil(filteredAndSortedLeads.length / leadsPerPage);
    console.log('[PAGINATION DEBUG]', {
      filteredAndSortedLeadsLength: filteredAndSortedLeads.length,
      leadsPerPage,
      totalPages: pages,
      currentPage,
      shouldShowPagination: pages > 1
    });
    return pages;
  }, [filteredAndSortedLeads.length, leadsPerPage, currentPage]);

  useEffect(() => {
    console.log('[AVAILABLE LEADS UPDATE]', {
      paginatedLeadsLength: paginatedLeads.length,
      filteredAndSortedLeadsLength: filteredAndSortedLeads.length,
      currentPage,
      totalPages
    });
    setAvailableLeads(paginatedLeads);
  }, [paginatedLeads, filteredAndSortedLeads.length, currentPage, totalPages]);

  // Action handlers
  const handleSelectLead = async (leadId: string) => {
    try {
      setError(null);

      const lead = availableLeads.find(l => l.id === leadId);
      if (!lead) return;

      // If lead is marked as bad, unmark it when adding to working area
      if (lead.background_color === '#FF0000') {
        const token = getAuthToken();
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        await fetch(`/api/leads/${leadId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ background_color: undefined })
        });

        // Update local lead object
        lead.background_color = undefined;
      }

      setWorkingLeads([...workingLeads, lead]);
      setSuccessMessage(`${lead.name} added to working area`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      // Refresh leads to update the UI
      await fetchLeadsData();
    } catch (err: any) {
      setError(err.message || 'Failed to select lead');
    }
  };

  const handleNoGood = async (leadId: string) => {
    try {
      setError(null);
      const token = getAuthToken();
      
      const lead = leads.find(l => l.id === leadId);
      if (!lead) return;

      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Toggle: If already marked as bad, unmark it; otherwise mark it
      const isCurrentlyBad = lead.background_color === '#FF0000';
      const newBackgroundColor = isCurrentlyBad ? undefined : '#FF0000';

      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ background_color: newBackgroundColor })
      });

      if (!response.ok) {
        throw new Error(isCurrentlyBad ? 'Failed to unmark lead' : 'Failed to mark lead as no good');
      }

      setWorkingLeads(workingLeads.filter(l => l.id !== leadId));
      await fetchLeadsData();
      
      if (isCurrentlyBad) {
        setSuccessMessage(`${lead.name} unmarked (no longer highlighted)`);
      } else {
        setSuccessMessage(`${lead.name} marked as "No Good" (highlighted red)`);
      }
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update lead');
    }
  };

  const handleRemoveFromWorking = (leadId: string) => {
    setWorkingLeads(workingLeads.filter(l => l.id !== leadId));
  };

  const handleToggleSelectAvailable = (leadId: string) => {
    if (selectedAvailableLeads.includes(leadId)) {
      setSelectedAvailableLeads(selectedAvailableLeads.filter(id => id !== leadId));
    } else {
      setSelectedAvailableLeads([...selectedAvailableLeads, leadId]);
    }
  };

  const handleSelectAllAvailable = () => {
    if (selectedAvailableLeads.length === availableLeads.length) {
      setSelectedAvailableLeads([]);
    } else {
      setSelectedAvailableLeads(availableLeads.map(l => l.id));
    }
  };

  const handleBulkSelectToWorking = async () => {
    try {
      setError(null);
      
      if (selectedAvailableLeads.length === 0) {
        setError('Please select at least one lead');
        return;
      }

      const leadsToAdd = availableLeads.filter(l => selectedAvailableLeads.includes(l.id));
      
      // Unmark any bad leads when adding to working area
      const token = getAuthToken();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const badLeads = leadsToAdd.filter(l => l.background_color === '#FF0000');
      if (badLeads.length > 0) {
        await Promise.all(
          badLeads.map(lead =>
            fetch(`/api/leads/${lead.id}`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify({ background_color: undefined })
            })
          )
        );
        
        // Update local lead objects
        badLeads.forEach(lead => {
          lead.background_color = undefined;
        });
      }

      setWorkingLeads([...workingLeads, ...leadsToAdd]);
      setSelectedAvailableLeads([]);
      
      setSuccessMessage(`${leadsToAdd.length} lead(s) added to working area`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      // Refresh leads to update the UI
      await fetchLeadsData();
    } catch (err: any) {
      setError(err.message || 'Failed to add leads to working area');
    }
  };

  const handleBulkDelete = async () => {
    try {
      setError(null);
      
      if (selectedAvailableLeads.length === 0) {
        setError('Please select at least one lead to delete');
        return;
      }

      setShowBulkDeleteConfirm(true);
    } catch (err: any) {
      setError(err.message || 'Failed to delete leads');
    }
  };

  const confirmBulkDelete = async () => {
    try {
      setError(null);
      const count = selectedAvailableLeads.length;
      const token = getAuthToken();
      
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      for (const leadId of selectedAvailableLeads) {
        try {
          await fetch(`/api/leads/${leadId}`, {
            method: 'DELETE',
            headers
          });
        } catch (error) {
          console.error(`Error deleting lead ${leadId}:`, error);
        }
      }

      setSelectedAvailableLeads([]);
      setShowBulkDeleteConfirm(false);
      await fetchLeadsData();
      
      setSuccessMessage(`${count} lead(s) deleted successfully`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete leads');
      setShowBulkDeleteConfirm(false);
    }
  };

  const handleOpenMaps = (mapsUrl: string) => {
    if (mapsUrl) {
      window.open(mapsUrl, '_blank');
    }
  };

  const handleGenerateRoute = async () => {
    try {
      setError(null);
      setRouteLoading(true);

      if (workingLeads.length === 0) {
        setError('Please select at least one lead to generate a route');
        return;
      }

      if (workingLeads.length > 25) {
        setError('Google Maps supports a maximum of 25 waypoints. Please use Google My Maps for larger routes.');
        return;
      }

      const leadsWithoutCoords = workingLeads.filter(lead => !lead.maps_address);
      if (leadsWithoutCoords.length > 0) {
        const leadNames = leadsWithoutCoords.map(l => l.name).join(', ');
        setError(`The following leads are missing Google Maps addresses: ${leadNames}. Please update them before generating a route.`);
        return;
      }

      // Extract coordinates from all leads
      const waypointsWithLeads = workingLeads.map(lead => ({
        lead,
        coords: extractCoordinatesFromMapsUrl(lead.maps_address || '')
      }));

      const failedLeads = waypointsWithLeads.filter(item => item.coords === null);
      
      if (failedLeads.length > 0) {
        const failedNames = failedLeads.map(item => `${item.lead.name} (${item.lead.maps_address?.substring(0, 50)}...)`).join(', ');
        setError(`The following leads have invalid Google Maps URLs: ${failedNames}. Please check the addresses and try again.`);
        console.error('Failed to extract coordinates from:', failedLeads.map(item => ({
          name: item.lead.name,
          url: item.lead.maps_address
        })));
        return;
      }

      const waypoints = waypointsWithLeads.map(item => item.coords!);

      // Generate route URL
      const routeUrl = generateRouteUrl(waypoints, startingPoint || undefined);
      const stopCount = calculateStopCount(waypoints, startingPoint || undefined);

      // Create route in database
      const token = getAuthToken();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const requestBody = {
        name: `Route ${new Date().toLocaleDateString()}`,
        routeUrl,
        stopCount,
        startingPoint: startingPoint || null,
        leadIds: workingLeads.map(l => l.id)
      };
      
      console.log('Sending route creation request:', {
        ...requestBody,
        routeUrl: requestBody.routeUrl.substring(0, 100) + '...',
        leadIdsCount: requestBody.leadIds.length
      });
      
      const routeResponse = await fetch('/api/leads/routes', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!routeResponse.ok) {
        const errorData = await routeResponse.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Route creation failed:', {
          status: routeResponse.status,
          statusText: routeResponse.statusText,
          error: errorData
        });
        throw new Error(errorData.details || errorData.error || 'Failed to create route');
      }

      const route = await routeResponse.json();

      // Move all working leads to "leads" status and unmark bad leads
      const updatePromises = workingLeads.map(lead =>
        fetch(`/api/leads/${lead.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ 
            status: 'leads',
            background_color: undefined // Unmark bad when generating route
          })
        })
      );
      await Promise.all(updatePromises);

      // Clear working area
      setWorkingLeads([]);

      // Refresh leads
      await fetchLeadsData();

      setSuccessMessage(
        `Route "${route.name}" generated successfully with ${stopCount} stops! All leads moved to "Leads" tab.`
      );
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (err: any) {
      console.error('Route generation error:', err);
      
      let errorMessage = 'Failed to generate route';
      
      if (err.message?.includes('coordinates')) {
        errorMessage = 'Some leads have invalid Google Maps URLs. Please check the addresses and try again.';
      } else if (err.message?.includes('waypoints')) {
        errorMessage = 'Too many stops for Google Maps. Please reduce the number of leads or use Google My Maps.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setRouteLoading(false);
    }
  };

  const handleMoveToStatus = async (targetStatus: 'leads' | 'working' | 'later' | 'bad' | 'signed') => {
    try {
      setError(null);

      if (workingLeads.length === 0) {
        setError('Please add leads to the working area first');
        return;
      }

      setRouteLoading(true);

      const token = getAuthToken();
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const headers: HeadersInit = { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      // Update all working leads to target status and unmark bad leads
      const updatePromises = workingLeads.map(lead =>
        fetch(`/api/leads/${lead.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ 
            status: targetStatus,
            background_color: undefined // Always unmark bad when moving to any tab
          })
        }).then(async (res) => {
          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to update lead');
          }
          return res.json();
        })
      );
      
      await Promise.all(updatePromises);

      // Clear working area
      setWorkingLeads([]);

      // Refresh leads
      await fetchLeadsData();

      const statusLabels = {
        leads: 'Leads',
        working: 'Working On',
        later: 'Later Stage',
        bad: 'Bad Leads',
        signed: 'Signed'
      };

      setSuccessMessage(
        `${workingLeads.length} lead(s) moved to "${statusLabels[targetStatus]}" successfully!`
      );
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      console.error('Move leads error:', err);
      setError(`Failed to move leads: ${err.message || 'Unknown error'}`);
    } finally {
      setRouteLoading(false);
    }
  };

  const handleDeleteList = async () => {
    if (!deleteListConfirm) return;
    
    try {
      setError(null);
      const listToDelete = deleteListConfirm;
      const token = getAuthToken();
      
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      setFilterListName('all');
      
      const response = await fetch(`/api/leads/lists/${encodeURIComponent(listToDelete)}`, {
        method: 'DELETE',
        headers
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete list');
      }
      
      const data = await response.json();
      
      // Refresh list names
      const listNamesResponse = await fetch('/api/leads/lists', { headers });
      
      if (listNamesResponse.ok) {
        const listNamesData = await listNamesResponse.json();
        setAllListNames(listNamesData.listNames || []);
      }
      
      await fetchLeadsData();
      
      setSuccessMessage(`Successfully deleted "${listToDelete}" list (${data.deletedCount} leads removed)`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete list');
    } finally {
      setDeleteListConfirm(null);
    }
  };

  // Render
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/leads"
          className="inline-flex items-center text-emerald-400 hover:text-emerald-300 mb-4 transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          <span>Back to Dashboard</span>
        </Link>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Main Sheet
            </h1>
            <p className="text-gray-300">
              Process new leads and generate routes
            </p>
          </div>
          <div className="w-full md:w-auto">
            <button
              data-import-button
              onClick={() => setShowImportModal(true)}
              className="w-full md:w-auto inline-flex items-center justify-center px-6 py-3 min-h-[48px] bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:shadow-lg transition-shadow font-medium"
            >
              <Plus className="w-5 h-5 mr-2" />
              Import Leads
            </button>
          </div>
        </div>
      </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="glass-card p-4 mb-6 border-l-4 border-green-500 bg-green-50/10">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
              <p className="text-sm text-green-200">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="glass-card p-4 mb-6 border-l-4 border-red-500 bg-red-50/10">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-400 mr-3 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-200">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-300"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Starting Point Input */}
        <div className="glass-card p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-3">Starting Point</h2>
          <p className="text-sm text-gray-300 mb-4">
            Enter your starting location (Google Maps URL or address) to begin your route
          </p>
          <input
            type="text"
            value={startingPoint}
            onChange={(e) => setStartingPoint(e.target.value)}
            placeholder="Paste Google Maps URL or enter address..."
            className="w-full px-4 py-3 min-h-[48px] bg-white/10 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-2">
            Example: https://maps.google.com/?q=123+Main+St or "123 Main Street, City"
          </p>
        </div>

        {/* Working Area */}
        <div className="glass-card p-6 mb-8">
          <div className="flex flex-col gap-3 mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-white">Working Area</h2>
              <p className="text-sm text-gray-300 mt-1">
                {workingLeads.length} lead{workingLeads.length !== 1 ? 's' : ''} selected
                {workingLeads.length > ROUTE_GENERATION_LIMIT && (
                  <span className="block md:inline text-yellow-400 md:ml-2 mt-1 md:mt-0">
                    (Route generation disabled - max {ROUTE_GENERATION_LIMIT} for routes)
                  </span>
                )}
              </p>
            </div>
            
            {/* Action Buttons - Mobile Optimized */}
            <div className="flex flex-col gap-2 md:flex-row md:gap-3">
              {/* Move To Dropdown */}
              <div className="relative w-full md:w-auto z-[100]">
                <button
                  onClick={() => setShowMoveToDropdown(!showMoveToDropdown)}
                  disabled={workingLeads.length === 0 || routeLoading}
                  className={`w-full md:w-auto inline-flex items-center justify-center px-6 py-3 min-h-[48px] rounded-lg font-semibold transition-all ${
                    workingLeads.length === 0 || routeLoading
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:shadow-lg'
                  }`}
                >
                  <FolderOpen className="w-5 h-5 mr-2" />
                  Move To
                  <ChevronDown className="w-4 h-4 ml-2" />
                </button>
                
                {showMoveToDropdown && workingLeads.length > 0 && (
                  <div className="absolute left-0 right-0 md:right-0 md:left-auto mt-2 w-full md:w-56 bg-slate-800 border border-emerald-500/30 rounded-lg shadow-xl z-[100]">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          handleMoveToStatus('leads');
                          setShowMoveToDropdown(false);
                        }}
                        className="w-full text-left px-4 py-3 min-h-[44px] text-white hover:bg-emerald-500/20 transition-colors"
                      >
                        Leads (Active Pipeline)
                      </button>
                      <button
                        onClick={() => {
                          handleMoveToStatus('working');
                          setShowMoveToDropdown(false);
                        }}
                        className="w-full text-left px-4 py-3 min-h-[44px] text-white hover:bg-emerald-500/20 transition-colors"
                      >
                        Working On
                      </button>
                      <button
                        onClick={() => {
                          handleMoveToStatus('later');
                          setShowMoveToDropdown(false);
                        }}
                        className="w-full text-left px-4 py-3 min-h-[44px] text-white hover:bg-emerald-500/20 transition-colors"
                      >
                        Later Stage
                      </button>
                      <button
                        onClick={() => {
                          handleMoveToStatus('bad');
                          setShowMoveToDropdown(false);
                        }}
                        className="w-full text-left px-4 py-3 min-h-[44px] text-white hover:bg-emerald-500/20 transition-colors"
                      >
                        Bad Leads
                      </button>
                      <button
                        onClick={() => {
                          handleMoveToStatus('signed');
                          setShowMoveToDropdown(false);
                        }}
                        className="w-full text-left px-4 py-3 min-h-[44px] text-white hover:bg-emerald-500/20 transition-colors"
                      >
                        Signed
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Generate Route Button */}
              <button
                onClick={handleGenerateRoute}
                disabled={workingLeads.length === 0 || workingLeads.length > ROUTE_GENERATION_LIMIT || routeLoading}
                className={`w-full md:w-auto inline-flex items-center justify-center px-6 py-3 min-h-[48px] rounded-lg font-semibold transition-all ${
                  workingLeads.length === 0 || workingLeads.length > ROUTE_GENERATION_LIMIT || routeLoading
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg'
                }`}
                title={workingLeads.length > ROUTE_GENERATION_LIMIT ? `Route generation limited to ${ROUTE_GENERATION_LIMIT} leads` : ''}
              >
                {routeLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <MapPin className="w-5 h-5 mr-2" />
                    Generate Route
                  </>
                )}
              </button>
            </div>
          </div>

          {workingLeads.length > ROUTE_GENERATION_LIMIT && (
            <div className="mb-4 p-3 md:p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-200">
                You have more than {ROUTE_GENERATION_LIMIT} leads selected. Route generation is disabled. Use "Move To" to move leads to another status, or remove some leads to enable route generation.
              </p>
            </div>
          )}

          {workingLeads.length === 0 ? (
            <div className="text-center py-8 md:py-12 border-2 border-dashed border-emerald-500/30 rounded-lg">
              <MapPin className="w-10 h-10 md:w-12 md:h-12 text-emerald-400/50 mx-auto mb-3" />
              <p className="text-base md:text-lg text-emerald-200 mb-2">No leads in working area</p>
              <p className="text-sm text-emerald-300/70">Select leads from the list below to add them here</p>
            </div>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {workingLeads.map((lead, index) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-3 md:p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition-colors"
                >
                  <div className="flex items-center space-x-3 md:space-x-4 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white truncate text-sm md:text-base">{lead.name}</h4>
                      <p className="text-xs md:text-sm text-emerald-200 truncate">{lead.provider || 'No provider'}</p>
                    </div>
                    {!isMobile && (
                      <div className="hidden md:block text-sm text-emerald-200">
                        {lead.type_of_business || 'No business type'}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveFromWorking(lead.id)}
                    className="ml-3 md:ml-4 p-2 min-w-[40px] min-h-[40px] text-red-400 hover:bg-red-500/20 rounded-lg transition-colors flex items-center justify-center"
                    title="Remove from working area"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {workingLeads.length > 10 && workingLeads.length <= 25 && (
            <div className="mt-4 p-3 md:p-4 bg-orange-500/20 border border-orange-500/30 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-orange-200">
                Routes with more than 10 stops may be difficult to navigate. Consider using Google My Maps for better route optimization.
              </p>
            </div>
          )}
        </div>

        {/* Available Leads */}
        <div className="glass-card p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
            <div>
              <h2 className="text-2xl font-semibold text-white">Available Leads</h2>
              <p className="text-sm text-gray-300 mt-1">
                {filteredAndSortedLeads.length} leads available
                {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
                {selectedAvailableLeads.length > 0 && ` • ${selectedAvailableLeads.length} selected`}
              </p>
            </div>
          </div>

          {/* Filter and Sort Bar */}
          {leads.filter(l => l.status === 'new').length > 0 && (
            <div className="mb-4 p-3 bg-white/5 rounded-lg border border-emerald-500/20">
              {/* Mobile: Stack vertically */}
              <div className="flex flex-col gap-3 md:hidden">
                {/* List Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <label className="text-sm font-medium text-emerald-200 whitespace-nowrap">List:</label>
                  <select
                    value={filterListName}
                    onChange={(e) => setFilterListName(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-2 bg-white/10 border border-emerald-500/30 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="all">All Lists</option>
                    {allListNames.map(listName => (
                      <option key={listName} value={listName}>{listName}</option>
                    ))}
                  </select>
                  {filterListName !== 'all' && (
                    <button
                      onClick={() => setDeleteListConfirm(filterListName)}
                      className="p-2 min-w-[40px] min-h-[40px] text-red-400 hover:bg-red-500/20 rounded-lg transition-colors flex-shrink-0"
                      title={`Delete "${filterListName}" list`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                {/* Provider Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <label className="text-sm font-medium text-emerald-200 whitespace-nowrap">Provider:</label>
                  <select
                    value={filterProvider}
                    onChange={(e) => setFilterProvider(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-2 bg-white/10 border border-emerald-500/30 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="all">All Providers</option>
                    {uniqueProviders.map(provider => (
                      <option key={provider} value={provider}>{provider}</option>
                    ))}
                  </select>
                </div>
                
                {/* Sort By */}
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <label className="text-sm font-medium text-emerald-200 whitespace-nowrap">Sort:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'number' | 'name' | 'provider')}
                    className="flex-1 min-w-0 px-3 py-2 bg-white/10 border border-emerald-500/30 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="number">Number</option>
                    <option value="name">Name</option>
                    <option value="provider">Provider</option>
                  </select>
                </div>
              </div>
              
              {/* Desktop: Horizontal layout */}
              <div className="hidden md:flex md:flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <label className="text-sm font-medium text-emerald-200 whitespace-nowrap">List:</label>
                  <select
                    value={filterListName}
                    onChange={(e) => setFilterListName(e.target.value)}
                    className="px-3 py-2 bg-white/10 border border-emerald-500/30 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="all">All Lists</option>
                    {allListNames.map(listName => (
                      <option key={listName} value={listName}>{listName}</option>
                    ))}
                  </select>
                  {filterListName !== 'all' && (
                    <button
                      onClick={() => setDeleteListConfirm(filterListName)}
                      className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors flex-shrink-0"
                      title={`Delete "${filterListName}" list`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <label className="text-sm font-medium text-emerald-200 whitespace-nowrap">Provider:</label>
                  <select
                    value={filterProvider}
                    onChange={(e) => setFilterProvider(e.target.value)}
                    className="px-3 py-2 bg-white/10 border border-emerald-500/30 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="all">All Providers</option>
                    {uniqueProviders.map(provider => (
                      <option key={provider} value={provider}>{provider}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <label className="text-sm font-medium text-emerald-200 whitespace-nowrap">Sort by:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'number' | 'name' | 'provider')}
                    className="px-3 py-2 bg-white/10 border border-emerald-500/30 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="number">Number</option>
                    <option value="name">Name</option>
                    <option value="provider">Provider</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Bulk Actions Bar */}
          {availableLeads.length > 0 && (
            <div className="mb-4 p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-xl border border-emerald-500/20">
              {/* Mobile: Stack vertically */}
              <div className="flex flex-col gap-2 md:hidden">
                <button
                  onClick={handleSelectAllAvailable}
                  className="inline-flex items-center justify-center px-4 py-2.5 min-h-[44px] bg-white/10 hover:bg-white/20 text-emerald-200 rounded-lg text-sm font-medium transition-colors"
                >
                  {selectedAvailableLeads.length === availableLeads.length ? (
                    <>
                      <CheckSquare className="w-4 h-4 mr-2" />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <Square className="w-4 h-4 mr-2" />
                      Select All
                    </>
                  )}
                </button>
                
                {selectedAvailableLeads.length > 0 && (
                  <>
                    <button
                      onClick={handleBulkSelectToWorking}
                      className="inline-flex items-center justify-center px-4 py-2.5 min-h-[44px] bg-green-500/20 hover:bg-green-500/30 text-green-200 rounded-lg text-sm font-medium transition-colors"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Add {selectedAvailableLeads.length} to Working
                    </button>
                    
                    <button
                      onClick={handleBulkDelete}
                      className="inline-flex items-center justify-center px-4 py-2.5 min-h-[44px] bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete {selectedAvailableLeads.length}
                    </button>
                  </>
                )}
              </div>
              
              {/* Desktop: Horizontal layout */}
              <div className="hidden md:flex md:flex-wrap items-center gap-3">
                <button
                  onClick={handleSelectAllAvailable}
                  className="inline-flex items-center px-3 py-1.5 bg-white/10 hover:bg-white/20 text-emerald-200 rounded-lg text-sm font-medium transition-colors"
                >
                  {selectedAvailableLeads.length === availableLeads.length ? (
                    <>
                      <CheckSquare className="w-4 h-4 mr-2" />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <Square className="w-4 h-4 mr-2" />
                      Select All
                    </>
                  )}
                </button>
                
                {selectedAvailableLeads.length > 0 && (
                  <>
                    <button
                      onClick={handleBulkSelectToWorking}
                      className="inline-flex items-center px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-200 rounded-lg text-sm font-medium transition-colors"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Add {selectedAvailableLeads.length} to Working Area
                    </button>
                    
                    <button
                      onClick={handleBulkDelete}
                      className="inline-flex items-center px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete {selectedAvailableLeads.length}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-3" />
              <p className="text-emerald-200">Loading leads...</p>
            </div>
          ) : availableLeads.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-emerald-500/30 rounded-lg">
              <AlertCircle className="w-12 h-12 text-emerald-400/50 mx-auto mb-3" />
              <p className="text-emerald-200 mb-4">No leads available</p>
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:shadow-lg transition-shadow"
              >
                <Plus className="w-4 h-4 mr-2" />
                Import Leads
              </button>
            </div>
          ) : (
            <>
              {/* Mobile View - Cards - Optimized */}
              {isMobile ? (
                <div className="space-y-2">
                  {availableLeads.map((lead) => {
                    const isNoGood = lead.background_color === '#FF0000';
                    const isSelected = selectedAvailableLeads.includes(lead.id);
                    
                    return (
                      <div key={lead.id} className="relative">
                        <div 
                          className={`p-3 rounded-lg border transition-colors ${
                            isSelected
                              ? 'bg-blue-500/20 border-blue-500/50'
                              : isNoGood 
                                ? 'bg-red-500/20 border-red-500/30' 
                                : 'bg-white/5 border-emerald-500/20'
                          }`}
                        >
                          <div className="flex items-start gap-2 mb-2">
                            <button
                              onClick={() => handleToggleSelectAvailable(lead.id)}
                              className="mt-0.5 min-w-[40px] min-h-[40px] flex items-center justify-center"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-5 h-5 text-blue-400" />
                              ) : (
                                <Square className="w-5 h-5 text-emerald-400/50" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <h3 className={`font-semibold mb-0.5 text-sm ${isNoGood ? 'text-red-300' : 'text-white'}`}>
                                {lead.name}
                              </h3>
                              <p className="text-xs text-emerald-200 break-words line-clamp-1">{lead.address}</p>
                              {lead.provider && (
                                <span className={`inline-block mt-1.5 px-2 py-0.5 rounded text-xs ${
                                  lead.provider.toLowerCase().includes('telkom')
                                    ? 'bg-blue-500/20 text-blue-200 border border-blue-500/30'
                                    : 'bg-emerald-500/20 text-emerald-200'
                                }`}>
                                  {lead.provider}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Mobile Action Buttons - 3 Column Grid */}
                          <div className="grid grid-cols-3 gap-1.5">
                            {lead.maps_address && (
                              <button
                                onClick={() => handleOpenMaps(lead.maps_address!)}
                                className="flex flex-col items-center justify-center px-1 py-2 min-h-[56px] bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 rounded-lg text-xs font-medium transition-colors border border-blue-500/30"
                              >
                                <ExternalLink className="w-4 h-4 mb-0.5" />
                                <span>Maps</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleSelectLead(lead.id)}
                              className="flex flex-col items-center justify-center px-1 py-2 min-h-[56px] bg-green-500/20 hover:bg-green-500/30 text-green-200 rounded-lg text-xs font-medium transition-colors border border-green-500/30"
                            >
                              <CheckCircle className="w-4 h-4 mb-0.5" />
                              <span>Select</span>
                            </button>
                            <button
                              onClick={() => handleNoGood(lead.id)}
                              className="flex flex-col items-center justify-center px-1 py-2 min-h-[56px] bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg text-xs font-medium transition-colors border border-red-500/30"
                            >
                              <XCircle className="w-4 h-4 mb-0.5" />
                              <span>Bad</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Desktop View - Table */
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-emerald-500/20">
                        <th className="w-12 py-3 px-4"></th>
                        <th className="text-left py-3 px-4 font-semibold text-emerald-200">Name</th>
                        <th className="text-left py-3 px-4 font-semibold text-emerald-200">Provider</th>
                        <th className="text-left py-3 px-4 font-semibold text-emerald-200">Phone</th>
                        <th className="text-left py-3 px-4 font-semibold text-emerald-200">Business Type</th>
                        <th className="text-right py-3 px-4 font-semibold text-emerald-200">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availableLeads.map((lead) => {
                        const isNoGood = lead.background_color === '#FF0000';
                        const isSelected = selectedAvailableLeads.includes(lead.id);
                        const isTelkom = lead.provider?.toLowerCase().includes('telkom');
                        
                        return (
                          <tr 
                            key={lead.id} 
                            className={`border-b border-emerald-500/10 hover:bg-white/5 transition-colors ${
                              isSelected 
                                ? 'bg-blue-500/20' 
                                : isNoGood 
                                  ? 'bg-red-500/10' 
                                  : ''
                            }`}
                          >
                            <td className="py-3 px-4">
                              <button
                                onClick={() => handleToggleSelectAvailable(lead.id)}
                                className="p-1 hover:bg-white/10 rounded transition-colors"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-5 h-5 text-blue-400" />
                                ) : (
                                  <Square className="w-5 h-5 text-emerald-400/50" />
                                )}
                              </button>
                            </td>
                            <td className="py-3 px-4">
                              <div className={`font-medium truncate max-w-xs ${isNoGood ? 'text-red-300' : 'text-white'}`} title={lead.name}>
                                {lead.name}
                              </div>
                              <div className="text-sm text-emerald-300/70 truncate max-w-xs" title={lead.address}>{lead.address}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                isTelkom
                                  ? 'bg-blue-500/20 text-blue-200 border border-blue-500/30'
                                  : 'bg-gray-500/20 text-gray-200 border border-gray-500/30'
                              }`}>
                                {lead.provider || 'N/A'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-emerald-200 whitespace-nowrap">{lead.phone || 'N/A'}</td>
                            <td className="py-3 px-4 text-emerald-200" title={lead.type_of_business || 'N/A'}>
                              <div className="truncate max-w-xs">{lead.type_of_business || 'N/A'}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex justify-end gap-1.5">
                                {lead.maps_address && (
                                  <button
                                    onClick={() => handleOpenMaps(lead.maps_address!)}
                                    className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-blue-300 bg-blue-500/20 hover:bg-blue-500/30 rounded border border-blue-500/30 transition-colors"
                                    title="Open in Google Maps"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>Maps</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleSelectLead(lead.id)}
                                  className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-green-300 bg-green-500/20 hover:bg-green-500/30 rounded border border-green-500/30 transition-colors"
                                  title="Add to working area"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Select</span>
                                </button>
                                <button
                                  onClick={() => handleNoGood(lead.id)}
                                  className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-red-300 bg-red-500/20 hover:bg-red-500/30 rounded border border-red-500/30 transition-colors"
                                  title="Mark as No Good"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Bad</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Pagination Controls - Mobile Optimized */}
          {!loading && filteredAndSortedLeads.length > 0 && totalPages > 1 && (
            <div className="mt-6 flex flex-col gap-4 border-t border-emerald-500/20 pt-4">
              {/* Results Info */}
              <div className="text-sm text-emerald-200 text-center md:text-left">
                Showing {((currentPage - 1) * leadsPerPage) + 1} to {Math.min(currentPage * leadsPerPage, filteredAndSortedLeads.length)} of {filteredAndSortedLeads.length} leads
              </div>
              
              {/* Pagination Buttons */}
              <div className="flex flex-col md:flex-row items-center justify-center md:justify-between gap-3">
                {/* Previous Button */}
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="w-full md:w-auto px-6 py-3 min-h-[48px] border border-emerald-500/30 rounded-lg text-sm font-medium text-emerald-200 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                
                {/* Page Numbers */}
                <div className="flex items-center gap-2 overflow-x-auto max-w-full px-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-4 py-2 min-w-[44px] min-h-[44px] rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                            : 'text-emerald-200 hover:bg-white/5'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                {/* Next Button */}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="w-full md:w-auto px-6 py-3 min-h-[48px] border border-emerald-500/30 rounded-lg text-sm font-medium text-emerald-200 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Import Modal */}
        {isMounted && showImportModal && createPortal(
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            onClick={(e) => {
              // Click outside to close
              if (e.target === e.currentTarget) {
                setShowImportModal(false);
                setSelectedImportMethod(null);
              }
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-modal-title"
          >
            <div 
              className="bg-gradient-to-br from-slate-900 via-emerald-900/20 to-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-emerald-500/30"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sticky Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-emerald-500/20 bg-gradient-to-br from-slate-900 via-emerald-900/20 to-slate-900 backdrop-blur-sm">
                <h2 id="import-modal-title" className="text-2xl font-bold text-white">Import Leads</h2>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setSelectedImportMethod(null);
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5 text-emerald-200" />
                </button>
              </div>
              
              {/* Scrollable Content with Custom Scrollbar */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] custom-scrollbar">
                <style jsx>{`
                  .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                  }
                  .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 4px;
                  }
                  .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(16, 185, 129, 0.3);
                    border-radius: 4px;
                  }
                  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(16, 185, 129, 0.5);
                  }
                `}</style>
                
                {!selectedImportMethod ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button
                      onClick={() => setSelectedImportMethod('scraper')}
                      className="group relative overflow-hidden rounded-xl p-8 bg-white/5 border-2 border-emerald-500/30 hover:border-emerald-500 hover:shadow-xl transition-all duration-300 text-left"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                      <div className="relative">
                        <div className="inline-flex p-4 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 mb-4">
                          <Database className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">
                          Import from Scraper
                        </h3>
                        <p className="text-emerald-200 text-sm">
                          Import leads from Smart Cost Calculator's scraper sessions
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => setSelectedImportMethod('excel')}
                      className="group relative overflow-hidden rounded-xl p-8 bg-white/5 border-2 border-emerald-500/30 hover:border-teal-500 hover:shadow-xl transition-all duration-300 text-left"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-emerald-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                      <div className="relative">
                        <div className="inline-flex p-4 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 mb-4">
                          <FileUp className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">
                          Import from Excel
                        </h3>
                        <p className="text-emerald-200 text-sm">
                          Upload an Excel file from your computer
                        </p>
                      </div>
                    </button>
                  </div>
                ) : (
                  <div>
                    <button
                      onClick={() => setSelectedImportMethod(null)}
                      className="mb-4 text-emerald-200 hover:text-emerald-100 flex items-center"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to method selection
                    </button>
                    
                    {selectedImportMethod === 'scraper' ? (
                      <ScrapedListSelector 
                        onImportComplete={async () => {
                          setShowImportModal(false);
                          setSelectedImportMethod(null);
                          
                          // Refresh list names
                          const token = getAuthToken();
                          const headers: HeadersInit = {};
                          if (token) {
                            headers['Authorization'] = `Bearer ${token}`;
                          }
                          
                          const listNamesResponse = await fetch('/api/leads/lists', { headers });
                          
                          if (listNamesResponse.ok) {
                            const listNamesData = await listNamesResponse.json();
                            setAllListNames(listNamesData.listNames || []);
                          }
                          
                          // Refresh leads
                          await fetchLeadsData();
                        }}
                        onCancel={() => {
                          setShowImportModal(false);
                          setSelectedImportMethod(null);
                        }}
                      />
                    ) : (
                      <ExcelImporter 
                        onImportComplete={async () => {
                          setShowImportModal(false);
                          setSelectedImportMethod(null);
                          
                          // Refresh list names
                          const token = getAuthToken();
                          const headers: HeadersInit = {};
                          if (token) {
                            headers['Authorization'] = `Bearer ${token}`;
                          }
                          
                          const listNamesResponse = await fetch('/api/leads/lists', { headers });
                          
                          if (listNamesResponse.ok) {
                            const listNamesData = await listNamesResponse.json();
                            setAllListNames(listNamesData.listNames || []);
                          }
                          
                          // Refresh leads
                          await fetchLeadsData();
                        }}
                        onCancel={() => {
                          setShowImportModal(false);
                          setSelectedImportMethod(null);
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Delete List Confirmation Modal */}
        <ConfirmModal
          isOpen={deleteListConfirm !== null}
          onClose={() => setDeleteListConfirm(null)}
          onConfirm={handleDeleteList}
          title="Delete Entire List"
          message={`Are you sure you want to delete the entire "${deleteListConfirm}" list? This will permanently delete all leads in this list and cannot be undone.`}
          confirmText="Delete List"
          variant="danger"
        />

        {/* Bulk Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={showBulkDeleteConfirm}
          onClose={() => setShowBulkDeleteConfirm(false)}
          onConfirm={confirmBulkDelete}
          title="Delete Selected Leads"
          message={`Are you sure you want to delete ${selectedAvailableLeads.length} lead(s)? This action cannot be undone.`}
          confirmText="Delete Leads"
          variant="danger"
        />
      </div>
  );
}
