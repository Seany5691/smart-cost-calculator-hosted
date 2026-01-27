/**
 * RetryFailedModal Component
 * Prompts user to retry towns that failed during scraping
 * Phase 4: Enhanced error recovery
 */

'use client';

import React from 'react';
import { RefreshCw, X, AlertTriangle } from 'lucide-react';

interface RetryFailedModalProps {
  isOpen: boolean;
  failedTowns: string[];
  onRetry: () => void;
  onSkip: () => void;
  onClose: () => void;
}

export default function RetryFailedModal({
  isOpen,
  failedTowns,
  onRetry,
  onSkip,
  onClose,
}: RetryFailedModalProps) {
  if (!isOpen || failedTowns.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 lg:p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-400" />
            <h2 className="text-xl font-bold text-white">
              Towns Failed
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 lg:p-6">
          <p className="text-gray-300 mb-4">
            {failedTowns.length} town{failedTowns.length !== 1 ? 's' : ''} failed to scrape:
          </p>

          {/* Failed Towns List */}
          <div className="glass-card p-4 mb-6 max-h-48 overflow-y-auto">
            <ul className="space-y-2">
              {failedTowns.map((town, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-white">{town}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-gray-400 text-sm mb-6">
            Would you like to retry these towns? This may help recover data if the failure was temporary.
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onSkip}
              className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Skip
            </button>
            <button
              onClick={onRetry}
              className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Retry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
