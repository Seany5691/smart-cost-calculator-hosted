"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Camera, X, Zap, ZapOff, CheckCircle } from "lucide-react";
import { CaptureModeProps } from "@/lib/documentScanner/types";
import { checkMemoryAvailable } from "@/lib/documentScanner/memoryManager";
import { useToast } from "@/components/ui/Toast/useToast";

/**
 * CaptureMode Component with Real-Time Edge Detection
 *
 * Camera interface for capturing document pages with live edge detection overlay.
 * Shows detected corners in real-time and can auto-capture when document is stable.
 *
 * Requirements:
 * - 1.1: Request camera access with environment-facing mode
 * - 1.2: Display live video stream in full-screen mode
 * - 1.3: Capture high-resolution images
 * - 1.4: Save images and increment page counter
 * - 1.6: Toggle camera flash
 * - 1.7: Handle camera errors with appropriate messages
 * - Real-time edge detection with visual overlay
 * - Auto-capture when document is detected and stable
 */

interface CameraModeState {
  stream: MediaStream | null;
  error: string | null;
  flashEnabled: boolean;
  isCapturing: boolean;
  detectedCorners: {
    topLeft: { x: number; y: number };
    topRight: { x: number; y: number };
    bottomRight: { x: number; y: number };
    bottomLeft: { x: number; y: number };
  } | null;
  isDocumentDetected: boolean;
}

export default function CaptureMode({
  onCapture,
  onDone,
  currentPageNumber,
  maxPages,
  retakeMode = false,
  retakePageNumbers = [],
  onCameraReady,
}: CaptureModeProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const detectionIntervalRef = useRef<number | null>(null);
  const stableFramesRef = useRef<number>(0);
  const { toast } = useToast();

  const [state, setState] = useState<CameraModeState>({
    stream: null,
    error: null,
    flashEnabled: false,
    isCapturing: false,
    detectedCorners: null,
    isDocumentDetected: false,
  });

  /**
   * Initialize camera on component mount
   */
  useEffect(() => {
    initializeCamera();

    // Handle keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        captureImage();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onDone();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFlash();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // Cleanup on unmount
    return () => {
      releaseCamera();
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  /**
   * Start edge detection when video is ready
   */
  useEffect(() => {
    if (videoRef.current && state.stream) {
      // Wait for video to be ready
      const video = videoRef.current;
      if (video.readyState >= 2) {
        startEdgeDetection();
      } else {
        video.addEventListener("loadeddata", startEdgeDetection, { once: true });
      }
    }

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [state.stream]);

  /**
   * Initialize camera with MediaDevices API
   */
  const initializeCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setState((prev) => ({
          ...prev,
          error: "Camera access is not supported on this device or browser.",
        }));
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setState((prev) => ({
        ...prev,
        stream,
        error: null,
      }));

      // Provide cleanup function to parent
      if (onCameraReady) {
        onCameraReady(releaseCamera);
      }
    } catch (error: any) {
      let errorMessage = "Failed to access camera. Please try again.";
      let errorTitle = "Camera Error";

      if (error.name === "NotAllowedError") {
        errorTitle = "Camera Access Denied";
        errorMessage =
          "Please enable camera permissions in your browser settings and reload the page.";
      } else if (error.name === "NotFoundError") {
        errorTitle = "No Camera Found";
        errorMessage = "Please ensure your device has a camera.";
      } else if (error.name === "NotReadableError") {
        errorTitle = "Camera In Use";
        errorMessage =
          "Please close other apps using the camera and try again.";
      }

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
   */
  const releaseCamera = () => {
    if (state.stream) {
      state.stream.getTracks().forEach((track) => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
  };

  /**
   * Start real-time edge detection
   */
  const startEdgeDetection = () => {
    if (!videoRef.current || !overlayCanvasRef.current) return;

    const video = videoRef.current;
    const overlayCanvas = overlayCanvasRef.current;

    // Set overlay canvas size to match video
    overlayCanvas.width = video.videoWidth;
    overlayCanvas.height = video.videoHeight;

    // Run edge detection every 500ms (2 FPS for performance)
    detectionIntervalRef.current = window.setInterval(() => {
      detectEdgesInFrame();
    }, 500);
  };

  /**
   * Detect edges in current video frame
   */
  const detectEdgesInFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !overlayCanvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    const overlayCtx = overlayCanvas.getContext("2d");
    if (!ctx || !overlayCtx) return;

    // Draw current frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Detect edges
    try {
      const { detectDocumentEdges } = await import("@/lib/documentScanner/edgeDetection");
      const edges = detectDocumentEdges(imageData);

      if (edges) {
        // Document detected!
        setState((prev) => ({
          ...prev,
          detectedCorners: edges,
          isDocumentDetected: true,
        }));

        // Draw overlay
        drawEdgeOverlay(overlayCtx, edges, canvas.width, canvas.height);

        // Reset stable frames counter (no auto-capture)
        stableFramesRef.current = 0;
      } else {
        // No document detected
        setState((prev) => ({
          ...prev,
          detectedCorners: null,
          isDocumentDetected: false,
        }));

        // Clear overlay
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        stableFramesRef.current = 0;
      }
    } catch (error) {
      console.error("[Edge Detection] Error:", error);
    }
  };

  /**
   * Draw edge detection overlay on canvas
   */
  const drawEdgeOverlay = (
    ctx: CanvasRenderingContext2D,
    edges: {
      topLeft: { x: number; y: number };
      topRight: { x: number; y: number };
      bottomRight: { x: number; y: number };
      bottomLeft: { x: number; y: number };
    },
    width: number,
    height: number,
  ) => {
    // Clear previous overlay
    ctx.clearRect(0, 0, width, height);

    // Draw semi-transparent overlay outside document
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, width, height);

    // Cut out the document area
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.moveTo(edges.topLeft.x, edges.topLeft.y);
    ctx.lineTo(edges.topRight.x, edges.topRight.y);
    ctx.lineTo(edges.bottomRight.x, edges.bottomRight.y);
    ctx.lineTo(edges.bottomLeft.x, edges.bottomLeft.y);
    ctx.closePath();
    ctx.fill();

    // Reset composite operation
    ctx.globalCompositeOperation = "source-over";

    // Draw green border around document
    ctx.strokeStyle = "#10b981"; // Emerald green
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(edges.topLeft.x, edges.topLeft.y);
    ctx.lineTo(edges.topRight.x, edges.topRight.y);
    ctx.lineTo(edges.bottomRight.x, edges.bottomRight.y);
    ctx.lineTo(edges.bottomLeft.x, edges.bottomLeft.y);
    ctx.closePath();
    ctx.stroke();

    // Draw corner circles
    const corners = [edges.topLeft, edges.topRight, edges.bottomRight, edges.bottomLeft];
    corners.forEach((corner) => {
      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, 12, 0, 2 * Math.PI);
      ctx.fill();

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, 12, 0, 2 * Math.PI);
      ctx.stroke();
    });
  };

  /**
   * Toggle camera flash
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
   */
  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current || state.isCapturing) return;

    if (currentPageNumber > maxPages) {
      setState((prev) => ({
        ...prev,
        error: `Maximum of ${maxPages} pages reached.`,
      }));
      return;
    }

    if (!checkMemoryAvailable()) {
      toast.warning("Memory Low", {
        message:
          "Device memory is running low. Please process your current pages before capturing more.",
        section: "leads",
      });
      return;
    }

    setState((prev) => ({ ...prev, isCapturing: true }));

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Failed to get canvas context");
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

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
          0.95,
        );
      });

      if ("vibrate" in navigator) {
        navigator.vibrate(50);
      }

      onCapture(blob);

      setState((prev) => ({ ...prev, isCapturing: false }));
    } catch (error) {
      console.error("Capture error:", error);

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
        className="fixed inset-0 z-[10002] bg-black flex items-center justify-center p-6"
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
    <div className="fixed inset-0 z-[10002] bg-black">
      {/* Video stream */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        autoPlay
        muted
        aria-label="Camera viewfinder for document scanning"
      />

      {/* Edge detection overlay canvas */}
      <canvas
        ref={overlayCanvasRef}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        aria-hidden="true"
      />

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      {/* Top bar with gradient overlay */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4 z-10">
        <div className="flex items-center justify-between">
          {/* Page counter and status */}
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
            {/* Document detection status */}
            {state.isDocumentDetected && (
              <div className="flex items-center gap-2 mt-2 text-emerald-400">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Document detected</span>
              </div>
            )}
            {/* Dark background tip */}
            <div className="mt-2 text-xs text-white/80 bg-black/30 px-3 py-2 rounded-lg backdrop-blur-sm">
              💡 Tip: Place documents on a dark background for better edge
              detection
            </div>
            {/* Keyboard shortcuts hint */}
            <span className="hidden md:block text-xs text-white/70 mt-1">
              Enter to capture • Esc to finish • F for flash
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
            className={`w-20 h-20 rounded-full border-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center touch-manipulation ${
              state.isDocumentDetected
                ? "bg-emerald-500 border-emerald-400 hover:bg-emerald-600"
                : "bg-white border-emerald-500 hover:bg-emerald-50"
            }`}
            aria-label={`Capture page ${currentPageNumber}`}
            aria-disabled={state.isCapturing}
          >
            <Camera
              className={`w-10 h-10 ${state.isDocumentDetected ? "text-white" : "text-emerald-600"}`}
              aria-hidden="true"
            />
          </button>

          {/* Spacer for layout balance */}
          <div className="w-32" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
