"use client";

import React, { useEffect, useRef, useState } from "react";
import { Camera, X, Zap, ZapOff } from "lucide-react";
import { CaptureModeProps } from "@/lib/documentScanner/types";
import { checkMemoryAvailable } from "@/lib/documentScanner/memoryManager";
import { useToast } from "@/components/ui/Toast/useToast";

/**
 * CaptureMode Component
 *
 * Camera interface for capturing document pages using device camera.
 * Handles camera initialization, capture functionality, and UI controls.
 *
 * Requirements:
 * - 1.1: Request camera access with environment-facing mode
 * - 1.2: Display live video stream in full-screen mode
 * - 1.3: Capture high-resolution images
 * - 1.4: Save images and increment page counter
 * - 1.6: Toggle camera flash
 * - 1.7: Handle camera errors with appropriate messages
 * - 15.1-15.3: Error handling for camera access
 */

interface CameraModeState {
  stream: MediaStream | null;
  error: string | null;
  flashEnabled: boolean;
  isCapturing: boolean;
}

export default function CaptureMode({
  onCapture,
  onDone,
  currentPageNumber,
  maxPages,
  retakeMode = false,
  retakePageNumbers = [],
}: CaptureModeProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const [state, setState] = useState<CameraModeState>({
    stream: null,
    error: null,
    flashEnabled: false,
    isCapturing: false,
  });

  /**
   * Initialize camera on component mount
   * Requirements: 1.1, 1.2, 1.7, 15.1-15.3
   */
  useEffect(() => {
    initializeCamera();

    // Handle orientation changes
    const handleOrientationChange = () => {
      // Re-initialize camera stream to adapt to new orientation
      if (state.stream) {
        // Small delay to allow orientation change to complete
        setTimeout(() => {
          if (videoRef.current && state.stream) {
            // Ensure video element adapts to new orientation
            videoRef.current.play().catch((err) => {
              console.warn(
                "Failed to resume video after orientation change:",
                err,
              );
            });
          }
        }, 300);
      }
    };

    // Handle keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter or Space to capture
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        captureImage();
      }
      // Escape to finish capturing
      else if (e.key === "Escape") {
        e.preventDefault();
        onDone();
      }
      // F key to toggle flash
      else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFlash();
      }
    };

    // Listen for orientation changes
    window.addEventListener("orientationchange", handleOrientationChange);
    window.addEventListener("resize", handleOrientationChange);
    // Listen for keyboard shortcuts
    window.addEventListener("keydown", handleKeyDown);

    // Cleanup on unmount
    return () => {
      releaseCamera();
      window.removeEventListener("orientationchange", handleOrientationChange);
      window.removeEventListener("resize", handleOrientationChange);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  /**
   * Initialize camera with MediaDevices API
   * Requests environment-facing camera with high resolution
   */
  const initializeCamera = async () => {
    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setState((prev) => ({
          ...prev,
          error: "Camera access is not supported on this device or browser.",
        }));
        return;
      }

      // Request camera access with environment-facing mode (rear camera)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" }, // Prefer rear camera
          width: { ideal: 1920 }, // High resolution
          height: { ideal: 1080 },
        },
        audio: false,
      });

      // Set video stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setState((prev) => ({
        ...prev,
        stream,
        error: null,
      }));
    } catch (error: any) {
      // Handle specific camera errors
      let errorMessage = "Failed to access camera. Please try again.";
      let errorTitle = "Camera Error";

      if (error.name === "NotAllowedError") {
        // User denied camera permission
        errorTitle = "Camera Access Denied";
        errorMessage =
          "Please enable camera permissions in your browser settings and reload the page.";
      } else if (error.name === "NotFoundError") {
        // No camera found
        errorTitle = "No Camera Found";
        errorMessage = "Please ensure your device has a camera.";
      } else if (error.name === "NotReadableError") {
        // Camera in use by another application
        errorTitle = "Camera In Use";
        errorMessage =
          "Please close other apps using the camera and try again.";
      } else if (error.name === "OverconstrainedError") {
        // Constraints not satisfied
        errorTitle = "Camera Not Supported";
        errorMessage =
          "Camera does not support the required settings. Please try a different device.";
      }

      // Show error toast
      toast.error(errorTitle, {
        message: errorMessage,
        section: "leads",
      });

      setState((prev) => ({
        ...prev,
        error: errorMessage,
      }));

      console.error("Camera initialization error:", error);
    }
  };

  /**
   * Release camera stream and resources
   * Requirements: Memory management
   */
  const releaseCamera = () => {
    if (state.stream) {
      state.stream.getTracks().forEach((track) => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  /**
   * Toggle camera flash
   * Requirements: 1.6
   */
  const toggleFlash = async () => {
    if (!state.stream) return;

    try {
      const track = state.stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;

      if (capabilities.torch) {
        await track.applyConstraints({
          advanced: [{ torch: !state.flashEnabled } as any],
        });

        setState((prev) => ({
          ...prev,
          flashEnabled: !prev.flashEnabled,
        }));
      }
    } catch (error) {
      console.error("Flash toggle error:", error);
    }
  };

  /**
   * Capture image from video stream
   * Requirements: 1.3, 1.4, 9.1, 9.2, 15.6
   */
  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current || state.isCapturing) return;

    // Check if max pages reached
    if (currentPageNumber > maxPages) {
      setState((prev) => ({
        ...prev,
        error: `Maximum of ${maxPages} pages reached. Please process current pages before capturing more.`,
      }));
      return;
    }

    // Check memory availability before capture
    // Requirements: 9.1, 9.2, 15.6
    if (!checkMemoryAvailable()) {
      toast.warning("Memory Low", {
        message:
          "Device memory is running low. Please process your current pages before capturing more to avoid losing your work.",
        section: "leads",
      });
      return;
    }

    setState((prev) => ({ ...prev, isCapturing: true }));

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Set canvas dimensions to video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Failed to get canvas context");
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob (JPEG, high quality)
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to create blob from canvas"));
            }
          },
          "image/jpeg",
          0.95, // High quality
        );
      });

      // Provide haptic feedback if supported
      if ("vibrate" in navigator) {
        navigator.vibrate(50);
      }

      // Call onCapture callback with blob
      onCapture(blob);

      setState((prev) => ({ ...prev, isCapturing: false }));
    } catch (error) {
      console.error("Capture error:", error);

      // Show error toast
      toast.error("Capture failed", {
        message: "Failed to capture image. Please try again.",
        section: "leads",
      });

      setState((prev) => ({
        ...prev,
        isCapturing: false,
      }));
    }
  };

  // Render error state
  if (state.error) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black flex items-center justify-center p-6"
        role="dialog"
        aria-labelledby="camera-error-title"
        aria-describedby="camera-error-description"
      >
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center justify-between mb-4">
            <h2
              id="camera-error-title"
              className="text-xl font-semibold text-gray-900"
            >
              Camera Error
            </h2>
            <button
              onClick={onDone}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close camera error dialog"
            >
              <X className="w-6 h-6" aria-hidden="true" />
            </button>
          </div>

          <div className="mb-6" role="alert" aria-live="assertive">
            <p id="camera-error-description" className="text-gray-700">
              {state.error}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setState((prev) => ({ ...prev, error: null }));
                initializeCamera();
              }}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors min-h-[44px]"
              aria-label="Retry camera initialization"
            >
              Retry
            </button>
            <button
              onClick={onDone}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors min-h-[44px]"
              aria-label="Cancel and close scanner"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Video stream */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        autoPlay
        muted
        aria-label="Camera viewfinder for document scanning"
      />

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      {/* Top bar with gradient overlay */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4 z-10">
        <div className="flex items-center justify-between">
          {/* Page counter */}
          <div
            className="text-white font-medium"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {retakeMode && retakePageNumbers.length > 0 ? (
              <span>
                Retaking Page {retakePageNumbers[0]} of{" "}
                {retakePageNumbers.length}
              </span>
            ) : (
              <span>
                Page {currentPageNumber} of {maxPages}
              </span>
            )}
            {/* Keyboard shortcuts hint */}
            <span className="hidden md:block text-xs text-white/70 mt-1">
              Press Enter to capture • Esc to finish • F for flash
            </span>
          </div>

          {/* Flash toggle */}
          <button
            onClick={toggleFlash}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={
              state.flashEnabled
                ? "Disable camera flash"
                : "Enable camera flash"
            }
            aria-pressed={state.flashEnabled}
          >
            {state.flashEnabled ? (
              <Zap className="w-6 h-6 text-yellow-400" aria-hidden="true" />
            ) : (
              <ZapOff className="w-6 h-6 text-white" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Bottom bar with gradient overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6 z-10">
        <div className="flex items-center justify-between">
          {/* Done button */}
          <button
            onClick={onDone}
            className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors font-medium min-h-[44px]"
            aria-label="Finish capturing pages and proceed to review"
          >
            Done Capturing
          </button>

          {/* Capture button */}
          <button
            onClick={captureImage}
            disabled={state.isCapturing}
            className="w-20 h-20 rounded-full bg-white border-4 border-emerald-500 hover:bg-emerald-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center touch-manipulation"
            aria-label={`Capture page ${currentPageNumber}`}
            aria-disabled={state.isCapturing}
          >
            <Camera className="w-10 h-10 text-emerald-600" aria-hidden="true" />
          </button>

          {/* Spacer for layout balance */}
          <div className="w-32" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
