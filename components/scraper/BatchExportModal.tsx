/**
 * BatchExportModal Component
 * Allows selecting specific businesses to export to leads
 * Phase 4: Batch export to leads
 */

'use client';

import React, { useState } from 'react';
import { Upload, X, Search, CheckSquare, Square } from 'lucide-react';
import { Business } from '@/lib/store/scraper';

interface BatchExportModalProps {
  isOpen: boolean;
  businesses: Business[];
  onExport: (selectedBusinesses: Business[], listName: string) => Promise<void>;
  onClose: () => void;
}

export default function BatchExportModal({
  isOpen,
  businesses,
  onExport,
  onClose,
}: BatchExportModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [listName, setListName] = useState('Selected Businesses');
  const [isExporting, setIsExporting] = useState(false);

  // Filter businesses based on search
  const filteredBusinesses = businesses.filter(business =>
    business.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    business.town?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (business.industry && business.industry.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleSelect = (business: Business) => {
    const id = `${business.name}-${business.phone}-${business.town}`;
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredBusinesses.length) {
      setSelectedIds(new Set());
    } else {
      const allIds = new Set(
        filteredBusinesses.map(b => `${b.name}-${b.phone}-${b.town}`)
      );
      setSelectedIds(allIds);
    }
  };

  const handleExport = async () => {
    if (selectedIds.size === 0) {
      return;
    }

    setIsExporting(true);
    try {
      const selectedBusinesses = businesses.filter(b =>
        selectedIds.has(`${b.name}-${b.phone}-${b.town}`)
      );
      await onExport(selectedBusinesses, listName);
      onClose();
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-card w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 lg:p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Upload className="w-6 h-6 text-rose-400" />
            <h2 className="text-xl lg:text-2xl font-bold text-white">
              Export to Leads
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Search & Select All */}
        <div className="p-4 lg:p-6 border-b border-white/10 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search businesses..."
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Select All & Count */}
          <div className="flex items-center justify-between">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
            >
              {selectedIds.size === filteredBusinesses.length ? (
                <CheckSquare className="w-5 h-5 text-rose-400" />
              ) : (
                <Square className="w-5 h-5" />
              )}
              Select All
            </button>
            <div className="text-sm text-gray-400">
              {selectedIds.size} of {filteredBusinesses.length} selected
            </div>
          </div>

          {/* List Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Lead List Name
            </label>
            <input
              type="text"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="Enter list name"
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        {/* Business List */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {filteredBusinesses.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No businesses found
            </div>
          ) : (
            <div className="space-y-2">
              {filteredBusinesses.map((business, index) => {
                const id = `${business.name}-${business.phone}-${business.town}`;
                const isSelected = selectedIds.has(id);

                return (
                  <div
                    key={index}
                    onClick={() => toggleSelect(business)}
                    className={`glass-card p-4 cursor-pointer transition-all ${
                      isSelected ? 'bg-rose-600/20 border-rose-500' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <div className="mt-1">
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-rose-400" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </div>

                      {/* Business Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold truncate">
                          {business.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm">
                          <span className="text-gray-300">{business.phone}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-300">{business.town}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-300">{business.industry}</span>
                          {business.provider && business.provider !== 'Unknown' && (
                            <>
                              <span className="text-gray-400">•</span>
                              <span className="text-rose-400">{business.provider}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 lg:p-6 border-t border-white/10">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || selectedIds.size === 0 || !listName.trim()}
              className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isExporting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Export {selectedIds.size} Business{selectedIds.size !== 1 ? 'es' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

