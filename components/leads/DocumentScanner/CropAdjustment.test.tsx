import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import CropAdjustment from "./CropAdjustment";
import { ProcessedImage, CropArea } from "@/lib/documentScanner/types";

// Mock canvas context
const mockContext = {
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
  drawImage: jest.fn(),
  beginPath: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  fillStyle: "",
  strokeStyle: "",
  lineWidth: 0,
};

// Mock canvas
HTMLCanvasElement.prototype.getContext = jest.fn(() => mockContext as any);

// Mock Image
global.Image = class {
  onload: (() => void) | null = null;
  src = "";
  width = 800;
  height = 600;

  constructor() {
    setTimeout(() => {
      if (this.onload) {
        this.onload();
      }
    }, 0);
  }
} as any;

describe("CropAdjustment", () => {
  const mockProcessedImage: ProcessedImage = {
    id: "test-id",
    originalBlob: new Blob(),
    originalDataUrl: "data:image/jpeg;base64,test",
    pageNumber: 1,
    timestamp: Date.now(),
    status: "processed",
    markedForRetake: false,
    markedForCrop: true,
    processedBlob: new Blob(),
    processedDataUrl: "data:image/jpeg;base64,processed",
    thumbnailDataUrl: "data:image/jpeg;base64,thumb",
    detectedEdges: {
      topLeft: { x: 50, y: 50 },
      topRight: { x: 750, y: 50 },
      bottomLeft: { x: 50, y: 550 },
      bottomRight: { x: 750, y: 550 },
    },
    cropArea: {
      x: 50,
      y: 50,
      width: 700,
      height: 500,
    },
    fileSize: 500000,
    processingTime: 1500,
  };

  const mockOnApply = jest.fn();
  const mockOnReset = jest.fn();
  const mockOnSkip = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders crop adjustment interface", async () => {
    render(
      <CropAdjustment
        image={mockProcessedImage}
        onApply={mockOnApply}
        onReset={mockOnReset}
        onSkip={mockOnSkip}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Adjust Crop")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Drag corners to adjust document boundaries"),
    ).toBeInTheDocument();
    expect(screen.getByText("Reset")).toBeInTheDocument();
    expect(screen.getByText("Skip")).toBeInTheDocument();
    expect(screen.getByText("Apply")).toBeInTheDocument();
  });

  it("displays instructions", async () => {
    render(
      <CropAdjustment
        image={mockProcessedImage}
        onApply={mockOnApply}
        onReset={mockOnReset}
        onSkip={mockOnSkip}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Drag the corner handles to adjust the crop area/),
      ).toBeInTheDocument();
    });
  });

  it("calls onApply when Apply button is clicked", async () => {
    render(
      <CropAdjustment
        image={mockProcessedImage}
        onApply={mockOnApply}
        onReset={mockOnReset}
        onSkip={mockOnSkip}
      />,
    );

    const applyButton = screen.getByText("Apply");
    fireEvent.click(applyButton);

    expect(mockOnApply).toHaveBeenCalledTimes(1);
    expect(mockOnApply).toHaveBeenCalledWith(mockProcessedImage.cropArea);
  });

  it("calls onReset when Reset button is clicked", async () => {
    render(
      <CropAdjustment
        image={mockProcessedImage}
        onApply={mockOnApply}
        onReset={mockOnReset}
        onSkip={mockOnSkip}
      />,
    );

    const resetButton = screen.getByText("Reset");
    fireEvent.click(resetButton);

    expect(mockOnReset).toHaveBeenCalledTimes(1);
  });

  it("calls onSkip when Skip button is clicked", async () => {
    render(
      <CropAdjustment
        image={mockProcessedImage}
        onApply={mockOnApply}
        onReset={mockOnReset}
        onSkip={mockOnSkip}
      />,
    );

    const skipButton = screen.getByText("Skip");
    fireEvent.click(skipButton);

    expect(mockOnSkip).toHaveBeenCalledTimes(1);
  });

  it("renders canvas element", async () => {
    const { container } = render(
      <CropAdjustment
        image={mockProcessedImage}
        onApply={mockOnApply}
        onReset={mockOnReset}
        onSkip={mockOnSkip}
      />,
    );

    await waitFor(() => {
      const canvas = container.querySelector("canvas");
      expect(canvas).toBeInTheDocument();
    });
  });

  it("initializes crop area from image prop", async () => {
    render(
      <CropAdjustment
        image={mockProcessedImage}
        onApply={mockOnApply}
        onReset={mockOnReset}
        onSkip={mockOnSkip}
      />,
    );

    const applyButton = screen.getByText("Apply");
    fireEvent.click(applyButton);

    // Should apply with initial crop area
    expect(mockOnApply).toHaveBeenCalledWith(mockProcessedImage.cropArea);
  });

  it("handles image without detected edges", async () => {
    const imageWithoutEdges: ProcessedImage = {
      ...mockProcessedImage,
      detectedEdges: undefined,
    };

    render(
      <CropAdjustment
        image={imageWithoutEdges}
        onApply={mockOnApply}
        onReset={mockOnReset}
        onSkip={mockOnSkip}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Adjust Crop")).toBeInTheDocument();
    });

    // Should still render without errors
    expect(screen.getByText("Apply")).toBeInTheDocument();
  });

  it("has proper button styling", async () => {
    render(
      <CropAdjustment
        image={mockProcessedImage}
        onApply={mockOnApply}
        onReset={mockOnReset}
        onSkip={mockOnSkip}
      />,
    );

    const applyButton = screen.getByText("Apply");
    const resetButton = screen.getByText("Reset");
    const skipButton = screen.getByText("Skip");

    // Apply button should have emerald gradient
    expect(applyButton.className).toContain("emerald");

    // Reset and Skip should have gray background
    expect(resetButton.className).toContain("gray");
    expect(skipButton.className).toContain("gray");
  });

  it("displays page information in header", async () => {
    render(
      <CropAdjustment
        image={mockProcessedImage}
        onApply={mockOnApply}
        onReset={mockOnReset}
        onSkip={mockOnSkip}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Adjust Crop")).toBeInTheDocument();
    });
  });

  it("renders with full-screen layout", async () => {
    const { container } = render(
      <CropAdjustment
        image={mockProcessedImage}
        onApply={mockOnApply}
        onReset={mockOnReset}
        onSkip={mockOnSkip}
      />,
    );

    const mainDiv = container.firstChild as HTMLElement;
    expect(mainDiv.className).toContain("fixed");
    expect(mainDiv.className).toContain("inset-0");
  });
});
