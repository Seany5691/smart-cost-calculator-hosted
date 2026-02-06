"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, RotateCcw } from "lucide-react";
import { loadImageData, convertToGrayscale, enhanceContrast, adjustBrightness, applyAdaptiveThreshold, sharpenImage, imageDataToBlob, blobToDataUrl } from "@/lib/documentScanner/imageProcessing";

interface EnhancementTunerProps {
  originalBlob: Blob;
  onClose: () => void;
  onApply: (settings: EnhancementSettings) => void;
}

export interface EnhancementSettings {
  brightness: number;
  contrast: number;
  adaptiveThreshold: boolean;
  adaptiveBlockSize: number;
  adaptiveConstant: number;
  sharpness: number;
}

const DEFAULT_SETTINGS: EnhancementSettings = {
  brightness: 0,
  contrast: 0,
  adaptiveThreshold: false,
  adaptiveBlockSize: 15,
  adaptiveConstant: 10,
  sharpness: 0,
};

export default function EnhancementTuner({
  originalBlob,
  onClose,
  onApply,
}: EnhancementTunerProps) {
  const [settings, setSettings] = useState<EnhancementSettings>(DEFAULT_SETTINGS);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Process image with current settings
  const processImage = async (currentSettings: EnhancementSettings) => {
    try {
      setIsProcessing(true);

      // Load original image
      let imageData = await loadImageData(originalBlob);

      // Convert to grayscale
      imageData = convertToGrayscale(imageData);

      // Apply enhancements based on settings
      if (currentSettings.contrast > 0) {
        const factor = 1 + (currentSettings.contrast / 100);
        imageData = enhanceContrast(imageData, factor);
      }

      if (currentSettings.brightness > 0) {
        const target = 128 + currentSettings.brightness;
        imageData = adjustBrightness(imageData, target);
      }

      if (currentSettings.adaptiveThreshold) {
        imageData = applyAdaptiveThreshold(
          imageData,
          currentSettings.adaptiveBlockSize,
          currentSettings.adaptiveConstant
        );
      }

      if (currentSettings.sharpness > 0) {
        // Apply sharpening multiple times based on intensity
        const iterations = Math.ceil(currentSettings.sharpness / 33);
        for (let i = 0; i < iterations; i++) {
          imageData = sharpenImage(imageData);
        }
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

  // Debounced processing
  useEffect(() => {
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }

    processingTimeoutRef.current = setTimeout(() => {
      processImage(settings);
    }, 300);

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
          <h2 className="text-xl font-bold text-white">Enhancement Tuner</h2>
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
              <h3 className="text-white font-medium">Adjustments</h3>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-200 text-sm transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            </div>

            {/* Brightness */}
            <div>
              <label className="block text-emerald-200 text-sm font-medium mb-2">
                Brightness: {settings.brightness}
              </label>
              <input
                type="range"
                min="0"
                max="127"
                value={settings.brightness}
                onChange={(e) =>
                  setSettings({ ...settings, brightness: parseInt(e.target.value) })
                }
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-emerald-300/50 mt-1">
                <span>0 (No change)</span>
                <span>127 (Max bright)</span>
              </div>
            </div>

            {/* Contrast */}
            <div>
              <label className="block text-emerald-200 text-sm font-medium mb-2">
                Contrast: {settings.contrast}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.contrast}
                onChange={(e) =>
                  setSettings({ ...settings, contrast: parseInt(e.target.value) })
                }
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-emerald-300/50 mt-1">
                <span>0 (No change)</span>
                <span>100 (2x contrast)</span>
              </div>
            </div>

            {/* Adaptive Threshold */}
            <div>
              <label className="flex items-center gap-2 text-emerald-200 text-sm font-medium mb-2">
                <input
                  type="checkbox"
                  checked={settings.adaptiveThreshold}
                  onChange={(e) =>
                    setSettings({ ...settings, adaptiveThreshold: e.target.checked })
                  }
                  className="w-4 h-4 rounded accent-emerald-500"
                />
                Adaptive Threshold (Black/White)
              </label>

              {settings.adaptiveThreshold && (
                <div className="ml-6 space-y-3 mt-3">
                  <div>
                    <label className="block text-emerald-200/80 text-xs mb-1">
                      Block Size: {settings.adaptiveBlockSize}
                    </label>
                    <input
                      type="range"
                      min="3"
                      max="31"
                      step="2"
                      value={settings.adaptiveBlockSize}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          adaptiveBlockSize: parseInt(e.target.value),
                        })
                      }
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-emerald-200/80 text-xs mb-1">
                      Constant: {settings.adaptiveConstant}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      value={settings.adaptiveConstant}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          adaptiveConstant: parseInt(e.target.value),
                        })
                      }
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Sharpness */}
            <div>
              <label className="block text-emerald-200 text-sm font-medium mb-2">
                Sharpness: {settings.sharpness}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.sharpness}
                onChange={(e) =>
                  setSettings({ ...settings, sharpness: parseInt(e.target.value) })
                }
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-emerald-300/50 mt-1">
                <span>0 (No sharpening)</span>
                <span>100 (Max sharp)</span>
              </div>
            </div>
          </div>

          {/* Current Settings Display */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-emerald-500/20">
            <h3 className="text-white font-medium mb-2">Current Settings</h3>
            <pre className="text-emerald-200 text-xs font-mono bg-slate-900/50 p-3 rounded overflow-x-auto">
              {JSON.stringify(settings, null, 2)}
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
