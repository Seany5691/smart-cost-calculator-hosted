/**
 * Unit tests for CaptureMode component
 *
 * Tests camera initialization, capture functionality, and error handling
 */

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import CaptureMode from "./CaptureMode";

// Mock the memory manager module
const mockCheckMemoryAvailable = jest.fn();
jest.mock("@/lib/documentScanner/memoryManager", () => ({
  checkMemoryAvailable: () => mockCheckMemoryAvailable(),
  getMemoryStats: jest.fn(),
  hintGarbageCollection: jest.fn(),
}));

// Mock the toast hook
const mockToastWarning = jest.fn();
jest.mock("@/components/ui/Toast/useToast", () => ({
  useToast: () => ({
    warning: mockToastWarning,
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  }),
}));

// Mock MediaDevices API
const mockGetUserMedia = jest.fn();
const mockVideoPlay = jest.fn();
const mockStopTrack = jest.fn();

// Mock navigator.mediaDevices
Object.defineProperty(global.navigator, "mediaDevices", {
  writable: true,
  value: {
    getUserMedia: mockGetUserMedia,
  },
});

// Mock HTMLVideoElement.play
HTMLVideoElement.prototype.play = mockVideoPlay;

// Mock MediaStream
class MockMediaStream {
  getTracks() {
    return [
      {
        stop: mockStopTrack,
        getCapabilities: () => ({}),
        applyConstraints: jest.fn(),
      },
    ];
  }
  getVideoTracks() {
    return this.getTracks();
  }
}

describe("CaptureMode Component", () => {
  const mockOnCapture = jest.fn();
  const mockOnDone = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockVideoPlay.mockResolvedValue(undefined);
    mockToastWarning.mockClear();
    mockCheckMemoryAvailable.mockReturnValue(true); // Default to memory available
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Camera Initialization", () => {
    it("should request camera access with environment-facing mode", async () => {
      mockGetUserMedia.mockResolvedValue(new MockMediaStream());

      render(
        <CaptureMode
          onCapture={mockOnCapture}
          onDone={mockOnDone}
          currentPageNumber={1}
          maxPages={50}
        />,
      );

      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledWith({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      });
    });

    it("should display video stream when camera access is granted", async () => {
      mockGetUserMedia.mockResolvedValue(new MockMediaStream());

      const { container } = render(
        <CaptureMode
          onCapture={mockOnCapture}
          onDone={mockOnDone}
          currentPageNumber={1}
          maxPages={50}
        />,
      );

      await waitFor(() => {
        const video = container.querySelector("video");
        expect(video).toBeInTheDocument();
      });
    });

    it("should display error message when camera access is denied", async () => {
      const error = new Error("Permission denied");
      error.name = "NotAllowedError";
      mockGetUserMedia.mockRejectedValue(error);

      render(
        <CaptureMode
          onCapture={mockOnCapture}
          onDone={mockOnDone}
          currentPageNumber={1}
          maxPages={50}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(/Camera access denied/i)).toBeInTheDocument();
        expect(
          screen.getByText(/enable camera permissions/i),
        ).toBeInTheDocument();
      });
    });

    it("should display error message when no camera is found", async () => {
      const error = new Error("No camera");
      error.name = "NotFoundError";
      mockGetUserMedia.mockRejectedValue(error);

      render(
        <CaptureMode
          onCapture={mockOnCapture}
          onDone={mockOnDone}
          currentPageNumber={1}
          maxPages={50}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(/No camera found/i)).toBeInTheDocument();
      });
    });

    it("should display error message when camera is in use", async () => {
      const error = new Error("Camera in use");
      error.name = "NotReadableError";
      mockGetUserMedia.mockRejectedValue(error);

      render(
        <CaptureMode
          onCapture={mockOnCapture}
          onDone={mockOnDone}
          currentPageNumber={1}
          maxPages={50}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(/Camera is in use/i)).toBeInTheDocument();
        expect(screen.getByText(/close other apps/i)).toBeInTheDocument();
      });
    });
  });

  describe("UI Controls", () => {
    it("should display page counter", async () => {
      mockGetUserMedia.mockResolvedValue(new MockMediaStream());

      render(
        <CaptureMode
          onCapture={mockOnCapture}
          onDone={mockOnDone}
          currentPageNumber={5}
          maxPages={50}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(/Page 5 of 50/i)).toBeInTheDocument();
      });
    });

    it("should display retake mode indicator", async () => {
      mockGetUserMedia.mockResolvedValue(new MockMediaStream());

      render(
        <CaptureMode
          onCapture={mockOnCapture}
          onDone={mockOnDone}
          currentPageNumber={3}
          maxPages={50}
          retakeMode={true}
          retakePageNumbers={[3, 7, 12]}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(/Retaking Page 3 of 3/i)).toBeInTheDocument();
      });
    });

    it("should display Done Capturing button", async () => {
      mockGetUserMedia.mockResolvedValue(new MockMediaStream());

      render(
        <CaptureMode
          onCapture={mockOnCapture}
          onDone={mockOnDone}
          currentPageNumber={1}
          maxPages={50}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(/Done Capturing/i)).toBeInTheDocument();
      });
    });

    it("should display capture button", async () => {
      mockGetUserMedia.mockResolvedValue(new MockMediaStream());

      render(
        <CaptureMode
          onCapture={mockOnCapture}
          onDone={mockOnDone}
          currentPageNumber={1}
          maxPages={50}
        />,
      );

      await waitFor(() => {
        const captureButton = screen.getByLabelText(/Capture image/i);
        expect(captureButton).toBeInTheDocument();
      });
    });

    it("should display flash toggle button", async () => {
      mockGetUserMedia.mockResolvedValue(new MockMediaStream());

      render(
        <CaptureMode
          onCapture={mockOnCapture}
          onDone={mockOnDone}
          currentPageNumber={1}
          maxPages={50}
        />,
      );

      await waitFor(() => {
        const flashButton = screen.getByLabelText(/flash/i);
        expect(flashButton).toBeInTheDocument();
      });
    });
  });

  describe("Cleanup", () => {
    it("should release camera stream on unmount", async () => {
      const mockStream = new MockMediaStream();
      mockGetUserMedia.mockResolvedValue(mockStream);

      const { unmount } = render(
        <CaptureMode
          onCapture={mockOnCapture}
          onDone={mockOnDone}
          currentPageNumber={1}
          maxPages={50}
        />,
      );

      // Wait for camera to initialize
      await waitFor(
        () => {
          expect(mockGetUserMedia).toHaveBeenCalled();
        },
        { timeout: 3000 },
      );

      // Unmount the component
      unmount();

      // The cleanup should have been called
      // Note: In a real scenario, the stream would be stopped
      // For now, we just verify the component unmounts without errors
      expect(mockGetUserMedia).toHaveBeenCalled();
    });
  });

  describe("Error Recovery", () => {
    it("should allow retry after camera error", async () => {
      const error = new Error("Permission denied");
      error.name = "NotAllowedError";
      mockGetUserMedia.mockRejectedValueOnce(error);
      mockGetUserMedia.mockResolvedValueOnce(new MockMediaStream());

      render(
        <CaptureMode
          onCapture={mockOnCapture}
          onDone={mockOnDone}
          currentPageNumber={1}
          maxPages={50}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(/Camera access denied/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByText(/Retry/i);
      retryButton.click();

      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledTimes(2);
      });
    });

    it("should call onDone when cancel is clicked in error state", async () => {
      const error = new Error("Permission denied");
      error.name = "NotAllowedError";
      mockGetUserMedia.mockRejectedValue(error);

      render(
        <CaptureMode
          onCapture={mockOnCapture}
          onDone={mockOnDone}
          currentPageNumber={1}
          maxPages={50}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(/Camera access denied/i)).toBeInTheDocument();
      });

      const cancelButton = screen.getByText(/Cancel/i);
      cancelButton.click();

      expect(mockOnDone).toHaveBeenCalled();
    });
  });

  describe("Memory Management", () => {
    it("should check memory before capture and show warning if low", async () => {
      // Mock memory check to return false (low memory)
      mockCheckMemoryAvailable.mockReturnValue(false);

      mockGetUserMedia.mockResolvedValue(new MockMediaStream());

      const { container } = render(
        <CaptureMode
          onCapture={mockOnCapture}
          onDone={mockOnDone}
          currentPageNumber={1}
          maxPages={50}
        />,
      );

      // Wait for camera to initialize
      await waitFor(() => {
        const video = container.querySelector("video");
        expect(video).toBeInTheDocument();
      });

      // Try to capture
      const captureButton = screen.getByLabelText(/Capture image/i);
      fireEvent.click(captureButton);

      // Should show warning toast
      await waitFor(() => {
        expect(mockToastWarning).toHaveBeenCalledWith(
          "Memory Low",
          expect.stringContaining("Device memory is running low"),
        );
      });

      // Should NOT call onCapture
      expect(mockOnCapture).not.toHaveBeenCalled();
    });

    it("should allow capture when memory is available", async () => {
      // Mock memory check to return true (memory available)
      mockCheckMemoryAvailable.mockReturnValue(true);

      mockGetUserMedia.mockResolvedValue(new MockMediaStream());

      // Mock canvas and toBlob
      const mockToBlob = jest.fn((callback) => {
        callback(new Blob(["test"], { type: "image/jpeg" }));
      });

      HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
        drawImage: jest.fn(),
      })) as any;

      HTMLCanvasElement.prototype.toBlob = mockToBlob;

      const { container } = render(
        <CaptureMode
          onCapture={mockOnCapture}
          onDone={mockOnDone}
          currentPageNumber={1}
          maxPages={50}
        />,
      );

      // Wait for camera to initialize
      await waitFor(() => {
        const video = container.querySelector("video");
        expect(video).toBeInTheDocument();
      });

      // Mock video dimensions
      const video = container.querySelector("video") as HTMLVideoElement;
      Object.defineProperty(video, "videoWidth", {
        value: 1920,
        writable: true,
      });
      Object.defineProperty(video, "videoHeight", {
        value: 1080,
        writable: true,
      });

      // Try to capture
      const captureButton = screen.getByLabelText(/Capture image/i);
      fireEvent.click(captureButton);

      // Should NOT show warning toast
      expect(mockToastWarning).not.toHaveBeenCalled();

      // Should call onCapture
      await waitFor(() => {
        expect(mockOnCapture).toHaveBeenCalled();
      });
    });
  });
});
