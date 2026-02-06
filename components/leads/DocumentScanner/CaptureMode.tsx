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
    topLeft: { x: number; y: number; locked: boolean } | null;
    topRight: { x: number; y: number; locked: boolean } | null;
    bottomRight: { x: number; y: number; locked: boolean } | null;
    bottomLeft: { x: number; y: number; locked: boolean } | null;
  };
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
    lockedCorners: {
      topLeft: null,
      topRight: null,
      bottomRight: null,
      bottomLeft: null,
    },
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
   * Detect edges in current video frame using COLOR SEGMENTATION with PROGRESSIVE CORNER LOCKING
   * Each corner locks independently and stays locked even with camera movement
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

    // Check if all corners are locked
    const allCornersLocked = 
      state.lockedCorners.topLeft?.locked &&
      state.lockedCorners.topRight?.locked &&
      state.lockedCorners.bottomRight?.locked &&
      state.lockedCorners.bottomLeft?.locked;

    if (allCornersLocked) {
      // All corners locked - STAY LOCKED no matter what
      // Only unlock if user manually moves camera completely away (checked less frequently)
      const finalCorners = {
        topLeft: state.lockedCorners.topLeft!,
        topRight: state.lockedCorners.topRight!,
        bottomRight: state.lockedCorners.bottomRight!,
        bottomLeft: state.lockedCorners.bottomLeft!,
      };
      
      // Draw locked overlay (green)
      drawEdgeOverlay(overlayCtx, finalCorners, overlayCanvas.width, overlayCanvas.height, true);
      
      // Check if document completely removed (very lenient check, only every 10 frames)
      if (stableFramesRef.current % 10 === 0) {
        const documentCompletelyGone = await checkDocumentCompletelyRemoved(imageData, state.lockedCorners, scale);
        
        if (documentCompletelyGone) {
          console.log("[Lock] Document completely removed from frame, unlocking");
          setState((prev) => ({
            ...prev,
            lockedCorners: {
              topLeft: null,
              topRight: null,
              bottomRight: null,
              bottomLeft: null,
            },
            isLocked: false,
            detectedCorners: null,
            isDocumentDetected: false,
          }));
          overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
          stableFramesRef.current = 0;
        }
      }
      
      stableFramesRef.current++;
      return;
    }

    // Not all corners locked yet, detect new corners
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

        // Validate and lock corners progressively
        await lockCornersProgressively(imageData, edges, scaledEdges, scale);

        // Draw overlay with current lock status
        const displayCorners = {
          topLeft: state.lockedCorners.topLeft || scaledEdges.topLeft,
          topRight: state.lockedCorners.topRight || scaledEdges.topRight,
          bottomRight: state.lockedCorners.bottomRight || scaledEdges.bottomRight,
          bottomLeft: state.lockedCorners.bottomLeft || scaledEdges.bottomLeft,
        };
        
        const allLocked = 
          state.lockedCorners.topLeft?.locked &&
          state.lockedCorners.topRight?.locked &&
          state.lockedCorners.bottomRight?.locked &&
          state.lockedCorners.bottomLeft?.locked;
        
        drawEdgeOverlay(overlayCtx, displayCorners, overlayCanvas.width, overlayCanvas.height, allLocked);
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
   * Lock corners progressively - each corner locks independently
   * Once a corner is validated, it stays locked even with camera movement
   */
  const lockCornersProgressively = async (
    imageData: ImageData,
    detectedCorners: {
      topLeft: { x: number; y: number };
      topRight: { x: number; y: number };
      bottomRight: { x: number; y: number };
      bottomLeft: { x: number; y: number };
    },
    scaledCorners: {
      topLeft: { x: number; y: number };
      topRight: { x: number; y: number };
      bottomRight: { x: number; y: number };
      bottomLeft: { x: number; y: number };
    },
    scale: number
  ) => {
    const cornerNames: Array<'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'> = 
      ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
    
    const newLockedCorners = { ...state.lockedCorners };
    let lockStatusChanged = false;

    for (const cornerName of cornerNames) {
      // Skip if already locked
      if (newLockedCorners[cornerName]?.locked) {
        continue;
      }

      // Validate this corner
      const isValid = await validateSingleCorner(
        imageData,
        detectedCorners[cornerName],
        cornerName
      );

      if (isValid) {
        // Lock this corner!
        newLockedCorners[cornerName] = {
          x: scaledCorners[cornerName].x,
          y: scaledCorners[cornerName].y,
          locked: true,
        };
        lockStatusChanged = true;
        console.log(`[Progressive Lock] ✓ ${cornerName} LOCKED at (${scaledCorners[cornerName].x.toFixed(0)}, ${scaledCorners[cornerName].y.toFixed(0)})`);
      }
    }

    // Update state if any corners changed
    if (lockStatusChanged) {
      const allLocked = 
        newLockedCorners.topLeft?.locked &&
        newLockedCorners.topRight?.locked &&
        newLockedCorners.bottomRight?.locked &&
        newLockedCorners.bottomLeft?.locked;

      setState((prev) => ({
        stream: prev.stream,
        error: prev.error,
        flashEnabled: prev.flashEnabled,
        isCapturing: prev.isCapturing,
        lockedCorners: newLockedCorners,
        detectedCorners: scaledCorners,
        isDocumentDetected: true as boolean,
        isLocked: allLocked as boolean,
        showTip: prev.showTip,
      }));

      if (allLocked) {
        console.log("[Progressive Lock] 🔒 ALL 4 CORNERS LOCKED!");
      }
    }
  };

  /**
   * Validate a single corner - check inside (white) and outside (dark)
   * Also ensures corner is within frame bounds
   */
  const validateSingleCorner = async (
    imageData: ImageData,
    corner: { x: number; y: number },
    cornerName: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'
  ): Promise<boolean> => {
    const { width, height, data } = imageData;
    const sampleSize = 10; // Smaller sample for faster validation
    const edgeOffset = 8; // Smaller offset

    // CRITICAL: Check if corner is within frame bounds (with margin)
    const margin = 20; // Corners must be at least 20px inside frame
    if (
      corner.x < margin || corner.x >= width - margin ||
      corner.y < margin || corner.y >= height - margin
    ) {
      console.log(`[Corner Validation] ${cornerName}: ✗ Out of frame bounds (${corner.x.toFixed(0)}, ${corner.y.toFixed(0)})`);
      return false;
    }

    // Helper to get average brightness
    const getAverageBrightness = (x: number, y: number, size: number): number => {
      let total = 0;
      let count = 0;
      
      for (let dy = -size; dy <= size; dy += 2) { // Sample every 2 pixels for speed
        for (let dx = -size; dx <= size; dx += 2) {
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

    // Calculate inside and outside positions based on corner
    let insideX, insideY, outsideX, outsideY;
    
    switch (cornerName) {
      case 'topLeft':
        insideX = corner.x + edgeOffset;
        insideY = corner.y + edgeOffset;
        outsideX = corner.x - edgeOffset;
        outsideY = corner.y - edgeOffset;
        break;
      case 'topRight':
        insideX = corner.x - edgeOffset;
        insideY = corner.y + edgeOffset;
        outsideX = corner.x + edgeOffset;
        outsideY = corner.y - edgeOffset;
        break;
      case 'bottomLeft':
        insideX = corner.x + edgeOffset;
        insideY = corner.y - edgeOffset;
        outsideX = corner.x - edgeOffset;
        outsideY = corner.y + edgeOffset;
        break;
      case 'bottomRight':
        insideX = corner.x - edgeOffset;
        insideY = corner.y - edgeOffset;
        outsideX = corner.x + edgeOffset;
        outsideY = corner.y + edgeOffset;
        break;
    }

    // Check bounds for sample points
    if (
      insideX < 0 || insideX >= width ||
      insideY < 0 || insideY >= height ||
      outsideX < 0 || outsideX >= width ||
      outsideY < 0 || outsideY >= height
    ) {
      return false;
    }

    const insideBrightness = getAverageBrightness(insideX, insideY, sampleSize);
    const outsideBrightness = getAverageBrightness(outsideX, outsideY, sampleSize);
    
    // More lenient thresholds for locking
    const insideIsWhite = insideBrightness > 140; // Lowered from 150
    const outsideIsDark = outsideBrightness < 110; // Raised from 100
    const contrast = insideBrightness - outsideBrightness;
    
    const isValid = insideIsWhite && outsideIsDark && contrast > 60; // Lowered from 80
    
    if (isValid) {
      console.log(`[Corner Validation] ${cornerName}: ✓ VALID - inside=${insideBrightness.toFixed(0)}, outside=${outsideBrightness.toFixed(0)}, contrast=${contrast.toFixed(0)}`);
    }
    
    return isValid;
  };

  /**
   * Check if document is COMPLETELY removed from frame
   * Very lenient - only returns true if document is totally gone
   * This prevents accidental unlocking from camera movement
   */
  const checkDocumentCompletelyRemoved = async (
    imageData: ImageData,
    lockedCorners: {
      topLeft: { x: number; y: number; locked: boolean } | null;
      topRight: { x: number; y: number; locked: boolean } | null;
      bottomRight: { x: number; y: number; locked: boolean } | null;
      bottomLeft: { x: number; y: number; locked: boolean } | null;
    },
    scale: number
  ): Promise<boolean> => {
    const { width, height, data } = imageData;
    
    // Calculate document center from locked corners (scaled down)
    const centerX = (
      (lockedCorners.topLeft!.x + lockedCorners.topRight!.x + 
       lockedCorners.bottomLeft!.x + lockedCorners.bottomRight!.x) / 4
    ) * scale;
    
    const centerY = (
      (lockedCorners.topLeft!.y + lockedCorners.topRight!.y + 
       lockedCorners.bottomLeft!.y + lockedCorners.bottomRight!.y) / 4
    ) * scale;
    
    // Check if center is out of bounds (document moved out of frame)
    if (centerX < 0 || centerX >= width || centerY < 0 || centerY >= height) {
      console.log("[Lock Check] Document center out of frame");
      return true;
    }
    
    // Sample a large area at center (very lenient)
    const sampleSize = 50; // Large sample area
    let totalBrightness = 0;
    let sampleCount = 0;
    
    for (let dy = -sampleSize; dy <= sampleSize; dy += 5) { // Sample every 5 pixels for speed
      for (let dx = -sampleSize; dx <= sampleSize; dx += 5) {
        const px = Math.floor(centerX + dx);
        const py = Math.floor(centerY + dy);
        
        if (px >= 0 && px < width && py >= 0 && py < height) {
          const idx = (py * width + px) * 4;
          const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          totalBrightness += brightness;
          sampleCount++;
        }
      }
    }
    
    const avgBrightness = sampleCount > 0 ? totalBrightness / sampleCount : 0;
    
    // Only unlock if center is VERY dark (< 50) - document completely gone
    // This is much more lenient than before (was < 100)
    if (avgBrightness < 50) {
      console.log(`[Lock Check] Document completely removed - center brightness: ${avgBrightness.toFixed(0)}`);
      return true;
    }
    
    return false;
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
   * CRITICAL: This function captures INSTANTLY using toDataURL() for immediate response.
   * - Uses toDataURL() instead of toBlob() for instant capture (no async wait)
   * - Converts to blob in background after capture completes
   * - If corners detected: Crops to detected area
   * - If no corners: Captures full frame
   * - Never blocks or waits - button responds immediately
   */
  const captureImage = () => {
    // Only check if already capturing - nothing else should block
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

      // Draw full frame IMMEDIATELY
      console.log("[Capture] Drawing video frame to canvas");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Use LOCKED corners if available (preferred), otherwise use detected corners
      let cornersToUse = null;
      if (state.lockedCorners.topLeft && state.lockedCorners.topRight && 
          state.lockedCorners.bottomLeft && state.lockedCorners.bottomRight) {
        cornersToUse = {
          topLeft: state.lockedCorners.topLeft,
          topRight: state.lockedCorners.topRight,
          bottomRight: state.lockedCorners.bottomRight,
          bottomLeft: state.lockedCorners.bottomLeft,
        };
        console.log("[Capture] Using LOCKED corners");
      } else if (state.detectedCorners) {
        cornersToUse = state.detectedCorners;
        console.log("[Capture] Using detected corners");
      } else {
        console.log("[Capture] No corners detected, capturing full frame");
      }

      let finalCanvas = canvas;
      let finalCorners = cornersToUse;

      // If we have corners, crop to that area
      if (cornersToUse) {
        console.log("[Capture] Cropping to detected area");
        
        const corners = cornersToUse;
        
        // Calculate bounding box
        const minX = Math.max(0, Math.min(corners.topLeft.x, corners.topRight.x, corners.bottomLeft.x, corners.bottomRight.x));
        const maxX = Math.min(canvas.width, Math.max(corners.topLeft.x, corners.topRight.x, corners.bottomLeft.x, corners.bottomRight.x));
        const minY = Math.max(0, Math.min(corners.topLeft.y, corners.topRight.y, corners.bottomLeft.y, corners.bottomRight.y));
        const maxY = Math.min(canvas.height, Math.max(corners.topLeft.y, corners.topRight.y, corners.bottomLeft.y, corners.bottomRight.y));
        
        const cropWidth = maxX - minX;
        const cropHeight = maxY - minY;
        
        // Validate crop dimensions
        if (cropWidth < 100 || cropHeight < 100) {
          console.warn("[Capture] Crop area too small, using full frame");
          finalCorners = null;
        } else {
          // Create new canvas for cropped image
          const croppedCanvas = document.createElement('canvas');
          croppedCanvas.width = cropWidth;
          croppedCanvas.height = cropHeight;
          const croppedCtx = croppedCanvas.getContext('2d', { willReadFrequently: false });
          
          if (!croppedCtx) {
            throw new Error("Failed to get cropped canvas context");
          }
          
          // Draw cropped area
          croppedCtx.drawImage(
            canvas,
            minX, minY, cropWidth, cropHeight,
            0, 0, cropWidth, cropHeight
          );
          
          finalCanvas = croppedCanvas;
          console.log("[Capture] ✓ Cropped to", cropWidth, "x", cropHeight);
        }
      }

      // INSTANT CAPTURE: Use toDataURL() for immediate response (synchronous)
      console.log("[Capture] Converting to data URL (INSTANT)");
      const dataUrl = finalCanvas.toDataURL("image/jpeg", 0.92);
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
          
          // Call capture handler with blob
          onCapture(blob, finalCorners);
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

      // After capture, unlock corners so user can capture next document
      setState((prev) => ({ 
        stream: prev.stream,
        error: prev.error,
        flashEnabled: prev.flashEnabled,
        isCapturing: false,
        lockedCorners: {
          topLeft: null,
          topRight: null,
          bottomRight: null,
          bottomLeft: null,
        },
        detectedCorners: null,
        isDocumentDetected: false,
        isLocked: false,
        showTip: prev.showTip,
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
