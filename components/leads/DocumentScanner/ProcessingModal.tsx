"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";

interface ProcessingModalProps {
  currentPage: number;
  totalPages: number;
  estimatedTimeRemaining: number;
  onCancel: () => void;
}

/**
 * ProcessingModal displays progress during batch image processing
 *
 * Features:
 * - Progress bar with percentage
 * - Current page and total pages display
 * - Estimated time remaining
 * - Cancellation with confirmation
 * - Portal rendering with emerald theme matching Leads modals
 *
 * Requirements: 8.6, 8.7
 */
export default function ProcessingModal({
  currentPage,
  totalPages,
  estimatedTimeRemaining,
  onCancel,
}: ProcessingModalProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Set mounted state for SSR safety
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update elapsed time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  // Don't render until mounted (prevents SSR hydration issues)
  if (!mounted) return null;

  // Calculate progress percentage
  const progressPercentage =
    totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;

  // Format time in seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCancelClick = () => {
    setShowCancelConfirm(true);
  };

  const handleConfirmCancel = () => {
    setShowCancelConfirm(false);
    onCancel();
  };

  const handleCancelCancel = () => {
    setShowCancelConfirm(false);
  };

  return createPortal(
    <>
      {/* Main Processing Modal */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10002] flex items-center justify-center p-4"
        role="dialog"
        aria-labelledby="processing-title"
        aria-describedby="processing-description"
        aria-live="polite"
      >
        <div className="bg-gradient-to-br from-slate-900 to-emerald-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden border border-emerald-500/30">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-emerald-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
              </div>
              <div>
                <h2
                  id="processing-title"
                  className="text-2xl font-bold text-white"
                >
                  Processing Images
                </h2>
                <p
                  id="processing-description"
                  className="text-sm text-emerald-200"
                >
                  Enhancing and optimizing your document pages
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] custom-scrollbar space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium text-emerald-200">
                <span>Progress</span>
                <span aria-live="polite" aria-atomic="true">
                  {progressPercentage}%
                </span>
              </div>
              <div
                className="w-full bg-slate-800/50 rounded-full h-3 overflow-hidden border border-emerald-500/20"
                role="progressbar"
                aria-valuenow={progressPercentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Processing progress"
              >
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Current Page */}
            <div
              className="flex justify-between items-center p-4 bg-slate-800/50 rounded-lg border border-emerald-500/20"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              <span className="text-sm font-medium text-emerald-200">
                Current Page
              </span>
              <span className="text-lg font-bold text-white">
                {currentPage} of {totalPages}
              </span>
            </div>

            {/* Time Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-800/50 rounded-lg border border-emerald-500/20">
                <div className="text-xs text-emerald-300 mb-1">
                  Elapsed Time
                </div>
                <div
                  className="text-lg font-bold text-white"
                  role="timer"
                  aria-live="off"
                >
                  {formatTime(elapsedTime)}
                </div>
              </div>
              <div className="p-4 bg-slate-800/50 rounded-lg border border-emerald-500/20">
                <div className="text-xs text-emerald-300 mb-1">
                  Time Remaining
                </div>
                <div
                  className="text-lg font-bold text-white"
                  role="timer"
                  aria-live="polite"
                >
                  {formatTime(estimatedTimeRemaining)}
                </div>
              </div>
            </div>

            {/* Processing Steps Info */}
            <div
              className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg"
              role="note"
              aria-label="Processing steps information"
            >
              <div className="flex items-start space-x-3">
                <svg
                  className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="text-sm text-emerald-200">
                  <p className="font-medium mb-1">Processing includes:</p>
                  <ul className="text-xs space-y-0.5 text-emerald-300">
                    <li>• Converting to grayscale</li>
                    <li>• Enhancing contrast and brightness</li>
                    <li>• Detecting document edges</li>
                    <li>• Straightening and cropping</li>
                    <li>• Compressing for optimal quality</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Cancel Button */}
            <button
              onClick={handleCancelClick}
              className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors duration-200 min-h-[44px] border border-emerald-500/30"
              aria-label="Cancel processing"
            >
              Cancel Processing
            </button>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      {showCancelConfirm &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10003] flex items-center justify-center p-4"
            role="alertdialog"
            aria-labelledby="cancel-confirm-title"
            aria-describedby="cancel-confirm-description"
          >
            <div className="bg-gradient-to-br from-slate-900 to-red-900 rounded-2xl shadow-2xl max-w-sm w-full border border-red-500/30">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-red-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <svg
                      className="w-5 h-5 text-red-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3
                      id="cancel-confirm-title"
                      className="text-xl font-bold text-white"
                    >
                      Cancel Processing?
                    </h3>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <p
                  id="cancel-confirm-description"
                  className="text-sm text-gray-300"
                >
                  Are you sure you want to cancel? All processing progress will
                  be lost and you'll need to start over.
                </p>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end pt-4 border-t border-red-500/20">
                  <button
                    onClick={handleCancelCancel}
                    className="px-6 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors"
                    aria-label="Continue processing, do not cancel"
                  >
                    Continue Processing
                  </button>
                  <button
                    onClick={handleConfirmCancel}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                    aria-label="Confirm cancellation and discard progress"
                  >
                    Yes, Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>,
    document.body
  );
}
