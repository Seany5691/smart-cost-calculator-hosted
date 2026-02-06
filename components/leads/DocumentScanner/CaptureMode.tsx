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
  lockedCorners: {
    topLeft: { x: number; y: number };
    topRight: { x: number; y: number };
    bottomRight: { x: number; y: number };
    bottomLeft: { x: number; y: number };
  } | null;
  isDocumentDetected: boolean;
  isLocked: boolean;
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
  const stableFramesRef = useRef<number>(0);
  const tipTimeoutRef = useRef<number | null>(null);
  const { toast } = useToast();

  const [state, setState] = useState<CameraModeState>({
    stream: null,
    error: null,
    flashEnabled: false,
    isCapturing: false,
    detectedCorners: null,
    lockedCorners: null,
    isDocumentDetected: false,
    isLocked: false,
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
   * Start real-time edge detection at 10 FPS (Phase 2 improvement)
   */
  const startEdgeDetection = () => {
    if (!videoRef.current || !overlayCanvasRef.current) return;

    const video = videoRef.current;
    const overlayCanvas = overlayCanvasRef.current;

    // Set overlay canvas size to match video
    overlayCanvas.width = video.videoWidth;
    overlayCanvas.height = video.videoHeight;

    // Run edge detection every 100ms (10 FPS - Phase 2 improvement)
    detectionIntervalRef.current = window.setInterval(() => {
      detectEdgesInFrame();
    }, 100);
  };

  /**
   * Detect edges in current video frame using COLOR SEGMENTATION with LOCKING
   * Once corners are found and validated, they lock until document is removed
   */
  const detectEdgesInFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !overlayCanvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;

    // Downsample for real-time detection (fast)
    const scale = 0.5; // Process at half resolution for speed
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;

    const ctx = canvas.getContext("2d");
    const overlayCtx = overlayCanvas.getContext("2d");
    if (!ctx || !overlayCtx) return;

    // Draw current frame to canvas (downsampled)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // If we have locked corners, validate they're still good
    if (state.isLocked && state.lockedCorners) {
      const isStillValid = await validateLockedCorners(imageData, state.lockedCorners, scale);
      
      if (isStillValid) {
        // Corners still valid, keep them locked
        drawEdgeOverlay(overlayCtx, state.lockedCorners, overlayCanvas.width, overlayCanvas.height, true);
        return;
      } else {
        // Corners no longer valid, unlock and search again
        console.log("[Corner Lock] Document removed or invalid, unlocking...");
        setState((prev) => ({
          ...prev,
          isLocked: false,
          lockedCorners: null,
          detectedCorners: null,
          isDocumentDetected: false,
        }));
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        stableFramesRef.current = 0;
        return;
      }
    }

    // Not locked, search for new corners
    try {
      const { detectDocumentByColor } = await import("@/lib/documentScanner/colorSegmentation");
      const edges = detectDocumentByColor(imageData);

      if (edges) {
        // Scale corners back to full resolution
        const scaledEdges = {
          topLeft: { x: edges.topLeft.x / scale, y: edges.topLeft.y / scale },
          topRight: { x: edges.topRight.x / scale, y: edges.topRight.y / scale },
          bottomRight: { x: edges.bottomRight.x / scale, y: edges.bottomRight.y / scale },
          bottomLeft: { x: edges.bottomLeft.x / scale, y: edges.bottomLeft.y / scale },
        };

        // Validate background around corners
        const isValidBackground = await validateBackgroundAroundCorners(imageData, edges, scale);

        if (isValidBackground) {
          // Valid document with contrasting background - LOCK IT!
          console.log("[Corner Lock] Valid document detected, LOCKING corners!");
          setState((prev) => ({
            ...prev,
            detectedCorners: scaledEdges,
            lockedCorners: scaledEdges,
            isDocumentDetected: true,
            isLocked: true,
          }));

          // Draw overlay showing LOCKED crop area (green quadrilateral)
          drawEdgeOverlay(overlayCtx, scaledEdges, overlayCanvas.width, overlayCanvas.height, true);

          stableFramesRef.current++;
        } else {
          // Document detected but background not contrasting enough, keep searching
          console.log("[Corner Lock] Document detected but background not valid, continuing search...");
          setState((prev) => ({
            ...prev,
            detectedCorners: scaledEdges,
            isDocumentDetected: true,
            isLocked: false,
          }));

          // Draw overlay but not locked (yellow/amber color)
          drawEdgeOverlay(overlayCtx, scaledEdges, overlayCanvas.width, overlayCanvas.height, false);
          
          stableFramesRef.current = 0;
        }
      } else {
        // No document detected
        setState((prev) => ({
          ...prev,
          detectedCorners: null,
          isDocumentDetected: false,
          isLocked: false,
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
   * Validate that locked corners are still valid
   * Checks if document is still present at locked position
   * STRICT: Only unlocks if document is completely removed
   */
  const validateLockedCorners = async (
    imageData: ImageData,
    lockedCorners: {
      topLeft: { x: number; y: number };
      topRight: { x: number; y: number };
      bottomRight: { x: number; y: number };
      bottomLeft: { x: number; y: number };
    },
    scale: number
  ): Promise<boolean> => {
    const { width, height, data } = imageData;
    
    // Scale corners to match imageData resolution
    const scaledCorners = {
      topLeft: { x: lockedCorners.topLeft.x * scale, y: lockedCorners.topLeft.y * scale },
      topRight: { x: lockedCorners.topRight.x * scale, y: lockedCorners.topRight.y * scale },
      bottomRight: { x: lockedCorners.bottomRight.x * scale, y: lockedCorners.bottomRight.y * scale },
      bottomLeft: { x: lockedCorners.bottomLeft.x * scale, y: lockedCorners.bottomLeft.y * scale },
    };

    // Check if document center is still white/light (document still present)
    const centerX = (scaledCorners.topLeft.x + scaledCorners.topRight.x + scaledCorners.bottomLeft.x + scaledCorners.bottomRight.x) / 4;
    const centerY = (scaledCorners.topLeft.y + scaledCorners.topRight.y + scaledCorners.bottomLeft.y + scaledCorners.bottomRight.y) / 4;
    
    // Sample center brightness
    const sampleSize = 20;
    let centerBrightness = 0;
    let centerCount = 0;
    
    for (let dy = -sampleSize; dy <= sampleSize; dy++) {
      for (let dx = -sampleSize; dx <= sampleSize; dx++) {
        const px = Math.floor(centerX + dx);
        const py = Math.floor(centerY + dy);
        
        if (px >= 0 && px < width && py >= 0 && py < height) {
          const idx = (py * width + px) * 4;
          const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          centerBrightness += brightness;
          centerCount++;
        }
      }
    }
    
    const avgCenterBrightness = centerCount > 0 ? centerBrightness / centerCount : 0;
    
    // If center is dark (< 100), document is gone - unlock
    if (avgCenterBrightness < 100) {
      console.log(`[Lock Validation] Document removed - center brightness: ${avgCenterBrightness.toFixed(0)}`);
      return false;
    }
    
    // Document still present, stay locked!
    return true;
  };


  /**
   * Validate that background around corners contrasts with document
   * Returns true if background is different color from document (good for detection)
   */
  /**
   * Validate that background around corners contrasts with document
   * Checks INSIDE edge (should be white) and OUTSIDE edge (should be dark)
   * Returns true if all 4 corners have good inside/outside contrast
   */
  const validateBackgroundAroundCorners = async (
    imageData: ImageData,
    corners: {
      topLeft: { x: number; y: number };
      topRight: { x: number; y: number };
      bottomRight: { x: number; y: number };
      bottomLeft: { x: number; y: number };
    },
    scale: number
  ): Promise<boolean> => {
    const { width, height, data } = imageData;
    
    // Sample size for checking (in scaled pixels)
    const sampleSize = 15;
    const edgeOffset = 10; // Distance from corner to sample inside/outside
    
    // Helper to get average brightness in a region
    const getAverageBrightness = (x: number, y: number, size: number): number => {
      let total = 0;
      let count = 0;
      
      for (let dy = -size; dy <= size; dy++) {
        for (let dx = -size; dx <= size; dx++) {
          const px = Math.floor(x + dx);
          const py = Math.floor(y + dy);
          
          if (px >= 0 && px < width && py >= 0 && py < height) {
            const idx = (py * width + px) * 4;
            const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            total += brightness;
            count++;
          }
        }
      }
      
      return count > 0 ? total / count : 0;
    };
    
    // Check each corner: inside should be white, outside should be dark
    const cornerChecks = [
      {
        name: 'topLeft',
        corner: corners.topLeft,
        insideX: corners.topLeft.x + edgeOffset,
        insideY: corners.topLeft.y + edgeOffset,
        outsideX: corners.topLeft.x - edgeOffset,
        outsideY: corners.topLeft.y - edgeOffset,
      },
      {
        name: 'topRight',
        corner: corners.topRight,
        insideX: corners.topRight.x - edgeOffset,
        insideY: corners.topRight.y + edgeOffset,
        outsideX: corners.topRight.x + edgeOffset,
        outsideY: corners.topRight.y - edgeOffset,
      },
      {
        name: 'bottomLeft',
        corner: corners.bottomLeft,
        insideX: corners.bottomLeft.x + edgeOffset,
        insideY: corners.bottomLeft.y - edgeOffset,
        outsideX: corners.bottomLeft.x - edgeOffset,
        outsideY: corners.bottomLeft.y + edgeOffset,
      },
      {
        name: 'bottomRight',
        corner: corners.bottomRight,
        insideX: corners.bottomRight.x - edgeOffset,
        insideY: corners.bottomRight.y - edgeOffset,
        outsideX: corners.bottomRight.x + edgeOffset,
        outsideY: corners.bottomRight.y + edgeOffset,
      },
    ];
    
    let validCorners = 0;
    
    for (const check of cornerChecks) {
      // Skip if outside image bounds
      if (
        check.insideX < 0 || check.insideX >= width ||
        check.insideY < 0 || check.insideY >= height ||
        check.outsideX < 0 || check.outsideX >= width ||
        check.outsideY < 0 || check.outsideY >= height
      ) {
        continue;
      }
      
      const insideBrightness = getAverageBrightness(check.insideX, check.insideY, sampleSize);
      const outsideBrightness = getAverageBrightness(check.outsideX, check.outsideY, sampleSize);
      
      // Inside should be bright (white document), outside should be dark (background)
      const insideIsWhite = insideBrightness > 150; // White threshold
      const outsideIsDark = outsideBrightness < 100; // Dark threshold
      const contrast = insideBrightness - outsideBrightness;
      
      if (insideIsWhite && outsideIsDark && contrast > 80) {
        validCorners++;
        console.log(`[Corner Validation] ${check.name}: ✓ inside=${insideBrightness.toFixed(0)}, outside=${outsideBrightness.toFixed(0)}, contrast=${contrast.toFixed(0)}`);
      } else {
        console.log(`[Corner Validation] ${check.name}: ✗ inside=${insideBrightness.toFixed(0)}, outside=${outsideBrightness.toFixed(0)}, contrast=${contrast.toFixed(0)}`);
      }
    }
    
    // Need ALL 4 corners to be valid for locking
    const isValid = validCorners === 4;
    
    if (!isValid) {
      console.log(`[Background Validation] Only ${validCorners}/4 corners valid - need all 4 to lock`);
    } else {
      console.log(`[Background Validation] ✓ All 4 corners valid - LOCKING!`);
    }
    
    return isValid;
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
   * Capture image from video stream WITH LOCKED corners - CROP IMMEDIATELY
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

      // Draw full frame first
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Use LOCKED corners if available (preferred), otherwise use detected corners
      const cornersToUse = state.lockedCorners || state.detectedCorners;

      // If we have corners, crop to that area IMMEDIATELY
      if (cornersToUse) {
        console.log(`[Capture] Cropping to ${state.lockedCorners ? 'LOCKED' : 'detected'} area immediately`);
        
        const corners = cornersToUse;
        
        // Calculate bounding box
        const minX = Math.min(corners.topLeft.x, corners.topRight.x, corners.bottomLeft.x, corners.bottomRight.x);
        const maxX = Math.max(corners.topLeft.x, corners.topRight.x, corners.bottomLeft.x, corners.bottomRight.x);
        const minY = Math.min(corners.topLeft.y, corners.topRight.y, corners.bottomLeft.y, corners.bottomRight.y);
        const maxY = Math.max(corners.topLeft.y, corners.topRight.y, corners.bottomLeft.y, corners.bottomRight.y);
        
        const cropWidth = maxX - minX;
        const cropHeight = maxY - minY;
        
        // Create new canvas for cropped image
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = cropWidth;
        croppedCanvas.height = cropHeight;
        const croppedCtx = croppedCanvas.getContext('2d')!;
        
        // Draw cropped area
        croppedCtx.drawImage(
          canvas,
          minX, minY, cropWidth, cropHeight,
          0, 0, cropWidth, cropHeight
        );
        
        // Use cropped canvas for blob
        const blob = await new Promise<Blob>((resolve, reject) => {
          croppedCanvas.toBlob(
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

        // Pass blob AND corners to capture handler
        onCapture(blob, cornersToUse);

        // After capture, unlock corners so user can capture next document
        setState((prev) => ({ 
          ...prev, 
          isCapturing: false,
          isLocked: false,
          lockedCorners: null,
          detectedCorners: null,
          isDocumentDetected: false,
        }));
      } else {
        // No corners detected, capture full frame
        console.log("[Capture] No corners detected, capturing full frame");
        
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

        onCapture(blob, null);

        setState((prev) => ({ ...prev, isCapturing: false }));
      }
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
            
            {/* Enhanced Visual Feedback with Lock Status */}
            {state.isLocked ? (
              <div className="flex items-center gap-2 mt-2 text-emerald-400">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-semibold">🔒 LOCKED - Ready to capture!</span>
              </div>
            ) : state.isDocumentDetected ? (
              <div className="flex items-center gap-2 mt-2 text-amber-400 animate-pulse">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-semibold">Searching for valid background...</span>
              </div>
            ) : (
              <div className="mt-2 text-sm text-amber-400">
                <span>📄 Position document in frame</span>
              </div>
            )}
            
            {/* Smart Guidance Hints - Tip disappears after 3 seconds */}
            <div className="mt-2 space-y-1">
              {state.showTip && !state.isDocumentDetected && (
                <div className="text-xs text-white/80 bg-black/40 px-3 py-2 rounded-lg backdrop-blur-sm transition-opacity duration-500">
                  💡 Tip: Place documents on a dark background for better edge detection
                </div>
              )}
              {state.isLocked && (
                <div className="text-xs text-emerald-300 bg-emerald-900/40 px-3 py-2 rounded-lg backdrop-blur-sm">
                  ✓ Corners locked! Press capture or move camera away to unlock
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

          {/* Capture button - Different colors for locked/unlocked/no detection */}
          <button
            onClick={captureImage}
            disabled={state.isCapturing}
            className={`w-20 h-20 rounded-full border-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center touch-manipulation ${
              state.isLocked
                ? "bg-emerald-500 border-emerald-400 hover:bg-emerald-600 shadow-lg shadow-emerald-500/50"
                : state.isDocumentDetected
                ? "bg-amber-500 border-amber-400 hover:bg-amber-600"
                : "bg-white border-emerald-500 hover:bg-emerald-50"
            }`}
            aria-label={`Capture page ${currentPageNumber}`}
            aria-disabled={state.isCapturing}
          >
            <Camera
              className={`w-10 h-10 ${state.isLocked || state.isDocumentDetected ? "text-white" : "text-emerald-600"}`}
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
