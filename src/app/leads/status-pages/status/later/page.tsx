'use client';

import { useEffect, useState, useMemo } from 'react';
import { useLeadsStore } from '@/store/leads/leads';
import { LeadCard } from '@/components/leads/leads/LeadCard';
import { Lead, LeadStatus, LeadSortOptions } from '@/lib/leads/types';
import { Card } from '@/components/leads/ui/Card';
import { 
  Search, 
  Calendar, 
  Download, 
  Grid, 
  List as ListIcon,
  Clock,
  AlertCircle,
  CheckCircle,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LaterStageModal } from '@/components/leads/leads/LaterStageModal';
import { SignedModal } from '@/components/leads/leads/SignedModal';
import { ConfirmModal } from '@/components/leads/ui/ConfirmModal';
import { AddLeadButton } from '@/components/leads/leads/AddLeadButton';

export default function LaterStagePage() {
  const {
    leads,
    isLoading,
    error,
    fetchLeadsByStatus,
    updateLead,
    deleteLead,
    changeLeadStatus,
    selectLead,
    deselectLead,
    selectedLeads
  } = useLeadsStore();

  // View mode state with localStorage persistence
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'calendar'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('later-view-mode') as 'grid' | 'table' | 'calendar') || 'table';
    }
    return 'table';
  });

  // Persist view mode changes
  useEffect(() => {
    localStorage.setItem('later-view-mode', viewMode);
  }, [viewMode]);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter and sort state
  const [filterTown, setFilterTown] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'provider' | 'town' | 'date'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Delete confirmation state
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);

  // Load leads on mount
  useEffect(() => {
    fetchLeadsByStatus('later');
  }, [fetchLeadsByStatus]);

  // Get callback reminder status
  const getCallbackStatus = (callbackDate: string | null) => {
    if (!callbackDate) return 'none';
    
    const callback = new Date(callbackDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    callback.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((callback.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'today';
    if (diffDays === 2) return 'two-days';
    if (diffDays <= 7) return 'upcoming';
    return 'future';
  };

  // Get unique towns
  const uniqueTowns = useMemo(() => {
    const towns = leads
      .filter(l => l.status === 'later' && l.town)
      .map(l => l.town!)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();
    return towns;
  }, [leads]);

  // Filter and sort leads
  const filteredLeads = useMemo(() => {
    let result = leads.filter(lead => lead.status === 'later');

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
  }, [leads, searchTerm, filterTown, sortBy, sortDirection]);

  // Group leads by callback status
  const groupedLeads = useMemo(() => {
    const groups = {
      overdue: [] as Lead[],
      today: [] as Lead[],
      twoDays: [] as Lead[],
      upcoming: [] as Lead[],
      future: [] as Lead[],
      none: [] as Lead[]
    };

    filteredLeads.forEach(lead => {
      const status = getCallbackStatus(lead.date_to_call_back);
      switch (status) {
        case 'overdue':
          groups.overdue.push(lead);
          break;
        case 'today':
          groups.today.push(lead);
          break;
        case 'two-days':
          groups.twoDays.push(lead);
          break;
        case 'upcoming':
          groups.upcoming.push(lead);
          break;
        case 'future':
          groups.future.push(lead);
          break;
        default:
          groups.none.push(lead);
      }
    });

    return groups;
  }, [filteredLeads]);

  // Calculate metrics
  const metrics = useMemo(() => ({
    total: filteredLeads.length,
    overdue: groupedLeads.overdue.length,
    today: groupedLeads.today.length,
    twoDays: groupedLeads.twoDays.length,
    upcoming: groupedLeads.upcoming.length
  }), [filteredLeads, groupedLeads]);

  // State for Signed modal
  const [showSignedModal, setShowSignedModal] = useState<Lead | null>(null);

  // Handle status change
  const handleStatusChange = async (leadId: string, status: LeadStatus, additionalData?: any) => {
    try {
      if (status === 'signed') {
        const lead = filteredLeads.find(l => l.id === leadId);
        if (lead) {
          setShowSignedModal(lead);
        }
      } else {
        await changeLeadStatus(leadId, status, additionalData);
      }
    } catch (err) {
      console.error('Failed to change lead status:', err);
    }
  };

  // Handle Signed confirmation
  const handleSignedConfirm = async (data: { dateSigned: string; notes: string }) => {
    if (!showSignedModal) return;
    
    try {
      await changeLeadStatus(showSignedModal.id, 'signed', data);
      setShowSignedModal(null);
      await fetchLeadsByStatus('later');
    } catch (err) {
      console.error('Failed to mark as Signed:', err);
      throw err;
    }
  };

  // Handle delete
  const handleDelete = (leadId: string) => {
    setDeletingLeadId(leadId);
  };

  const confirmDelete = async () => {
    if (!deletingLeadId) return;
    try {
      await deleteLead(deletingLeadId);
      setDeletingLeadId(null);
    } catch (err) {
      console.error('Failed to delete lead:', err);
    }
  };

  // Handle export
  const handleExport = () => {
    const headers = ['Number', 'Name', 'Provider', 'Phone', 'Address', 'Business Type', 'Callback Date', 'Notes'];
    const rows = filteredLeads.map(lead => [
      lead.number,
      lead.name,
      lead.provider || '',
      lead.phone || '',
      lead.address || '',
      lead.type_of_business || '',
      lead.date_to_call_back || '',
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
    a.download = `later-stage-leads-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Render lead card
  const renderLeadCard = (lead: Lead) => {
    return (
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
    );
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-7xl">
      {/* Header - Mobile Optimized */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-1 sm:mb-2">
          Later Stage
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Manage callback dates and follow-up reminders
        </p>
      </div>

      {/* Metrics - Mobile Optimized */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-6">
        <Card variant="glass" padding="sm" className="sm:p-3 lg:p-4">
          <div className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1">Total</div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-purple-600">{metrics.total}</div>
        </Card>
        <Card variant="glass" padding="sm" className="sm:p-3 lg:p-4 bg-red-50">
          <div className="text-xs sm:text-sm text-red-600 mb-0.5 sm:mb-1">Overdue</div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-red-600">{metrics.overdue}</div>
        </Card>
        <Card variant="glass" padding="sm" className="sm:p-3 lg:p-4 bg-green-50">
          <div className="text-xs sm:text-sm text-green-600 mb-0.5 sm:mb-1">Today</div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600">{metrics.today}</div>
        </Card>
        <Card variant="glass" padding="sm" className="sm:p-3 lg:p-4 bg-blue-50">
          <div className="text-xs sm:text-sm text-blue-600 mb-0.5 sm:mb-1">In 2 Days</div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-600">{metrics.twoDays}</div>
        </Card>
        <Card variant="glass" padding="sm" className="sm:p-3 lg:p-4 bg-yellow-50 col-span-2 sm:col-span-1">
          <div className="text-xs sm:text-sm text-yellow-600 mb-0.5 sm:mb-1">This Week</div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-yellow-600">{metrics.upcoming}</div>
        </Card>
      </div>

      {/* Filter and Sort Bar - Mobile Optimized */}
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

      {/* Search and Action Bar - Mobile Optimized */}
      <Card variant="glass" padding="sm" className="sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search later stage leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 w-full"
              aria-label="Search leads"
            />
          </div>

          {/* Add Lead Button */}
          <AddLeadButton defaultStatus="later" onSuccess={() => fetchLeadsByStatus('later')} />
          
          {/* Export Button - Mobile Optimized */}
          <button
            onClick={handleExport}
            className="btn btn-success flex items-center gap-2 touch-manipulation"
            aria-label="Export leads"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
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
        <div className="space-y-6">
          {/* Overdue */}
          {groupedLeads.overdue.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-red-600 mb-3 flex items-center gap-2">
                <AlertCircle className="w-6 h-6" />
                Overdue ({groupedLeads.overdue.length})
              </h2>
              <div className="space-y-3">
                {groupedLeads.overdue.map(lead => renderLeadCard(lead))}
              </div>
            </div>
          )}

          {/* Today */}
          {groupedLeads.today.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-green-600 mb-3 flex items-center gap-2">
                <CheckCircle className="w-6 h-6" />
                Call Today ({groupedLeads.today.length})
              </h2>
              <div className="space-y-3">
                {groupedLeads.today.map(lead => renderLeadCard(lead))}
              </div>
            </div>
          )}

          {/* In 2 Days */}
          {groupedLeads.twoDays.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-blue-600 mb-3 flex items-center gap-2">
                <Clock className="w-6 h-6" />
                In 2 Days ({groupedLeads.twoDays.length})
              </h2>
              <div className="space-y-3">
                {groupedLeads.twoDays.map(lead => renderLeadCard(lead))}
              </div>
            </div>
          )}

          {/* Upcoming This Week */}
          {groupedLeads.upcoming.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-yellow-600 mb-3 flex items-center gap-2">
                <Calendar className="w-6 h-6" />
                This Week ({groupedLeads.upcoming.length})
              </h2>
              <div className="space-y-3">
                {groupedLeads.upcoming.map(lead => renderLeadCard(lead))}
              </div>
            </div>
          )}

          {/* Future */}
          {groupedLeads.future.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-600 mb-3 flex items-center gap-2">
                <Calendar className="w-6 h-6" />
                Future ({groupedLeads.future.length})
              </h2>
              <div className="space-y-3">
                {groupedLeads.future.map(lead => renderLeadCard(lead))}
              </div>
            </div>
          )}

          {/* No Callback Date */}
          {groupedLeads.none.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-500 mb-3 flex items-center gap-2">
                <AlertCircle className="w-6 h-6" />
                No Callback Date ({groupedLeads.none.length})
              </h2>
              <div className="space-y-3">
                {groupedLeads.none.map(lead => renderLeadCard(lead))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredLeads.length === 0 && (
            <Card variant="glass" padding="lg" className="text-center">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">No leads in later stage</p>
              <p className="text-gray-400 text-sm">
                Move leads to later stage when they need follow-up calls
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deletingLeadId !== null}
        onClose={() => setDeletingLeadId(null)}
        onConfirm={confirmDelete}
        title="Delete Lead"
        message="Are you sure you want to delete this lead? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />

      {/* Signed Modal */}
      {showSignedModal && (
        <SignedModal
          lead={showSignedModal}
          isOpen={true}
          onClose={() => setShowSignedModal(null)}
          onConfirm={handleSignedConfirm}
        />
      )}
    </div>
  );
}
