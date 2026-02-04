/**
 * Lead Attachments API Routes
 * Handles file upload, retrieval, and deletion for lead attachments
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { verifyAuth } from '@/lib/middleware';
import { saveFile, deleteFile } from '@/lib/storage';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/leads/[id]/attachments
 * Get all attachments for a lead
 * Requirements: 17.8, 30.20
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leadId = params.id;

    const result = await pool.query(
      `SELECT 
        id,
        lead_id,
        uploaded_by as user_id,
        file_name as filename,
        storage_path as file_path,
        file_size,
        file_type as mime_type,
        description,
        created_at
      FROM attachments
      WHERE lead_id = $1
      ORDER BY created_at DESC`,
      [leadId]
    );

    return NextResponse.json({ attachments: result.rows });
  } catch (error) {
    console.error('Error fetching attachments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attachments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/leads/[id]/attachments
 * Upload a new attachment for a lead
 * Requirements: 17.3-17.7, 30.21
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leadId = params.id;
    const userId = authResult.user.userId;

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (max 10MB) - Requirements 17.4
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Validate file type - Requirements 17.3, 17.5
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed types: PDF, images (JPG, PNG, GIF), documents (DOC, DOCX, XLS, XLSX)' },
        { status: 400 }
      );
    }

    // Save file to storage - Requirements 17.6, 17.7
    const { storagePath, fileName, fileSize, fileType } = await saveFile(file, leadId);

    // Insert attachment record
    const result = await pool.query(
      `INSERT INTO attachments (
        lead_id,
        uploaded_by,
        file_name,
        storage_path,
        file_size,
        file_type,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING 
        id,
        lead_id,
        uploaded_by as user_id,
        file_name as filename,
        storage_path as file_path,
        file_size,
        file_type as mime_type,
        description,
        created_at`,
      [leadId, userId, fileName, storagePath, fileSize, fileType]
    );

    // Log interaction
    await pool.query(
      `INSERT INTO interactions (
        lead_id,
        user_id,
        interaction_type,
        new_value,
        metadata
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        leadId,
        userId,
        'attachment_added',
        fileName,
        JSON.stringify({ filename: fileName, file_size: fileSize }),
      ]
    );

    return NextResponse.json({
      attachment: result.rows[0],
      message: 'Attachment uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading attachment:', error);
    return NextResponse.json(
      { error: 'Failed to upload attachment' },
      { status: 500 }
    );
  }
}
