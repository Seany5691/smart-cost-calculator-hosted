/**
 * Quality Preset Selector Component
 * 
 * Phase 4: Polish & Features
 * 
 * Allows users to choose quality preset before scanning.
 */

"use client";

import React, { useState } from "react";
import { X, Zap, Scale, Sparkles, Cpu } from "lucide-react";
import {
  QualityPreset,
  getPresetDescription,
  estimateProcessingTime,
  getQualitySettings,
} from "@/lib/documentScanner/qualitySettings";

interface QualityPresetSelectorProps {
  onSelect: (preset: QualityPreset) => void;
  onClose: () => void;
  estimatedPages?: number;
}

export default function QualityPresetSelector({
  onSelect,
  onClose,
  estimatedPages = 5,
}: QualityPresetSelectorProps) {
  const [selectedPreset, setSelectedPreset] = useState<QualityPreset>("auto");

  const presets: QualityPreset[] = ["fast", "balanced", "best", "auto"];

  const getIcon = (preset: QualityPreset) => {
    switch (preset) {
      case "fast":
        return <Zap className="w-8 h-8" />;
      case "balanced":
        return <Scale className="w-8 h-8" />;
      case "best":
        return <Sparkles className="w-8 h-8" />;
      case "auto":
        return <Cpu className="w-8 h-8" />;
    }
  };

  const handleSelect = () => {
    onSelect(selectedPreset);
  };

  return (
    <div className="fixed inset-0 z-[10003] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 to-emerald-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-emerald-700 border-b border-emerald-500/30 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Quality Settings</h2>
            <p className="text-sm text-emerald-100 mt-1">
              Choose the quality level for your scans
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-2"
            aria-label="Close quality settings"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Presets Grid */}
        <div className="p-6 space-y-4">
          {presets.map((preset) => {
            const info = getPresetDescription(preset);
            const settings = getQualitySettings(preset);
            const estimatedTime = estimateProcessingTime(estimatedPages, settings);
            const isSelected = selectedPreset === preset;

            return (
              <button
                key={preset}
                onClick={() => setSelectedPreset(preset)}
                className={`
                  w-full text-left p-6 rounded-xl transition-all
                  ${
                    isSelected
                      ? "bg-emerald-600 border-2 border-emerald-400 shadow-lg scale-105"
                      : "bg-slate-800/50 border-2 border-emerald-500/20 hover:border-emerald-500/40 hover:bg-slate-800/70"
                  }
                `}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={`
                    p-3 rounded-lg
                    ${isSelected ? "bg-white/20" : "bg-emerald-600/20"}
                  `}
                  >
                    <div className={isSelected ? "text-white" : "text-emerald-400"}>
                      {getIcon(preset)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3
                        className={`text-xl font-bold ${isSelected ? "text-white" : "text-emerald-100"}`}
                      >
                        {info.icon} {info.name}
                      </h3>
                      {preset === "auto" && (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30">
                          Recommended
                        </span>
                      )}
                    </div>

                    <p
                      className={`text-sm mb-3 ${isSelected ? "text-white/90" : "text-emerald-200/70"}`}
                    >
                      {info.description}
                    </p>

                    {/* Technical Details */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div
                        className={`${isSelected ? "text-white/80" : "text-emerald-300/60"}`}
                      >
                        <span className="font-semibold">Resolution:</span>{" "}
                        {settings.targetResolution.width}x{settings.targetResolution.height}
                      </div>
                      <div
                        className={`${isSelected ? "text-white/80" : "text-emerald-300/60"}`}
                      >
                        <span className="font-semibold">File Size:</span> ~
                        {settings.maxFileSize}MB/page
                      </div>
                      <div
                        className={`${isSelected ? "text-white/80" : "text-emerald-300/60"}`}
                      >
                        <span className="font-semibold">Processing:</span> ~{estimatedTime}s
                        for {estimatedPages} pages
                      </div>
                      <div
                        className={`${isSelected ? "text-white/80" : "text-emerald-300/60"}`}
                      >
                        <span className="font-semibold">Workers:</span>{" "}
                        {settings.useWebWorkers ? "Enabled" : "Disabled"}
                      </div>
                    </div>
                  </div>

                  {/* Selection Indicator */}
                  {isSelected && (
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                        <div className="w-3 h-3 bg-emerald-600 rounded-full" />
                      </div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-900/80 border-t border-emerald-500/30 px-6 py-4 backdrop-blur-sm">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSelect}
              className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium shadow-lg"
            >
              Start Scanning
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
