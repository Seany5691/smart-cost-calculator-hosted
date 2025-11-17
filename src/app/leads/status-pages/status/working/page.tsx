'use client';

import { useEffect, useState, useMemo } from 'react';
import { useLeadsStore } from '@/store/leads/leads';
import { LeadCard } from '@/components/leads/leads/LeadCard';
import { Lead, LeadStatus, LeadSortOptions } from '@/lib/leads/types';
import { Card } from '@/components/leads/ui/Card';
import { 
  Search, 
  Download, 
  Grid, 
  List as ListIcon,
  Clock,
  CheckCircle,
  AlertCircle,
  Bell,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LaterStageModal } from '@/components/leads/leads/LaterStageModal';
import { AddLeadButton } from '@/components/leads/leads/AddLeadButton';
import { useAuthStore } from '@/store/auth';
import { useRemindersStore, useLeadReminders } from '@/store/reminders';
import { getLeadNotes, type LeadNote } from '@/lib/leads/supabaseNotesReminders';

export default function WorkingOnStatusPage() {
  const user = useAuthStore((state) => state.user);
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
    clearSelection,
    selectedLeads
  } = useLeadsStore();

  // View mode state with localStorage persistence
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('working-view-mode') as 'grid' | 'table') || 'table';
    }
    return 'table';
  });

  // Persist view mode changes
  useEffect(() => {
    localStorage.setItem('working-view-mode', viewMode);
  }, [viewMode]);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sort state
  const [sortOptions, setSortOptions] = useState<LeadSortOptions>({
    field: 'updated_at',
    direction: 'desc'
  });

  // Notes state for metrics
  const [notesCount, setNotesCount] = useState<Record<string, number>>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load leads on mount
  useEffect(() => {
    const loadData = async () => {
      await fetchLeadsByStatus('working');
    };
    loadData();
  }, [fetchLeadsByStatus]);

  // Load notes count for metrics
  useEffect(() => {
    if (leads.length > 0 && user) {
      loadNotesCount();
    }
  }, [leads, user, refreshTrigger]);

  const loadNotesCount = async () => {
    if (!user) return;
    
    try {
      const counts: Record<string, number> = {};
      const workingLeads = leads.filter(l => l.status === 'working');
      
      for (const lead of workingLeads) {
        const leadNotes = await getLeadNotes(lead.id);
        counts[lead.id] = leadNotes.length;
      }
      
      setNotesCount(counts);
    } catch (error) {
      console.error('Error loading notes count:', error);
    }
  };

  // Filter and sort leads
  const filteredLeads = useMemo(() => {
    let result = leads.filter(lead => lead.status === 'working');

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
      const { field, direction } = sortOptions;
      let valueA = a[field];
      let valueB = b[field];

      if (valueA === null || valueA === undefined) return direction === 'asc' ? 1 : -1;
      if (valueB === null || valueB === undefined) return direction === 'asc' ? -1 : 1;

      if (typeof valueA === 'string' && typeof valueB === 'string') {
        const comparison = valueA.localeCompare(valueB);
        return direction === 'asc' ? comparison : -comparison;
      }

      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return direction === 'asc' ? valueA - valueB : valueB - valueA;
      }

      return 0;
    });

    return result;
  }, [leads, searchTerm, sortOptions]);

  // Calculate progress metrics
  const progressMetrics = useMemo(() => {
    const total = filteredLeads.length;
    const withNotes = Object.values(notesCount).filter(count => count > 0).length;
    
    // Get reminders count from store
    let withReminders = 0;
    filteredLeads.forEach(lead => {
      const leadReminders = useRemindersStore.getState().reminders.filter(
        r => r.leadId === lead.id && !r.completed
      );
      if (leadReminders.length > 0) withReminders++;
    });
    
    const recentlyUpdated = filteredLeads.filter(lead => {
      const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(lead.updated_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceUpdate <= 7;
    }).length;

    return { total, withNotes, withReminders, recentlyUpdated };
  }, [filteredLeads, notesCount]);

  // State for Later Stage modal
  const [showLaterStageModal, setShowLaterStageModal] = useState<Lead | null>(null);

  // Handle status change
  const handleStatusChange = async (leadId: string, status: LeadStatus) => {
    try {
      if (status === 'later') {
        const lead = filteredLeads.find(l => l.id === leadId);
        if (lead) {
          setShowLaterStageModal(lead);
        }
      } else {
        await changeLeadStatus(leadId, status);
      }
    } catch (err) {
      console.error('Failed to change lead status:', err);
    }
  };

  // Handle Later Stage confirmation
  const handleLaterStageConfirm = async (data: { date_to_call_back: string; notes: string }) => {
    if (!showLaterStageModal) return;
    
    try {
      await changeLeadStatus(showLaterStageModal.id, 'later', data);
      setShowLaterStageModal(null);
      await fetchLeadsByStatus('working');
    } catch (err) {
      console.error('Failed to move to Later Stage:', err);
      throw err;
    }
  };

  // Handle edit
  const handleEdit = async (lead: Lead) => {
    console.log('Edit lead:', lead);
  };

  // Handle delete
  const handleDelete = async (leadId: string) => {
    try {
      await deleteLead(leadId);
    } catch (err) {
      console.error('Failed to delete lead:', err);
    }
  };

  // Handle export
  const handleExport = () => {
    const headers = ['Number', 'Name', 'Provider', 'Phone', 'Address', 'Business Type', 'Status', 'Notes', 'Last Updated'];
    const rows = filteredLeads.map(lead => [
      lead.number,
      lead.name,
      lead.provider || '',
      lead.phone || '',
      lead.address || '',
      lead.type_of_business || '',
      lead.status,
      lead.notes || '',
      new Date(lead.updated_at).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `working-leads-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-7xl">
      {/* Header - Mobile Optimized */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent mb-1 sm:mb-2">
          Working On
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Track progress and manage active leads
        </p>
      </div>

      {/* Progress Metrics - Mobile Optimized */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Card variant="glass" padding="sm" className="sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1">Active Leads</div>
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-yellow-600">{progressMetrics.total}</div>
            </div>
            <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600 opacity-50" />
          </div>
        </Card>
        <Card variant="glass" padding="sm" className="sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1">With Notes</div>
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-600">{progressMetrics.withNotes}</div>
            </div>
            <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 opacity-50" />
          </div>
        </Card>
        <Card variant="glass" padding="sm" className="sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1">With Reminders</div>
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-purple-600">{progressMetrics.withReminders}</div>
            </div>
            <Bell className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 opacity-50" />
          </div>
        </Card>
        <Card variant="glass" padding="sm" className="sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1">Recently Updated</div>
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600">{progressMetrics.recentlyUpdated}</div>
            </div>
            <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 opacity-50" />
          </div>
        </Card>
      </div>

      {/* Search and Action Bar - Mobile Optimized */}
      <Card variant="glass" padding="sm" className="sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search working leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 w-full"
              aria-label="Search leads"
            />
          </div>

          {/* View Mode Toggle - Mobile Optimized */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'btn touch-manipulation',
                viewMode === 'table' ? 'btn-primary' : 'btn-secondary'
              )}
              aria-label="Table view"
            >
              <ListIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'btn touch-manipulation',
                viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'
              )}
              aria-label="Grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>

          {/* Add Lead Button */}
          <AddLeadButton defaultStatus="working" onSuccess={() => fetchLeadsByStatus('working')} />
          
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading leads...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card variant="glass" padding="md" className="bg-red-50 border-red-200 mb-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <p className="text-red-600">{error}</p>
          </div>
        </Card>
      )}

      {/* Leads Display */}
      {!isLoading && !error && (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLeads.map(lead => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onStatusChange={handleStatusChange}
                  onEdit={handleEdit}
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
            <div className="space-y-4">
              {filteredLeads.map(lead => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onStatusChange={handleStatusChange}
                  onEdit={handleEdit}
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
              <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">No leads in progress</p>
              <p className="text-gray-400 text-sm">
                Select leads from the main list to start working on them
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
