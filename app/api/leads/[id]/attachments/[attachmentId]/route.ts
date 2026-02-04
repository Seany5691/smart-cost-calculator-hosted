/**
 * Individual Attachment API Routes
 * Handles download and deletion of specific attachments
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { verifyAuth } from '@/lib/middleware';
import { readFile, deleteFile } from '@/lib/storage';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/leads/[id]/attachments/[attachmentId]
 * Download an attachment
 * Requirements: 17.10-17.11
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; attachmentId: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { attachmentId } = params;

    // Get attachment details
    const result = await pool.query(
      `SELECT * FROM attachments WHERE id = $1`,
      [attachmentId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    const attachment = result.rows[0];

    // Read file from storage
    const fileBuffer = await readFile(attachment.file_path);

    // Return file with appropriate headers
    return new NextResponse(fileBuffer as any, {
      headers: {
        'Content-Type': attachment.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${attachment.filename}"`,
        'Content-Length': attachment.file_size.toString(),
      },
    });
  } catch (error) {
    console.error('Error downloading attachment:', error);
    return NextResponse.json(
      { error: 'Failed to download attachment' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/leads/[id]/attachments/[attachmentId]
 * Delete an attachment
 * Requirements: 17.12-17.14, 30.22
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; attachmentId: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: leadId, attachmentId } = params;
    const userId = authResult.user.userId;

    // Get attachment details
    const result = await pool.query(
      `SELECT * FROM attachments WHERE id = $1 AND lead_id = $2`,
      [attachmentId, leadId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    const attachment = result.rows[0];

    // Delete file from storage
    await deleteFile(attachment.file_path);

    // Delete record from database
    await pool.query(`DELETE FROM attachments WHERE id = $1`, [attachmentId]);

    // Log interaction
    await pool.query(
      `INSERT INTO interactions (
        lead_id,
        user_id,
        interaction_type,
        old_value,
        metadata
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        leadId,
        userId,
        'attachment_deleted',
        attachment.filename,
        JSON.stringify({ filename: attachment.filename }),
      ]
    );

    return NextResponse.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    return NextResponse.json(
      { error: 'Failed to delete attachment' },
      { status: 500 }
    );
  }
}
