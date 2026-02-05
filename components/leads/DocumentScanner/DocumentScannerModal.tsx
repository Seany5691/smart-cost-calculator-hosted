"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  DocumentScannerModalProps,
  Phase,
  CapturedImage,
  ProcessedImage,
  ScannerSession,
  CropArea,
} from "@/lib/documentScanner/types";
import { blobToDataUrl } from "@/lib/documentScanner/imageProcessing";
import { processBatch } from "@/lib/documentScanner/imageProcessing";
import { generatePDF } from "@/lib/documentScanner/pdfGenerator";
import { uploadWithRetry } from "@/lib/documentScanner/upload";
import { useToast } from "@/components/ui/Toast/useToast";
import CaptureMode from "./CaptureMode";
import PreviewGrid from "./PreviewGrid";
import ProcessingModal from "./ProcessingModal";
import FinalReviewGrid from "./FinalReviewGrid";
import CropAdjustment from "./CropAdjustment";
import DocumentNaming from "./DocumentNaming";

/**
 * DocumentScannerModal - Main Container Component
 *
 * Orchestrates the entire document scanning workflow:
 * - Routes between all 5 UI components based on phase
 * - Manages the complete scanning workflow
 * - Handles image capture, processing, PDF generation, and upload
 * - Persists session state to sessionStorage
 * - Handles all phase transitions
 * - Orchestrates batch processing
 * - Generates and uploads PDFs
 *
 * Requirements: Architecture section, 1.4, 3.5, 3.6, 3.7, 3.8, 8.1, 8.2, 10.1-10.7, 12.1-12.6, 16.1-16.5
 */

interface ScannerState {
  currentPhase: Phase;
  images: CapturedImage[];
  documentName: string;
  error: string | null;
  isProcessing: boolean;
  processingProgress: {
    current: number;
    total: number;
    estimatedTimeRemaining: number;
  };
  currentCropIndex: number;
  retakePageNumbers: number[];
}

const SESSION_STORAGE_KEY = "document-scanner-session";
const MAX_PAGES = 50;

export default function DocumentScannerModal({
  leadId,
  leadName,
  onClose,
  onComplete,
}: DocumentScannerModalProps) {
  const { toast } = useToast();
  const cameraCleanupRef = useRef<(() => void) | null>(null);
  const [state, setState] = useState<ScannerState>({
    currentPhase: "capture",
    images: [],
    documentName: "",
    error: null,
    isProcessing: false,
    processingProgress: {
      current: 0,
      total: 0,
      estimatedTimeRemaining: 0,
    },
    currentCropIndex: 0,
    retakePageNumbers: [],
  });

  /**
   * Session Persistence - Load session on mount
   * Requirements: 16.1, 16.2, 16.3
   */
  useEffect(() => {
    loadSession();
  }, []);

  /**
   * Session Persistence - Save session on state changes
   * Requirements: 16.1, 16.2
   */
  useEffect(() => {
    if (state.images.length > 0) {
      saveSession();
    }
  }, [state.images, state.currentPhase, state.documentName]);

  /**
   * Cleanup on unmount
   * Requirements: Memory management, 17.9
   */
  useEffect(() => {
    return () => {
      // Stop camera if it's running
      if (cameraCleanupRef.current) {
        cameraCleanupRef.current();
      }
      cleanup();
    };
  }, []);

  /**
   * Load session from sessionStorage
   * Requirements: 16.2, 16.3
   */
  const loadSession = () => {
    try {
      const sessionData = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (sessionData) {
        const session: ScannerSession = JSON.parse(sessionData);

        // Check if session is for the same lead
        if (session.leadId === leadId) {
          // Offer to restore session
          const restore = window.confirm(
            "A previous scanning session was found. Would you like to restore it?",
          );

          if (restore) {
            setState((prev) => ({
              ...prev,
              images: session.images,
              currentPhase: session.currentPhase,
              documentName: session.documentName,
            }));
          } else {
            // Clear session if user declines
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load session:", error);
    }
  };

  /**
   * Save session to sessionStorage
   * Requirements: 16.1, 16.2
   */
  const saveSession = () => {
    try {
      const session: ScannerSession = {
        leadId,
        leadName,
        images: state.images as ProcessedImage[],
        currentPhase: state.currentPhase,
        documentName: state.documentName,
        createdAt: Date.now(),
        maxPages: MAX_PAGES,
      };

      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      console.error("Failed to save session:", error);
    }
  };

  /**
   * Clear session from sessionStorage
   * Requirements: 16.4, 16.5
   */
  const clearSession = () => {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear session:", error);
    }
  };

  /**
   * Cleanup resources
   * Requirements: 17.9, Memory management
   */
  const cleanup = () => {
    // Release all blob URLs
    state.images.forEach((img) => {
      try {
        if (img.originalDataUrl.startsWith("blob:")) {
          URL.revokeObjectURL(img.originalDataUrl);
        }
        if (
          "processedDataUrl" in img &&
          (img as ProcessedImage).processedDataUrl.startsWith("blob:")
        ) {
          URL.revokeObjectURL((img as ProcessedImage).processedDataUrl);
        }
        if (
          "thumbnailDataUrl" in img &&
          (img as ProcessedImage).thumbnailDataUrl.startsWith("blob:")
        ) {
          URL.revokeObjectURL((img as ProcessedImage).thumbnailDataUrl);
        }
      } catch (error) {
        console.warn("Failed to revoke URL:", error);
      }
    });
  };

  /**
   * Handle image capture from camera
   * Requirements: 1.4, 2.1, 2.2
   */
  const handleCapture = async (blob: Blob) => {
    try {
      // Check if max pages reached
      if (state.images.length >= MAX_PAGES) {
        toast.warning("Maximum pages reached", {
          message: `You can capture up to ${MAX_PAGES} pages per document. Please process current pages.`,
          section: "leads",
        });
        return;
      }

      // Generate unique ID
      const id = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Convert blob to data URL for preview
      const dataUrl = await blobToDataUrl(blob);

      // Create captured image
      const capturedImage: CapturedImage = {
        id,
        originalBlob: blob,
        originalDataUrl: dataUrl,
        pageNumber: state.images.length + 1,
        timestamp: Date.now(),
        status: "captured",
        markedForRetake: false,
        markedForCrop: false,
      };

      // Add to images array
      setState((prev) => ({
        ...prev,
        images: [...prev.images, capturedImage],
        error: null,
      }));
    } catch (error) {
      console.error("Failed to capture image:", error);
      toast.error("Capture failed", {
        message: "Failed to capture image. Please try again.",
        section: "leads",
      });
    }
  };

  /**
   * Handle done capturing - transition to preview
   * Requirements: 2.4, 17.5
   */
  const handleDoneCapturing = () => {
    if (state.images.length === 0) {
      toast.warning("No pages captured", {
        message: "Please capture at least one page before continuing.",
        section: "leads",
      });
      return;
    }

    setState((prev) => ({
      ...prev,
      currentPhase: "preview",
      error: null,
    }));
  };

  /**
   * Handle mark page for retake
   * Requirements: 3.5, 17.2
   */
  const handleMarkRetake = (imageId: string) => {
    setState((prev) => ({
      ...prev,
      images: prev.images.map((img) =>
        img.id === imageId
          ? { ...img, markedForRetake: !img.markedForRetake }
          : img,
      ),
    }));
  };

  /**
   * Handle mark page for manual crop (only in Final Review)
   * Requirements: 3.6, 17.2
   */
  const handleMarkCrop = (imageId: string) => {
    setState((prev) => ({
      ...prev,
      images: prev.images.map((img) =>
        img.id === imageId
          ? { ...img, markedForCrop: !img.markedForCrop }
          : img,
      ),
    }));
  };

  /**
   * Handle delete page
   * Requirements: 3.7, 17.2
   */
  const handleDelete = (imageId: string) => {
    setState((prev) => {
      const newImages = prev.images.filter((img) => img.id !== imageId);

      // Renumber pages
      const renumberedImages = newImages.map((img, index) => ({
        ...img,
        pageNumber: index + 1,
      }));

      return {
        ...prev,
        images: renumberedImages,
      };
    });
  };

  /**
   * Handle reorder pages
   * Requirements: 3.8, 17.2
   */
  const handleReorder = (fromIndex: number, toIndex: number) => {
    setState((prev) => {
      const newImages = [...prev.images];
      const [movedImage] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, movedImage);

      // Renumber pages
      const renumberedImages = newImages.map((img, index) => ({
        ...img,
        pageNumber: index + 1,
      }));

      return {
        ...prev,
        images: renumberedImages,
      };
    });
  };

  /**
   * Handle initiate retake mode
   * Requirements: 4.1, 17.5
   */
  const handleRetake = () => {
    const markedImages = state.images.filter((img) => img.markedForRetake);

    if (markedImages.length === 0) {
      return;
    }

    setState((prev) => ({
      ...prev,
      currentPhase: "retake",
      retakePageNumbers: markedImages.map((img) => img.pageNumber),
    }));
  };

  /**
   * Handle retake capture - replace marked page
   * Requirements: 4.3, 17.2
   */
  const handleRetakeCapture = async (blob: Blob) => {
    try {
      if (state.retakePageNumbers.length === 0) return;

      const pageNumber = state.retakePageNumbers[0];
      const imageToReplace = state.images.find(
        (img) => img.pageNumber === pageNumber,
      );

      if (!imageToReplace) return;

      // Convert blob to data URL
      const dataUrl = await blobToDataUrl(blob);

      // Create replacement image (preserve ID and page number)
      const replacementImage: CapturedImage = {
        ...imageToReplace,
        originalBlob: blob,
        originalDataUrl: dataUrl,
        timestamp: Date.now(),
        status: "captured",
        markedForRetake: false,
      };

      // Replace image in array
      setState((prev) => ({
        ...prev,
        images: prev.images.map((img) =>
          img.id === imageToReplace.id ? replacementImage : img,
        ),
        retakePageNumbers: prev.retakePageNumbers.slice(1),
      }));
    } catch (error) {
      console.error("Failed to retake image:", error);
      toast.error("Retake failed", {
        message: "Failed to retake image. Please try again.",
        section: "leads",
      });
    }
  };

  /**
   * Handle done retaking - return to preview
   * Requirements: 4.4, 17.5
   */
  const handleDoneRetaking = () => {
    setState((prev) => ({
      ...prev,
      currentPhase: "preview",
      retakePageNumbers: [],
    }));
  };

  /**
   * Handle start processing
   * Requirements: 8.1, 8.2, 17.5, 17.6
   */
  const handleProcess = async () => {
    setState((prev) => ({
      ...prev,
      currentPhase: "process",
      isProcessing: true,
      processingProgress: {
        current: 0,
        total: prev.images.length,
        estimatedTimeRemaining: prev.images.length * 2, // Estimate 2 seconds per image
      },
    }));

    try {
      const startTime = Date.now();

      // Process images in batches
      const processedImages = await processBatch(
        state.images,
        5,
        (current, total) => {
          // Calculate estimated time remaining
          const elapsed = (Date.now() - startTime) / 1000;
          const avgTimePerImage = elapsed / current;
          const remaining = Math.ceil((total - current) * avgTimePerImage);

          setState((prev) => ({
            ...prev,
            processingProgress: {
              current,
              total,
              estimatedTimeRemaining: remaining,
            },
          }));
        },
      );

      // Update images with processed results
      setState((prev) => ({
        ...prev,
        images: processedImages,
        isProcessing: false,
        currentPhase: "finalReview", // Go to Final Review instead of checking for crops
      }));
    } catch (error) {
      console.error("Processing failed:", error);

      // Show error toast
      toast.error("Processing failed", {
        message: "Some images failed to process. Please mark them for retake.",
        section: "leads",
      });

      // Mark failed images for retake
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        currentPhase: "preview",
        images: prev.images.map((img) =>
          img.status === "error" ? { ...img, markedForRetake: true } : img,
        ),
      }));
    }
  };

  /**
   * Handle cancel processing
   * Requirements: 17.6
   */
  const handleCancelProcessing = () => {
    setState((prev) => ({
      ...prev,
      currentPhase: "preview",
      isProcessing: false,
    }));
  };

  /**
   * Handle rotate image 90 degrees clockwise
   * Requirements: Phase 2 - Rotation controls
   */
  const handleRotateImage = async (imageId: string) => {
    const image = state.images.find((img) => img.id === imageId) as ProcessedImage;
    if (!image) return;

    try {
      // Create canvas to rotate image
      const img = new Image();
      img.src = image.processedDataUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Create canvas with swapped dimensions (90° rotation)
      const canvas = document.createElement("canvas");
      canvas.width = img.height;
      canvas.height = img.width;

      const ctx = canvas.getContext("2d")!;

      // Rotate 90° clockwise
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      // Convert to blob
      const rotatedBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Failed to create blob"));
          },
          "image/jpeg",
          0.95
        );
      });

      // Convert to data URL
      const rotatedDataUrl = await blobToDataUrl(rotatedBlob);

      // Update image in state
      setState((prev) => ({
        ...prev,
        images: prev.images.map((img) =>
          img.id === imageId
            ? {
                ...img,
                processedBlob: rotatedBlob,
                processedDataUrl: rotatedDataUrl,
              }
            : img
        ),
      }));

      toast.success("Image rotated", {
        message: "Page rotated 90° clockwise",
        section: "leads",
      });
    } catch (error) {
      console.error("Failed to rotate image:", error);
      toast.error("Rotation failed", {
        message: "Failed to rotate image. Please try again.",
        section: "leads",
      });
    }
  };
    // Check if any pages need manual crop
    const needsCrop = state.images.filter((img) => img.markedForCrop);

    if (needsCrop.length > 0) {
      // Transition to crop phase
      setState((prev) => ({
        ...prev,
        currentPhase: "crop",
        currentCropIndex: 0,
      }));
    } else {
      // Transition to naming phase
      setState((prev) => ({
        ...prev,
        currentPhase: "name",
      }));
    }
  };

  /**
   * Handle apply manual crop
   * Requirements: 7.3, 17.2
   */
  const handleApplyCrop = (cropArea: CropArea) => {
    const markedImages = state.images.filter((img) => img.markedForCrop);
    const currentImage = markedImages[state.currentCropIndex] as ProcessedImage;

    if (!currentImage) return;

    // Update crop area for current image
    setState((prev) => ({
      ...prev,
      images: prev.images.map((img) =>
        img.id === currentImage.id
          ? { ...img, cropArea, markedForCrop: false }
          : img,
      ),
    }));

    // Move to next crop or finish
    moveToNextCrop();
  };

  /**
   * Handle reset crop to auto-detected
   * Requirements: 7.4
   */
  const handleResetCrop = () => {
    const markedImages = state.images.filter((img) => img.markedForCrop);
    const currentImage = markedImages[state.currentCropIndex] as ProcessedImage;

    if (!currentImage || !currentImage.detectedEdges) return;

    // Reset to auto-detected crop
    const edges = currentImage.detectedEdges;
    const minX = Math.min(edges.topLeft.x, edges.bottomLeft.x);
    const maxX = Math.max(edges.topRight.x, edges.bottomRight.x);
    const minY = Math.min(edges.topLeft.y, edges.topRight.y);
    const maxY = Math.max(edges.bottomLeft.y, edges.bottomRight.y);

    const resetCropArea: CropArea = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };

    setState((prev) => ({
      ...prev,
      images: prev.images.map((img) =>
        img.id === currentImage.id ? { ...img, cropArea: resetCropArea } : img,
      ),
    }));
  };

  /**
   * Handle skip crop - keep auto-detected
   * Requirements: 7.5
   */
  const handleSkipCrop = () => {
    const markedImages = state.images.filter((img) => img.markedForCrop);
    const currentImage = markedImages[state.currentCropIndex];

    if (!currentImage) return;

    // Unmark for crop
    setState((prev) => ({
      ...prev,
      images: prev.images.map((img) =>
        img.id === currentImage.id ? { ...img, markedForCrop: false } : img,
      ),
    }));

    // Move to next crop or finish
    moveToNextCrop();
  };

  /**
   * Move to next crop or finish cropping
   * Requirements: 17.5
   */
  const moveToNextCrop = () => {
    const markedImages = state.images.filter((img) => img.markedForCrop);

    if (state.currentCropIndex + 1 < markedImages.length) {
      // Move to next crop
      setState((prev) => ({
        ...prev,
        currentCropIndex: prev.currentCropIndex + 1,
      }));
    } else {
      // All crops done, move to naming
      setState((prev) => ({
        ...prev,
        currentPhase: "name",
        currentCropIndex: 0,
      }));
    }
  };

  /**
   * Handle document name submission
   * Requirements: 11.3, 11.4, 11.5, 17.5
   */
  const handleSubmitName = async (name: string) => {
    // Validate name
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Invalid name", {
        message: "Document name cannot be empty.",
        section: "leads",
      });
      return;
    }

    setState((prev) => ({
      ...prev,
      documentName: trimmedName,
      currentPhase: "generate",
      error: null,
    }));

    // Start PDF generation and upload
    await handleGenerateAndUpload(trimmedName);
  };

  /**
   * Handle cancel naming - return to preview
   */
  const handleCancelNaming = () => {
    setState((prev) => ({
      ...prev,
      currentPhase: "preview",
    }));
  };

  /**
   * Handle PDF generation and upload
   * Requirements: 10.1-10.7, 12.1-12.6, 17.8
   */
  const handleGenerateAndUpload = async (documentName: string) => {
    try {
      // Generate PDF
      const pdfBlob = await generatePDF(
        state.images as ProcessedImage[],
        documentName,
      );

      // Upload with retry
      await uploadWithRetry(leadId, pdfBlob, documentName);

      // Success - clear session and close
      clearSession();
      cleanup();

      // Show success toast
      toast.success("Document uploaded", {
        message: `${documentName}.pdf has been attached to the lead`,
        section: "leads",
      });

      // Call completion callback to refresh attachments
      onComplete();

      // Close modal
      onClose();
    } catch (error) {
      console.error("Upload failed:", error);

      // Show error toast with retry option
      toast.error("Upload failed", {
        message:
          error instanceof Error
            ? error.message
            : "Failed to upload document. Please try again.",
        section: "leads",
      });

      // Return to naming phase so user can retry
      setState((prev) => ({
        ...prev,
        currentPhase: "name",
        error: "Upload failed. Please try again.",
      }));
    }
  };

  /**
   * Handle close modal
   * Requirements: 16.5
   */
  const handleClose = () => {
    const confirm = window.confirm(
      "Are you sure you want to close? Your progress will be saved and you can resume later.",
    );

    if (confirm) {
      // Stop camera if it's running
      if (cameraCleanupRef.current) {
        cameraCleanupRef.current();
      }
      onClose();
    }
  };

  /**
   * Handle cancel scanning - clear session
   * Requirements: 16.5
   */
  const handleCancel = () => {
    const confirm = window.confirm(
      "Are you sure you want to cancel? All captured pages will be lost.",
    );

    if (confirm) {
      // Stop camera if it's running
      if (cameraCleanupRef.current) {
        cameraCleanupRef.current();
      }
      clearSession();
      cleanup();
      onClose();
    }
  };

  /**
   * Render current phase component
   * Requirements: 17.1, Architecture section
   */
  const renderPhase = () => {
    switch (state.currentPhase) {
      case "capture":
        return (
          <CaptureMode
            onCapture={handleCapture}
            onDone={handleDoneCapturing}
            currentPageNumber={state.images.length + 1}
            maxPages={MAX_PAGES}
            retakeMode={false}
            onCameraReady={(cleanup) => {
              cameraCleanupRef.current = cleanup;
            }}
          />
        );

      case "retake":
        return (
          <CaptureMode
            onCapture={handleRetakeCapture}
            onDone={handleDoneRetaking}
            currentPageNumber={state.retakePageNumbers[0] || 1}
            maxPages={MAX_PAGES}
            retakeMode={true}
            retakePageNumbers={state.retakePageNumbers}
            onCameraReady={(cleanup) => {
              cameraCleanupRef.current = cleanup;
            }}
          />
        );

      case "preview":
        return (
          <PreviewGrid
            images={state.images}
            onMarkRetake={handleMarkRetake}
            onDelete={handleDelete}
            onReorder={handleReorder}
            onProcess={handleProcess}
            onRetake={handleRetake}
          />
        );

      case "process":
        return (
          <ProcessingModal
            currentPage={state.processingProgress.current}
            totalPages={state.processingProgress.total}
            estimatedTimeRemaining={
              state.processingProgress.estimatedTimeRemaining
            }
            onCancel={handleCancelProcessing}
          />
        );

      case "finalReview":
        return (
          <FinalReviewGrid
            images={state.images as ProcessedImage[]}
            onMarkRetake={handleMarkRetake}
            onMarkCrop={handleMarkCrop}
            onDelete={handleDelete}
            onRotate={handleRotateImage}
            onContinue={handleContinueFromFinalReview}
            onRetake={handleRetake}
          />
        );

      case "crop":
        const markedImages = state.images.filter((img) => img.markedForCrop);
        const currentImage = markedImages[
          state.currentCropIndex
        ] as ProcessedImage;

        if (!currentImage) {
          // No more crops, move to naming
          setState((prev) => ({ ...prev, currentPhase: "name" }));
          return null;
        }

        return (
          <CropAdjustment
            image={currentImage}
            onApply={handleApplyCrop}
            onReset={handleResetCrop}
            onSkip={handleSkipCrop}
          />
        );

      case "name":
        return (
          <DocumentNaming
            leadName={leadName}
            onSubmit={handleSubmitName}
            onCancel={handleCancelNaming}
          />
        );

      case "generate":
        return (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10002] flex items-center justify-center p-4"
            role="dialog"
            aria-labelledby="generating-title"
            aria-describedby="generating-description"
            aria-live="polite"
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-white animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </div>
                <h2
                  id="generating-title"
                  className="text-2xl font-bold text-gray-900"
                >
                  Generating PDF
                </h2>
                <p id="generating-description" className="text-gray-600">
                  Creating and uploading your document...
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {renderPhase()}

      {/* Error Toast */}
      {state.error && (
        <div
          className="fixed bottom-4 left-4 right-4 z-[60] flex justify-center"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <div className="bg-red-600 text-white px-6 py-4 rounded-lg shadow-2xl max-w-md w-full flex items-start gap-3">
            <svg
              className="w-6 h-6 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="font-medium">{state.error}</p>
            </div>
            <button
              onClick={() => setState((prev) => ({ ...prev, error: null }))}
              className="text-white/80 hover:text-white"
              aria-label="Dismiss error message"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
