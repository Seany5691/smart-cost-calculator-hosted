import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { verifyToken } from '@/lib/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// GET /api/email-templates/[id] - Fetch single template
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const result = await pool.query(
      `SELECT t.*, 
              json_agg(
                json_build_object(
                  'id', f.id,
                  'field_key', f.field_key,
                  'field_label', f.field_label,
                  'field_type', f.field_type,
                  'lead_field_source', f.lead_field_source,
                  'is_required', f.is_required,
                  'field_order', f.field_order,
                  'options', f.options,
                  'placeholder', f.placeholder
                ) ORDER BY f.field_order
              ) as fields
       FROM email_templates t
       LEFT JOIN email_template_fields f ON t.id = f.template_id
       WHERE t.id = $1
       GROUP BY t.id`,
      [params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ template: result.rows[0] });
  } catch (error) {
    console.error('Error fetching email template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email template' },
      { status: 500 }
    );
  }
}

// PUT /api/email-templates/[id] - Update template (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is admin
    const userResult = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (!userResult.rows[0] || userResult.rows[0].role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, template_content, is_active, fields } = body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update template
      await client.query(
        `UPDATE email_templates 
         SET name = $1, description = $2, template_content = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [name, description || null, template_content, is_active !== false, params.id]
      );

      // Delete existing fields
      await client.query(
        'DELETE FROM email_template_fields WHERE template_id = $1',
        [params.id]
      );

      // Insert new fields
      if (fields && Array.isArray(fields) && fields.length > 0) {
        for (const field of fields) {
          await client.query(
            `INSERT INTO email_template_fields 
             (template_id, field_key, field_label, field_type, lead_field_source, 
              is_required, field_order, options, placeholder)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              params.id,
              field.field_key,
              field.field_label,
              field.field_type,
              field.lead_field_source || null,
              field.is_required || false,
              field.field_order || 0,
              field.options ? JSON.stringify(field.options) : null,
              field.placeholder || null
            ]
          );
        }
      }

      await client.query('COMMIT');

      // Fetch updated template
      const result = await pool.query(
        `SELECT t.*, 
                json_agg(
                  json_build_object(
                    'id', f.id,
                    'field_key', f.field_key,
                    'field_label', f.field_label,
                    'field_type', f.field_type,
                    'lead_field_source', f.lead_field_source,
                    'is_required', f.is_required,
                    'field_order', f.field_order,
                    'options', f.options,
                    'placeholder', f.placeholder
                  ) ORDER BY f.field_order
                ) as fields
         FROM email_templates t
         LEFT JOIN email_template_fields f ON t.id = f.template_id
         WHERE t.id = $1
         GROUP BY t.id`,
        [params.id]
      );

      return NextResponse.json({ template: result.rows[0] });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating email template:', error);
    return NextResponse.json(
      { error: 'Failed to update email template' },
      { status: 500 }
    );
  }
}

// DELETE /api/email-templates/[id] - Delete template (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is admin
    const userResult = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (!userResult.rows[0] || userResult.rows[0].role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Delete template (fields will be cascade deleted)
    await pool.query('DELETE FROM email_templates WHERE id = $1', [params.id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting email template:', error);
    return NextResponse.json(
      { error: 'Failed to delete email template' },
      { status: 500 }
    );
  }
}
