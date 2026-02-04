"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ProcessedImage,
  CropArea,
  CropAdjustmentProps,
} from "@/lib/documentScanner/types";
import { X, RotateCcw, Check, SkipForward } from "lucide-react";

/**
 * CropAdjustment Component
 *
 * Manual crop boundary adjustment tool for document scanning.
 * Allows users to adjust crop boundaries by dragging corner handles.
 *
 * Features:
 * - Draggable corner handles (40x40px touch targets)
 * - Real-time crop preview
 * - Pinch-to-zoom support for precision
 * - Apply, Reset, and Skip actions
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */
export default function CropAdjustment({
  image,
  onApply,
  onReset,
  onSkip,
}: CropAdjustmentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Crop state - initialize with current crop area
  const [cropArea, setCropArea] = useState<CropArea>(image.cropArea);

  // Dragging state
  const [draggingCorner, setDraggingCorner] = useState<
    "topLeft" | "topRight" | "bottomLeft" | "bottomRight" | null
  >(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null,
  );

  // Zoom state
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [lastPinchDistance, setLastPinchDistance] = useState<number | null>(
    null,
  );

  // Image dimensions
  const [imageDimensions, setImageDimensions] = useState({
    width: 0,
    height: 0,
  });

  // Load and draw image on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;

      setImageDimensions({ width: img.width, height: img.height });

      // Draw image
      ctx.drawImage(img, 0, 0);

      // Draw crop overlay
      drawCropOverlay(ctx, cropArea, img.width, img.height);
    };

    img.src = image.processedDataUrl;
  }, [image.processedDataUrl, cropArea]);

  /**
   * Handle keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter to apply
      if (e.key === "Enter") {
        e.preventDefault();
        handleApply();
      }
      // Escape to skip
      else if (e.key === "Escape") {
        e.preventDefault();
        handleSkip();
      }
      // R key to reset
      else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        handleReset();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cropArea]);

  /**
   * Draw crop overlay with corner handles
   */
  const drawCropOverlay = (
    ctx: CanvasRenderingContext2D,
    crop: CropArea,
    imgWidth: number,
    imgHeight: number,
  ) => {
    // Clear canvas
    ctx.clearRect(0, 0, imgWidth, imgHeight);

    // Redraw image
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);

      // Draw semi-transparent overlay outside crop area
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";

      // Top
      ctx.fillRect(0, 0, imgWidth, crop.y);
      // Bottom
      ctx.fillRect(
        0,
        crop.y + crop.height,
        imgWidth,
        imgHeight - (crop.y + crop.height),
      );
      // Left
      ctx.fillRect(0, crop.y, crop.x, crop.height);
      // Right
      ctx.fillRect(
        crop.x + crop.width,
        crop.y,
        imgWidth - (crop.x + crop.width),
        crop.height,
      );

      // Draw crop boundary
      ctx.strokeStyle = "#10b981"; // Emerald color
      ctx.lineWidth = 3;
      ctx.strokeRect(crop.x, crop.y, crop.width, crop.height);

      // Draw corner handles (40x40px for touch targets)
      const handleSize = 44; // Increased to 44px to meet minimum touch target size
      const handleColor = "#10b981";
      const handleBorderColor = "#ffffff";

      const corners = [
        { x: crop.x, y: crop.y }, // Top-left
        { x: crop.x + crop.width, y: crop.y }, // Top-right
        { x: crop.x, y: crop.y + crop.height }, // Bottom-left
        { x: crop.x + crop.width, y: crop.y + crop.height }, // Bottom-right
      ];

      corners.forEach((corner) => {
        // Draw handle background
        ctx.fillStyle = handleColor;
        ctx.beginPath();
        ctx.arc(corner.x, corner.y, handleSize / 2, 0, 2 * Math.PI);
        ctx.fill();

        // Draw handle border
        ctx.strokeStyle = handleBorderColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(corner.x, corner.y, handleSize / 2, 0, 2 * Math.PI);
        ctx.stroke();

        // Draw inner circle
        ctx.fillStyle = handleBorderColor;
        ctx.beginPath();
        ctx.arc(corner.x, corner.y, 6, 0, 2 * Math.PI);
        ctx.fill();
      });
    };
    img.src = image.processedDataUrl;
  };

  /**
   * Get corner position from crop area
   */
  const getCornerPosition = (
    corner: "topLeft" | "topRight" | "bottomLeft" | "bottomRight",
  ): { x: number; y: number } => {
    switch (corner) {
      case "topLeft":
        return { x: cropArea.x, y: cropArea.y };
      case "topRight":
        return { x: cropArea.x + cropArea.width, y: cropArea.y };
      case "bottomLeft":
        return { x: cropArea.x, y: cropArea.y + cropArea.height };
      case "bottomRight":
        return {
          x: cropArea.x + cropArea.width,
          y: cropArea.y + cropArea.height,
        };
    }
  };

  /**
   * Check if point is near a corner handle
   */
  const getCornerAtPoint = (
    x: number,
    y: number,
  ): "topLeft" | "topRight" | "bottomLeft" | "bottomRight" | null => {
    const handleSize = 44; // Updated to match new handle size
    const threshold = handleSize / 2;

    const corners: Array<{
      name: "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
      pos: { x: number; y: number };
    }> = [
      { name: "topLeft", pos: getCornerPosition("topLeft") },
      { name: "topRight", pos: getCornerPosition("topRight") },
      { name: "bottomLeft", pos: getCornerPosition("bottomLeft") },
      { name: "bottomRight", pos: getCornerPosition("bottomRight") },
    ];

    for (const corner of corners) {
      const distance = Math.sqrt(
        Math.pow(x - corner.pos.x, 2) + Math.pow(y - corner.pos.y, 2),
      );

      if (distance <= threshold) {
        return corner.name;
      }
    }

    return null;
  };

  /**
   * Get canvas coordinates from mouse/touch event
   */
  const getCanvasCoordinates = (
    clientX: number,
    clientY: number,
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  /**
   * Update crop area when corner is dragged
   */
  const updateCropArea = (
    corner: "topLeft" | "topRight" | "bottomLeft" | "bottomRight",
    newX: number,
    newY: number,
  ) => {
    // Constrain to image bounds
    newX = Math.max(0, Math.min(newX, imageDimensions.width));
    newY = Math.max(0, Math.min(newY, imageDimensions.height));

    let newCrop = { ...cropArea };

    switch (corner) {
      case "topLeft":
        // Adjust x, y, width, height
        const deltaX = newX - cropArea.x;
        const deltaY = newY - cropArea.y;
        newCrop.x = newX;
        newCrop.y = newY;
        newCrop.width = Math.max(50, cropArea.width - deltaX);
        newCrop.height = Math.max(50, cropArea.height - deltaY);
        break;

      case "topRight":
        // Adjust y, width, height
        const deltaY2 = newY - cropArea.y;
        newCrop.y = newY;
        newCrop.width = Math.max(50, newX - cropArea.x);
        newCrop.height = Math.max(50, cropArea.height - deltaY2);
        break;

      case "bottomLeft":
        // Adjust x, width, height
        const deltaX3 = newX - cropArea.x;
        newCrop.x = newX;
        newCrop.width = Math.max(50, cropArea.width - deltaX3);
        newCrop.height = Math.max(50, newY - cropArea.y);
        break;

      case "bottomRight":
        // Adjust width, height
        newCrop.width = Math.max(50, newX - cropArea.x);
        newCrop.height = Math.max(50, newY - cropArea.y);
        break;
    }

    // Ensure crop stays within image bounds
    if (newCrop.x + newCrop.width > imageDimensions.width) {
      newCrop.width = imageDimensions.width - newCrop.x;
    }
    if (newCrop.y + newCrop.height > imageDimensions.height) {
      newCrop.height = imageDimensions.height - newCrop.y;
    }

    setCropArea(newCrop);
  };

  /**
   * Handle mouse down - start dragging
   */
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    const corner = getCornerAtPoint(coords.x, coords.y);
    if (corner) {
      setDraggingCorner(corner);
      setDragStart({ x: coords.x, y: coords.y });
    }
  };

  /**
   * Handle mouse move - update crop during drag
   */
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggingCorner || !dragStart) return;

    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    updateCropArea(draggingCorner, coords.x, coords.y);
  };

  /**
   * Handle mouse up - stop dragging
   */
  const handleMouseUp = () => {
    setDraggingCorner(null);
    setDragStart(null);
  };

  /**
   * Handle touch start - start dragging
   */
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    // Handle pinch-to-zoom with two fingers
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2),
      );
      setLastPinchDistance(distance);
      e.preventDefault();
      return;
    }

    // Handle single touch for dragging corners
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    const coords = getCanvasCoordinates(touch.clientX, touch.clientY);
    if (!coords) return;

    const corner = getCornerAtPoint(coords.x, coords.y);
    if (corner) {
      setDraggingCorner(corner);
      setDragStart({ x: coords.x, y: coords.y });
      e.preventDefault();
    }
  };

  /**
   * Handle touch move - update crop during drag or handle pinch zoom
   */
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    // Handle pinch-to-zoom with two fingers
    if (e.touches.length === 2 && lastPinchDistance !== null) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2),
      );

      const delta = distance - lastPinchDistance;
      const zoomFactor = 1 + delta / 500; // Adjust sensitivity
      const newScale = Math.max(1, Math.min(3, scale * zoomFactor)); // Limit zoom between 1x and 3x

      setScale(newScale);
      setLastPinchDistance(distance);
      e.preventDefault();
      return;
    }

    // Handle single touch for dragging corners
    if (!draggingCorner || !dragStart || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const coords = getCanvasCoordinates(touch.clientX, touch.clientY);
    if (!coords) return;

    updateCropArea(draggingCorner, coords.x, coords.y);
    e.preventDefault();
  };

  /**
   * Handle touch end - stop dragging or pinch zoom
   */
  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    // Reset pinch zoom state
    if (e.touches.length < 2) {
      setLastPinchDistance(null);
    }

    // Reset dragging state
    if (e.touches.length === 0) {
      setDraggingCorner(null);
      setDragStart(null);
    }
  };

  /**
   * Handle apply button - save crop
   */
  const handleApply = () => {
    onApply(cropArea);
  };

  /**
   * Handle reset button - revert to auto-crop
   */
  const handleReset = () => {
    // Reset to original auto-detected crop or full image
    if (image.detectedEdges) {
      // Convert edges to crop area
      const edges = image.detectedEdges;
      const minX = Math.min(edges.topLeft.x, edges.bottomLeft.x);
      const maxX = Math.max(edges.topRight.x, edges.bottomRight.x);
      const minY = Math.min(edges.topLeft.y, edges.topRight.y);
      const maxY = Math.max(edges.bottomLeft.y, edges.bottomRight.y);

      setCropArea({
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      });
    } else {
      // Reset to full image
      setCropArea({
        x: 0,
        y: 0,
        width: imageDimensions.width,
        height: imageDimensions.height,
      });
    }

    onReset();
  };

  /**
   * Handle skip button - keep auto-crop and move to next
   */
  const handleSkip = () => {
    onSkip();
  };

  return (
    <div className="fixed inset-0 z-[10001] bg-black flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-4 flex items-center justify-between">
        <div>
          <h2 id="crop-adjustment-title" className="text-xl font-bold">
            Adjust Crop
          </h2>
          <p
            id="crop-adjustment-instructions"
            className="text-sm text-emerald-100"
          >
            Drag corners to adjust document boundaries
          </p>
        </div>
      </div>

      {/* Canvas Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-900 flex items-center justify-center p-4"
        role="application"
        aria-labelledby="crop-adjustment-title"
        aria-describedby="crop-adjustment-instructions crop-adjustment-help"
      >
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full cursor-crosshair touch-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            transform: `scale(${scale}) translate(${offset.x}px, ${offset.y}px)`,
          }}
          aria-label="Crop adjustment canvas. Drag corner handles to adjust crop boundaries. Pinch to zoom for precision."
          role="img"
        />
      </div>

      {/* Instructions */}
      <div
        className="bg-gray-800 text-white p-3 text-center text-sm"
        role="status"
        aria-live="polite"
      >
        <p id="crop-adjustment-help" className="hidden sm:block">
          Drag the corner handles to adjust the crop area. Pinch to zoom for
          precision. Press Enter to apply, R to reset, or Esc to skip.
        </p>
        <p className="sm:hidden">
          Drag corners to adjust. Pinch to zoom. Enter to apply.
        </p>
      </div>

      {/* Action Buttons */}
      <div
        className="bg-gray-900 p-4 flex gap-3"
        role="group"
        aria-label="Crop adjustment actions"
      >
        <button
          onClick={handleReset}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors min-h-[44px]"
          aria-label="Reset crop to automatic detection"
        >
          <RotateCcw className="w-5 h-5" aria-hidden="true" />
          Reset
        </button>

        <button
          onClick={handleSkip}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors min-h-[44px]"
          aria-label="Skip manual crop and use automatic detection"
        >
          <SkipForward className="w-5 h-5" aria-hidden="true" />
          Skip
        </button>

        <button
          onClick={handleApply}
          className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all shadow-lg min-h-[44px]"
          aria-label="Apply manual crop adjustments"
        >
          <Check className="w-5 h-5" aria-hidden="true" />
          Apply
        </button>
      </div>
    </div>
  );
}
