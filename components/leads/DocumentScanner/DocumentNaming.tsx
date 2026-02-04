"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

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

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-labelledby="document-naming-title"
      aria-describedby="document-naming-description"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4 flex items-center justify-between">
          <h2
            id="document-naming-title"
            className="text-xl font-bold text-white"
          >
            Name Your Document
          </h2>
          <button
            onClick={onCancel}
            className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            aria-label="Cancel document naming and return to preview"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label
              htmlFor="documentName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Document Name
            </label>
            <input
              id="documentName"
              type="text"
              value={state.documentName}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors ${
                state.error ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Enter document name"
              autoFocus
              aria-invalid={!!state.error}
              aria-describedby={
                state.error
                  ? "name-error document-naming-description"
                  : "document-naming-description"
              }
              aria-required="true"
            />
            {state.error && (
              <p
                id="name-error"
                className="mt-2 text-sm text-red-600"
                role="alert"
                aria-live="assertive"
              >
                {state.error}
              </p>
            )}
            <p
              id="document-naming-description"
              className="mt-2 text-sm text-gray-500"
            >
              The file will be saved as:{" "}
              <span className="font-medium">
                {state.documentName.trim() || "(name)"}.pdf
              </span>
            </p>
            <p className="mt-1 text-xs text-gray-400 hidden sm:block">
              Press Enter to generate PDF or Esc to cancel
            </p>
          </div>

          {/* Action Buttons */}
          <div
            className="flex gap-3"
            role="group"
            aria-label="Document naming actions"
          >
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors min-h-[44px]"
              aria-label="Cancel and return to preview"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl min-h-[44px]"
              aria-label="Generate PDF with this name"
            >
              Generate PDF
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
