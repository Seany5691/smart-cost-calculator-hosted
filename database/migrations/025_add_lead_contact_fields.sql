-- Migration 025: Add additional contact and business fields to leads table
-- Adds: email, cell_number, pbx_link, business_registration_number, vat_number

ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS cell_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS pbx_link TEXT,
ADD COLUMN IF NOT EXISTS business_registration_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS vat_number VARCHAR(100);

-- Add indexes for searchable fields
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_cell_number ON leads(cell_number);

-- Add comments for documentation
COMMENT ON COLUMN leads.email IS 'Email address for the lead contact';
COMMENT ON COLUMN leads.cell_number IS 'Cell/mobile phone number';
COMMENT ON COLUMN leads.pbx_link IS 'URL link to PBX system';
COMMENT ON COLUMN leads.business_registration_number IS 'Business registration/company number';
COMMENT ON COLUMN leads.vat_number IS 'VAT registration number';
