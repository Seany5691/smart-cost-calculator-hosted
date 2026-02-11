'use client';

import { useEffect, useState, useMemo } from 'react';
import { useLeadsStore } from '@/lib/store/leads';
import type { Lead, LeadFilters, LeadStatus } from '@/lib/leads/types';
import { useAuthStore } from '@/lib/store/auth-simple';
import LeadsTable from './LeadsTable';
import LeadsCards from './LeadsCards';
import LeadsFilters from './LeadsFilters';
import LeadsPagination from './LeadsPagination';
import BulkActions from './BulkActions';
import ExportButton from './ExportButton';
import { Grid, List, StickyNote, Users, ArrowUpDown } from 'lucide-react';

export default function LeadsManager({ statusFilter, showDateInfo, highlightLeadId }: { statusFilter?: string; showDateInfo?: boolean; highlightLeadId?: string | null }) {
  const {
    leads,
    selectedLeads,
    filters,
    currentPage,
    totalPages,
    total,
    loading,
    error,
    setLeads,
    setPagination,
    setLoading,
    setError,
    setFilters
  } = useLeadsStore();

  const { token } = useAuthStore();
  const [isMobile, setIsMobile] = useState(false);
  
  // View mode with localStorage persistence
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('leads-view-mode') as 'grid' | 'table') || 'table';
    }
    return 'table';
  });
  
  // Sort state
  const [sortBy, setSortBy] = useState<'name' | 'provider' | 'town' | 'date'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Town filter
  const [townFilter, setTownFilter] = useState<string>('all');

  // Persist view mode changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('leads-view-mode', viewMode);
    }
  }, [viewMode]);
  
  // Apply status filter when component mounts or statusFilter changes
  useEffect(() => {
    if (statusFilter) {
      setFilters({ status: [statusFilter as LeadStatus] });
    } else {
      // Reset to show all statuses if no filter
      setFilters({ status: [] });
    }
  }, [statusFilter, setFilters]);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Get unique towns from leads
  const uniqueTowns = useMemo(() => {
    const towns = new Set<string>();
    leads.forEach(lead => {
      if (lead.town) towns.add(lead.town);
    });
    return Array.from(towns).sort();
  }, [leads]);
  
  // Calculate statistics
  const stats = useMemo(() => {
    const totalLeads = leads.length;
    const leadsWithNotes = leads.filter(lead => lead.notes && lead.notes.length > 0).length;
    const selectedCount = selectedLeads.length;
    
    return {
      totalLeads,
      leadsWithNotes,
      selectedCount
    };
  }, [leads, selectedLeads]);
  
  // Apply local sorting and filtering
  const filteredAndSortedLeads = useMemo(() => {
    let result = [...leads];
    
    // Apply town filter
    if (townFilter && townFilter !== 'all') {
      result = result.filter(lead => lead.town === townFilter);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'provider':
          comparison = (a.provider || '').localeCompare(b.provider || '');
          break;
        case 'town':
          comparison = (a.town || '').localeCompare(b.town || '');
          break;
        case 'date':
          comparison = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [leads, townFilter, sortBy, sortDirection]);

  // Fetch leads
  const fetchLeads = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      // Build query params
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', '20');
      
      // Add cache-busting timestamp to ensure fresh data
      params.append('_t', Date.now().toString());

      if (filters.status && filters.status.length > 0) {
        params.append('status', filters.status.join(','));
      }
      if (filters.provider && filters.provider.length > 0) {
        params.append('provider', filters.provider.join(','));
      }
      if (filters.list_name) {
        params.append('listName', filters.list_name);
      }
      if (filters.search) {
        params.append('search', filters.search);
      }
      if (filters.date_from) {
        params.append('dateFrom', filters.date_from);
      }
      if (filters.date_to) {
        params.append('dateTo', filters.date_to);
      }
      if (filters.callback_date_from) {
        params.append('callbackDateFrom', filters.callback_date_from);
      }
      if (filters.callback_date_to) {
        params.append('callbackDateTo', filters.callback_date_to);
      }

      const response = await fetch(`/api/leads?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch leads');
      }

      const data = await response.json();
      setLeads(data.leads);
      setPagination(
        data.pagination.page,
        data.pagination.totalPages,
        data.pagination.total
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  // Fetch leads on mount and when filters/page change or statusFilter changes
  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, currentPage, token, statusFilter]);

  // Refresh handler
  const handleRefresh = () => {
    fetchLeads();
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Leads</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.totalLeads}</p>
            </div>
            <Users className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">With Notes</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.leadsWithNotes}</p>
            </div>
            <StickyNote className="w-8 h-8 text-purple-400" />
          </div>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Selected</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.selectedCount}</p>
            </div>
            <Users className="w-8 h-8 text-emerald-400" />
          </div>
        </div>
      </div>
      
      {/* Header with View Mode Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Lead Management</h1>
          <p className="text-gray-300 mt-1">
            {total} total leads
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 glass-card p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
              title="Table View"
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
              title="Grid View"
            >
              <Grid className="w-5 h-5" />
            </button>
          </div>
          
          {statusFilter && <ExportButton status={statusFilter} />}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>
      
      {/* Sort and Filter Controls - Always visible */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* List Filter Display */}
          {filters.list_name && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
              <span className="text-sm text-blue-300">
                List: <strong>{filters.list_name}</strong>
              </span>
              <button
                onClick={() => setFilters({ list_name: undefined })}
                className="text-blue-400 hover:text-blue-300"
                title="Clear list filter"
              >
                ×
              </button>
            </div>
          )}
          
          {/* Town Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-300">Town:</label>
            <select
              value={townFilter}
              onChange={(e) => setTownFilter(e.target.value)}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">All Towns</option>
              {uniqueTowns.map(town => (
                <option key={town} value={town}>{town}</option>
              ))}
            </select>
          </div>
          
          {/* Sort By */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-300">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="name">Name</option>
              <option value="provider">Provider</option>
              <option value="town">Town</option>
              <option value="date">Date Added</option>
            </select>
          </div>
          
          {/* Sort Direction */}
          <button
            onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
            className="p-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
            title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
          >
            <ArrowUpDown className={`w-5 h-5 transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters - Always visible */}
      <LeadsFilters />

      {/* Bulk Actions */}
      {selectedLeads.length > 0 && (
        <BulkActions onComplete={handleRefresh} />
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Leads Display */}
      {loading && leads.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
          <p className="mt-2 text-gray-300">Loading leads...</p>
        </div>
      ) : filteredAndSortedLeads.length === 0 ? (
        <div className="text-center py-12 glass-card">
          <p className="text-gray-300">No leads found</p>
          <p className="text-sm text-gray-400 mt-1">
            Try adjusting your filters or create a new lead
          </p>
        </div>
      ) : viewMode === 'grid' || isMobile ? (
        <LeadsCards 
          leads={filteredAndSortedLeads} 
          onUpdate={handleRefresh} 
          disableBackgroundColor={true}
          showDateInfo={showDateInfo || statusFilter === 'proposal' || statusFilter === 'later' || statusFilter === 'signed'}
          highlightLeadId={highlightLeadId}
        />
      ) : (
        <LeadsTable 
          leads={filteredAndSortedLeads} 
          onUpdate={handleRefresh} 
          disableBackgroundColor={true}
          showDateInfo={showDateInfo || statusFilter === 'proposal' || statusFilter === 'later' || statusFilter === 'signed'}
          highlightLeadId={highlightLeadId}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && <LeadsPagination />}
    </div>
  );
}
