'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, CheckSquare, Square, Briefcase, X, AlertCircle, FolderOpen } from 'lucide-react';

interface IndustrySelectorProps {
  industries: string[];
  selectedIndustries: string[];
  onSelectionChange: (selected: string[]) => void;
  onAddIndustry: (industry: string) => void;
  onRemoveIndustry: (industry: string) => void;
  disabled?: boolean;
  onTemplatesClick?: () => void;
}

export default function IndustrySelector({
  industries,
  selectedIndustries,
  onSelectionChange,
  onAddIndustry,
  onRemoveIndustry,
  disabled,
  onTemplatesClick,
}: IndustrySelectorProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newIndustry, setNewIndustry] = useState('');
  const [selectedForRemoval, setSelectedForRemoval] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  // Mounted state for SSR safety
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleToggleIndustry = (industry: string) => {
    if (selectedIndustries.includes(industry)) {
      onSelectionChange(selectedIndustries.filter((i) => i !== industry));
    } else {
      onSelectionChange([...selectedIndustries, industry]);
    }
  };

  const handleSelectAll = () => {
    onSelectionChange(industries);
  };

  const handleDeselectAll = () => {
    onSelectionChange([]);
  };

  const handleAddIndustry = () => {
    if (newIndustry.trim() && !industries.includes(newIndustry.trim())) {
      onAddIndustry(newIndustry.trim());
      setNewIndustry('');
      setShowAddDialog(false);
    }
  };

  const handleRemoveIndustries = () => {
    selectedForRemoval.forEach((industry) => {
      onRemoveIndustry(industry);
    });
    setSelectedForRemoval([]);
  };

  return (
    <div className="space-y-2 sm:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg">
            <Briefcase className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base lg:text-lg font-bold text-white">
              Industry Categories
            </h3>
            <p className="text-xs text-gray-400">
              {selectedIndustries.length} selected
            </p>
          </div>
        </div>
        <div className="flex gap-1 sm:gap-2 text-xs sm:text-sm">
          <button
            type="button"
            onClick={handleSelectAll}
            disabled={disabled}
            className="font-medium text-rose-400 hover:text-rose-300 hover:underline disabled:opacity-50"
          >
            All
          </button>
          <span className="text-gray-500">•</span>
          <button
            type="button"
            onClick={handleDeselectAll}
            disabled={disabled}
            className="font-medium text-rose-400 hover:text-rose-300 hover:underline disabled:opacity-50"
          >
            None
          </button>
        </div>
      </div>

      <div className="bg-white/5 rounded-lg border border-white/10 p-2 sm:p-4 max-h-60 sm:max-h-80 overflow-y-auto space-y-1 sm:space-y-2">
        {industries.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            No industries available. Add some to get started.
          </p>
        ) : (
          industries.map((industry) => (
            <label
              key={industry}
              className={`
                flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-lg cursor-pointer transition-all duration-200
                ${selectedIndustries.includes(industry)
                  ? 'bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-md'
                  : 'hover:bg-white/10'
                }
              `}
            >
              <input
                type="checkbox"
                checked={selectedIndustries.includes(industry)}
                onChange={() => handleToggleIndustry(industry)}
                disabled={disabled}
                className="w-[14px] h-[14px] text-rose-600 rounded focus:ring-1 focus:ring-rose-500 flex-shrink-0"
                style={{ minWidth: '14px', minHeight: '14px' }}
              />
              <span className={`text-xs sm:text-sm flex-1 ${
                selectedIndustries.includes(industry) ? 'text-white font-medium' : 'text-gray-300'
              }`}>
                {industry}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    if (selectedForRemoval.includes(industry)) {
                      setSelectedForRemoval(selectedForRemoval.filter((i) => i !== industry));
                    } else {
                      setSelectedForRemoval([...selectedForRemoval, industry]);
                    }
                  }}
                  className={`p-0.5 sm:p-1 rounded ${
                    selectedForRemoval.includes(industry)
                      ? 'text-red-400 bg-red-500/20'
                      : selectedIndustries.includes(industry)
                      ? 'text-white/80 hover:text-white hover:bg-white/20'
                      : 'text-gray-400 hover:text-red-400'
                  }`}
                  title="Mark for removal"
                >
                  {selectedForRemoval.includes(industry) ? (
                    <CheckSquare className="w-3 h-3 sm:w-4 sm:h-4" />
                  ) : (
                    <Square className="w-3 h-3 sm:w-4 sm:h-4" />
                  )}
                </button>
              )}
            </label>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowAddDialog(true)}
          disabled={disabled}
          className="btn btn-secondary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Industry
        </button>
        {onTemplatesClick && (
          <button
            type="button"
            onClick={onTemplatesClick}
            disabled={disabled}
            className="btn btn-secondary flex items-center gap-2 bg-gradient-to-r from-purple-500/20 to-purple-600/20 border-purple-500/30 hover:from-purple-500/30 hover:to-purple-600/30"
          >
            <FolderOpen className="w-4 h-4" />
            Templates
          </button>
        )}
        {selectedForRemoval.length > 0 && (
          <button
            type="button"
            onClick={handleRemoveIndustries}
            disabled={disabled}
            className="btn btn-danger flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Remove ({selectedForRemoval.length})
          </button>
        )}
      </div>

      {/* Add Industry Dialog */}
      {showAddDialog && mounted && createPortal(
        <>
          {/* Backdrop Overlay - Creates dark background, centers modal, and appears ABOVE navigation */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowAddDialog(false);
                setNewIndustry('');
              }
            }}
          >
            {/* Modal Container - The glassmorphic card that "floats" */}
            <div className="bg-gradient-to-br from-slate-900 to-rose-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden border border-rose-500/30">
              
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-rose-500/20">
                <h3 className="text-xl font-bold text-white">Add Custom Industry</h3>
                <button
                  onClick={() => {
                    setShowAddDialog(false);
                    setNewIndustry('');
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5 text-rose-200" />
                </button>
              </div>
              
              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)] custom-scrollbar">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-white font-medium">
                      Industry Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={newIndustry}
                      onChange={(e) => setNewIndustry(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newIndustry.trim() && !industries.includes(newIndustry.trim())) {
                          handleAddIndustry();
                        } else if (e.key === 'Escape') {
                          setShowAddDialog(false);
                          setNewIndustry('');
                        }
                      }}
                      placeholder="e.g., Restaurants, Law Firms, etc."
                      className="w-full px-4 py-3 bg-white/10 border border-rose-500/30 rounded-lg text-white placeholder-rose-300/50 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500"
                      autoFocus
                    />
                    <p className="text-sm text-rose-300/70">
                      Enter a custom industry category to add to your list
                    </p>
                  </div>

                  {/* Info Box */}
                  {newIndustry.trim() && industries.includes(newIndustry.trim()) && (
                    <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/20">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 rounded-lg bg-yellow-500/20">
                          <AlertCircle className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-yellow-400 font-medium mb-1">Already Exists</p>
                          <p className="text-sm text-yellow-300">This industry is already in your list.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-rose-500/20">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddDialog(false);
                    setNewIndustry('');
                  }}
                  className="px-6 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddIndustry}
                  disabled={!newIndustry.trim() || industries.includes(newIndustry.trim())}
                  className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Industry
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
