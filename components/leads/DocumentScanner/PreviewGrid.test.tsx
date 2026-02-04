/**
 * PreviewGrid Component Tests
 *
 * Tests for the PreviewGrid component functionality
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import PreviewGrid from "./PreviewGrid";
import { CapturedImage } from "@/lib/documentScanner/types";

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  Camera: () => <div data-testid="camera-icon" />,
  Crop: () => <div data-testid="crop-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  RotateCcw: () => <div data-testid="rotate-icon" />,
  CheckCircle2: () => <div data-testid="check-icon" />,
  AlertCircle: () => <div data-testid="alert-icon" />,
}));

describe("PreviewGrid", () => {
  const mockOnMarkRetake = jest.fn();
  const mockOnMarkCrop = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnReorder = jest.fn();
  const mockOnProcess = jest.fn();
  const mockOnRetake = jest.fn();

  const createMockImage = (
    overrides?: Partial<CapturedImage>,
  ): CapturedImage => ({
    id: "test-id-1",
    originalBlob: new Blob(),
    originalDataUrl: "data:image/png;base64,test",
    pageNumber: 1,
    timestamp: Date.now(),
    status: "captured",
    markedForRetake: false,
    markedForCrop: false,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders empty state when no images", () => {
    render(
      <PreviewGrid
        images={[]}
        onMarkRetake={mockOnMarkRetake}
        onMarkCrop={mockOnMarkCrop}
        onDelete={mockOnDelete}
        onReorder={mockOnReorder}
        onProcess={mockOnProcess}
        onRetake={mockOnRetake}
      />,
    );

    expect(screen.getByText("No pages captured yet")).toBeInTheDocument();
  });

  it("renders images in grid", () => {
    const images = [
      createMockImage({ id: "1", pageNumber: 1 }),
      createMockImage({ id: "2", pageNumber: 2 }),
    ];

    render(
      <PreviewGrid
        images={images}
        onMarkRetake={mockOnMarkRetake}
        onMarkCrop={mockOnMarkCrop}
        onDelete={mockOnDelete}
        onReorder={mockOnReorder}
        onProcess={mockOnProcess}
        onRetake={mockOnRetake}
      />,
    );

    expect(screen.getByText("2 pages captured")).toBeInTheDocument();
  });

  it("calls onMarkRetake when retake button clicked", () => {
    const images = [createMockImage({ id: "test-1" })];

    render(
      <PreviewGrid
        images={images}
        onMarkRetake={mockOnMarkRetake}
        onMarkCrop={mockOnMarkCrop}
        onDelete={mockOnDelete}
        onReorder={mockOnReorder}
        onProcess={mockOnProcess}
        onRetake={mockOnRetake}
      />,
    );

    const retakeButtons = screen.getAllByTitle(/retake/i);
    fireEvent.click(retakeButtons[0]);

    expect(mockOnMarkRetake).toHaveBeenCalledWith("test-1");
  });

  it("calls onMarkCrop when crop button clicked", () => {
    const images = [createMockImage({ id: "test-1" })];

    render(
      <PreviewGrid
        images={images}
        onMarkRetake={mockOnMarkRetake}
        onMarkCrop={mockOnMarkCrop}
        onDelete={mockOnDelete}
        onReorder={mockOnReorder}
        onProcess={mockOnProcess}
        onRetake={mockOnRetake}
      />,
    );

    const cropButtons = screen.getAllByTitle(/crop/i);
    fireEvent.click(cropButtons[0]);

    expect(mockOnMarkCrop).toHaveBeenCalledWith("test-1");
  });

  it("calls onDelete when delete button clicked", () => {
    const images = [createMockImage({ id: "test-1" })];

    render(
      <PreviewGrid
        images={images}
        onMarkRetake={mockOnMarkRetake}
        onMarkCrop={mockOnMarkCrop}
        onDelete={mockOnDelete}
        onReorder={mockOnReorder}
        onProcess={mockOnProcess}
        onRetake={mockOnRetake}
      />,
    );

    const deleteButton = screen.getByTitle("Delete page");
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith("test-1");
  });

  it("shows retake button when pages marked for retake", () => {
    const images = [
      createMockImage({ id: "1", markedForRetake: true }),
      createMockImage({ id: "2", markedForRetake: true }),
    ];

    render(
      <PreviewGrid
        images={images}
        onMarkRetake={mockOnMarkRetake}
        onMarkCrop={mockOnMarkCrop}
        onDelete={mockOnDelete}
        onReorder={mockOnReorder}
        onProcess={mockOnProcess}
        onRetake={mockOnRetake}
      />,
    );

    expect(screen.getByText("Retake 2 Pages")).toBeInTheDocument();
  });

  it("calls onRetake when retake marked pages button clicked", () => {
    const images = [createMockImage({ markedForRetake: true })];

    render(
      <PreviewGrid
        images={images}
        onMarkRetake={mockOnMarkRetake}
        onMarkCrop={mockOnMarkCrop}
        onDelete={mockOnDelete}
        onReorder={mockOnReorder}
        onProcess={mockOnProcess}
        onRetake={mockOnRetake}
      />,
    );

    const retakeButton = screen.getByText("Retake 1 Page");
    fireEvent.click(retakeButton);

    expect(mockOnRetake).toHaveBeenCalled();
  });

  it("calls onProcess when process button clicked", () => {
    const images = [createMockImage()];

    render(
      <PreviewGrid
        images={images}
        onMarkRetake={mockOnMarkRetake}
        onMarkCrop={mockOnMarkCrop}
        onDelete={mockOnDelete}
        onReorder={mockOnReorder}
        onProcess={mockOnProcess}
        onRetake={mockOnRetake}
      />,
    );

    const processButton = screen.getByText("Process All Pages");
    fireEvent.click(processButton);

    expect(mockOnProcess).toHaveBeenCalled();
  });

  it("disables process button when no images", () => {
    render(
      <PreviewGrid
        images={[]}
        onMarkRetake={mockOnMarkRetake}
        onMarkCrop={mockOnMarkCrop}
        onDelete={mockOnDelete}
        onReorder={mockOnReorder}
        onProcess={mockOnProcess}
        onRetake={mockOnRetake}
      />,
    );

    const processButton = screen.getByText("Process All Pages");
    expect(processButton).toBeDisabled();
  });

  it("shows status indicators for marked pages", () => {
    const images = [
      createMockImage({ id: "1", markedForRetake: true }),
      createMockImage({ id: "2", markedForCrop: true }),
      createMockImage({ id: "3", status: "error" }),
      createMockImage({ id: "4", status: "processed" }),
    ];

    render(
      <PreviewGrid
        images={images}
        onMarkRetake={mockOnMarkRetake}
        onMarkCrop={mockOnMarkCrop}
        onDelete={mockOnDelete}
        onReorder={mockOnReorder}
        onProcess={mockOnProcess}
        onRetake={mockOnRetake}
      />,
    );

    // Check for status badges in the header
    expect(screen.getByText("1 to retake")).toBeInTheDocument();
    expect(screen.getByText("1 to crop")).toBeInTheDocument();
  });
});
