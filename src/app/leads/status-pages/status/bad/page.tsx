'use client';

import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLeadsStore } from '@/store/leads/leads';
import { LeadCard } from '@/components/leads/leads/LeadCard';
import { LeadTable } from '@/components/leads/leads/LeadTable';
import { Lead, LeadStatus, LeadSortOptions } from '@/lib/leads/types';
import { Card } from '@/components/leads/ui/Card';
import { ConfirmModal } from '@/components/leads/ui/ConfirmModal';
import { 
  Search, 
  Download, 
  Grid, 
  List as ListIcon,
  XCircle,
  RotateCcw,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { showToast } from '@/lib/leads/toast';
import { AddLeadButton } from '@/components/leads/leads/AddLeadButton';

export default function BadLeadsPage() {
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
      return (localStorage.getItem('bad-view-mode') as 'grid' | 'table') || 'table';
    }
    return 'table';
  });

  // Persist view mode changes
  useEffect(() => {
    localStorage.setItem('bad-view-mode', viewMode);
  }, [viewMode]);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sort state
  const [sortOptions, setSortOptions] = useState<LeadSortOptions>({
    field: 'updated_at',
    direction: 'desc'
  });

  // Recover modal state
  const [showRecoverModal, setShowRecoverModal] = useState(false);
  const [recoveringLeadId, setRecoveringLeadId] = useState<string | null>(null);
  const [selectedRecoverStatus, setSelectedRecoverStatus] = useState<'leads' | 'working' | 'later'>('leads');
  const [callbackDate, setCallbackDate] = useState('');

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showBulkRecoverModal, setShowBulkRecoverModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load leads on mount
  useEffect(() => {
    fetchLeadsByStatus('bad');
  }, [fetchLeadsByStatus]);

  // Filter and sort leads
  const filteredLeads = useMemo(() => {
    let result = leads.filter(lead => lead.status === 'bad');

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

  // Calculate metrics
  const metrics = useMemo(() => {
    const total = filteredLeads.length;
    const byProvider: Record<string, number> = {};
    
    filteredLeads.forEach(lead => {
      const provider = lead.provider || 'Unknown';
      byProvider[provider] = (byProvider[provider] || 0) + 1;
    });

    const topProvider = Object.entries(byProvider).sort((a, b) => b[1] - a[1])[0];

    return {
      total,
      byProvider,
      topProvider: topProvider ? { name: topProvider[0], count: topProvider[1] } : null
    };
  }, [filteredLeads]);

  // Handle status change (recovery)
  const handleRecoverLead = (leadId: string) => {
    setRecoveringLeadId(leadId);
    setSelectedRecoverStatus('leads');
    setCallbackDate('');
    setShowRecoverModal(true);
  };

  const confirmRecoverLead = async () => {
    if (!recoveringLeadId) return;

    try {
      if (selectedRecoverStatus === 'later') {
        if (!callbackDate) {
          showToast('Please select a callback date for Later Stage', 'warning');
          return;
        }
        await changeLeadStatus(recoveringLeadId, 'later', { date_to_call_back: callbackDate });
      } else {
        await changeLeadStatus(recoveringLeadId, selectedRecoverStatus);
      }
      
      showToast('Lead recovered successfully!', 'success');
      setShowRecoverModal(false);
      setRecoveringLeadId(null);
    } catch (err) {
      console.error('Failed to recover lead:', err);
      showToast('Failed to recover lead. Please try again.', 'error');
    }
  };

  // Handle edit
  const handleEdit = async (lead: Lead) => {
    console.log('Edit lead:', lead);
  };

  // Handle status change
  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    try {
      await changeLeadStatus(leadId, newStatus);
    } catch (err) {
      console.error('Failed to change lead status:', err);
    }
  };

  // Handle delete
  const handleDelete = (leadId: string) => {
    setDeletingLeadId(leadId);
    setShowDeleteModal(true);
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

  // Handle bulk actions
  const handleBulkAction = async (leadIds: string[], action: string) => {
    try {
      if (action === 'delete') {
        setShowBulkDeleteModal(true);
      } else if (action === 'export') {
        handleExport(leadIds);
      } else if (action === 'recover') {
        setShowBulkRecoverModal(true);
      }
    } catch (err) {
      console.error('Failed to perform bulk action:', err);
    }
  };

  const confirmBulkDelete = async () => {
    try {
      for (const id of selectedLeads) {
        await deleteLead(id);
      }
      clearSelection();
    } catch (err) {
      console.error('Failed to delete leads:', err);
    }
  };

  const confirmBulkRecover = async () => {
    try {
      for (const id of selectedLeads) {
        await changeLeadStatus(id, 'leads');
      }
      clearSelection();
    } catch (err) {
      console.error('Failed to recover leads:', err);
    }
  };

  // Handle export
  const handleExport = (leadIds?: string[]) => {
    const leadsToExport = leadIds 
      ? filteredLeads.filter(lead => leadIds.includes(lead.id))
      : filteredLeads;

    const headers = ['Number', 'Name', 'Provider', 'Phone', 'Address', 'Business Type', 'Notes', 'Marked Bad On'];
    const rows = leadsToExport.map(lead => [
      lead.number,
      lead.name,
      lead.provider || '',
      lead.phone || '',
      lead.address || '',
      lead.type_of_business || '',
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
    a.download = `bad-leads-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle selection change
  const handleSelectionChange = (leadIds: string[]) => {
    clearSelection();
    leadIds.forEach(id => selectLead(id));
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent mb-2">
          Bad Leads
        </h1>
        <p className="text-gray-600">
          Leads marked as not viable - can be recovered or permanently deleted
        </p>
      </div>

      {/* Warning Banner */}
      <Card variant="glass" padding="md" className="mb-6 bg-red-50 border-red-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900 mb-1">Bad Leads Archive</h3>
            <p className="text-sm text-red-700">
              These leads have been marked as not viable. You can recover them to another status or permanently delete them.
              Deleted leads cannot be recovered.
            </p>
          </div>
        </div>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card variant="glass" padding="md" className="bg-red-50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-red-600 mb-1">Total Bad Leads</div>
              <div className="text-3xl font-bold text-red-600">{metrics.total}</div>
            </div>
            <XCircle className="w-8 h-8 text-red-600 opacity-50" />
          </div>
        </Card>
        <Card variant="glass" padding="md">
          <div className="text-sm text-gray-600 mb-1">Selected</div>
          <div className="text-3xl font-bold text-indigo-600">{selectedLeads.length}</div>
        </Card>
        <Card variant="glass" padding="md">
          <div className="text-sm text-gray-600 mb-1">Most Common Provider</div>
          <div className="text-lg font-bold text-gray-900">
            {metrics.topProvider ? `${metrics.topProvider.name} (${metrics.topProvider.count})` : 'N/A'}
          </div>
        </Card>
      </div>

      {/* Search and Action Bar */}
      <Card variant="glass" padding="md" className="mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search bad leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 w-full"
              aria-label="Search leads"
            />
          </div>

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
          <AddLeadButton defaultStatus="bad" onSuccess={() => fetchLeadsByStatus('bad')} />
          
          {/* Export Button */}
          <button
            onClick={() => handleExport()}
            className="btn btn-success flex items-center gap-2"
            aria-label="Export leads"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </Card>

      {/* Bulk Actions */}
      {selectedLeads.length > 0 && (
        <Card variant="glass" padding="md" className="mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedLeads.length} lead{selectedLeads.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction(selectedLeads, 'recover')}
                className="btn btn-success btn-mobile-icon flex items-center gap-2"
                aria-label="Recover selected leads"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Recover</span>
              </button>
              <button
                onClick={() => handleBulkAction(selectedLeads, 'delete')}
                className="btn btn-danger btn-mobile-icon flex items-center gap-2"
                aria-label="Delete selected leads"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
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
              <XCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">No bad leads</p>
              <p className="text-gray-400 text-sm">
                Leads marked as "No Good" will appear here
              </p>
            </Card>
          )}
        </>
      )}

      {/* Recover Lead Modal */}
      {showRecoverModal && mounted && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
            onClick={() => setShowRecoverModal(false)}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg">
                    <RotateCcw className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Recover Lead</h2>
                </div>
                <button
                  onClick={() => setShowRecoverModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="space-y-4">
                <p className="text-gray-600">
                  Select the status to recover this lead to:
                </p>

                {/* Status Options */}
                <div className="space-y-3">
                  <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50">
                    <input
                      type="radio"
                      name="recoverStatus"
                      value="leads"
                      checked={selectedRecoverStatus === 'leads'}
                      onChange={(e) => setSelectedRecoverStatus(e.target.value as any)}
                      className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">📝</span>
                        <span className="font-semibold text-gray-900">Leads</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">Active lead pipeline</p>
                    </div>
                  </label>

                  <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50">
                    <input
                      type="radio"
                      name="recoverStatus"
                      value="working"
                      checked={selectedRecoverStatus === 'working'}
                      onChange={(e) => setSelectedRecoverStatus(e.target.value as any)}
                      className="w-4 h-4 text-yellow-600 focus:ring-yellow-500"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">👥</span>
                        <span className="font-semibold text-gray-900">Working On</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">Currently in progress</p>
                    </div>
                  </label>

                  <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50">
                    <input
                      type="radio"
                      name="recoverStatus"
                      value="later"
                      checked={selectedRecoverStatus === 'later'}
                      onChange={(e) => setSelectedRecoverStatus(e.target.value as any)}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">⏰</span>
                        <span className="font-semibold text-gray-900">Later Stage</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">Schedule for callback</p>
                    </div>
                  </label>
                </div>

                {/* Callback Date (only for Later Stage) */}
                {selectedRecoverStatus === 'later' && (
                  <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Callback Date *
                    </label>
                    <input
                      type="date"
                      value={callbackDate}
                      onChange={(e) => setCallbackDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowRecoverModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRecoverLead}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-lg transition-all"
                >
                  Recover Lead
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingLeadId(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Lead"
        message="Are you sure you want to permanently delete this lead? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={confirmBulkDelete}
        title="Delete Multiple Leads"
        message={`Are you sure you want to permanently delete ${selectedLeads.length} lead(s)? This action cannot be undone.`}
        confirmText="Delete All"
        variant="danger"
      />

      {/* Bulk Recover Confirmation Modal */}
      <ConfirmModal
        isOpen={showBulkRecoverModal}
        onClose={() => setShowBulkRecoverModal(false)}
        onConfirm={confirmBulkRecover}
        title="Recover Multiple Leads"
        message={`Recover ${selectedLeads.length} lead(s) to "Leads" status?`}
        confirmText="Recover All"
        variant="info"
      />
    </div>
  );
}
