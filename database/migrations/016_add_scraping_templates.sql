-- Migration: Add Scraping Templates Table
-- Allows users to save and reuse common scraping configurations

CREATE TABLE IF NOT EXISTS scraping_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  towns TEXT[] NOT NULL,
  industries TEXT[] NOT NULL,
  config JSONB,
  is_favorite BOOLEAN DEFAULT FALSE,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON scraping_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_is_favorite ON scraping_templates(is_favorite);
CREATE INDEX IF NOT EXISTS idx_templates_use_count ON scraping_templates(use_count DESC);

-- Comments
COMMENT ON TABLE scraping_templates IS 'Stores reusable scraping configurations (templates)';
COMMENT ON COLUMN scraping_templates.name IS 'Template name (e.g., "Gauteng Pharmacies")';
COMMENT ON COLUMN scraping_templates.description IS 'Optional description of what this template is for';
COMMENT ON COLUMN scraping_templates.towns IS 'Array of town names';
COMMENT ON COLUMN scraping_templates.industries IS 'Array of industry names';
COMMENT ON COLUMN scraping_templates.config IS 'Optional scraping configuration (concurrency settings)';
COMMENT ON COLUMN scraping_templates.is_favorite IS 'Whether this template is marked as favorite';
COMMENT ON COLUMN scraping_templates.use_count IS 'Number of times this template has been used';
