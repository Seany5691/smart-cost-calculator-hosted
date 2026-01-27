/**
 * DuplicateWarningModal Component
 * Warns user about potential duplicate scraping sessions
 * Phase 2: Duplicate Detection
 */

'use client';

import React from 'react';
import { AlertTriangle, X, Calendar, Package } from 'lucide-react';

interface Duplicate {
  sessionId: string;
  sessionName: string;
  businessCount: number;
  createdAt: string;
  overlappingTowns: string[];
  overlappingIndustries: string[];
  overlapPercentage: number;
}

interface DuplicateWarningModalProps {
  isOpen: boolean;
  duplicates: Duplicate[];
  onClose: () => void;
  onContinue: () => void;
  onLoadExisting: (sessionId: string) => void;
}

export default function DuplicateWarningModal({
  isOpen,
  duplicates,
  onClose,
  onContinue,
  onLoadExisting,
}: DuplicateWarningModalProps) {
  if (!isOpen || duplicates.length === 0) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const topDuplicate = duplicates[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-card w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 lg:p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-white">
                Potential Duplicate Detected
              </h2>
              <p className="text-sm text-gray-400">
                You may have already scraped this data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {/* Warning Message */}
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-yellow-200 text-sm">
              ⚠️ We found {duplicates.length} existing session{duplicates.length > 1 ? 's' : ''} with similar towns and industries.
              Scraping again may result in duplicate data.
            </p>
          </div>

          {/* Top Match */}
          <div className="mb-4">
            <h3 className="text-white font-semibold mb-3">Best Match:</h3>
            <div className="glass-card p-4 border-2 border-yellow-500/30">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="text-white font-semibold text-lg mb-1">
                    {topDuplicate.sessionName}
                  </h4>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(topDuplicate.createdAt)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Package className="w-4 h-4" />
                      {topDuplicate.businessCount} businesses
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-yellow-400">
                    {topDuplicate.overlapPercentage}%
                  </div>
                  <div className="text-xs text-gray-400">overlap</div>
                </div>
              </div>

              {/* Overlapping Details */}
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-gray-400">Overlapping Towns:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {topDuplicate.overlappingTowns.map((town, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded"
                      >
                        {town}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-400">Overlapping Industries:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {topDuplicate.overlappingIndustries.map((industry, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded"
                      >
                        {industry}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Load Button */}
              <button
                onClick={() => onLoadExisting(topDuplicate.sessionId)}
                className="w-full mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors font-medium"
              >
                Load This Session Instead
              </button>
            </div>
          </div>

          {/* Other Matches */}
          {duplicates.length > 1 && (
            <div>
              <h3 className="text-white font-semibold mb-3">
                Other Matches ({duplicates.length - 1}):
              </h3>
              <div className="space-y-2">
                {duplicates.slice(1, 4).map((dup) => (
                  <div
                    key={dup.sessionId}
                    className="glass-card p-3 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="text-white text-sm font-medium">
                        {dup.sessionName}
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatDate(dup.createdAt)} • {dup.businessCount} businesses
                      </div>
                    </div>
                    <div className="text-yellow-400 font-semibold">
                      {dup.overlapPercentage}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 lg:p-6 border-t border-white/10 space-y-3">
          <button
            onClick={onContinue}
            className="w-full px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors font-medium"
          >
            Continue Anyway (May Create Duplicates)
          </button>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
