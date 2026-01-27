'use client';

import React from 'react';
import {
  Play,
  Square,
  Save,
  FolderOpen,
  Trash2,
  Download,
  Loader2,
  Gamepad2,
} from 'lucide-react';
import { ScrapingStatus } from '@/lib/store/scraper';

interface ControlPanelProps {
  status: ScrapingStatus;
  onStart: () => void;
  onStop: () => void;
  onSave: () => void;
  onLoad: () => void;
  onClear: () => void;
  onExport: () => void;
  onExportToLeads?: () => void;
  onBatchExport?: () => void;
  hasData: boolean;
  isSaving?: boolean;
  isLoading?: boolean;
  isExporting?: boolean;
}

export default function ControlPanel({
  status,
  onStart,
  onStop,
  onSave,
  onLoad,
  onClear,
  onExport,
  onExportToLeads,
  onBatchExport,
  hasData,
  isSaving,
  isLoading,
  isExporting,
}: ControlPanelProps) {
  const isRunning = status === 'running';
  const isIdle = status === 'idle';
  const isStopped = status === 'stopped';
  const isCompleted = status === 'completed';
  const isActive = isRunning;

  return (
    <div className="space-y-2 sm:space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="p-1.5 sm:p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-lg">
          <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white">
            Controls
          </h3>
          <p className="text-xs text-gray-400 hidden sm:block">
            Start, stop, and manage scraping
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:grid sm:grid-cols-3 gap-2">
        {/* Start Button */}
        <button
          type="button"
          onClick={onStart}
          disabled={isActive}
          className="btn btn-success flex items-center justify-center gap-1 sm:gap-2 text-sm h-12 lg:h-10 w-full disabled:opacity-50 disabled:cursor-not-allowed"
          title="Start scraping"
        >
          {isRunning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          <span>Start</span>
        </button>

        {/* Stop Button */}
        <button
          type="button"
          onClick={onStop}
          disabled={!isActive}
          className="btn btn-danger flex items-center justify-center gap-1 sm:gap-2 text-sm h-12 lg:h-10 w-full disabled:opacity-50 disabled:cursor-not-allowed"
          title="Stop scraping"
        >
          <Square className="w-4 h-4" />
          <span>Stop</span>
        </button>

        {/* Export Button */}
        <button
          type="button"
          onClick={onExport}
          disabled={!hasData || isActive || isExporting}
          className="btn btn-scraper-primary flex items-center justify-center gap-1 sm:gap-2 text-sm h-12 lg:h-10 w-full disabled:opacity-50 disabled:cursor-not-allowed"
          title="Export to Excel"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span>{isExporting ? 'Export...' : 'Export'}</span>
        </button>
      </div>

      {/* Export to Leads and Batch Export Buttons - Side by Side */}
      {(onExportToLeads || onBatchExport) && (
        <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2">
          {onExportToLeads && (
            <button
              type="button"
              onClick={onExportToLeads}
              disabled={!hasData || isActive || isExporting}
              className="btn btn-primary flex items-center justify-center gap-2 text-sm h-12 lg:h-10 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export businesses to leads section"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              )}
              <span>Export to Leads</span>
            </button>
          )}
          {onBatchExport && (
            <button
              type="button"
              onClick={onBatchExport}
              disabled={!hasData || isActive || isExporting}
              className="btn btn-secondary flex items-center justify-center gap-2 text-sm h-12 lg:h-10 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-green-500/20 to-green-600/20 border-green-500/30 hover:from-green-500/30 hover:to-green-600/30"
              title="Batch export businesses"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Batch Export</span>
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col sm:grid sm:grid-cols-3 gap-2">
        {/* Save Button */}
        <button
          type="button"
          onClick={onSave}
          disabled={!hasData || isActive || isSaving}
          className="btn btn-secondary flex items-center justify-center gap-1 sm:gap-2 text-sm h-12 lg:h-10 w-full disabled:opacity-50 disabled:cursor-not-allowed"
          title="Save session"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{isSaving ? 'Save...' : 'Save'}</span>
        </button>

        {/* Load Button */}
        <button
          type="button"
          onClick={onLoad}
          disabled={isActive || isLoading}
          className="btn btn-secondary flex items-center justify-center gap-1 sm:gap-2 text-sm h-12 lg:h-10 w-full disabled:opacity-50 disabled:cursor-not-allowed"
          title="Load session"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FolderOpen className="w-4 h-4" />
          )}
          <span>{isLoading ? 'Load...' : 'Load'}</span>
        </button>

        {/* Clear Button */}
        <button
          type="button"
          onClick={onClear}
          disabled={!hasData || isActive}
          className="btn btn-secondary flex items-center justify-center gap-1 sm:gap-2 text-sm h-12 lg:h-10 w-full disabled:opacity-50 disabled:cursor-not-allowed"
          title="Clear all data"
        >
          <Trash2 className="w-4 h-4" />
          <span>Clear</span>
        </button>
      </div>

      {/* Status Indicator */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5">
        <div
          className={`w-3 h-3 rounded-full ${
            isRunning
              ? 'bg-green-500 animate-pulse'
              : isCompleted
              ? 'bg-blue-500'
              : isStopped
              ? 'bg-red-500'
              : 'bg-gray-400'
          }`}
        />
        <span className="text-sm font-medium text-gray-300 capitalize">{status}</span>
      </div>
    </div>
  );
}
