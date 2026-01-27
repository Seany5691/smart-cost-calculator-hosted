/**
 * ProviderLookupProgress Component
 * Shows real-time progress of provider lookups
 * Phase 2: Provider Lookup Progress
 */

'use client';

import React from 'react';
import { Phone, Loader2 } from 'lucide-react';

interface ProviderLookupProgressProps {
  completed: number;
  total: number;
  percentage: number;
  currentBatch: number;
  totalBatches: number;
  isActive: boolean;
}

export default function ProviderLookupProgress({
  completed,
  total,
  percentage,
  currentBatch,
  totalBatches,
  isActive,
}: ProviderLookupProgressProps) {
  if (!isActive || total === 0) {
    return null;
  }

  return (
    <div className="glass-card p-4 lg:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-purple-500/20 rounded-lg">
          <Phone className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold">Provider Lookups</h3>
          <p className="text-xs text-gray-400">
            Identifying telecommunications providers
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-300">
            {completed} / {total} numbers
          </span>
          <span className="text-sm font-semibold text-teal-400">
            {percentage}%
          </span>
        </div>
        <div className="w-full bg-gray-700/50 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-teal-500 transition-all duration-300 ease-out flex items-center justify-end"
            style={{ width: `${percentage}%` }}
          >
            {percentage > 10 && (
              <Loader2 className="w-3 h-3 text-white animate-spin mr-1" />
            )}
          </div>
        </div>
      </div>

      {/* Batch Info */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>Batch {currentBatch} of {totalBatches}</span>
        <span className="flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          Processing...
        </span>
      </div>

      {/* Info Text */}
      <div className="mt-3 p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
        <p className="text-xs text-purple-300">
          💡 Lookups are batched in groups of 5 to avoid captcha detection
        </p>
      </div>
    </div>
  );
}
