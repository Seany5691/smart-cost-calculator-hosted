/**
 * Storage Service Tests
 * Tests for file storage operations
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { saveFile, readFile, deleteFile, fileExists, initializeStorage } from '@/lib/storage';

const TEST_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'test-attachments');

// Override UPLOAD_DIR for tests
process.env.UPLOAD_DIR = TEST_UPLOAD_DIR;

describe('Storage Service', () => {
  beforeAll(async () => {
    // Clean up test directory before tests
    try {
      await fs.rm(TEST_UPLOAD_DIR, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
  });

  afterAll(async () => {
    // Clean up test directory after tests
    try {
      await fs.rm(TEST_UPLOAD_DIR, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('initializeStorage creates upload directory', async () => {
    await initializeStorage();
    
    const stats = await fs.stat(TEST_UPLOAD_DIR);
    expect(stats.isDirectory()).toBe(true);
  });

  test('saveFile stores file and returns metadata', async () => {
    const leadId = 'test-lead-123';
    const fileContent = 'Test file content';
    const blob = new Blob([fileContent], { type: 'text/plain' });
    const file = new File([blob], 'test.txt', { type: 'text/plain' });

    const result = await saveFile(file, leadId);

    expect(result.fileName).toBe('test.txt');
    expect(result.fileType).toBe('text/plain');
    expect(result.fileSize).toBeGreaterThan(0);
    expect(result.storagePath).toContain(leadId);
    expect(result.storagePath).toContain('.txt');
  });

  test('readFile retrieves stored file', async () => {
    const leadId = 'test-lead-456';
    const fileContent = 'Test file content for reading';
    const blob = new Blob([fileContent], { type: 'text/plain' });
    const file = new File([blob], 'read-test.txt', { type: 'text/plain' });

    const { storagePath } = await saveFile(file, leadId);
    const buffer = await readFile(storagePath);

    expect(buffer.toString()).toBe(fileContent);
  });

  test('fileExists returns true for existing file', async () => {
    const leadId = 'test-lead-789';
    const fileContent = 'Test file for existence check';
    const blob = new Blob([fileContent], { type: 'text/plain' });
    const file = new File([blob], 'exists-test.txt', { type: 'text/plain' });

    const { storagePath } = await saveFile(file, leadId);
    const exists = await fileExists(storagePath);

    expect(exists).toBe(true);
  });

  test('fileExists returns false for non-existing file', async () => {
    const exists = await fileExists('non-existent-file.txt');
    expect(exists).toBe(false);
  });

  test('deleteFile removes file from storage', async () => {
    const leadId = 'test-lead-delete';
    const fileContent = 'Test file for deletion';
    const blob = new Blob([fileContent], { type: 'text/plain' });
    const file = new File([blob], 'delete-test.txt', { type: 'text/plain' });

    const { storagePath } = await saveFile(file, leadId);
    
    // Verify file exists
    let exists = await fileExists(storagePath);
    expect(exists).toBe(true);

    // Delete file
    await deleteFile(storagePath);

    // Verify file no longer exists
    exists = await fileExists(storagePath);
    expect(exists).toBe(false);
  });

  test('saveFile generates unique filenames for same lead', async () => {
    const leadId = 'test-lead-unique';
    const fileContent = 'Test file content';
    const blob1 = new Blob([fileContent], { type: 'text/plain' });
    const blob2 = new Blob([fileContent], { type: 'text/plain' });
    const file1 = new File([blob1], 'test.txt', { type: 'text/plain' });
    const file2 = new File([blob2], 'test.txt', { type: 'text/plain' });

    const result1 = await saveFile(file1, leadId);
    const result2 = await saveFile(file2, leadId);

    expect(result1.storagePath).not.toBe(result2.storagePath);
  });
});
