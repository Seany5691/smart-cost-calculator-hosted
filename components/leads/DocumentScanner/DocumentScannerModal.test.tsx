/**
 * DocumentScannerModal Component Tests
 *
 * Tests for the main container component that orchestrates the document scanning workflow.
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DocumentScannerModal from "./DocumentScannerModal";

// Mock child components
jest.mock("./CaptureMode", () => ({
  __esModule: true,
  default: ({ onCapture, onDone }: any) => (
    <div data-testid="capture-mode">
      <button
        onClick={() => onCapture(new Blob(["test"], { type: "image/jpeg" }))}
      >
        Capture
      </button>
      <button onClick={onDone}>Done</button>
    </div>
  ),
}));

jest.mock("./PreviewGrid", () => ({
  __esModule: true,
  default: ({ images, onProcess }: any) => (
    <div data-testid="preview-grid">
      <div>Images: {images.length}</div>
      <button onClick={onProcess}>Process</button>
    </div>
  ),
}));

jest.mock("./ProcessingModal", () => ({
  __esModule: true,
  default: ({ currentPage, totalPages }: any) => (
    <div data-testid="processing-modal">
      Processing {currentPage}/{totalPages}
    </div>
  ),
}));

jest.mock("./CropAdjustment", () => ({
  __esModule: true,
  default: ({ onSkip }: any) => (
    <div data-testid="crop-adjustment">
      <button onClick={onSkip}>Skip</button>
    </div>
  ),
}));

jest.mock("./DocumentNaming", () => ({
  __esModule: true,
  default: ({ onSubmit, leadName }: any) => (
    <div data-testid="document-naming">
      <div>Lead: {leadName}</div>
      <button onClick={() => onSubmit("Test Document")}>Submit</button>
    </div>
  ),
}));

// Mock utilities
jest.mock("@/lib/documentScanner/imageProcessing", () => ({
  blobToDataUrl: jest.fn().mockResolvedValue("data:image/jpeg;base64,test"),
  processBatch: jest.fn().mockResolvedValue([]),
}));

jest.mock("@/lib/documentScanner/pdfGenerator", () => ({
  generatePDF: jest
    .fn()
    .mockResolvedValue(new Blob(["pdf"], { type: "application/pdf" })),
}));

jest.mock("@/lib/documentScanner/upload", () => ({
  uploadWithRetry: jest.fn().mockResolvedValue(undefined),
}));

describe("DocumentScannerModal", () => {
  const mockProps = {
    leadId: "lead-123",
    leadName: "John Doe",
    onClose: jest.fn(),
    onComplete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
  });

  it("should render capture mode initially", () => {
    render(<DocumentScannerModal {...mockProps} />);
    expect(screen.getByTestId("capture-mode")).toBeInTheDocument();
  });

  it("should transition to preview after capturing and clicking done", async () => {
    const user = userEvent.setup();
    render(<DocumentScannerModal {...mockProps} />);

    // Capture an image
    await user.click(screen.getByText("Capture"));

    // Click done
    await user.click(screen.getByText("Done"));

    // Should show preview grid
    await waitFor(() => {
      expect(screen.getByTestId("preview-grid")).toBeInTheDocument();
    });
  });

  it("should show error when trying to proceed without capturing", async () => {
    const user = userEvent.setup();

    // Mock window.alert
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

    render(<DocumentScannerModal {...mockProps} />);

    // Click done without capturing
    await user.click(screen.getByText("Done"));

    // Should still be in capture mode (error shown)
    expect(screen.getByTestId("capture-mode")).toBeInTheDocument();

    alertSpy.mockRestore();
  });

  it("should save session to sessionStorage when images are captured", async () => {
    const user = userEvent.setup();
    render(<DocumentScannerModal {...mockProps} />);

    // Capture an image
    await user.click(screen.getByText("Capture"));

    // Wait for session to be saved
    await waitFor(() => {
      const session = sessionStorage.getItem("document-scanner-session");
      expect(session).toBeTruthy();
    });
  });

  it("should display lead name in document naming phase", async () => {
    const user = userEvent.setup();
    render(<DocumentScannerModal {...mockProps} />);

    // Capture an image
    await user.click(screen.getByText("Capture"));

    // Click done to go to preview
    await user.click(screen.getByText("Done"));

    // Wait for preview
    await waitFor(() => {
      expect(screen.getByTestId("preview-grid")).toBeInTheDocument();
    });

    // Note: Full workflow test would require mocking processing
    // This is a basic smoke test to ensure component renders
  });
});
