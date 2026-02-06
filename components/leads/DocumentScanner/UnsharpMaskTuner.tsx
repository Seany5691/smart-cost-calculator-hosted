"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, RotateCcw } from "lucide-react";
import { loadImageData, convertToGrayscale, enhanceContrast, adjustBrightness, applyUnsharpMask, imageDataToBlob, blobToDataUrl } from "@/lib/documentScanner/imageProcessing";

interface UnsharpMaskTunerProps {
  originalBlob: Blob;
  onClose: () => void;
  onApply: (settings: UnsharpMaskSettings) => void;
}

export interface UnsharpMaskSettings {
  amount: number;
  radius: number;
}

const DEFAULT_SETTINGS: UnsharpMaskSettings = {
  amount: 1.5,
  radius: 1.0,
};

export default function UnsharpMaskTuner({
  originalBlob,
  onClose,
  onApply,
}: UnsharpMaskTunerProps) {
  const [settings, setSettings] = useState<UnsharpMaskSettings>(DEFAULT_SETTINGS);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Process image with current settings
  const processImage = async (currentSettings: UnsharpMaskSettings) => {
    try {
      setIsProcessing(true);

      // Load original image
      let imageData = await loadImageData(originalBlob);

      // Convert to grayscale
      imageData = convertToGrayscale(imageData);

      // Apply HARDCODED settings (brightness=30, contrast=130)
      imageData = enhanceContrast(imageData, 2.3); // contrast=130 = 2.3x
      imageData = adjustBrightness(imageData, 158); // brightness=30 = target 158

      // Apply unsharp mask with current settings
      imageData = applyUnsharpMask(
        imageData,
        currentSettings.amount,
        currentSettings.radius
      );

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
          <div>
            <h2 className="text-xl font-bold text-white">Unsharp Mask Tuner</h2>
            <p className="text-xs text-emerald-200 mt-1">
              Brightness: 30, Contrast: 130 (hardcoded)
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
          <div className="bg-slate-800/50 rounded-lg p-4 border border-emerald-500/20 space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Unsharp Mask Settings</h3>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-200 text-sm transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            </div>

            {/* Amount (Strength) */}
            <div>
              <label className="block text-emerald-200 text-base font-medium mb-3">
                Amount (Strength): {settings.amount.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={settings.amount}
                onChange={(e) =>
                  setSettings({ ...settings, amount: parseFloat(e.target.value) })
                }
                className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-emerald-300/50 mt-2">
                <span>0.0 (No effect)</span>
                <span>5.0 (Maximum)</span>
              </div>
              <p className="text-sm text-emerald-300/70 mt-3 bg-slate-900/50 p-3 rounded">
                Controls how much sharpening is applied. Higher values = sharper text.
                <br />
                <span className="text-emerald-400">Recommended: 1.0 - 2.5</span>
              </p>
            </div>

            {/* Radius */}
            <div>
              <label className="block text-emerald-200 text-base font-medium mb-3">
                Radius: {settings.radius.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={settings.radius}
                onChange={(e) =>
                  setSettings({ ...settings, radius: parseFloat(e.target.value) })
                }
                className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-emerald-300/50 mt-2">
                <span>0.5 (Fine details)</span>
                <span>3.0 (Broad edges)</span>
              </div>
              <p className="text-sm text-emerald-300/70 mt-3 bg-slate-900/50 p-3 rounded">
                Controls the size of edges to enhance. Lower = fine text, Higher = bold text.
                <br />
                <span className="text-emerald-400">Recommended: 0.8 - 1.5</span>
              </p>
            </div>
          </div>

          {/* Current Settings Display */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-emerald-500/20">
            <h3 className="text-white font-medium mb-2">Current Settings</h3>
            <pre className="text-emerald-200 text-sm font-mono bg-slate-900/50 p-3 rounded overflow-x-auto">
{`Brightness: 30 (hardcoded)
Contrast: 130 (hardcoded)
Unsharp Mask:
  Amount: ${settings.amount.toFixed(1)}
  Radius: ${settings.radius.toFixed(1)}`}
            </pre>
          </div>

          {/* Tips */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <h4 className="text-blue-300 font-medium mb-2">💡 Tips</h4>
            <ul className="text-sm text-blue-200/80 space-y-1">
              <li>• Start with Amount=1.5, Radius=1.0 (default)</li>
              <li>• Increase Amount for sharper text</li>
              <li>• Decrease Radius for fine print</li>
              <li>• Too much Amount creates halos around text</li>
              <li>• Too much Radius makes text look artificial</li>
            </ul>
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
