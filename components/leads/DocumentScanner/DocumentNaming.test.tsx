import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import DocumentNaming from "./DocumentNaming";

describe("DocumentNaming", () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();
  const leadName = "Test Lead";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the component with correct title", () => {
    render(
      <DocumentNaming
        leadName={leadName}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    expect(screen.getByText("Name Your Document")).toBeInTheDocument();
  });

  it('pre-fills input with lead name followed by " - "', () => {
    render(
      <DocumentNaming
        leadName={leadName}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    const input = screen.getByLabelText("Document Name") as HTMLInputElement;
    expect(input.value).toBe("Test Lead - ");
  });

  it("updates input value when user types", () => {
    render(
      <DocumentNaming
        leadName={leadName}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    const input = screen.getByLabelText("Document Name") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Test Lead - Contract" } });

    expect(input.value).toBe("Test Lead - Contract");
  });

  it("displays validation error when submitting empty name", () => {
    render(
      <DocumentNaming
        leadName={leadName}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    const input = screen.getByLabelText("Document Name") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });

    const submitButton = screen.getByText("Generate PDF");
    fireEvent.click(submitButton);

    expect(
      screen.getByText("Document name cannot be empty"),
    ).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("displays validation error when submitting whitespace-only name", () => {
    render(
      <DocumentNaming
        leadName={leadName}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    const input = screen.getByLabelText("Document Name") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "   " } });

    const submitButton = screen.getByText("Generate PDF");
    fireEvent.click(submitButton);

    expect(
      screen.getByText("Document name cannot be empty"),
    ).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("clears error when user starts typing after validation error", () => {
    render(
      <DocumentNaming
        leadName={leadName}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    const input = screen.getByLabelText("Document Name") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });

    const submitButton = screen.getByText("Generate PDF");
    fireEvent.click(submitButton);

    expect(
      screen.getByText("Document name cannot be empty"),
    ).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "Test" } });

    expect(
      screen.queryByText("Document name cannot be empty"),
    ).not.toBeInTheDocument();
  });

  it("calls onSubmit with trimmed name when valid name is submitted", () => {
    render(
      <DocumentNaming
        leadName={leadName}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    const input = screen.getByLabelText("Document Name") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "  Test Lead - Contract  " } });

    const submitButton = screen.getByText("Generate PDF");
    fireEvent.click(submitButton);

    expect(mockOnSubmit).toHaveBeenCalledWith("Test Lead - Contract");
  });

  it("calls onCancel when cancel button is clicked", () => {
    render(
      <DocumentNaming
        leadName={leadName}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("calls onCancel when X button is clicked", () => {
    render(
      <DocumentNaming
        leadName={leadName}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    const closeButton = screen.getByLabelText("Cancel");
    fireEvent.click(closeButton);

    expect(mockOnCancel).toHaveBeenCalled();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("displays preview of final filename", () => {
    render(
      <DocumentNaming
        leadName={leadName}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    const input = screen.getByLabelText("Document Name") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Test Lead - Contract" } });

    expect(screen.getByText(/Test Lead - Contract\.pdf/)).toBeInTheDocument();
  });

  it("submits form when Enter key is pressed", () => {
    render(
      <DocumentNaming
        leadName={leadName}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    const input = screen.getByLabelText("Document Name") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Test Lead - Contract" } });
    fireEvent.submit(input.closest("form")!);

    expect(mockOnSubmit).toHaveBeenCalledWith("Test Lead - Contract");
  });

  it("has proper accessibility attributes", () => {
    render(
      <DocumentNaming
        leadName={leadName}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    const input = screen.getByLabelText("Document Name");
    expect(input).toHaveAttribute("id", "documentName");
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveAttribute("placeholder", "Enter document name");
  });

  it("sets aria-invalid when there is an error", () => {
    render(
      <DocumentNaming
        leadName={leadName}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    const input = screen.getByLabelText("Document Name") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });

    const submitButton = screen.getByText("Generate PDF");
    fireEvent.click(submitButton);

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "name-error");
  });

  it('error message has role="alert"', () => {
    render(
      <DocumentNaming
        leadName={leadName}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    const input = screen.getByLabelText("Document Name") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });

    const submitButton = screen.getByText("Generate PDF");
    fireEvent.click(submitButton);

    const errorMessage = screen.getByText("Document name cannot be empty");
    expect(errorMessage).toHaveAttribute("role", "alert");
  });
});
