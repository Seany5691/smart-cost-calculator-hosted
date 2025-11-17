'use client';

import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
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
  FileUp,
  Database
} from 'lucide-react';
import { useLeadsStore } from '@/store/leads/leads';
import { useRoutesStore } from '@/store/leads/routes';
import { useAuthStore } from '@/store/auth';
import { Lead } from '@/lib/leads/types';
import { storage, STORAGE_KEYS } from '@/lib/leads/localStorage';
import { LeadCard } from '@/components/leads/leads/LeadCard';
import { ConfirmModal } from '@/components/leads/ui/ConfirmModal';
import ExcelImporter from '@/components/leads/import/ExcelImporter';
import ScrapedListSelector from '@/components/leads/import/ScrapedListSelector';

const WORKING_AREA_LIMIT = 9;

export default function MainLeadsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { 
    leads, 
    fetchLeads, 
    updateLead,
    deleteLead,
    changeLeadStatus,
    isLoading 
  } = useLeadsStore();
  
  const { 
    generateRouteFromLeads,
    isLoading: routeLoading 
  } = useRoutesStore();

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
  const [leadsPerPage] = useState(50); // Show 50 leads per page
  const [isMounted, setIsMounted] = useState(false);
  const [allListNames, setAllListNames] = useState<string[]>([]);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState<number | null>(null);
  const [deleteListConfirm, setDeleteListConfirm] = useState<string | null>(null);

  // Track if component is mounted (client-side)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch all list names when component mounts or user changes
  useEffect(() => {
    const fetchListNames = async () => {
      if (user) {
        const listNames = await useLeadsStore.getState().getUniqueListNames();
        setAllListNames(listNames);
      }
    };
    fetchListNames();
  }, [user]);

  // Initialize with last used list or first available list
  useEffect(() => {
    if (user && filterListName === '' && allListNames.length >= 0) {
      // Try to load last used list from localStorage
      const lastUsedList = storage.get<string>('last_used_list');
      if (lastUsedList && allListNames.includes(lastUsedList)) {
        setFilterListName(lastUsedList);
      } else if (allListNames.length > 0) {
        // Default to first available list
        setFilterListName(allListNames[0]);
      } else {
        // No lists available, show all
        setFilterListName('all');
      }
    }
  }, [user, filterListName, allListNames]);

  useEffect(() => {
    if (user && filterListName !== '') {
      // Main Sheet shows only "new" leads (not yet processed through route generation)
      // Apply list filter if selected
      const filters: any = { status: 'new' };
      if (filterListName !== 'all') {
        filters.list_name = filterListName;
        // Save last used list to localStorage
        storage.set('last_used_list', filterListName);
      }
      fetchLeads(filters);
      
      // Reset to first page when filter changes
      setCurrentPage(1);
      
      // Load saved starting point from localStorage
      const savedStartingPoint = storage.get<string>('leads_starting_point');
      if (savedStartingPoint) {
        setStartingPoint(savedStartingPoint);
      }
    }
  }, [user, filterListName]);

  // Save starting point to localStorage whenever it changes
  useEffect(() => {
    if (startingPoint) {
      storage.set('leads_starting_point', startingPoint);
    }
  }, [startingPoint]);

  useEffect(() => {
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get unique providers for filter dropdown
  const uniqueProviders = useMemo(() => {
    const providers = new Set<string>();
    leads.forEach(lead => {
      if (lead.provider) {
        providers.add(lead.provider);
      }
    });
    return Array.from(providers).sort();
  }, [leads]);

  // Use the fetched list names
  const uniqueListNames = allListNames;

  // Calculate available leads with useMemo to avoid infinite loops
  const filteredAndSortedLeads = useMemo(() => {
    // Get working lead IDs
    const workingLeadIds = workingLeads.map(wl => wl.id);
    
    // Filter: only "new" status leads that are NOT in working area
    let available = leads.filter(lead => 
      lead.status === 'new' && !workingLeadIds.includes(lead.id)
    );
    
    // Apply provider filter
    if (filterProvider !== 'all') {
      available = available.filter(lead => lead.provider === filterProvider);
    }
    
    // Sort by selected field
    available.sort((a, b) => {
      // Always put "No Good" leads at the bottom, regardless of other sorting
      const aIsNoGood = a.background_color === '#FF0000';
      const bIsNoGood = b.background_color === '#FF0000';
      
      if (aIsNoGood && !bIsNoGood) return 1;
      if (!aIsNoGood && bIsNoGood) return -1;
      
      // If both are "No Good" or both are not, sort by selected field
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      } else if (sortBy === 'provider') {
        return (a.provider || '').localeCompare(b.provider || '');
      } else {
        // Sort by number
        return (a.number || 0) - (b.number || 0);
      }
    });
    
    return available;
  }, [leads, workingLeads, filterProvider, sortBy]);

  // Paginate leads only when "All Lists" is selected
  const paginatedLeads = useMemo(() => {
    if (filterListName === 'all' && filteredAndSortedLeads.length > leadsPerPage) {
      const startIndex = (currentPage - 1) * leadsPerPage;
      const endIndex = startIndex + leadsPerPage;
      return filteredAndSortedLeads.slice(startIndex, endIndex);
    }
    return filteredAndSortedLeads;
  }, [filteredAndSortedLeads, filterListName, currentPage, leadsPerPage]);

  const totalPages = useMemo(() => {
    if (filterListName === 'all') {
      return Math.ceil(filteredAndSortedLeads.length / leadsPerPage);
    }
    return 1;
  }, [filteredAndSortedLeads.length, filterListName, leadsPerPage]);

  // Update availableLeads when paginated leads change
  useEffect(() => {
    setAvailableLeads(paginatedLeads);
  }, [paginatedLeads]);

  const handleSelectLead = async (leadId: string) => {
    try {
      setError(null);
      
      // Check working area limit
      if (workingLeads.length >= WORKING_AREA_LIMIT) {
        setError(`Working area is full. Maximum ${WORKING_AREA_LIMIT} leads allowed.`);
        return;
      }

      const lead = availableLeads.find(l => l.id === leadId);
      if (!lead) return;

      // Add to working area
      setWorkingLeads([...workingLeads, lead]);
      setSuccessMessage(`${lead.name} added to working area`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to select lead');
    }
  };

  const handleNoGood = async (leadId: string) => {
    try {
      setError(null);
      
      const lead = leads.find(l => l.id === leadId);
      if (!lead) return;

      // Mark lead with red background but DON'T change status
      // This matches Google Sheets behavior where "No Good" highlights red but stays in Main Sheet
      await updateLead(leadId, { 
        background_color: '#FF0000'
      });
      
      // Remove from working area if present
      setWorkingLeads(workingLeads.filter(l => l.id !== leadId));
      
      setSuccessMessage(`${lead.name} marked as "No Good" (highlighted red)`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to mark lead as no good');
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

  const handleBulkSelectToWorking = () => {
    try {
      setError(null);
      
      // Check if any leads are selected
      if (selectedAvailableLeads.length === 0) {
        setError('Please select at least one lead');
        return;
      }

      // Check working area limit
      if (workingLeads.length + selectedAvailableLeads.length > WORKING_AREA_LIMIT) {
        setError(`Cannot add ${selectedAvailableLeads.length} leads. Working area limit is ${WORKING_AREA_LIMIT}.`);
        return;
      }

      // Get the selected leads
      const leadsToAdd = availableLeads.filter(l => selectedAvailableLeads.includes(l.id));
      
      // Add to working area
      setWorkingLeads([...workingLeads, ...leadsToAdd]);
      setSelectedAvailableLeads([]);
      
      setSuccessMessage(`${leadsToAdd.length} lead(s) added to working area`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to add leads to working area');
    }
  };

  const handleBulkDelete = async () => {
    try {
      setError(null);
      
      // Check if any leads are selected
      if (selectedAvailableLeads.length === 0) {
        setError('Please select at least one lead to delete');
        return;
      }

      const count = selectedAvailableLeads.length;

      // Confirm deletion
      if (!confirm(`Are you sure you want to delete ${count} lead(s)? This action cannot be undone.`)) {
        return;
      }

      // Delete each lead from Supabase
      for (const leadId of selectedAvailableLeads) {
        try {
          await deleteLead(leadId);
        } catch (error) {
          console.error(`Error deleting lead ${leadId}:`, error);
        }
      }

      // Clear selection
      setSelectedAvailableLeads([]);
      
      // Refresh leads from store
      await fetchLeads({ status: 'new' });
      
      setSuccessMessage(`${count} lead(s) deleted successfully`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete leads');
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

      // Validation: Check if leads are selected
      if (workingLeads.length === 0) {
        setError('Please select at least one lead to generate a route');
        return;
      }

      // Validation: Check maximum waypoints
      if (workingLeads.length > 25) {
        setError('Google Maps supports a maximum of 25 waypoints. Please use Google My Maps for larger routes.');
        return;
      }

      // Validation: Check for valid coordinates
      const leadsWithoutCoords = workingLeads.filter(lead => !lead.maps_address);
      if (leadsWithoutCoords.length > 0) {
        const leadNames = leadsWithoutCoords.map(l => l.name).join(', ');
        setError(`The following leads are missing Google Maps addresses: ${leadNames}. Please update them before generating a route.`);
        return;
      }

      // Generate route with coordinate validation and starting point
      const route = await generateRouteFromLeads(workingLeads, startingPoint || undefined);

      // Automatic lead processing after route generation
      // Move all working leads to "leads" status (matches Google Sheets behavior)
      const updatePromises = workingLeads.map(lead => 
        changeLeadStatus(lead.id, 'leads')
      );
      await Promise.all(updatePromises);

      // Clear working area
      setWorkingLeads([]);

      // Show success message with route details
      const stopText = route.stop_count === 1 ? 'stop' : 'stops';
      setSuccessMessage(
        `Route "${route.name}" generated successfully with ${route.stop_count} ${stopText}! ` +
        `All leads moved to "Leads" tab.`
      );
      setShowSuccess(true);
      
      // Auto-hide success message after 5 seconds (don't redirect)
      setTimeout(() => {
        setShowSuccess(false);
      }, 5000);
    } catch (err: any) {
      console.error('Route generation error:', err);
      
      // Enhanced error handling
      let errorMessage = 'Failed to generate route';
      
      if (err.message?.includes('coordinates')) {
        errorMessage = 'Some leads have invalid Google Maps URLs. Please check the addresses and try again.';
      } else if (err.message?.includes('waypoints')) {
        errorMessage = 'Too many stops for Google Maps. Please reduce the number of leads or use Google My Maps.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="glass-card p-8 max-w-md mx-auto text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please sign in to manage leads.</p>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-shadow"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/leads"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Main Sheet
            </h1>
            <p className="text-lg text-gray-600">
              Process new leads and generate routes
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <button
              data-import-button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-shadow"
            >
              <Plus className="w-4 h-4 mr-2" />
              Import Leads
            </button>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="glass-card p-4 mb-6 border-l-4 border-green-500 bg-green-50">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
            <p className="text-sm text-green-700">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="glass-card p-4 mb-6 border-l-4 border-red-500 bg-red-50">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Starting Point Input */}
      <div className="glass-card p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Starting Point</h2>
        <p className="text-sm text-gray-600 mb-4">
          Enter your starting location (Google Maps URL or address) to begin your route
        </p>
        <input
          type="text"
          value={startingPoint}
          onChange={(e) => setStartingPoint(e.target.value)}
          placeholder="Paste Google Maps URL or enter address..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-2">
          Example: https://maps.google.com/?q=123+Main+St or "123 Main Street, City"
        </p>
      </div>

      {/* Working Area */}
      <div className="glass-card p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Working Area</h2>
            <p className="text-sm text-gray-600 mt-1">
              {workingLeads.length} / {WORKING_AREA_LIMIT} leads selected
            </p>
          </div>
          <button
            onClick={handleGenerateRoute}
            disabled={workingLeads.length === 0 || routeLoading}
            className={`inline-flex items-center px-6 py-3 rounded-lg font-semibold transition-all ${
              workingLeads.length === 0 || routeLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg'
            }`}
          >
            {routeLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <MapPin className="w-5 h-5 mr-2" />
                Generate Route
              </>
            )}
          </button>
        </div>

        {/* Working Area Limit Warning */}
        {workingLeads.length >= WORKING_AREA_LIMIT && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
            <p className="text-sm text-yellow-800">
              Working area is full. Generate a route or remove leads to add more.
            </p>
          </div>
        )}

        {/* Working Leads Display */}
        {workingLeads.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">No leads in working area</p>
            <p className="text-sm text-gray-500">Select leads from the list below to add them here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {workingLeads.map((lead, index) => (
              <div
                key={lead.id}
                className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">{lead.name}</h4>
                    <p className="text-sm text-gray-600 truncate">{lead.provider || 'No provider'}</p>
                  </div>
                  {!isMobile && (
                    <div className="hidden md:block text-sm text-gray-600">
                      {lead.type_of_business || 'No business type'}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveFromWorking(lead.id)}
                  className="ml-4 p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                  title="Remove from working area"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Route Warning */}
        {workingLeads.length > 10 && workingLeads.length <= 25 && (
          <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start">
            <AlertCircle className="w-5 h-5 text-orange-600 mr-2 mt-0.5" />
            <p className="text-sm text-orange-800">
              Routes with more than 10 stops may be difficult to navigate. Consider using Google My Maps for better route optimization.
            </p>
          </div>
        )}
      </div>

      {/* Available Leads */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Available Leads</h2>
            <p className="text-sm text-gray-600 mt-1">
              {availableLeads.length} leads available
              {selectedAvailableLeads.length > 0 && ` • ${selectedAvailableLeads.length} selected`}
            </p>
          </div>
          <Link
            href="/leads/status/leads"
            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            View All Leads →
          </Link>
        </div>

        {/* Filter and Sort Bar */}
        {leads.filter(l => l.status === 'new').length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <label className="text-sm font-medium text-gray-700">List:</label>
              <select
                value={filterListName}
                onChange={(e) => setFilterListName(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              >
                <option value="all">All Lists</option>
                {uniqueListNames.map(listName => (
                  <option key={listName} value={listName}>{listName}</option>
                ))}
              </select>
              {filterListName !== 'all' && (
                <button
                  onClick={async () => {
                    if (confirm(`Are you sure you want to delete the entire "${filterListName}" list? This will permanently delete all leads in this list and cannot be undone.`)) {
                      try {
                        setError(null);
                        const listToDelete = filterListName;
                        
                        // Switch to "all" view first
                        setFilterListName('all');
                        
                        // Delete the list
                        const result = await useLeadsStore.getState().deleteList(listToDelete);
                        
                        // Refresh list names
                        const updatedListNames = await useLeadsStore.getState().getUniqueListNames();
                        setAllListNames(updatedListNames);
                        
                        // Force refresh leads
                        await fetchLeads();
                        
                        setSuccessMessage(`Successfully deleted "${listToDelete}" list (${result.deletedCount} leads removed)`);
                        setShowSuccess(true);
                        setTimeout(() => setShowSuccess(false), 5000);
                      } catch (err: any) {
                        setError(err.message || 'Failed to delete list');
                      }
                    }
                  }}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title={`Delete "${filterListName}" list`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <label className="text-sm font-medium text-gray-700">Provider:</label>
              <select
                value={filterProvider}
                onChange={(e) => setFilterProvider(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Providers</option>
                {uniqueProviders.map(provider => (
                  <option key={provider} value={provider}>{provider}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-gray-500" />
              <label className="text-sm font-medium text-gray-700">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'number' | 'name' | 'provider')}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="number">Number</option>
                <option value="name">Name</option>
                <option value="provider">Provider</option>
              </select>
            </div>
          </div>
        )}

        {/* Bulk Actions Bar */}
        {availableLeads.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 shadow-sm">
            <button
              onClick={handleSelectAllAvailable}
              className="btn btn-sm btn-secondary inline-flex items-center"
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
                  disabled={workingLeads.length + selectedAvailableLeads.length > WORKING_AREA_LIMIT}
                  className="btn btn-sm btn-success inline-flex items-center"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Add {selectedAvailableLeads.length} to Working Area
                </button>
                
                <button
                  onClick={handleBulkDelete}
                  className="btn btn-sm btn-danger inline-flex items-center"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete {selectedAvailableLeads.length}
                </button>
              </>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-3" />
            <p className="text-gray-600">Loading leads...</p>
          </div>
        ) : availableLeads.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">No leads available</p>
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-shadow"
            >
              <Plus className="w-4 h-4 mr-2" />
              Import Leads
            </button>
          </div>
        ) : (
          <>
            {/* Mobile View - Cards */}
            {isMobile ? (
              <div className="space-y-4">
                {availableLeads.map((lead) => (
                  <div key={lead.id} className="relative">
                    <LeadCard lead={lead} />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleSelectLead(lead.id)}
                        disabled={workingLeads.length >= WORKING_AREA_LIMIT}
                        className="btn btn-sm btn-success flex-1 inline-flex items-center justify-center"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Select
                      </button>
                      <button
                        onClick={() => handleNoGood(lead.id)}
                        className="btn btn-sm btn-danger flex-1 inline-flex items-center justify-center"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Bad
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Desktop View - Table */
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="w-12 py-3 px-4"></th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Provider</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Phone</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Business Type</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableLeads.map((lead) => {
                      const isNoGood = lead.background_color === '#FF0000';
                      const isSelected = selectedAvailableLeads.includes(lead.id);
                      
                      return (
                        <tr 
                          key={lead.id} 
                          className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                            isNoGood ? 'bg-red-50' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleToggleSelectAvailable(lead.id)}
                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-5 h-5 text-blue-600" />
                              ) : (
                                <Square className="w-5 h-5 text-gray-400" />
                              )}
                            </button>
                          </td>
                          <td className="py-3 px-4">
                            <div className={`font-medium truncate max-w-xs ${isNoGood ? 'text-red-700' : 'text-gray-900'}`} title={lead.name}>
                              {lead.name}
                            </div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">{lead.address}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              lead.provider?.toLowerCase() === 'telkom'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {lead.provider || 'N/A'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{lead.phone || 'N/A'}</td>
                          <td className="py-3 px-4 text-gray-600">{lead.type_of_business || 'N/A'}</td>
                          <td className="py-3 px-4">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenMaps(lead.maps_address)}
                                className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                                title="Open in Google Maps"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Maps</span>
                              </button>
                              <button
                                onClick={() => handleSelectLead(lead.id)}
                                disabled={workingLeads.length >= WORKING_AREA_LIMIT}
                                className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded border border-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Select</span>
                              </button>
                              <button
                                onClick={() => handleNoGood(lead.id)}
                                className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors"
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

        {/* Pagination Controls - Only show when "All Lists" is selected */}
        {filterListName === 'all' && totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * leadsPerPage) + 1} to {Math.min(currentPage * leadsPerPage, filteredAndSortedLeads.length)} of {filteredAndSortedLeads.length} leads
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
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
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Import Modal - Using Portal to render at document body level */}
      {isMounted && showImportModal && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Import Leads</h2>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setSelectedImportMethod(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {!selectedImportMethod ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Scraper Import */}
                  <button
                    onClick={() => setSelectedImportMethod('scraper')}
                    className="group relative overflow-hidden rounded-xl p-8 bg-white border-2 border-gray-200 hover:border-blue-500 hover:shadow-xl transition-all duration-300 text-left"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                    <div className="relative">
                      <div className="inline-flex p-4 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 mb-4">
                        <Database className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Import from Scraper
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Import leads from Smart Cost Calculator's scraper sessions
                      </p>
                    </div>
                  </button>

                  {/* Excel Import */}
                  <button
                    onClick={() => setSelectedImportMethod('excel')}
                    className="group relative overflow-hidden rounded-xl p-8 bg-white border-2 border-gray-200 hover:border-purple-500 hover:shadow-xl transition-all duration-300 text-left"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                    <div className="relative">
                      <div className="inline-flex p-4 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 mb-4">
                        <FileUp className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Import from Excel
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Upload an Excel file from your computer
                      </p>
                    </div>
                  </button>
                </div>
              ) : (
                <div>
                  <button
                    onClick={() => setSelectedImportMethod(null)}
                    className="mb-4 text-gray-600 hover:text-gray-900 flex items-center"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to method selection
                  </button>
                  
                  {selectedImportMethod === 'scraper' ? (
                    <ScrapedListSelector 
                      onImportComplete={async () => {
                        setShowImportModal(false);
                        setSelectedImportMethod(null);
                        
                        // Refresh list names first
                        const updatedListNames = await useLeadsStore.getState().getUniqueListNames();
                        setAllListNames(updatedListNames);
                        
                        // Then refresh leads
                        await fetchLeads();
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
                        
                        // Refresh list names first
                        const updatedListNames = await useLeadsStore.getState().getUniqueListNames();
                        setAllListNames(updatedListNames);
                        
                        // Then refresh leads
                        await fetchLeads();
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
    </div>
  );
}
