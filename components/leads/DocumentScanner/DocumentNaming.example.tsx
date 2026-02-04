/**
 * Example usage of DocumentNaming component
 *
 * This file demonstrates how to integrate the DocumentNaming component
 * into the DocumentScannerModal workflow.
 */

import React, { useState } from "react";
import DocumentNaming from "./DocumentNaming";

export function DocumentNamingExample() {
  const [showNaming, setShowNaming] = useState(false);
  const [finalFilename, setFinalFilename] = useState<string | null>(null);

  const handleSubmit = (name: string) => {
    // The parent component (DocumentScannerModal) will:
    // 1. Append ".pdf" to the name
    const filename = `${name}.pdf`;
    setFinalFilename(filename);

    // 2. Proceed to PDF generation phase
    console.log("Generating PDF with filename:", filename);

    // 3. Close the naming modal
    setShowNaming(false);
  };

  const handleCancel = () => {
    // Return to previous phase (crop or preview)
    setShowNaming(false);
  };

  return (
    <div>
      <button onClick={() => setShowNaming(true)}>Open Document Naming</button>

      {showNaming && (
        <DocumentNaming
          leadName="John Smith"
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      )}

      {finalFilename && (
        <div>
          <p>Final filename: {finalFilename}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Integration Notes:
 *
 * 1. Pre-fill Behavior (Requirement 11.2):
 *    - The component automatically pre-fills the input with `${leadName} - `
 *    - This happens in the useEffect on mount
 *
 * 2. Validation (Requirements 11.3, 11.4):
 *    - Empty names are rejected with error message
 *    - Whitespace-only names are rejected
 *    - Error clears when user starts typing
 *
 * 3. Submission (Requirement 11.5):
 *    - The component trims the input before calling onSubmit
 *    - The parent component should append ".pdf" to create final filename
 *    - Example: "John Smith - Contract" becomes "John Smith - Contract.pdf"
 *
 * 4. Accessibility:
 *    - Input has proper label and aria attributes
 *    - Error messages use role="alert"
 *    - aria-invalid set when validation fails
 *    - Close button has aria-label
 *
 * 5. User Experience:
 *    - Auto-focus on input for immediate typing
 *    - Enter key submits the form
 *    - Preview of final filename shown below input
 *    - Cancel button and X button both call onCancel
 */
