import React, { useEffect, useState } from "react";

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

  // Update elapsed time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

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

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-labelledby="processing-title"
      aria-describedby="processing-description"
      aria-live="polite"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-white animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <h2
            id="processing-title"
            className="text-2xl font-bold text-gray-900"
          >
            Processing Images
          </h2>
          <p id="processing-description" className="text-gray-600">
            Enhancing and optimizing your document pages
          </p>
        </div>

        {/* Progress Information */}
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium text-gray-700">
              <span>Progress</span>
              <span aria-live="polite" aria-atomic="true">
                {progressPercentage}%
              </span>
            </div>
            <div
              className="w-full bg-gray-200 rounded-full h-3 overflow-hidden"
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
            className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="text-sm font-medium text-gray-700">
              Current Page
            </span>
            <span className="text-lg font-bold text-gray-900">
              {currentPage} of {totalPages}
            </span>
          </div>

          {/* Time Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-600 mb-1">Elapsed Time</div>
              <div
                className="text-lg font-bold text-gray-900"
                role="timer"
                aria-live="off"
              >
                {formatTime(elapsedTime)}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-600 mb-1">Time Remaining</div>
              <div
                className="text-lg font-bold text-gray-900"
                role="timer"
                aria-live="polite"
              >
                {formatTime(estimatedTimeRemaining)}
              </div>
            </div>
          </div>

          {/* Processing Steps Info */}
          <div
            className="p-4 bg-blue-50 border border-blue-200 rounded-lg"
            role="note"
            aria-label="Processing steps information"
          >
            <div className="flex items-start space-x-3">
              <svg
                className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
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
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Processing includes:</p>
                <ul className="text-xs space-y-0.5 text-blue-700">
                  <li>• Converting to grayscale</li>
                  <li>• Enhancing contrast and brightness</li>
                  <li>• Detecting document edges</li>
                  <li>• Straightening and cropping</li>
                  <li>• Compressing for optimal quality</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Cancel Button */}
        <button
          onClick={handleCancelClick}
          className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors duration-200 min-h-[44px]"
          aria-label="Cancel processing"
        >
          Cancel Processing
        </button>
      </div>

      {/* Cancel Confirmation Dialog */}
      {showCancelConfirm && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          role="alertdialog"
          aria-labelledby="cancel-confirm-title"
          aria-describedby="cancel-confirm-description"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-600"
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
              <h3
                id="cancel-confirm-title"
                className="text-xl font-bold text-gray-900"
              >
                Cancel Processing?
              </h3>
              <p
                id="cancel-confirm-description"
                className="text-sm text-gray-600"
              >
                Are you sure you want to cancel? All processing progress will be
                lost and you'll need to start over.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleCancelCancel}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors duration-200 min-h-[44px]"
                aria-label="Continue processing, do not cancel"
              >
                Continue Processing
              </button>
              <button
                onClick={handleConfirmCancel}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200 min-h-[44px]"
                aria-label="Confirm cancellation and discard progress"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
