'use client';

import { useEffect, useState, useMemo } from 'react';
import { useLeadsStore } from '@/store/leads/leads';
import { LeadCard } from '@/components/leads/leads/LeadCard';
import { LeadTable } from '@/components/leads/leads/LeadTable';
import { Lead, LeadStatus, LeadSortOptions } from '@/lib/leads/types';
import { Card } from '@/components/leads/ui/Card';
import { 
  Search, 
  Filter, 
  Download, 
  Grid, 
  List as ListIcon,
  X,
  FileText,
  CheckCircle,
  AlertCircle,
  Plus,
  ArrowRight,
  Edit,
  MessageSquare,
  Bell,
  Trash2,
  ArrowUpDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LeadDetailsModal } from '@/components/leads/leads/LeadDetailsModal';
import { LaterStageModal } from '@/components/leads/leads/LaterStageModal';
import { AddLeadButton } from '@/components/leads/leads/AddLeadButton';
import { AddNoteModal } from '@/components/leads/leads/AddNoteModal';
import { AddReminderModal } from '@/components/leads/leads/AddReminderModal';
import { ConfirmModal } from '@/components/leads/ui/ConfirmModal';
import { showToast } from '@/lib/leads/toast';
import { LEAD_STATUSES } from '@/lib/leads/types';

export default function LeadsStatusPage() {
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
      return (localStorage.getItem('leads-view-mode') as 'grid' | 'table') || 'table';
    }
    return 'table';
  });

  // Persist view mode changes
  useEffect(() => {
    localStorage.setItem('leads-view-mode', viewMode);
  }, [viewMode]);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter and sort state
  const [filterTown, setFilterTown] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'provider' | 'town' | 'date'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Modal states
  const [selectedLeadForDetails, setSelectedLeadForDetails] = useState<Lead | null>(null);
  const [showLaterStageModal, setShowLaterStageModal] = useState<Lead | null>(null);
  const [showNoteModal, setShowNoteModal] = useState<{ leadId: string; leadName: string } | null>(null);
  const [showReminderModal, setShowReminderModal] = useState<{ leadId: string; leadName: string } | null>(null);
  const [bulkStatusConfirm, setBulkStatusConfirm] = useState<{ status: LeadStatus; count: number } | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState<number | null>(null);
  const [singleDeleteConfirm, setSingleDeleteConfirm] = useState<{ leadId: string; leadName: string } | null>(null);

  // Load leads on mount
  useEffect(() => {
    fetchLeadsByStatus('leads');
  }, [fetchLeadsByStatus]);

  // Get unique towns
  const uniqueTowns = useMemo(() => {
    const towns = leads
      .filter(l => l.status === 'leads' && l.town)
      .map(l => l.town!)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();
    return towns;
  }, [leads]);

  // Filter and sort leads
  const filteredLeads = useMemo(() => {
    let result = leads.filter(lead => lead.status === 'leads');

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

  // Handle status change
  const handleStatusChange = async (leadId: string, newStatus: LeadStatus, additionalData?: any) => {
    try {
      // If changing to "later" status, show modal to collect callback date
      if (newStatus === 'later') {
        const lead = filteredLeads.find(l => l.id === leadId);
        if (lead) {
          setShowLaterStageModal(lead);
        }
      } else {
        await changeLeadStatus(leadId, newStatus, additionalData);
      }
    } catch (error) {
      console.error('Failed to change lead status:', error);
    }
  };

  // Handle Later Stage confirmation
  const handleLaterStageConfirm = async (data: { date_to_call_back: string; notes: string }) => {
    if (!showLaterStageModal) return;
    
    try {
      await changeLeadStatus(showLaterStageModal.id, 'later', data);
      setShowLaterStageModal(null);
      // Reload leads to reflect changes
      await fetchLeadsByStatus('leads');
    } catch (error) {
      console.error('Failed to move lead to Later Stage:', error);
    }
  };

  // Handle lead update
  const handleLeadUpdate = async (leadId: string, updates: Partial<Lead>) => {
    try {
      await updateLead(leadId, updates);
    } catch (error) {
      console.error('Failed to update lead:', error);
    }
  };

  // Handle lead deletion (no confirmation - used by bulk delete)
  const handleLeadDelete = async (leadId: string) => {
    try {
      await deleteLead(leadId);
    } catch (error) {
      console.error('Failed to delete lead:', error);
      throw error;
    }
  };

  // Handle sort change
  const handleSortChange = (field: keyof Lead) => {
    setSortOptions(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading leads...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6 bg-red-50 border-red-200">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-900">Error Loading Leads</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header - Mobile Optimized */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">Leads</h1>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600">
              Leads that have been through route generation and are ready to be worked on.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded-lg transition-colors touch-manipulation',
                viewMode === 'grid'
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
              aria-label="Grid view"
            >
              <Grid className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'p-2 rounded-lg transition-colors touch-manipulation',
                viewMode === 'table'
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
              aria-label="Table view"
            >
              <ListIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Stats - Mobile Optimized */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <Card className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Total Leads</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{filteredLeads.length}</p>
              </div>
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">With Notes</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {filteredLeads.filter(l => l.notes).length}
                </p>
              </div>
              <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Selected</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{selectedLeads.length}</p>
              </div>
              <Plus className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500" />
            </div>
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

        {/* Search and Filters - Mobile Optimized */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-10 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 touch-manipulation"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
          </div>
          
          {/* Add Lead Button */}
          <AddLeadButton defaultStatus="leads" onSuccess={() => fetchLeadsByStatus('leads')} />
        </div>

        {/* Bulk Actions Toolbar - Mobile Optimized */}
        {selectedLeads.length > 0 && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <span className="text-sm sm:text-base font-semibold text-blue-900">
                {selectedLeads.length} lead{selectedLeads.length > 1 ? 's' : ''} selected
              </span>
              <button
                onClick={clearSelection}
                className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 underline touch-manipulation"
              >
                Clear
              </button>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    setBulkStatusConfirm({ 
                      status: e.target.value as LeadStatus, 
                      count: selectedLeads.length 
                    });
                  }
                  e.target.value = '';
                }}
                className="flex-1 sm:flex-none px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm touch-manipulation"
                defaultValue=""
              >
                <option value="" disabled>Change Status...</option>
                {LEAD_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setBulkDeleteConfirm(selectedLeads.length)}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-xs sm:text-sm font-medium touch-manipulation active:scale-95 transition-transform"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {filteredLeads.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Leads Yet</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm
              ? 'No leads match your search criteria.'
              : 'Generate a route from the Main Sheet to add leads here.'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => window.location.href = '/'}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Main Sheet
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          )}
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLeads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onStatusChange={handleStatusChange}
              onUpdate={handleLeadUpdate}
              onDelete={handleLeadDelete}
              onViewDetails={() => setSelectedLeadForDetails(lead)}
              isSelected={selectedLeads.includes(lead.id)}
              onSelect={() => selectLead(lead.id)}
              onDeselect={() => deselectLead(lead.id)}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4">
                  <input
                    type="checkbox"
                    checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        filteredLeads.forEach(lead => selectLead(lead.id));
                      } else {
                        clearSelection();
                      }
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Provider</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Phone</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className={cn(
                  "border-b border-gray-100 hover:bg-gray-50",
                  selectedLeads.includes(lead.id) && "bg-blue-50"
                )}>
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedLeads.includes(lead.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          selectLead(lead.id);
                        } else {
                          deselectLead(lead.id);
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-900 truncate max-w-xs" title={lead.name}>{lead.name}</div>
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
                  <td className="py-3 px-4">
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {LEAD_STATUSES.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setShowNoteModal({ leadId: lead.id, leadName: lead.name })}
                        className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                        title="Add Note"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Note</span>
                      </button>
                      <button
                        onClick={() => setShowReminderModal({ leadId: lead.id, leadName: lead.name })}
                        className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded border border-purple-200 transition-colors"
                        title="Add Reminder"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        <span>Remind</span>
                      </button>
                      <button
                        onClick={() => setSelectedLeadForDetails(lead)}
                        className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 transition-colors"
                        title="View Details"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </button>
                      <button
                        onClick={() => setSingleDeleteConfirm({ leadId: lead.id, leadName: lead.name })}
                        className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors"
                        title="Delete Lead"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Lead Details Modal */}
      {selectedLeadForDetails && (
        <LeadDetailsModal
          lead={selectedLeadForDetails}
          onClose={() => setSelectedLeadForDetails(null)}
          onUpdate={handleLeadUpdate}
          onStatusChange={handleStatusChange}
        />
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

      {/* Add Note Modal */}
      {showNoteModal && (
        <AddNoteModal
          isOpen={true}
          onClose={() => setShowNoteModal(null)}
          leadId={showNoteModal.leadId}
          leadName={showNoteModal.leadName}
        />
      )}

      {/* Add Reminder Modal */}
      {showReminderModal && (
        <AddReminderModal
          isOpen={true}
          onClose={() => setShowReminderModal(null)}
          leadId={showReminderModal.leadId}
          leadName={showReminderModal.leadName}
        />
      )}

      {/* Bulk Status Change Confirmation */}
      <ConfirmModal
        isOpen={bulkStatusConfirm !== null}
        onClose={() => setBulkStatusConfirm(null)}
        onConfirm={async () => {
          if (bulkStatusConfirm) {
            for (const leadId of selectedLeads) {
              await handleStatusChange(leadId, bulkStatusConfirm.status);
            }
            clearSelection();
          }
          setBulkStatusConfirm(null);
        }}
        title="Change Status"
        message={`Change status of ${bulkStatusConfirm?.count} lead${bulkStatusConfirm?.count !== 1 ? 's' : ''}?`}
        confirmText="Change Status"
        variant="warning"
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmModal
        isOpen={bulkDeleteConfirm !== null}
        onClose={() => setBulkDeleteConfirm(null)}
        onConfirm={async () => {
          if (bulkDeleteConfirm) {
            try {
              await Promise.all(selectedLeads.map(leadId => deleteLead(leadId)));
              clearSelection();
              showToast('success', `Successfully deleted ${bulkDeleteConfirm} lead${bulkDeleteConfirm > 1 ? 's' : ''}`);
            } catch (error) {
              console.error('Error deleting leads:', error);
              showToast('error', 'Some leads could not be deleted. Please try again.');
            }
          }
          setBulkDeleteConfirm(null);
        }}
        title="Delete Leads"
        message={`Delete ${bulkDeleteConfirm} lead${bulkDeleteConfirm !== 1 ? 's' : ''}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Single Delete Confirmation */}
      <ConfirmModal
        isOpen={singleDeleteConfirm !== null}
        onClose={() => setSingleDeleteConfirm(null)}
        onConfirm={async () => {
          if (singleDeleteConfirm) {
            await handleLeadDelete(singleDeleteConfirm.leadId);
          }
          setSingleDeleteConfirm(null);
        }}
        title="Delete Lead"
        message={`Delete ${singleDeleteConfirm?.leadName}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
