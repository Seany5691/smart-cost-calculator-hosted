/**
 * Data model types and interfaces for the Document Scanner feature
 *
 * This module defines all TypeScript types and interfaces used throughout
 * the document scanning workflow, from image capture to PDF generation.
 */

/**
 * Workflow phases for the document scanner
 */
export type Phase =
  | "capture" // Camera interface for taking photos
  | "preview" // Grid view of captured pages with actions (RAW images)
  | "retake" // Re-capture specific marked pages
  | "process" // Batch image processing with progress
  | "finalReview" // Review processed images before naming
  | "crop" // Manual adjustment for marked pages
  | "name" // Document naming input
  | "generate"; // PDF generation and upload

/**
 * Status of a captured or processed image
 */
export type ImageStatus =
  | "captured" // Raw image captured from camera
  | "processing" // Currently being processed
  | "processed" // Processing complete
  | "error"; // Processing failed

/**
 * 2D point coordinates in pixels
 */
export interface Point {
  x: number; // X coordinate in pixels
  y: number; // Y coordinate in pixels
}

/**
 * Four corner points defining document boundaries
 * Used for edge detection and perspective transform
 */
export interface EdgePoints {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
}

/**
 * Rectangular crop area definition
 */
export interface CropArea {
  x: number; // Top-left X coordinate
  y: number; // Top-left Y coordinate
  width: number; // Crop width in pixels
  height: number; // Crop height in pixels
}

/**
 * Captured image from camera with metadata
 * Represents a raw, unprocessed document page
 */
export interface CapturedImage {
  id: string; // Unique identifier (UUID)
  originalBlob: Blob; // Raw camera capture
  originalDataUrl: string; // Base64 data URL for preview
  pageNumber: number; // 1-indexed position in document
  timestamp: number; // Capture time in milliseconds
  status: ImageStatus; // Current processing status
  markedForRetake: boolean; // User marked for re-capture
  markedForCrop: boolean; // User marked for manual crop adjustment
}

/**
 * Processed image with enhancements and metadata
 * Extends CapturedImage with processing results
 */
export interface ProcessedImage extends CapturedImage {
  processedBlob: Blob; // Enhanced image after processing pipeline
  processedDataUrl: string; // Base64 data URL of processed image
  thumbnailDataUrl: string; // Low-resolution thumbnail (200x300 max)
  detectedEdges?: EdgePoints; // Auto-detected document boundaries (if found)
  cropArea: CropArea; // Final crop area (auto-detected or manual)
  fileSize: number; // Compressed file size in bytes
  processingTime: number; // Time taken to process in milliseconds
}

/**
 * Scanner session state for persistence
 * Stored in sessionStorage to preserve work across navigation
 */
export interface ScannerSession {
  leadId: string; // Lead ID for attachment upload
  leadName: string; // Lead name for document naming
  images: ProcessedImage[]; // All captured and processed images
  currentPhase: Phase; // Current workflow phase
  documentName: string; // User-provided document name
  createdAt: number; // Session creation timestamp
  maxPages: 50; // Maximum pages allowed per session
}

/**
 * Props for DocumentScannerModal component
 */
export interface DocumentScannerModalProps {
  leadId: string; // Lead ID for attachment upload
  leadName: string; // Lead name for pre-filling document name
  onClose: () => void; // Callback when modal is closed
  onComplete: () => void; // Callback when upload completes successfully
}

/**
 * Props for CaptureMode component
 */
export interface CaptureModeProps {
  onCapture: (blob: Blob) => void; // Callback when image is captured
  onDone: () => void; // Callback when user finishes capturing
  currentPageNumber: number; // Current page number being captured
  maxPages: number; // Maximum pages allowed
  retakeMode?: boolean; // Whether in retake mode
  retakePageNumbers?: number[]; // Page numbers being retaken
  onCameraReady?: (cleanup: () => void) => void; // Callback with camera cleanup function
}

/**
 * Props for PreviewGrid component
 */
export interface PreviewGridProps {
  images: CapturedImage[]; // All captured images
  onMarkRetake: (imageId: string) => void; // Mark page for retake
  onDelete: (imageId: string) => void; // Delete page
  onReorder: (fromIndex: number, toIndex: number) => void; // Reorder pages
  onProcess: () => void; // Start processing
  onRetake: () => void; // Start retake mode
}

/**
 * Props for FinalReviewGrid component
 */
export interface FinalReviewGridProps {
  images: ProcessedImage[]; // All processed images
  onMarkRetake: (imageId: string) => void; // Mark page for retake
  onMarkCrop: (imageId: string) => void; // Mark page for manual crop
  onDelete: (imageId: string) => void; // Delete page
  onRotate: (imageId: string) => void; // Rotate page 90 degrees clockwise
  onContinue: () => void; // Continue to naming or crop adjustment
  onRetake: () => void; // Start retake mode
}

/**
 * Props for ProcessingModal component
 */
export interface ProcessingModalProps {
  currentPage: number; // Current page being processed
  totalPages: number; // Total pages to process
  estimatedTimeRemaining: number; // Estimated seconds remaining
  onCancel: () => void; // Callback to cancel processing
}

/**
 * Props for CropAdjustment component
 */
export interface CropAdjustmentProps {
  image: ProcessedImage; // Image to adjust crop for
  onApply: (cropArea: CropArea) => void; // Apply manual crop
  onReset: () => void; // Reset to auto-detected crop
  onSkip: () => void; // Skip and keep auto-detected crop
}

/**
 * Props for DocumentNaming component
 */
export interface DocumentNamingProps {
  leadName: string; // Lead name for pre-filling
  onSubmit: (name: string) => void; // Submit document name
  onCancel: () => void; // Cancel and return to previous phase
}
