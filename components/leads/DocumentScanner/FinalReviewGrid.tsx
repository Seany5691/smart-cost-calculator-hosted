/**
 * FinalReviewGrid Component
 *
 * Displays processed/cropped pages as thumbnails in a responsive grid layout.
 * Shows the final processed images after auto edge detection and cropping.
 * Provides actions for marking pages for retake/manual crop adjustment, and deleting pages.
 *
 * This is the final review step before naming the document.
 */

"use client";

import React, { useState, useEffect } from "react";
import { FinalReviewGridProps, ProcessedImage } from "@/lib/documentScanner/types";
import {
  Camera,
  Crop,
  Trash2,
  RotateCcw,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Settings,
} from "lucide-react";
import EnhancementTuner, { EnhancementSettings } from "./EnhancementTuner";

export default function FinalReviewGrid({
  images,
  onMarkRetake,
  onMarkCrop,
  onDelete,
  onRotate,
  onContinue,
  onRetake,
}: FinalReviewGridProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [swipedImageId, setSwipedImageId] = useState<string | null>(null);
  const [focusedImageIndex, setFocusedImageIndex] = useState<number>(0);
  const [showTuner, setShowTuner] = useState(false);
  const [tunerSettings, setTunerSettings] = useState<EnhancementSettings | null>(null);

  // Count marked pages
  const markedForRetakeCount = images.filter(
    (img) => img.markedForRetake,
  ).length;
  const markedForCropCount = images.filter((img) => img.markedForCrop).length;

  /**
   * Handle keyboard navigation
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Arrow keys for navigation
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedImageIndex((prev) => Math.min(prev + 1, images.length - 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedImageIndex((prev) => Math.max(prev - 1, 0));
      }
      // R key to mark for retake
      else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        if (images[focusedImageIndex]) {
          onMarkRetake(images[focusedImageIndex].id);
        }
      }
      // C key to mark for crop
      else if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        if (images[focusedImageIndex]) {
          onMarkCrop(images[focusedImageIndex].id);
        }
      }
      // Delete key to delete
      else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (images[focusedImageIndex]) {
          const confirmDelete = window.confirm(
            `Delete page ${images[focusedImageIndex].pageNumber}?`,
          );
          if (confirmDelete) {
            onDelete(images[focusedImageIndex].id);
          }
        }
      }
      // Enter key to continue
      else if (e.key === "Enter") {
        e.preventDefault();
        if (images.length > 0) {
          onContinue();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    images,
    focusedImageIndex,
    onMarkRetake,
    onMarkCrop,
    onDelete,
    onContinue,
  ]);

  /**
   * Handle touch start for swipe gestures
   */
  const handleTouchStart = (e: React.TouchEvent, imageId: string) => {
    const touch = e.touches[0];
    setTouchStartX(touch.clientX);
    setTouchStartY(touch.clientY);
    setSwipedImageId(imageId);
  };

  /**
   * Handle touch move for swipe gestures
   */
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    // Prevent default if horizontal swipe is detected
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      e.preventDefault();
    }
  };

  /**
   * Handle touch end for swipe gestures
   * Swipe left to delete, swipe right to mark for retake
   */
  const handleTouchEnd = (e: React.TouchEvent, imageId: string) => {
    if (
      touchStartX === null ||
      touchStartY === null ||
      swipedImageId !== imageId
    ) {
      setTouchStartX(null);
      setTouchStartY(null);
      setSwipedImageId(null);
      return;
    }

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    // Check if it's a horizontal swipe (more horizontal than vertical)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      // Provide haptic feedback
      if ("vibrate" in navigator) {
        navigator.vibrate(30);
      }

      if (deltaX > 0) {
        // Swipe right - mark for retake
        onMarkRetake(imageId);
      } else {
        // Swipe left - delete (with confirmation for safety)
        const confirmDelete = window.confirm("Delete this page?");
        if (confirmDelete) {
          onDelete(imageId);
        }
      }
    }

    setTouchStartX(null);
    setTouchStartY(null);
    setSwipedImageId(null);
  };

  /**
   * Get status indicator for an image
   */
  const getStatusIndicator = (image: ProcessedImage) => {
    if (image.status === "error") {
      return (
        <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Error
        </div>
      );
    }

    if (image.markedForRetake) {
      return (
        <div className="absolute top-2 right-2 bg-amber-500 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1">
          <Camera className="w-3 h-3" />
          Retake
        </div>
      );
    }

    if (image.markedForCrop) {
      return (
        <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1">
          <Crop className="w-3 h-3" />
          Crop
        </div>
      );
    }

    return (
      <div className="absolute top-2 right-2 bg-emerald-500 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3" />
        Ready
      </div>
    );
  };

  const handleTunerApply = (settings: EnhancementSettings) => {
    setTunerSettings(settings);
    console.log("Enhancement settings applied:", settings);
    // Settings will be used during processing
  };

  return (
    <>
      {showTuner && images.length > 0 && (
        <EnhancementTuner
          originalBlob={images[0].originalBlob}
          onClose={() => setShowTuner(false)}
          onApply={handleTunerApply}
        />
      )}

      <div className="fixed inset-0 z-[10002] flex flex-col h-full bg-gradient-to-br from-slate-900 to-emerald-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 border-b border-emerald-500/30 px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h2
              id="final-review-title"
              className="text-xl font-bold text-white"
            >
              Final Review
            </h2>
            <p
              className="text-sm text-emerald-100 mt-1"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {images.length} {images.length === 1 ? "page" : "pages"} processed
            </p>
            {/* Mobile swipe hint */}
            <p
              className="text-xs text-emerald-200/70 mt-1 sm:hidden"
              aria-describedby="swipe-instructions"
            >
              💡 Swipe right to retake, left to delete
            </p>
            {/* Desktop keyboard shortcuts hint */}
            <p className="text-xs text-emerald-200/70 mt-1 hidden sm:block">
              ⌨️ Arrow keys to navigate • R to retake • C to crop • Delete to
              remove • Enter to continue
            </p>
            <span id="swipe-instructions" className="sr-only">
              On mobile, swipe right on a page thumbnail to mark it for retake,
              or swipe left to delete it
            </span>
          </div>

          {/* Status badges */}
          <div
            className="flex items-center gap-2"
            role="status"
            aria-live="polite"
          >
            {markedForRetakeCount > 0 && (
              <div
                className="bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-xs font-medium border border-amber-500/30"
                aria-label={`${markedForRetakeCount} ${markedForRetakeCount === 1 ? "page" : "pages"} marked for retake`}
              >
                {markedForRetakeCount} to retake
              </div>
            )}
            {markedForCropCount > 0 && (
              <div
                className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-xs font-medium border border-blue-500/30"
                aria-label={`${markedForCropCount} ${markedForCropCount === 1 ? "page" : "pages"} marked for manual crop`}
              >
                {markedForCropCount} to crop
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
        {/* Responsive Grid: 2 columns (mobile), 3 (tablet), 4 (desktop) */}
        <div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          role="list"
          aria-labelledby="final-review-title"
        >
          {images.map((image, index) => (
            <div
              key={image.id}
              onTouchStart={(e) => handleTouchStart(e, image.id)}
              onTouchMove={handleTouchMove}
              onTouchEnd={(e) => handleTouchEnd(e, image.id)}
              onFocus={() => setFocusedImageIndex(index)}
              tabIndex={0}
              className={`
                relative bg-slate-800/50 rounded-lg shadow-md overflow-hidden
                transition-all duration-200 border border-emerald-500/20
                ${focusedImageIndex === index ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900" : ""}
                hover:shadow-lg hover:border-emerald-500/40 touch-manipulation
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900
              `}
              role="listitem"
              aria-label={`Page ${image.pageNumber}${image.markedForRetake ? ", marked for retake" : ""}${image.markedForCrop ? ", marked for crop" : ""}${image.status === "error" ? ", error" : ""}`}
            >
              {/* Thumbnail Image - Show PROCESSED image */}
              <div className="aspect-[3/4] bg-slate-700 relative">
                <img
                  src={image.processedDataUrl}
                  alt={`Page ${image.pageNumber} processed thumbnail`}
                  className="w-full h-full object-cover"
                />

                {/* Page Number Badge */}
                <div
                  className="absolute top-2 left-2 bg-emerald-600 text-white px-2 py-1 rounded-md text-xs font-bold shadow-lg"
                  aria-hidden="true"
                >
                  {image.pageNumber}
                </div>

                {/* Status Indicator */}
                {getStatusIndicator(image)}
              </div>

              {/* Action Buttons */}
              <div
                className="p-2 flex items-center justify-between gap-1 bg-slate-800/80"
                role="group"
                aria-label={`Actions for page ${image.pageNumber}`}
              >
                {/* Rotate 90° */}
                <button
                  onClick={() => onRotate(image.id)}
                  className="
                    flex items-center justify-center px-2 py-2 rounded-md
                    text-xs font-medium transition-colors
                    bg-white/10 text-blue-300 hover:bg-blue-500/20 border border-blue-500/30
                    min-h-[44px] sm:min-h-[40px]
                  "
                  title="Rotate 90° clockwise"
                  aria-label={`Rotate page ${image.pageNumber} 90 degrees`}
                >
                  <RotateCw className="w-4 h-4" aria-hidden="true" />
                </button>

                {/* Mark for Retake */}
                <button
                  onClick={() => onMarkRetake(image.id)}
                  className={`
                    flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-md
                    text-xs font-medium transition-colors
                    min-h-[44px] sm:min-h-[40px]
                    ${
                      image.markedForRetake
                        ? "bg-amber-500 text-white hover:bg-amber-600"
                        : "bg-white/10 text-emerald-200 hover:bg-white/20 border border-emerald-500/30"
                    }
                  `}
                  title={
                    image.markedForRetake ? "Unmark retake" : "Mark for retake"
                  }
                  aria-label={
                    image.markedForRetake
                      ? `Unmark page ${image.pageNumber} for retake`
                      : `Mark page ${image.pageNumber} for retake`
                  }
                  aria-pressed={image.markedForRetake}
                >
                  <Camera className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Retake</span>
                </button>

                {/* Mark for Crop */}
                <button
                  onClick={() => onMarkCrop(image.id)}
                  className={`
                    flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-md
                    text-xs font-medium transition-colors
                    min-h-[44px] sm:min-h-[40px]
                    ${
                      image.markedForCrop
                        ? "bg-blue-500 text-white hover:bg-blue-600"
                        : "bg-white/10 text-emerald-200 hover:bg-white/20 border border-emerald-500/30"
                    }
                  `}
                  title={image.markedForCrop ? "Unmark crop" : "Mark for crop"}
                  aria-label={
                    image.markedForCrop
                      ? `Unmark page ${image.pageNumber} for manual crop`
                      : `Mark page ${image.pageNumber} for manual crop`
                  }
                  aria-pressed={image.markedForCrop}
                >
                  <Crop className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Crop</span>
                </button>

                {/* Delete */}
                <button
                  onClick={() => onDelete(image.id)}
                  className="
                    flex items-center justify-center px-2 py-2 rounded-md
                    text-xs font-medium transition-colors
                    bg-white/10 text-red-400 hover:bg-red-500/20 border border-red-500/30
                    min-h-[44px] sm:min-h-[40px]
                  "
                  title="Delete page"
                  aria-label={`Delete page ${image.pageNumber}`}
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {images.length === 0 && (
          <div
            className="flex flex-col items-center justify-center h-64 text-emerald-300/50"
            role="status"
            aria-live="polite"
          >
            <Camera className="w-16 h-16 mb-4" aria-hidden="true" />
            <p className="text-lg font-medium">No pages processed yet</p>
            <p className="text-sm">Start capturing to see your pages here</p>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="bg-slate-900/80 border-t border-emerald-500/30 px-4 py-4 sm:px-6 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Enhancement Tuner Button */}
          <button
            onClick={() => setShowTuner(true)}
            disabled={images.length === 0}
            className="
              flex items-center justify-center gap-2 px-6 py-3 rounded-lg
              bg-blue-600 text-white font-medium
              hover:bg-blue-700 active:bg-blue-800
              disabled:bg-slate-600 disabled:cursor-not-allowed
              transition-colors shadow-md hover:shadow-lg
              min-h-[44px]
            "
            aria-label="Tune enhancement settings"
          >
            <Settings className="w-5 h-5" aria-hidden="true" />
            Tune Settings
          </button>

          {/* Retake Marked Pages Button */}
          {markedForRetakeCount > 0 && (
            <button
              onClick={onRetake}
              className="
                flex items-center justify-center gap-2 px-6 py-3 rounded-lg
                bg-amber-500 text-white font-medium
                hover:bg-amber-600 active:bg-amber-700
                transition-colors shadow-md hover:shadow-lg
                min-h-[44px]
              "
              aria-label={`Retake ${markedForRetakeCount} marked ${markedForRetakeCount === 1 ? "page" : "pages"}`}
            >
              <RotateCcw className="w-5 h-5" aria-hidden="true" />
              Retake {markedForRetakeCount}{" "}
              {markedForRetakeCount === 1 ? "Page" : "Pages"}
            </button>
          )}

          {/* Spacer */}
          <div className="flex-1" aria-hidden="true" />

          {/* Continue Button */}
          <button
            onClick={onContinue}
            disabled={images.length === 0}
            className="
              flex items-center justify-center gap-2 px-6 py-3 rounded-lg
              bg-emerald-600 text-white font-medium
              hover:bg-emerald-700
              active:bg-emerald-800
              disabled:bg-slate-600 disabled:cursor-not-allowed
              transition-all shadow-md hover:shadow-lg
              min-h-[44px]
            "
            aria-label={`Continue to ${markedForCropCount > 0 ? "crop adjustment" : "naming"}`}
            aria-disabled={images.length === 0}
          >
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
            Continue
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
