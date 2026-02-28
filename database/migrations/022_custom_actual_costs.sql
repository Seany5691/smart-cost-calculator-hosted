-- Migration: Add custom_actual_costs column to deal_calculations table
-- Purpose: Store admin-customized actual cost prices for individual items per deal
-- Date: 2026-02-28

-- Add custom_actual_costs JSONB column to store per-deal cost overrides
ALTER TABLE deal_calculations 
ADD COLUMN IF NOT EXISTS custom_actual_costs JSONB DEFAULT NULL;

-- Add comment explaining the column structure
COMMENT ON COLUMN deal_calculations.custom_actual_costs IS 
'Stores admin-customized actual cost prices for hardware, connectivity, and licensing items. 
Structure: {
  "hardware": [{"name": "Item Name", "customActualCost": 1234.56}],
  "connectivity": [{"name": "Service Name", "customActualCost": 567.89}],
  "licensing": [{"name": "License Name", "customActualCost": 890.12}]
}';

-- Create index for faster lookups when custom costs exist
CREATE INDEX IF NOT EXISTS idx_deals_custom_costs ON deal_calculations(id) 
WHERE custom_actual_costs IS NOT NULL;
