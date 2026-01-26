'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLeadsStore } from '@/lib/store/leads';
import { useToast } from '@/components/ui/Toast/useToast';

export default function ListManager() {
  const { setFilters, filters } = useLeadsStore();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [deletingList, setDeletingList] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [listNames, setListNames] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      // TODO: Implement fetchListNames API call
      // fetchListNames();
    }
  }, [isOpen]);

  const handleDeleteList = async (listName: string) => {
    if (confirmDelete !== listName) {
      setConfirmDelete(listName);
      return;
    }

    setDeletingList(listName);
    try {
      // TODO: Implement deleteList API call
      // await deleteList(listName);
      setConfirmDelete(null);
      
      // If the deleted list was being filtered, clear the filter
      if (filters.list_name === listName) {
        setFilters({ list_name: undefined });
      }
      
      toast.success('List deleted successfully', {
        section: 'leads'
      });
    } catch (error) {
      console.error('Error deleting list:', error);
      toast.error('Failed to delete list', {
        message: 'Please try again',
        section: 'leads'
      });
    } finally {
      setDeletingList(null);
    }
  };

  const handleViewList = (listName: string) => {
    setFilters({ list_name: listName });
    setIsOpen(false);
  };

  const handleClearFilter = () => {
    setFilters({ list_name: undefined });
  };

  return (
    <div className="relative">
      {/* List Manager Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
      >
        <span className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          Manage Lists
          {listNames.length > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
              {listNames.length}
            </span>
          )}
        </span>
      </button>

      {/* Current Filter Display */}
      {filters.list_name && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-300">
              Viewing: <strong>{filters.list_name}</strong>
            </span>
            <button
              onClick={handleClearFilter}
              className="text-xs text-blue-400 hover:text-blue-300 underline"
            >
              Clear Filter
            </button>
          </div>
        </div>
      )}

      {/* List Manager Modal */}
      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 to-emerald-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-emerald-500/30">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-emerald-500/20">
              <h2 className="text-2xl font-bold text-white">Manage Lead Lists</h2>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setConfirmDelete(null);
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] custom-scrollbar">
              {listNames.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto text-emerald-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-white text-lg">No lists found</p>
                  <p className="text-emerald-300 text-sm mt-2">
                    Create a list by adding a list name when creating or editing leads
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {listNames.map((listName) => (
                    <div
                      key={listName}
                      className="bg-white/5 rounded-lg p-4 border border-emerald-500/20 hover:border-emerald-500/30 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="text-white font-semibold text-lg">{listName}</h3>
                          {filters.list_name === listName && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-xs rounded-full">
                              Currently Viewing
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewList(listName)}
                            className="px-4 py-2 bg-emerald-500/20 text-emerald-300 rounded-lg hover:bg-emerald-500/30 transition-colors font-semibold"
                            disabled={filters.list_name === listName}
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDeleteList(listName)}
                            disabled={deletingList === listName}
                            className={`px-4 py-2 rounded-lg transition-colors font-semibold ${
                              confirmDelete === listName
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                            }`}
                          >
                            {deletingList === listName ? (
                              <span className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Deleting...
                              </span>
                            ) : confirmDelete === listName ? (
                              'Confirm Delete'
                            ) : (
                              'Delete'
                            )}
                          </button>
                          {confirmDelete === listName && (
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors font-semibold"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-emerald-500/20">
              <p className="text-emerald-300 text-sm text-center">
                💡 Tip: Assign a list name to leads when creating or editing them to organize your leads into lists
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
