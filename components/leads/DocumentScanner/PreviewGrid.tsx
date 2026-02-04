/**
 * PreviewGrid Component
 *
 * Displays captured pages as thumbnails in a responsive grid layout.
 * Provides actions for marking pages for retake/crop, deleting pages,
 * and reordering pages via drag-and-drop.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 3.7, 3.8, 14.1, 14.2, 14.3
 */

"use client";

import React, { useState, useEffect } from "react";
import { PreviewGridProps, CapturedImage } from "@/lib/documentScanner/types";
import {
  Camera,
  Crop,
  Trash2,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function PreviewGrid({
  images,
  onMarkRetake,
  onMarkCrop,
  onDelete,
  onReorder,
  onProcess,
  onRetake,
}: PreviewGridProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [swipedImageId, setSwipedImageId] = useState<string | null>(null);
  const [focusedImageIndex, setFocusedImageIndex] = useState<number>(0);

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
      // Enter key to process
      else if (e.key === "Enter") {
        e.preventDefault();
        if (images.length > 0) {
          onProcess();
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
    onProcess,
  ]);

  /**
   * Handle drag start
   */
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  /**
   * Handle drag over
   */
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  /**
   * Handle drop
   */
  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();

    if (draggedIndex !== null && draggedIndex !== toIndex) {
      onReorder(draggedIndex, toIndex);
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  /**
   * Handle drag end
   */
  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

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
  const getStatusIndicator = (image: CapturedImage) => {
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

    if (image.status === "processed") {
      return (
        <div className="absolute top-2 right-2 bg-emerald-500 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Ready
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h2
              id="preview-grid-title"
              className="text-xl font-bold text-slate-900"
            >
              Review Pages
            </h2>
            <p
              className="text-sm text-slate-600 mt-1"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {images.length} {images.length === 1 ? "page" : "pages"} captured
            </p>
            {/* Mobile swipe hint */}
            <p
              className="text-xs text-slate-500 mt-1 sm:hidden"
              aria-describedby="swipe-instructions"
            >
              💡 Swipe right to retake, left to delete
            </p>
            {/* Desktop keyboard shortcuts hint */}
            <p className="text-xs text-slate-500 mt-1 hidden sm:block">
              ⌨️ Arrow keys to navigate • R to retake • C to crop • Delete to
              remove • Enter to process
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
                className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-medium"
                aria-label={`${markedForRetakeCount} ${markedForRetakeCount === 1 ? "page" : "pages"} marked for retake`}
              >
                {markedForRetakeCount} to retake
              </div>
            )}
            {markedForCropCount > 0 && (
              <div
                className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium"
                aria-label={`${markedForCropCount} ${markedForCropCount === 1 ? "page" : "pages"} marked for manual crop`}
              >
                {markedForCropCount} to crop
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* Responsive Grid: 2 columns (mobile), 3 (tablet), 4 (desktop) */}
        <div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          role="list"
          aria-labelledby="preview-grid-title"
        >
          {images.map((image, index) => (
            <div
              key={image.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => handleTouchStart(e, image.id)}
              onTouchMove={handleTouchMove}
              onTouchEnd={(e) => handleTouchEnd(e, image.id)}
              onFocus={() => setFocusedImageIndex(index)}
              tabIndex={0}
              className={`
                relative bg-white rounded-lg shadow-md overflow-hidden
                transition-all duration-200 cursor-move
                ${draggedIndex === index ? "opacity-50 scale-95" : ""}
                ${dragOverIndex === index && draggedIndex !== index ? "ring-2 ring-emerald-500" : ""}
                ${focusedImageIndex === index ? "ring-2 ring-blue-500 ring-offset-2" : ""}
                hover:shadow-lg touch-manipulation
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              `}
              role="listitem"
              aria-label={`Page ${image.pageNumber}${image.markedForRetake ? ", marked for retake" : ""}${image.markedForCrop ? ", marked for crop" : ""}${image.status === "error" ? ", error" : ""}`}
            >
              {/* Thumbnail Image */}
              <div className="aspect-[3/4] bg-slate-100 relative">
                <img
                  src={image.originalDataUrl}
                  alt={`Page ${image.pageNumber} thumbnail`}
                  className="w-full h-full object-cover"
                />

                {/* Page Number Badge */}
                <div
                  className="absolute top-2 left-2 bg-slate-900/80 text-white px-2 py-1 rounded-md text-xs font-bold"
                  aria-hidden="true"
                >
                  {image.pageNumber}
                </div>

                {/* Status Indicator */}
                {getStatusIndicator(image)}
              </div>

              {/* Action Buttons */}
              <div
                className="p-2 flex items-center justify-between gap-1 bg-slate-50"
                role="group"
                aria-label={`Actions for page ${image.pageNumber}`}
              >
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
                        : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
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
                        : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
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
                    bg-white text-red-600 hover:bg-red-50 border border-slate-200
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
            className="flex flex-col items-center justify-center h-64 text-slate-400"
            role="status"
            aria-live="polite"
          >
            <Camera className="w-16 h-16 mb-4" aria-hidden="true" />
            <p className="text-lg font-medium">No pages captured yet</p>
            <p className="text-sm">Start capturing to see your pages here</p>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="bg-white border-t border-slate-200 px-4 py-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
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

          {/* Process All Pages Button */}
          <button
            onClick={onProcess}
            disabled={images.length === 0}
            className="
              flex items-center justify-center gap-2 px-6 py-3 rounded-lg
              bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium
              hover:from-emerald-600 hover:to-emerald-700
              active:from-emerald-700 active:to-emerald-800
              disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed
              transition-all shadow-md hover:shadow-lg
              min-h-[44px]
            "
            aria-label={`Process all ${images.length} ${images.length === 1 ? "page" : "pages"}`}
            aria-disabled={images.length === 0}
          >
            <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
            Process All Pages
          </button>
        </div>
      </div>
    </div>
  );
}
