"use client";

import React, { useEffect, useRef, useState } from "react";
import { Camera, X, Zap, ZapOff } from "lucide-react";
import { CaptureModeProps } from "@/lib/documentScanner/types";
import { checkMemoryAvailable } from "@/lib/documentScanner/memoryManager";
import { useToast } from "@/components/ui/Toast/useToast";

/**
 * CaptureMode Component with Fixed Frame Overlay
 *
 * Simple camera interface with a fixed rectangular frame.
 * User positions document to fit inside the frame.
 * Frame turns green when document detected, orange when not.
 * All edge detection and cropping happens during processing.
 *
 * Requirements:
 * - 1.1: Request camera access with environment-facing mode
 * - 1.2: Display live video stream in full-screen mode
 * - 1.3: Capture high-resolution images
 * - 1.4: Save images and increment page counter
 * - 1.6: Toggle camera flash
 * - 1.7: Handle camera errors with appropriate messages
 * - Fixed frame overlay (green when document present, orange when not)
 */

interface CameraModeState {
  stream: MediaStream | null;
  error: string | null;
  flashEnabled: boolean;
  isCapturing: boolean;
  documentPresent: boolean; // Simple: is there a document in the frame?
  showTip: boolean;
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
  const tipTimeoutRef = useRef<number | null>(null);
  const { toast } = useToast();

  const [state, setState] = useState<CameraModeState>({
    stream: null,
    error: null,
    flashEnabled: false,
    isCapturing: false,
    documentPresent: false,
    showTip: true, // Show tip initially
  });

  /**
   * Initialize camera on component mount
   */
  useEffect(() => {
    initializeCamera();

    // Hide tip after 3 seconds
    tipTimeoutRef.current = window.setTimeout(() => {
      setState((prev) => ({ ...prev, showTip: false }));
    }, 3000);

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
      if (tipTimeoutRef.current) {
        clearTimeout(tipTimeoutRef.current);
      }
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  /**
   * Start document detection when video is ready
   */
  useEffect(() => {
    if (videoRef.current && state.stream) {
      // Wait for video to be ready
      const video = videoRef.current;
      if (video.readyState >= 2) {
        startDocumentDetection();
      } else {
        video.addEventListener("loadeddata", startDocumentDetection, { once: true });
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
   * Start simple document detection at 5 FPS
   * Just checks if there's a white document in the center frame area
   */
  const startDocumentDetection = () => {
    if (!videoRef.current || !overlayCanvasRef.current) return;

    const video = videoRef.current;
    const overlayCanvas = overlayCanvasRef.current;

    // Set overlay canvas size to match video
    overlayCanvas.width = video.videoWidth;
    overlayCanvas.height = video.videoHeight;

    // Draw fixed frame immediately
    drawFixedFrame(overlayCanvas.getContext("2d")!, overlayCanvas.width, overlayCanvas.height, false);

    // Run simple detection every 200ms (5 FPS - less frequent, saves battery)
    detectionIntervalRef.current = window.setInterval(() => {
      checkDocumentPresence();
    }, 200);
  };

  /**
   * Simple check: Is there a white document in the frame area?
   * No corner tracking - just brightness check in center region
   */
  const checkDocumentPresence = async () => {
    if (!videoRef.current || !canvasRef.current || !overlayCanvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;

    // Downsample for speed
    const scale = 0.25; // Quarter resolution is enough for presence check
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;

    const ctx = canvas.getContext("2d");
    const overlayCtx = overlayCanvas.getContext("2d");
    if (!ctx || !overlayCtx) return;

    // Draw current frame to canvas (downsampled)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { width, height, data } = imageData;

    // Define frame area (center 70% of screen, A4 proportions)
    const frameWidth = width * 0.7;
    const frameHeight = frameWidth * 1.414; // A4 ratio (1:1.414)
    const frameX = (width - frameWidth) / 2;
    const frameY = (height - frameHeight) / 2;

    // Sample brightness in frame area
    let totalBrightness = 0;
    let sampleCount = 0;
    const sampleStep = 10; // Sample every 10 pixels for speed

    for (let y = frameY; y < frameY + frameHeight; y += sampleStep) {
      for (let x = frameX; x < frameX + frameWidth; x += sampleStep) {
        const px = Math.floor(x);
        const py = Math.floor(y);
        
        if (px >= 0 && px < width && py >= 0 && py < height) {
          const idx = (py * width + px) * 4;
          const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          totalBrightness += brightness;
          sampleCount++;
        }
      }
    }

    const avgBrightness = sampleCount > 0 ? totalBrightness / sampleCount : 0;

    // Simple rule: If average brightness > 150, there's likely a white document
    const documentPresent = avgBrightness > 150;

    // Update state if changed
    if (documentPresent !== state.documentPresent) {
      setState((prev) => ({
        ...prev,
        documentPresent,
      }));
    }

    // Draw fixed frame with appropriate color
    drawFixedFrame(overlayCtx, overlayCanvas.width, overlayCanvas.height, documentPresent);
  };

  /**
   * Draw fixed rectangular frame overlay
   * Green when document present, orange when not
   */
  const drawFixedFrame = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    documentPresent: boolean
  ) => {
    // Clear previous overlay
    ctx.clearRect(0, 0, width, height);

    // Define frame dimensions (center 70% of screen, A4 proportions)
    const frameWidth = width * 0.7;
    const frameHeight = frameWidth * 1.414; // A4 ratio
    const frameX = (width - frameWidth) / 2;
    const frameY = (height - frameHeight) / 2;

    // Draw semi-transparent overlay outside frame
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, width, height);

    // Cut out the frame area
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillRect(frameX, frameY, frameWidth, frameHeight);
    ctx.globalCompositeOperation = "source-over";

    // Draw frame border - GREEN if document present, ORANGE if not
    const borderColor = documentPresent ? "#10b981" : "#f59e0b"; // Emerald green or amber
    const borderWidth = documentPresent ? 6 : 4; // Thicker when document present

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(frameX, frameY, frameWidth, frameHeight);

    // Draw corner markers for better visibility
    const cornerSize = 30;
    const corners = [
      { x: frameX, y: frameY }, // Top-left
      { x: frameX + frameWidth, y: frameY }, // Top-right
      { x: frameX + frameWidth, y: frameY + frameHeight }, // Bottom-right
      { x: frameX, y: frameY + frameHeight }, // Bottom-left
    ];

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;

    corners.forEach((corner, index) => {
      // Draw L-shaped corner markers
      ctx.beginPath();
      
      if (index === 0) { // Top-left
        ctx.moveTo(corner.x, corner.y + cornerSize);
        ctx.lineTo(corner.x, corner.y);
        ctx.lineTo(corner.x + cornerSize, corner.y);
      } else if (index === 1) { // Top-right
        ctx.moveTo(corner.x - cornerSize, corner.y);
        ctx.lineTo(corner.x, corner.y);
        ctx.lineTo(corner.x, corner.y + cornerSize);
      } else if (index === 2) { // Bottom-right
        ctx.moveTo(corner.x, corner.y - cornerSize);
        ctx.lineTo(corner.x, corner.y);
        ctx.lineTo(corner.x - cornerSize, corner.y);
      } else { // Bottom-left
        ctx.moveTo(corner.x + cornerSize, corner.y);
        ctx.lineTo(corner.x, corner.y);
        ctx.lineTo(corner.x, corner.y - cornerSize);
      }
      
      ctx.stroke();
    });
  };

  /**
   * Draw edge detection overlay on canvas
   * Shows green for locked corners, amber for unlocked
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
    isLocked: boolean = false,
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

    // Draw border around document - GREEN if locked, AMBER if searching
    ctx.strokeStyle = isLocked ? "#10b981" : "#f59e0b"; // Emerald green or amber
    ctx.lineWidth = isLocked ? 6 : 4; // Thicker when locked
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
      ctx.fillStyle = isLocked ? "#10b981" : "#f59e0b";
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, isLocked ? 14 : 12, 0, 2 * Math.PI);
      ctx.fill();

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, isLocked ? 14 : 12, 0, 2 * Math.PI);
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
   * Capture image from video stream - INSTANT CAPTURE
   * 
   * Captures the full frame - no cropping here.
   * All edge detection and cropping happens during processing.
   */
  const captureImage = () => {
    // Only check if already capturing
    if (state.isCapturing) {
      console.log("[Capture] Already capturing, ignoring duplicate click");
      return;
    }

    if (!videoRef.current || !canvasRef.current) {
      console.error("[Capture] Video or canvas ref not available");
      toast.error("Camera not ready", {
        message: "Please wait for camera to initialize.",
        section: "leads",
      });
      return;
    }

    if (currentPageNumber > maxPages) {
      toast.warning("Maximum pages reached", {
        message: `Maximum of ${maxPages} pages reached.`,
        section: "leads",
      });
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

    // Set capturing state IMMEDIATELY
    setState((prev) => ({ ...prev, isCapturing: true }));
    console.log("[Capture] 📸 CAPTURE BUTTON PRESSED - INSTANT CAPTURE");

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Ensure video is ready
      if (video.readyState < 2) {
        throw new Error("Video not ready");
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d", { willReadFrequently: false });
      if (!ctx) {
        throw new Error("Failed to get canvas context");
      }

      // Draw full frame - NO CROPPING in capture mode
      console.log("[Capture] Drawing full video frame to canvas");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // INSTANT CAPTURE: Use toDataURL() for immediate response (synchronous)
      console.log("[Capture] Converting to data URL (INSTANT)");
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      console.log("[Capture] ✓ Data URL created instantly");

      // Haptic feedback
      if ("vibrate" in navigator) {
        navigator.vibrate(50);
      }

      // Convert to blob in background (async, doesn't block)
      console.log("[Capture] Converting to blob in background...");
      const convertToBlob = async () => {
        try {
          // Convert data URL to blob
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          console.log("[Capture] ✓ Blob created:", blob.size, "bytes");
          
          // Call capture handler with blob (no corners - processing will detect them)
          onCapture(blob, null);
        } catch (error) {
          console.error("[Capture] Blob conversion failed:", error);
          toast.error("Capture failed", {
            message: "Failed to save image. Please try again.",
            section: "leads",
          });
        }
      };

      // Start background conversion (don't await)
      convertToBlob();

      // Reset capturing state immediately
      setState((prev) => ({
        ...prev,
        isCapturing: false,
      }));

      console.log("[Capture] ✓ CAPTURE COMPLETE (instant response)");

    } catch (error) {
      console.error("[Capture] ✗ Capture failed:", error);

      toast.error("Capture failed", {
        message: error instanceof Error ? error.message : "Failed to capture image. Please try again.",
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
            
            {/* Simple Visual Feedback */}
            {state.documentPresent ? (
              <div className="flex items-center gap-2 mt-2 text-emerald-400">
                <span className="text-sm font-semibold">✓ Document detected - Ready to capture!</span>
              </div>
            ) : (
              <div className="mt-2 text-sm text-amber-400">
                <span>📄 Position document in the green frame</span>
              </div>
            )}
            
            {/* Smart Guidance Hints - Tip disappears after 3 seconds */}
            <div className="mt-2 space-y-1">
              {state.showTip && !state.documentPresent && (
                <div className="text-xs text-white/80 bg-black/40 px-3 py-2 rounded-lg backdrop-blur-sm transition-opacity duration-500">
                  💡 Tip: Position document to fit inside the frame - processing will perfect it
                </div>
              )}
              {state.documentPresent && (
                <div className="text-xs text-emerald-300 bg-emerald-900/40 px-3 py-2 rounded-lg backdrop-blur-sm">
                  ✓ Document detected! Press capture when ready
                </div>
              )}
            </div>
            
            {/* Keyboard shortcuts hint */}
            <span className="hidden md:block text-xs text-white/70 mt-2">
              ⌨️ Space/Enter to capture • Esc to finish • F for flash
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

          {/* Capture button - Green when document present, white when not */}
          <button
            onClick={captureImage}
            disabled={state.isCapturing}
            className={`w-20 h-20 rounded-full border-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center touch-manipulation ${
              state.documentPresent
                ? "bg-emerald-500 border-emerald-400 hover:bg-emerald-600 shadow-lg shadow-emerald-500/50"
                : "bg-white border-gray-400 hover:bg-gray-50"
            }`}
            aria-label={`Capture page ${currentPageNumber}`}
            aria-disabled={state.isCapturing}
          >
            <Camera
              className={`w-10 h-10 ${state.documentPresent ? "text-white" : "text-gray-600"}`}
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
