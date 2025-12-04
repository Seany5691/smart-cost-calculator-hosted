'use client';

import { useEffect, useState, useMemo } from 'react';
import { useLeadsStore } from '@/store/leads/leads';
import { LeadCard } from '@/components/leads/leads/LeadCard';
import { Lead, LeadSortOptions } from '@/lib/leads/types';
import { Card } from '@/components/leads/ui/Card';
import { 
  Search, 
  Download, 
  Grid, 
  List as ListIcon,
  CheckCircle,
  TrendingUp,
  Award,
  DollarSign,
  Calendar,
  Phone,
  MapPin,
  Building2,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddLeadButton } from '@/components/leads/leads/AddLeadButton';
import { LaterStageModal } from '@/components/leads/leads/LaterStageModal';

export default function SignedLeadsPage() {
  const {
    leads,
    isLoading,
    error,
    fetchLeadsByStatus,
    selectLead,
    deselectLead,
    selectedLeads,
    updateLead
  } = useLeadsStore();

  // View mode state with localStorage persistence
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('signed-view-mode') as 'grid' | 'table') || 'table';
    }
    return 'table';
  });

  // Persist view mode changes
  useEffect(() => {
    localStorage.setItem('signed-view-mode', viewMode);
  }, [viewMode]);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter state
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');
  const [filterTown, setFilterTown] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'provider' | 'town' | 'date'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // State for Later Stage modal
  const [showLaterStageModal, setShowLaterStageModal] = useState<Lead | null>(null);

  // Load leads on mount
  useEffect(() => {
    fetchLeadsByStatus('signed');
  }, [fetchLeadsByStatus]);

  // Get unique towns
  const uniqueTowns = useMemo(() => {
    const towns = leads
      .filter(l => l.status === 'signed' && l.town)
      .map(l => l.town!)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();
    return towns;
  }, [leads]);

  // Filter and sort leads
  const filteredLeads = useMemo(() => {
    let result = leads.filter(lead => lead.status === 'signed');

    // Apply town filter
    if (filterTown !== 'all') {
      result = result.filter(l => l.town === filterTown);
    }

    // Apply search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(lead =>
        lead.name?.toLowerCase().includes(term) ||
        lead.phone?.toLowerCase().includes(term) ||
        lead.provider?.toLowerCase().includes(term) ||
        lead.address?.toLowerCase().includes(term) ||
        lead.type_of_business?.toLowerCase().includes(term) ||
        lead.notes?.toLowerCase().includes(term)
      );
    }

    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      result = result.filter(lead => 
        new Date(lead.updated_at) >= filterDate
      );
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
  }, [leads, searchTerm, dateFilter, filterTown, sortBy, sortDirection]);

  // Calculate success metrics
  const metrics = useMemo(() => {
    const total = filteredLeads.length;
    const allSigned = leads.filter(l => l.status === 'signed').length;
    
    // Group by provider
    const byProvider: Record<string, number> = {};
    filteredLeads.forEach(lead => {
      const provider = lead.provider || 'Unknown';
      byProvider[provider] = (byProvider[provider] || 0) + 1;
    });

    // Group by business type
    const byBusinessType: Record<string, number> = {};
    filteredLeads.forEach(lead => {
      const type = lead.type_of_business || 'Unknown';
      byBusinessType[type] = (byBusinessType[type] || 0) + 1;
    });

    // Calculate conversion rate (assuming total leads ever created)
    const totalLeads = leads.length;
    const conversionRate = totalLeads > 0 ? ((allSigned / totalLeads) * 100).toFixed(1) : '0';

    // Recent signings (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentSignings = filteredLeads.filter(lead => 
      new Date(lead.updated_at) >= sevenDaysAgo
    ).length;

    return {
      total,
      allSigned,
      byProvider,
      byBusinessType,
      conversionRate,
      recentSignings
    };
  }, [filteredLeads, leads]);

  // Handle export
  const handleExport = () => {
    const headers = [
      'Number', 
      'Name', 
      'Provider', 
      'Phone', 
      'Address', 
      'Business Type', 
      'Signed Date', 
      'Notes'
    ];
    const rows = filteredLeads.map(lead => [
      lead.number,
      lead.name,
      lead.provider || '',
      lead.phone || '',
      lead.address || '',
      lead.type_of_business || '',
      getSignedDateDisplay(lead),
      lead.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signed-leads-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Get days since signed
  const getDaysSinceSigned = (lead: Lead) => {
    const dateToUse = lead.dateSigned || lead.updated_at;
    return Math.floor((Date.now() - new Date(dateToUse).getTime()) / (1000 * 60 * 60 * 24));
  };

  // Format signed date for display (DD/MM/YYYY)
  const getSignedDateDisplay = (lead: Lead) => {
    const dateToUse = lead.dateSigned || lead.updated_at;
    const date = new Date(dateToUse);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Handle status change
  const handleStatusChange = async (leadId: string, newStatus: string, additionalData?: any) => {
    try {
      if (newStatus === 'later') {
        const lead = filteredLeads.find(l => l.id === leadId);
        if (lead) {
          setShowLaterStageModal(lead);
        }
      } else {
        const { changeLeadStatus } = useLeadsStore.getState();
        await changeLeadStatus(leadId, newStatus as any, additionalData);
        // Refresh the leads list
        fetchLeadsByStatus('signed');
      }
    } catch (error) {
      console.error('Failed to update lead status:', error);
      throw error;
    }
  };

  // Handle Later Stage confirmation
  const handleLaterStageConfirm = async (data: { date_to_call_back: string; notes: string }) => {
    if (!showLaterStageModal) return;
    
    try {
      const { changeLeadStatus } = useLeadsStore.getState();
      await changeLeadStatus(showLaterStageModal.id, 'later', data);
      setShowLaterStageModal(null);
      await fetchLeadsByStatus('signed');
    } catch (err) {
      console.error('Failed to move to Later Stage:', err);
      throw err;
    }
  };

  // Handle delete
  const handleDelete = async (leadId: string) => {
    try {
      const { deleteLead } = useLeadsStore.getState();
      await deleteLead(leadId);
    } catch (error) {
      console.error('Failed to delete lead:', error);
      throw error;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
          Signed Leads
        </h1>
        <p className="text-gray-600">
          Track successful conversions and celebrate wins
        </p>
      </div>

      {/* Success Banner */}
      <Card variant="glass" padding="md" className="mb-6 bg-green-50 border-green-200">
        <div className="flex items-start gap-3">
          <Award className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-green-900 mb-1">Success Tracker</h3>
            <p className="text-sm text-green-700">
              These leads have been successfully converted. Keep up the great work!
            </p>
          </div>
        </div>
      </Card>

      {/* Success Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card variant="glass" padding="md" className="bg-green-50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-green-600 mb-1">Total Signed</div>
              <div className="text-3xl font-bold text-green-600">{metrics.allSigned}</div>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600 opacity-50" />
          </div>
        </Card>
        <Card variant="glass" padding="md" className="bg-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-blue-600 mb-1">This Period</div>
              <div className="text-3xl font-bold text-blue-600">{metrics.total}</div>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-600 opacity-50" />
          </div>
        </Card>
        <Card variant="glass" padding="md" className="bg-purple-50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-purple-600 mb-1">Conversion Rate</div>
              <div className="text-3xl font-bold text-purple-600">{metrics.conversionRate}%</div>
            </div>
            <DollarSign className="w-8 h-8 text-purple-600 opacity-50" />
          </div>
        </Card>
        <Card variant="glass" padding="md" className="bg-yellow-50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-yellow-600 mb-1">Last 7 Days</div>
              <div className="text-3xl font-bold text-yellow-600">{metrics.recentSignings}</div>
            </div>
            <Calendar className="w-8 h-8 text-yellow-600 opacity-50" />
          </div>
        </Card>
      </div>

      {/* Provider Breakdown */}
      {Object.keys(metrics.byProvider).length > 0 && (
        <Card variant="glass" padding="md" className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Signed by Provider</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(metrics.byProvider)
              .sort((a, b) => b[1] - a[1])
              .map(([provider, count]) => (
                <div key={provider} className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">{provider}</div>
                  <div className="text-2xl font-bold text-gray-900">{count}</div>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Filter and Sort Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <label className="text-sm font-medium text-gray-700">Town:</label>
          <select 
            value={filterTown}
            onChange={(e) => setFilterTown(e.target.value)}
            className="pl-3 pr-8 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Towns</option>
            {uniqueTowns.map(town => (
              <option key={town} value={town}>{town}</option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-gray-500" />
          <label className="text-sm font-medium text-gray-700">Sort by:</label>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'provider' | 'town' | 'date')}
            className="pl-3 pr-8 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="name">Name</option>
            <option value="provider">Provider</option>
            <option value="town">Town</option>
            <option value="date">Date Added</option>
          </select>
          <button
            onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
          >
            <ArrowUpDown className={cn("w-4 h-4", sortDirection === 'desc' && "rotate-180")} />
          </button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <Card variant="glass" padding="md" className="mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search signed leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 w-full"
              aria-label="Search leads"
            />
          </div>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="input"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last Month</option>
            <option value="year">Last Year</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'btn',
                viewMode === 'table' ? 'btn-primary' : 'btn-secondary'
              )}
              aria-label="Table view"
            >
              <ListIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'btn',
                viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'
              )}
              aria-label="Grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>

          {/* Add Lead Button */}
          <AddLeadButton defaultStatus="signed" onSuccess={() => fetchLeadsByStatus('signed')} />
          
          {/* Export Button */}
          <button
            onClick={handleExport}
            className="btn btn-success flex items-center gap-2"
            aria-label="Export leads"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading leads...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card variant="glass" padding="md" className="bg-red-50 border-red-200 mb-6">
          <p className="text-red-600">{error}</p>
        </Card>
      )}

      {/* Leads Display */}
      {!isLoading && !error && (
        <>
          {viewMode === 'table' ? (
            <div className="space-y-4">
              {filteredLeads.map(lead => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                  isSelected={selectedLeads.includes(lead.id)}
                  onSelect={(id) => {
                    if (selectedLeads.includes(id)) {
                      deselectLead(id);
                    } else {
                      selectLead(id);
                    }
                  }}
                  showActions={true}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLeads.map(lead => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                  isSelected={selectedLeads.includes(lead.id)}
                  onSelect={(id) => {
                    if (selectedLeads.includes(id)) {
                      deselectLead(id);
                    } else {
                      selectLead(id);
                    }
                  }}
                  showActions={true}
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {filteredLeads.length === 0 && (
            <Card variant="glass" padding="lg" className="text-center">
              <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">
                {dateFilter !== 'all' ? 'No signed leads in this period' : 'No signed leads yet'}
              </p>
              <p className="text-gray-400 text-sm">
                {dateFilter !== 'all' 
                  ? 'Try selecting a different time period'
                  : 'Successfully converted leads will appear here'
                }
              </p>
            </Card>
          )}
        </>
      )}

      {/* Later Stage Modal */}
      {showLaterStageModal && (
        <LaterStageModal
          lead={showLaterStageModal}
          isOpen={true}
          onClose={() => setShowLaterStageModal(null)}
          onConfirm={handleLaterStageConfirm}
        />
      )}
    </div>
  );
}
