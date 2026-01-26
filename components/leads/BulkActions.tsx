'use client';

import { useState } from 'react';
import { useLeadsStore } from '@/lib/store/leads';
import { X, MapPin, Trash2, AlertTriangle, Share2 } from 'lucide-react';
import RoutesSection from './RoutesSection';
import BatchShareLeadsModal from './BatchShareLeadsModal';
import { useToast } from '@/components/ui/Toast/useToast';

// Helper function to get auth token
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const data = JSON.parse(stored);
      return data.state?.token || data.token || null;
    }
  } catch (error) {
    console.error('Error reading auth token:', error);
  }
  return null;
}

interface BulkActionsProps {
  onComplete: () => void;
}

export default function BulkActions({ onComplete }: BulkActionsProps) {
  const { selectedLeads, leads, clearSelection } = useLeadsStore();
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [showRoutes, setShowRoutes] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBatchShare, setShowBatchShare] = useState(false);
  const [action, setAction] = useState<'status' | 'provider' | null>(null);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBulkUpdate = async () => {
    if (!action || !value) return;

    setLoading(true);
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error('Not authenticated', {
          message: 'Please log in to continue',
          section: 'leads'
        });
        return;
      }

      const updates: any = {};
      if (action === 'status') {
        updates.status = value;
      } else if (action === 'provider') {
        updates.provider = value;
      }

      const response = await fetch('/api/leads/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          leadIds: selectedLeads,
          updates
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update leads');
      }

      clearSelection();
      setShowModal(false);
      setAction(null);
      setValue('');
      onComplete();
    } catch (error) {
      console.error('Error updating leads:', error);
      toast.error('Failed to update leads', {
        message: 'Please try again',
        section: 'leads'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error('Not authenticated', {
          message: 'Please log in to continue',
          section: 'leads'
        });
        return;
      }

      const response = await fetch('/api/leads/bulk', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          leadIds: selectedLeads
        })
      });

      if (!response.ok) {
        throw new Error('Failed to delete leads');
      }

      clearSelection();
      setShowDeleteConfirm(false);
      onComplete();
    } catch (error) {
      console.error('Error deleting leads:', error);
      toast.error('Failed to delete leads', {
        message: 'Please try again',
        section: 'leads'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error('Not authenticated', {
          message: 'Please log in to continue',
          section: 'leads'
        });
        return;
      }

      const response = await fetch(
        `/api/leads/export?leadIds=${selectedLeads.join(',')}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to export leads');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting leads:', error);
      toast.error('Failed to export leads', {
        message: 'Please try again',
        section: 'leads'
      });
    }
  };

  return (
    <>
      <div className="bg-white/10 border border-white/20 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-white">
              {selectedLeads.length} lead{selectedLeads.length !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={clearSelection}
              className="text-sm text-gray-300 hover:text-white flex items-center gap-1 transition-colors min-h-[44px] px-2"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                setAction('status');
                setShowModal(true);
              }}
              className="flex-1 sm:flex-none px-4 py-2 min-h-[44px] bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors text-sm"
            >
              Change Status
            </button>
            <button
              onClick={() => {
                setAction('provider');
                setShowModal(true);
              }}
              className="flex-1 sm:flex-none px-4 py-2 min-h-[44px] bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors text-sm"
            >
              Change Provider
            </button>
            <button
              onClick={() => setShowBatchShare(true)}
              className="flex-1 sm:flex-none px-4 py-2 min-h-[44px] bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Share Leads</span>
              <span className="sm:hidden">Share</span>
            </button>
            <button
              onClick={() => setShowRoutes(true)}
              className="flex-1 sm:flex-none px-4 py-2 min-h-[44px] bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <MapPin className="w-4 h-4" />
              <span className="hidden sm:inline">Create Route</span>
              <span className="sm:hidden">Route</span>
            </button>
            <button
              onClick={handleExport}
              className="flex-1 sm:flex-none px-4 py-2 min-h-[44px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Export
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex-1 sm:flex-none px-4 py-2 min-h-[44px] bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Update Modal */}
      {showModal && action && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-gradient-to-br from-slate-900 to-emerald-900 rounded-2xl shadow-2xl max-w-md w-full border border-emerald-500/30">
            <div className="flex items-center justify-between p-6 border-b border-emerald-500/20">
              <h3 className="text-xl font-semibold text-white">
                Bulk Update {action === 'status' ? 'Status' : 'Provider'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setAction(null);
                  setValue('');
                }}
                disabled={loading}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5 text-emerald-200" />
              </button>
            </div>
            
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select {action === 'status' ? 'Status' : 'Provider'}
              </label>
              {action === 'status' ? (
                <select
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select status...</option>
                  <option value="new">New</option>
                  <option value="leads">Leads</option>
                  <option value="working">Working</option>
                  <option value="bad">Bad</option>
                  <option value="later">Later</option>
                  <option value="signed">Signed</option>
                </select>
              ) : (
                <select
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select provider...</option>
                  <option value="Telkom">Telkom</option>
                  <option value="Vodacom">Vodacom</option>
                  <option value="MTN">MTN</option>
                  <option value="Cell C">Cell C</option>
                  <option value="Other">Other</option>
                </select>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-end p-6 border-t border-emerald-500/20">
              <button
                onClick={() => {
                  setShowModal(false);
                  setAction(null);
                  setValue('');
                }}
                disabled={loading}
                className="w-full sm:w-auto px-6 py-3 min-h-[44px] bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkUpdate}
                disabled={!value || loading}
                className="w-full sm:w-auto px-6 py-3 min-h-[44px] bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                {loading ? 'Updating...' : `Update ${selectedLeads.length} Leads`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-gradient-to-br from-slate-900 to-emerald-900 rounded-2xl shadow-2xl max-w-md w-full border border-emerald-500/30">
            <div className="flex items-center justify-between p-6 border-b border-emerald-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">Confirm Bulk Delete</h3>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5 text-emerald-200" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-300">
                Are you sure you want to delete {selectedLeads.length} lead{selectedLeads.length !== 1 ? 's' : ''}? 
                This action cannot be undone.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-end p-6 border-t border-emerald-500/20">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
                className="w-full sm:w-auto px-6 py-3 min-h-[44px] bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={loading}
                className="w-full sm:w-auto px-6 py-3 min-h-[44px] bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                {loading ? 'Deleting...' : `Delete ${selectedLeads.length} Leads`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Routes Modal */}
      {showRoutes && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-gradient-to-br from-slate-900 to-emerald-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-emerald-500/30">
            <RoutesSection
              selectedLeads={leads
                .filter(lead => selectedLeads.includes(lead.id))
                .map(lead => ({
                  id: lead.id,
                  name: lead.name,
                  address: lead.address || '',
                  maps_address: lead.maps_address
                }))}
              onClose={() => setShowRoutes(false)}
            />
          </div>
        </div>
      )}

      {/* Batch Share Modal */}
      {showBatchShare && (
        <BatchShareLeadsModal
          isOpen={showBatchShare}
          onClose={() => setShowBatchShare(false)}
          leadIds={selectedLeads}
          leadCount={selectedLeads.length}
          onShareSuccess={() => {
            clearSelection();
            toast.success('Leads shared successfully', {
              message: `${selectedLeads.length} lead${selectedLeads.length !== 1 ? 's' : ''} shared`,
              section: 'leads'
            });
            onComplete();
          }}
        />
      )}
    </>
  );
}
