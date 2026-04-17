import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { verifyToken } from '@/lib/auth';
import { generateEmailContent, validateLeadFields, validateFieldValues } from '@/lib/emailTemplates/utils';
import type { Lead } from '@/lib/leads/types';
import type { EmailTemplate } from '@/lib/emailTemplates/types';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// POST /api/email-templates/generate - Generate email from template
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { template_id, lead_id, field_values, lead_data } = body;

    if (!template_id || !lead_id) {
      return NextResponse.json(
        { error: 'Template ID and Lead ID are required' },
        { status: 400 }
      );
    }

    // Fetch template with fields
    const templateResult = await pool.query(
      `SELECT t.*, 
              json_agg(
                json_build_object(
                  'id', f.id,
                  'template_id', f.template_id,
                  'field_key', f.field_key,
                  'field_label', f.field_label,
                  'field_type', f.field_type,
                  'lead_field_source', f.lead_field_source,
                  'is_required', f.is_required,
                  'field_order', f.field_order,
                  'options', f.options,
                  'placeholder', f.placeholder,
                  'created_at', f.created_at
                ) ORDER BY f.field_order
              ) as fields
       FROM email_templates t
       LEFT JOIN email_template_fields f ON t.id = f.template_id
       WHERE t.id = $1 AND t.is_active = true
       GROUP BY t.id`,
      [template_id]
    );

    if (templateResult.rows.length === 0) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const template: EmailTemplate = templateResult.rows[0];

    // Use provided lead_data if available (for immediate updates), otherwise fetch from database
    let lead: Lead;
    if (lead_data) {
      console.log('[Generate API] Using provided lead_data instead of fetching from database');
      lead = lead_data as Lead;
    } else {
      // Fetch lead from database
      const leadResult = await pool.query(
        'SELECT * FROM leads WHERE id = $1',
        [lead_id]
      );

      if (leadResult.rows.length === 0) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
      }

      lead = leadResult.rows[0];
    }

    // Validate lead fields
    const leadValidation = validateLeadFields(lead, template.fields || []);
    if (!leadValidation.valid) {
      return NextResponse.json({
        success: false,
        missing_fields: leadValidation.missingFields,
        error: 'Required lead fields are missing'
      }, { status: 400 });
    }

    // Validate field values
    const fieldValidation = validateFieldValues(template.fields || [], field_values || {});
    if (!fieldValidation.valid) {
      return NextResponse.json({
        success: false,
        error: fieldValidation.errors.join(', ')
      }, { status: 400 });
    }

    // Generate email content
    const emailContent = generateEmailContent(template, lead, field_values || {});

    return NextResponse.json({
      success: true,
      email_content: emailContent
    });
  } catch (error) {
    console.error('Error generating email:', error);
    return NextResponse.json(
      { error: 'Failed to generate email' },
      { status: 500 }
    );
  }
}
