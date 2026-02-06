"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, RotateCcw } from "lucide-react";
import { loadImageData, convertToGrayscale, enhanceContrast, adjustBrightness, applyAdaptiveThreshold, imageDataToBlob, blobToDataUrl } from "@/lib/documentScanner/imageProcessing";

interface AdaptiveThresholdTunerProps {
  originalBlob: Blob;
  onClose: () => void;
  onApply: (settings: AdaptiveThresholdSettings) => void;
}

export interface AdaptiveThresholdSettings {
  enabled: boolean;
  blockSize: number;
  constant: number;
}

const DEFAULT_SETTINGS: AdaptiveThresholdSettings = {
  enabled: false,
  blockSize: 15,
  constant: 10,
};

export default function AdaptiveThresholdTuner({
  originalBlob,
  onClose,
  onApply,
}: AdaptiveThresholdTunerProps) {
  const [settings, setSettings] = useState<AdaptiveThresholdSettings>(DEFAULT_SETTINGS);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Process image with current settings
  const processImage = async (currentSettings: AdaptiveThresholdSettings) => {
    try {
      setIsProcessing(true);

      // Load original image
      let imageData = await loadImageData(originalBlob);

      // Convert to grayscale
      imageData = convertToGrayscale(imageData);

      // Apply HARDCODED settings (brightness=30, contrast=100, sharpness=0)
      imageData = enhanceContrast(imageData, 2.0); // contrast=100 = 2x
      imageData = adjustBrightness(imageData, 158); // brightness=30 = target 158

      // Apply adaptive threshold if enabled
      if (currentSettings.enabled) {
        imageData = applyAdaptiveThreshold(
          imageData,
          currentSettings.blockSize,
          currentSettings.constant
        );
      }

      // Convert to blob and data URL
      const blob = await imageDataToBlob(imageData, "image/jpeg", 0.95);
      const dataUrl = await blobToDataUrl(blob);

      setPreviewUrl(dataUrl);
    } catch (error) {
      console.error("Error processing image:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Debounced processing - longer delay to prevent freezing
  useEffect(() => {
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }

    processingTimeoutRef.current = setTimeout(() => {
      processImage(settings);
    }, 500); // Increased from 300ms to 500ms

    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, [settings]);

  // Initial load
  useEffect(() => {
    processImage(settings);
  }, []);

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  const handleApply = () => {
    onApply(settings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10003] flex flex-col h-full bg-gradient-to-br from-slate-900 to-emerald-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 border-b border-emerald-500/30 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Adaptive Threshold Tuner</h2>
            <p className="text-xs text-emerald-200 mt-1">
              Brightness: 30, Contrast: 100, Sharpness: 0 (hardcoded)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Preview */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-emerald-500/20">
            <h3 className="text-white font-medium mb-3">Preview</h3>
            <div className="relative bg-slate-700 rounded-lg overflow-hidden">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-auto"
                />
              ) : (
                <div className="aspect-[3/4] flex items-center justify-center text-emerald-300/50">
                  Loading...
                </div>
              )}
              {isProcessing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-white">Processing...</div>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-emerald-500/20 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Adaptive Threshold Settings</h3>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-200 text-sm transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            </div>

            {/* Enable/Disable */}
            <div>
              <label className="flex items-center gap-3 text-emerald-200 text-base font-medium">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) =>
                    setSettings({ ...settings, enabled: e.target.checked })
                  }
                  className="w-5 h-5 rounded accent-emerald-500"
                />
                Enable Adaptive Threshold (Black/White)
              </label>
              <p className="text-xs text-emerald-300/70 mt-2 ml-8">
                Converts image to pure black text on white background
              </p>
            </div>

            {settings.enabled && (
              <div className="ml-8 space-y-4 mt-4 pt-4 border-t border-emerald-500/20">
                {/* Block Size */}
                <div>
                  <label className="block text-emerald-200 text-sm font-medium mb-2">
                    Block Size: {settings.blockSize}
                  </label>
                  <input
                    type="range"
                    min="3"
                    max="31"
                    step="2"
                    value={settings.blockSize}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        blockSize: parseInt(e.target.value),
                      })
                    }
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-xs text-emerald-300/50 mt-1">
                    <span>3 (Small neighborhood)</span>
                    <span>31 (Large neighborhood)</span>
                  </div>
                  <p className="text-xs text-emerald-300/70 mt-2">
                    Size of the area used to calculate local threshold. Larger = smoother.
                  </p>
                </div>

                {/* Constant */}
                <div>
                  <label className="block text-emerald-200 text-sm font-medium mb-2">
                    Constant: {settings.constant}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={settings.constant}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        constant: parseInt(e.target.value),
                      })
                    }
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-xs text-emerald-300/50 mt-1">
                    <span>0 (More white)</span>
                    <span>30 (More black)</span>
                  </div>
                  <p className="text-xs text-emerald-300/70 mt-2">
                    Adjustment to threshold. Higher = more pixels become black.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Current Settings Display */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-emerald-500/20">
            <h3 className="text-white font-medium mb-2">Current Settings</h3>
            <pre className="text-emerald-200 text-xs font-mono bg-slate-900/50 p-3 rounded overflow-x-auto">
{`Brightness: 30 (hardcoded)
Contrast: 100 (hardcoded)
Sharpness: 0 (hardcoded)
Adaptive Threshold: ${settings.enabled ? 'ENABLED' : 'DISABLED'}
  Block Size: ${settings.blockSize}
  Constant: ${settings.constant}`}
            </pre>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-slate-900/80 border-t border-emerald-500/30 px-4 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 rounded-lg bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-6 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
          >
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
}
