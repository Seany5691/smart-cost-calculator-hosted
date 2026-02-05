"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, FileText } from "lucide-react";

interface DocumentNamingProps {
  leadName: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

interface DocumentNamingState {
  documentName: string;
  error: string | null;
}

export default function DocumentNaming({
  leadName,
  onSubmit,
  onCancel,
}: DocumentNamingProps) {
  const [state, setState] = useState<DocumentNamingState>({
    documentName: "",
    error: null,
  });

  // CRITICAL: Mounted state for SSR safety - prevents hydration mismatch
  const [mounted, setMounted] = useState(false);

  // Set mounted state on client side only
  useEffect(() => {
    setMounted(true);
  }, []);

  // Pre-fill input with lead name + " - " on mount
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      documentName: `${leadName} - `,
    }));
  }, [leadName]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to cancel
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  // Don't render until mounted (prevents SSR hydration issues)
  if (!mounted) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState((prev) => ({
      ...prev,
      documentName: e.target.value,
      error: null, // Clear error when user types
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate non-empty input (trim whitespace)
    const trimmedName = state.documentName.trim();

    if (!trimmedName) {
      setState((prev) => ({
        ...prev,
        error: "Document name cannot be empty",
      }));
      return;
    }

    // Submit with trimmed name (onSubmit will append .pdf)
    onSubmit(trimmedName);
  };

  // Use createPortal to render at document.body level - ensures modal appears above ALL content
  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10002] flex items-center justify-center p-4"
      role="dialog"
      aria-labelledby="document-naming-title"
      aria-describedby="document-naming-description"
      onClick={(e) => {
        // Click outside to close
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div className="bg-gradient-to-br from-slate-900 to-emerald-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden border border-emerald-500/30">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2
                id="document-naming-title"
                className="text-2xl font-bold text-white"
              >
                Name Your Document
              </h2>
              <p className="text-sm text-emerald-200">{leadName}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Cancel document naming and return to preview"
          >
            <X className="w-5 h-5 text-emerald-200" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <form
          onSubmit={handleSubmit}
          className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] custom-scrollbar space-y-4"
        >
          {state.error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-1">
                  <p className="text-red-400 font-medium mb-1">Error</p>
                  <p className="text-sm text-red-300">{state.error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="documentName"
              className="text-white font-medium block"
            >
              Document Name <span className="text-red-400">*</span>
            </label>
            <input
              id="documentName"
              type="text"
              value={state.documentName}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 transition-colors"
              placeholder="Enter document name"
              autoFocus
              aria-invalid={!!state.error}
              aria-describedby="document-naming-description"
              aria-required="true"
            />
            <p
              id="document-naming-description"
              className="text-sm text-emerald-300/70"
            >
              The file will be saved as:{" "}
              <span className="font-medium text-emerald-200">
                {state.documentName.trim() || "(name)"}.pdf
              </span>
            </p>
            <p className="text-xs text-emerald-300/50 hidden sm:block">
              Press Enter to generate PDF or Esc to cancel
            </p>
          </div>

          {/* Action Buttons */}
          <div
            className="flex gap-3 justify-end pt-4 border-t border-emerald-500/20"
            role="group"
            aria-label="Document naming actions"
          >
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors"
              aria-label="Cancel and return to preview"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!state.documentName.trim()}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
              aria-label="Generate PDF with this name"
            >
              Generate PDF
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body // CRITICAL: Render at document.body level to escape parent stacking context
  );
}
