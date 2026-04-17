-- Migration 024: Email Templates System
-- This creates tables for managing email templates with dynamic fields

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create email_template_fields table for dynamic field definitions
CREATE TABLE IF NOT EXISTS email_template_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
  field_key VARCHAR(100) NOT NULL,
  field_label VARCHAR(255) NOT NULL,
  field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('text', 'dropdown', 'date', 'bullet_list', 'lead_field')),
  lead_field_source VARCHAR(100), -- e.g., 'contact_person', 'name', 'phone'
  is_required BOOLEAN DEFAULT false,
  field_order INTEGER DEFAULT 0,
  options JSONB, -- For dropdown options, bullet list config, etc.
  placeholder TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_email_template_fields_template_id ON email_template_fields(template_id);
CREATE INDEX IF NOT EXISTS idx_email_template_fields_order ON email_template_fields(template_id, field_order);

-- Add comments for documentation
COMMENT ON TABLE email_templates IS 'Stores email templates for lead communication';
COMMENT ON TABLE email_template_fields IS 'Defines dynamic fields for each email template';
COMMENT ON COLUMN email_template_fields.field_type IS 'Field types: text, dropdown, date, bullet_list, lead_field';
COMMENT ON COLUMN email_template_fields.lead_field_source IS 'Maps to lead table columns for auto-fill';
COMMENT ON COLUMN email_template_fields.options IS 'JSON config for dropdown options, bullet list settings, etc.';

-- Insert the first template (Document Request Email)
INSERT INTO email_templates (name, description, template_content, is_active)
VALUES (
  'Document Request Email',
  'Request documents from a lead after initial meeting',
  'Dear [Contact Person],
I hope this email finds you well.
It was great meeting you [Meeting Time] at [Company Name]. During our conversation, you mentioned some of the challenges with your current situation, and we discussed the possibility of exploring options that might help improve things for you.

As discussed, it would be helpful if you could share a copy of the relevant documents:
[Documents]

Once I have these documents, I can put together a proposal for you and I can tailor it specifically to your needs.

We''ve also attached our company profile for your perusal in the meantime, so you can have a bit more background on who we are.

I will give you a call before I come through to run through the proposal with you. We can then discuss whether any possible next steps might make sense for your business, particularly if they could help address the challenges you are currently experiencing.

Please let me know if you''re able to share the documents. I''m also happy to answer any questions in the meantime.

Thank You.',
  true
)
RETURNING id;

-- Insert fields for the Document Request Email template
-- Note: We'll use a variable to store the template_id
DO $$
DECLARE
  template_uuid UUID;
BEGIN
  -- Get the template ID we just created
  SELECT id INTO template_uuid FROM email_templates WHERE name = 'Document Request Email' LIMIT 1;
  
  -- Insert fields
  INSERT INTO email_template_fields (template_id, field_key, field_label, field_type, lead_field_source, is_required, field_order, placeholder)
  VALUES
    (template_uuid, 'contact_person', 'Contact Person', 'lead_field', 'contact_person', true, 1, NULL),
    (template_uuid, 'meeting_time', 'Meeting Time', 'dropdown', NULL, true, 2, NULL),
    (template_uuid, 'company_name', 'Company Name', 'lead_field', 'name', true, 3, NULL),
    (template_uuid, 'documents', 'Documents Required', 'bullet_list', NULL, true, 4, 'Enter document name');
  
  -- Update options for meeting_time dropdown
  UPDATE email_template_fields
  SET options = '{"options": ["Today", "Last Week", "Custom Date"]}'::jsonb
  WHERE template_id = template_uuid AND field_key = 'meeting_time';
  
  -- Update options for documents bullet list
  UPDATE email_template_fields
  SET options = '{"min_items": 1, "max_items": 20, "default_count": 3}'::jsonb
  WHERE template_id = template_uuid AND field_key = 'documents';
END $$;
