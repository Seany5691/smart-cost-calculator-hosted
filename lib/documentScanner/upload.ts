/**
 * Upload Utility Module
 *
 * Handles uploading scanned documents to the server with retry logic.
 * Uses the existing /api/leads/[id]/attachments endpoint.
 *
 * Requirements: 12.1, 12.2, 12.3, 12.5
 */

/**
 * Upload a scanned document PDF to the server
 *
 * Uses the existing attachments API endpoint with authentication.
 * Gets auth token from localStorage (same pattern as AttachmentsSection).
 *
 * @param leadId - Lead ID to attach the document to
 * @param pdfBlob - PDF file as a Blob
 * @param documentName - Name for the document (without .pdf extension)
 * @returns Promise that resolves when upload succeeds
 * @throws Error if authentication fails or upload fails
 *
 * Requirements: 12.1, 12.2, 12.3
 *
 * @example
 * await uploadScannedDocument("lead-123", pdfBlob, "Contract - John Doe");
 */
export async function uploadScannedDocument(
  leadId: string,
  pdfBlob: Blob,
  documentName: string,
): Promise<void> {
  // Get auth token from localStorage (Requirement 12.3)
  // Same pattern as AttachmentsSection
  const token = localStorage.getItem("auth-storage");
  let authToken: string | null = null;

  if (token) {
    try {
      const data = JSON.parse(token);
      authToken = data.state?.token || data.token;
    } catch (error) {
      console.error("Failed to parse auth token:", error);
    }
  }

  if (!authToken) {
    throw new Error("Not authenticated. Please log in and try again.");
  }

  // Create FormData with PDF blob and description (Requirement 12.2)
  const formData = new FormData();
  formData.append("file", pdfBlob, `${documentName}.pdf`);
  formData.append("description", "Scanned document");

  // Send POST request to attachments endpoint (Requirement 12.1)
  const response = await fetch(`/api/leads/${leadId}/attachments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Upload failed with status ${response.status}`,
    );
  }
}

/**
 * Upload with automatic retry logic
 *
 * Retries failed uploads up to 3 times with exponential backoff.
 * Backoff delays: 1s, 2s, 4s
 *
 * @param leadId - Lead ID to attach the document to
 * @param pdfBlob - PDF file as a Blob
 * @param documentName - Name for the document (without .pdf extension)
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Promise that resolves when upload succeeds
 * @throws Error if all retry attempts are exhausted
 *
 * Requirement: 12.5
 *
 * @example
 * try {
 *   await uploadWithRetry("lead-123", pdfBlob, "Contract - John Doe");
 *   console.log("Upload successful!");
 * } catch (error) {
 *   console.error("Upload failed after all retries:", error);
 * }
 */
export async function uploadWithRetry(
  leadId: string,
  pdfBlob: Blob,
  documentName: string,
  maxRetries: number = 3,
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await uploadScannedDocument(leadId, pdfBlob, documentName);
      return; // Success - exit function
    } catch (error) {
      lastError = error as Error;
      console.error(`Upload attempt ${attempt} failed:`, error);

      // If this wasn't the last attempt, wait before retrying
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s (Requirement 12.5)
        const delayMs = 1000 * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  // All retries exhausted - throw the last error (Requirement 12.5)
  throw new Error(
    `Upload failed after ${maxRetries} attempts: ${lastError?.message || "Unknown error"}`,
  );
}
