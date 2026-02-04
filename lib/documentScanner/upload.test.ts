/**
 * Unit tests for Upload Module
 *
 * Tests document upload functionality including authentication,
 * retry logic, and error handling.
 */

import { uploadScannedDocument, uploadWithRetry } from "./upload";

// Mock fetch globally
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("upload", () => {
  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  describe("uploadScannedDocument", () => {
    it("should upload successfully with valid auth token", async () => {
      // Setup auth token
      localStorageMock.setItem(
        "auth-storage",
        JSON.stringify({
          state: { token: "test-token-123" },
        }),
      );

      // Mock successful response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const pdfBlob = new Blob(["test pdf"], { type: "application/pdf" });

      await uploadScannedDocument("lead-123", pdfBlob, "Test Document");

      // Verify fetch was called correctly
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/leads/lead-123/attachments",
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Bearer test-token-123",
          },
        }),
      );
    });

    it("should throw error when not authenticated", async () => {
      // No auth token in localStorage
      const pdfBlob = new Blob(["test pdf"], { type: "application/pdf" });

      await expect(
        uploadScannedDocument("lead-123", pdfBlob, "Test Document"),
      ).rejects.toThrow("Not authenticated");

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should handle alternative token structure", async () => {
      // Setup auth token with alternative structure
      localStorageMock.setItem(
        "auth-storage",
        JSON.stringify({
          token: "direct-token-456",
        }),
      );

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const pdfBlob = new Blob(["test pdf"], { type: "application/pdf" });

      await uploadScannedDocument("lead-123", pdfBlob, "Test Document");

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/leads/lead-123/attachments",
        expect.objectContaining({
          headers: {
            Authorization: "Bearer direct-token-456",
          },
        }),
      );
    });

    it("should throw error on failed upload", async () => {
      localStorageMock.setItem(
        "auth-storage",
        JSON.stringify({
          state: { token: "test-token" },
        }),
      );

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "Server error" }),
      });

      const pdfBlob = new Blob(["test pdf"], { type: "application/pdf" });

      await expect(
        uploadScannedDocument("lead-123", pdfBlob, "Test Document"),
      ).rejects.toThrow("Server error");
    });

    it("should handle malformed error response", async () => {
      localStorageMock.setItem(
        "auth-storage",
        JSON.stringify({
          state: { token: "test-token" },
        }),
      );

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      const pdfBlob = new Blob(["test pdf"], { type: "application/pdf" });

      await expect(
        uploadScannedDocument("lead-123", pdfBlob, "Test Document"),
      ).rejects.toThrow("Upload failed with status 500");
    });
  });

  describe("uploadWithRetry", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should succeed on first attempt", async () => {
      localStorageMock.setItem(
        "auth-storage",
        JSON.stringify({
          state: { token: "test-token" },
        }),
      );

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const pdfBlob = new Blob(["test pdf"], { type: "application/pdf" });

      await uploadWithRetry("lead-123", pdfBlob, "Test Document");

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should retry with exponential backoff", async () => {
      localStorageMock.setItem(
        "auth-storage",
        JSON.stringify({
          state: { token: "test-token" },
        }),
      );

      // Fail twice, succeed on third attempt
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: "Temporary error" }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: "Temporary error" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      const pdfBlob = new Blob(["test pdf"], { type: "application/pdf" });

      const uploadPromise = uploadWithRetry(
        "lead-123",
        pdfBlob,
        "Test Document",
      );

      // Fast-forward through delays
      await jest.advanceTimersByTimeAsync(1000); // First retry after 1s
      await jest.advanceTimersByTimeAsync(2000); // Second retry after 2s

      await uploadPromise;

      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it("should throw error after max retries", async () => {
      localStorageMock.setItem(
        "auth-storage",
        JSON.stringify({
          state: { token: "test-token" },
        }),
      );

      // Fail all attempts
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: "Persistent error" }),
      });

      const pdfBlob = new Blob(["test pdf"], { type: "application/pdf" });

      // Start the upload
      const uploadPromise = uploadWithRetry(
        "lead-123",
        pdfBlob,
        "Test Document",
        3,
      );

      // Run all timers to completion
      await jest.runAllTimersAsync();

      // Now check that it rejects with the right error
      await expect(uploadPromise).rejects.toThrow(
        /Upload failed after 3 attempts/,
      );

      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it("should respect custom maxRetries parameter", async () => {
      localStorageMock.setItem(
        "auth-storage",
        JSON.stringify({
          state: { token: "test-token" },
        }),
      );

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: "Error" }),
      });

      const pdfBlob = new Blob(["test pdf"], { type: "application/pdf" });

      const uploadPromise = uploadWithRetry(
        "lead-123",
        pdfBlob,
        "Test Document",
        2,
      );

      // Run all timers to completion
      await jest.runAllTimersAsync();

      // Now check that it rejects with the right error
      await expect(uploadPromise).rejects.toThrow(
        /Upload failed after 2 attempts/,
      );

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
