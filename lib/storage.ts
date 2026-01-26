/**
 * File Storage Service
 * Handles file uploads and downloads to local filesystem
 */

import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

/**
 * Get upload directory (allows for dynamic configuration in tests)
 */
function getUploadDir(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'attachments');
}

/**
 * Initialize upload directory
 */
export async function initializeStorage(): Promise<void> {
  try {
    await fs.mkdir(getUploadDir(), { recursive: true });
  } catch (error) {
    console.error('Error initializing storage:', error);
    throw new Error('Failed to initialize storage');
  }
}

/**
 * Save file to local storage
 */
export async function saveFile(
  file: File,
  leadId: string
): Promise<{ storagePath: string; fileName: string; fileSize: number; fileType: string }> {
  try {
    // Ensure upload directory exists
    await initializeStorage();

    // Generate unique filename
    const fileExtension = path.extname(file.name);
    const uniqueFileName = `${leadId}_${randomUUID()}${fileExtension}`;
    const storagePath = path.join(getUploadDir(), uniqueFileName);

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Write file to disk
    await fs.writeFile(storagePath, buffer);

    return {
      storagePath: uniqueFileName, // Store relative path
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    };
  } catch (error) {
    console.error('Error saving file:', error);
    throw new Error('Failed to save file');
  }
}

/**
 * Read file from local storage
 */
export async function readFile(storagePath: string): Promise<Buffer> {
  try {
    const fullPath = path.join(getUploadDir(), storagePath);
    const buffer = await fs.readFile(fullPath);
    return buffer;
  } catch (error) {
    console.error('Error reading file:', error);
    throw new Error('Failed to read file');
  }
}

/**
 * Delete file from local storage
 */
export async function deleteFile(storagePath: string): Promise<void> {
  try {
    const fullPath = path.join(getUploadDir(), storagePath);
    await fs.unlink(fullPath);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw new Error('Failed to delete file');
  }
}

/**
 * Check if file exists
 */
export async function fileExists(storagePath: string): Promise<boolean> {
  try {
    const fullPath = path.join(getUploadDir(), storagePath);
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}
