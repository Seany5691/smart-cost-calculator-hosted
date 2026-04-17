import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { verifyToken } from '@/lib/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// GET /api/email-templates - Fetch all email templates
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Fetch templates with their fields
    const templatesResult = await pool.query(
      `SELECT id, name, description, template_content, is_active, created_by, created_at, updated_at
       FROM email_templates
       WHERE is_active = true
       ORDER BY name ASC`
    );

    const templates = templatesResult.rows;

    // Fetch fields for all templates
    const fieldsResult = await pool.query(
      `SELECT id, template_id, field_key, field_label, field_type, lead_field_source, 
              is_required, field_order, options, placeholder, created_at
       FROM email_template_fields
       ORDER BY field_order ASC`
    );

    // Group fields by template_id
    const fieldsByTemplate: Record<string, any[]> = {};
    for (const field of fieldsResult.rows) {
      if (!fieldsByTemplate[field.template_id]) {
        fieldsByTemplate[field.template_id] = [];
      }
      fieldsByTemplate[field.template_id].push(field);
    }

    // Attach fields to templates
    const templatesWithFields = templates.map(template => ({
      ...template,
      fields: fieldsByTemplate[template.id] || []
    }));

    return NextResponse.json({ templates: templatesWithFields });
  } catch (error) {
    console.error('Error fetching email templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email templates' },
      { status: 500 }
    );
  }
}

// POST /api/email-templates - Create new email template (Admin only)
export async function POST(request: NextRequest) {
  try {
    // Verify authentication and admin role
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

    // Validate required fields
    if (!name || !template_content) {
      return NextResponse.json(
        { error: 'Name and template content are required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert template
      const templateResult = await client.query(
        `INSERT INTO email_templates (name, description, template_content, is_active, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [name, description || null, template_content, is_active !== false, decoded.userId]
      );

      const template = templateResult.rows[0];

      // Insert fields if provided
      if (fields && Array.isArray(fields) && fields.length > 0) {
        for (const field of fields) {
          await client.query(
            `INSERT INTO email_template_fields 
             (template_id, field_key, field_label, field_type, lead_field_source, 
              is_required, field_order, options, placeholder)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              template.id,
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

      // Fetch the complete template with fields
      const completeTemplate = await pool.query(
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
        [template.id]
      );

      return NextResponse.json({ template: completeTemplate.rows[0] }, { status: 201 });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating email template:', error);
    return NextResponse.json(
      { error: 'Failed to create email template' },
      { status: 500 }
    );
  }
}
