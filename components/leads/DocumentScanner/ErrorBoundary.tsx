"use client";

import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, X } from "lucide-react";

/**
 * ErrorBoundary Component
 *
 * Catches JavaScript errors anywhere in the DocumentScanner component tree,
 * logs those errors, and displays a fallback UI instead of crashing the whole app.
 *
 * Requirements: 15.1-15.7 (Error Handling and Recovery)
 */

interface ErrorBoundaryProps {
  children: ReactNode;
  onClose?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details for debugging
    console.error(
      "DocumentScanner Error Boundary caught an error:",
      error,
      errorInfo,
    );

    this.setState({
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    // Reset error state to retry rendering
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleClose = () => {
    // Close the scanner modal
    if (this.props.onClose) {
      this.props.onClose();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 to-red-900 rounded-2xl shadow-2xl max-w-md w-full border border-red-500/30">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    Something Went Wrong
                  </h2>
                </div>
                <button
                  onClick={this.handleClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-gray-300" />
                </button>
              </div>

              {/* Error Message */}
              <div className="mb-6 space-y-3">
                <p className="text-gray-300">
                  The document scanner encountered an unexpected error. Your
                  progress may have been saved.
                </p>

                {this.state.error && (
                  <div className="p-3 bg-black/30 rounded-lg border border-red-500/20">
                    <p className="text-sm text-red-300 font-mono">
                      {this.state.error.message}
                    </p>
                  </div>
                )}

                <p className="text-sm text-gray-400">
                  You can try again or close the scanner. If the problem
                  persists, please contact support.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={this.handleRetry}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Try Again</span>
                </button>
                <button
                  onClick={this.handleClose}
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
