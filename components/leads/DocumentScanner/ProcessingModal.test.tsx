/**
 * Unit tests for ProcessingModal component
 *
 * Tests progress display, time estimation, and cancellation functionality
 */

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import ProcessingModal from "./ProcessingModal";

describe("ProcessingModal Component", () => {
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe("Progress Display", () => {
    it("should display progress bar with correct percentage", () => {
      render(
        <ProcessingModal
          currentPage={5}
          totalPages={10}
          estimatedTimeRemaining={30}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.getByText("50%")).toBeInTheDocument();
      expect(screen.getByText("Progress")).toBeInTheDocument();
    });

    it("should display current page and total pages", () => {
      render(
        <ProcessingModal
          currentPage={3}
          totalPages={20}
          estimatedTimeRemaining={60}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.getByText("3 of 20")).toBeInTheDocument();
      expect(screen.getByText("Current Page")).toBeInTheDocument();
    });

    it("should calculate progress percentage correctly for first page", () => {
      render(
        <ProcessingModal
          currentPage={1}
          totalPages={50}
          estimatedTimeRemaining={100}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.getByText("2%")).toBeInTheDocument();
    });

    it("should calculate progress percentage correctly for last page", () => {
      render(
        <ProcessingModal
          currentPage={50}
          totalPages={50}
          estimatedTimeRemaining={0}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.getByText("100%")).toBeInTheDocument();
    });

    it("should handle zero total pages gracefully", () => {
      render(
        <ProcessingModal
          currentPage={0}
          totalPages={0}
          estimatedTimeRemaining={0}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("should display processing steps information", () => {
      render(
        <ProcessingModal
          currentPage={5}
          totalPages={10}
          estimatedTimeRemaining={30}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.getByText(/Converting to grayscale/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Enhancing contrast and brightness/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/Detecting document edges/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Straightening and cropping/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Compressing for optimal quality/i),
      ).toBeInTheDocument();
    });
  });

  describe("Time Estimation", () => {
    it("should display estimated time remaining in MM:SS format", () => {
      render(
        <ProcessingModal
          currentPage={5}
          totalPages={10}
          estimatedTimeRemaining={125}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.getByText("2:05")).toBeInTheDocument();
    });

    it("should format time correctly for less than 1 minute", () => {
      render(
        <ProcessingModal
          currentPage={9}
          totalPages={10}
          estimatedTimeRemaining={45}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.getByText("0:45")).toBeInTheDocument();
    });

    it("should format time correctly for exactly 1 minute", () => {
      render(
        <ProcessingModal
          currentPage={5}
          totalPages={10}
          estimatedTimeRemaining={60}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.getByText("1:00")).toBeInTheDocument();
    });

    it("should update elapsed time every second", async () => {
      render(
        <ProcessingModal
          currentPage={5}
          totalPages={10}
          estimatedTimeRemaining={30}
          onCancel={mockOnCancel}
        />,
      );

      // Initial elapsed time should be 0:00
      expect(screen.getByText("0:00")).toBeInTheDocument();

      // Advance time by 5 seconds
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Elapsed time should now be 0:05
      await waitFor(() => {
        expect(screen.getByText("0:05")).toBeInTheDocument();
      });
    });

    it("should display both elapsed and remaining time labels", () => {
      render(
        <ProcessingModal
          currentPage={5}
          totalPages={10}
          estimatedTimeRemaining={30}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.getByText("Elapsed Time")).toBeInTheDocument();
      expect(screen.getByText("Time Remaining")).toBeInTheDocument();
    });
  });

  describe("Cancellation", () => {
    it("should display cancel button", () => {
      render(
        <ProcessingModal
          currentPage={5}
          totalPages={10}
          estimatedTimeRemaining={30}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.getByText("Cancel Processing")).toBeInTheDocument();
    });

    it("should show confirmation dialog when cancel is clicked", () => {
      render(
        <ProcessingModal
          currentPage={5}
          totalPages={10}
          estimatedTimeRemaining={30}
          onCancel={mockOnCancel}
        />,
      );

      const cancelButton = screen.getByText("Cancel Processing");
      fireEvent.click(cancelButton);

      expect(screen.getByText("Cancel Processing?")).toBeInTheDocument();
      expect(
        screen.getByText(/All processing progress will be lost/i),
      ).toBeInTheDocument();
    });

    it("should call onCancel when confirmation is accepted", () => {
      render(
        <ProcessingModal
          currentPage={5}
          totalPages={10}
          estimatedTimeRemaining={30}
          onCancel={mockOnCancel}
        />,
      );

      // Click cancel button
      const cancelButton = screen.getByText("Cancel Processing");
      fireEvent.click(cancelButton);

      // Confirm cancellation
      const confirmButton = screen.getByText("Yes, Cancel");
      fireEvent.click(confirmButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it("should not call onCancel when confirmation is rejected", () => {
      render(
        <ProcessingModal
          currentPage={5}
          totalPages={10}
          estimatedTimeRemaining={30}
          onCancel={mockOnCancel}
        />,
      );

      // Click cancel button
      const cancelButton = screen.getByText("Cancel Processing");
      fireEvent.click(cancelButton);

      // Reject cancellation
      const continueButton = screen.getByText("Continue Processing");
      fireEvent.click(continueButton);

      expect(mockOnCancel).not.toHaveBeenCalled();
    });

    it("should hide confirmation dialog when continue is clicked", () => {
      render(
        <ProcessingModal
          currentPage={5}
          totalPages={10}
          estimatedTimeRemaining={30}
          onCancel={mockOnCancel}
        />,
      );

      // Click cancel button
      const cancelButton = screen.getByText("Cancel Processing");
      fireEvent.click(cancelButton);

      // Verify dialog is shown
      expect(screen.getByText("Cancel Processing?")).toBeInTheDocument();

      // Click continue
      const continueButton = screen.getByText("Continue Processing");
      fireEvent.click(continueButton);

      // Dialog should be hidden
      expect(screen.queryByText("Cancel Processing?")).not.toBeInTheDocument();
    });
  });

  describe("UI Elements", () => {
    it("should display header with title and description", () => {
      render(
        <ProcessingModal
          currentPage={5}
          totalPages={10}
          estimatedTimeRemaining={30}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.getByText("Processing Images")).toBeInTheDocument();
      expect(
        screen.getByText(/Enhancing and optimizing your document pages/i),
      ).toBeInTheDocument();
    });

    it("should display spinning loader icon", () => {
      const { container } = render(
        <ProcessingModal
          currentPage={5}
          totalPages={10}
          estimatedTimeRemaining={30}
          onCancel={mockOnCancel}
        />,
      );

      const spinner = container.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });

    it("should have proper modal backdrop", () => {
      const { container } = render(
        <ProcessingModal
          currentPage={5}
          totalPages={10}
          estimatedTimeRemaining={30}
          onCancel={mockOnCancel}
        />,
      );

      const backdrop = container.querySelector(".fixed.inset-0.bg-black\\/50");
      expect(backdrop).toBeInTheDocument();
    });
  });

  describe("Progress Updates", () => {
    it("should update progress when currentPage changes", () => {
      const { rerender } = render(
        <ProcessingModal
          currentPage={5}
          totalPages={10}
          estimatedTimeRemaining={30}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.getByText("50%")).toBeInTheDocument();
      expect(screen.getByText("5 of 10")).toBeInTheDocument();

      // Update to next page
      rerender(
        <ProcessingModal
          currentPage={6}
          totalPages={10}
          estimatedTimeRemaining={24}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.getByText("60%")).toBeInTheDocument();
      expect(screen.getByText("6 of 10")).toBeInTheDocument();
    });

    it("should update estimated time when it changes", () => {
      const { rerender } = render(
        <ProcessingModal
          currentPage={5}
          totalPages={10}
          estimatedTimeRemaining={60}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.getByText("1:00")).toBeInTheDocument();

      // Update estimated time
      rerender(
        <ProcessingModal
          currentPage={6}
          totalPages={10}
          estimatedTimeRemaining={48}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.getByText("0:48")).toBeInTheDocument();
    });
  });
});
