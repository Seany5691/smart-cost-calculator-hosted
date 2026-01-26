-- Fix Extension Flags for Hardware Items
-- This script updates the is_extension field for hardware items
-- Run this on your PostgreSQL database

-- Update extension items (phones that count as extensions)
UPDATE hardware_items 
SET is_extension = true 
WHERE name IN (
  'Desk Phone B&W',
  'Desk Phone Colour',
  'Switchboard Colour',
  'Cordless Phone'
);

-- Ensure non-extension items are marked correctly
UPDATE hardware_items 
SET is_extension = false 
WHERE name NOT IN (
  'Desk Phone B&W',
  'Desk Phone Colour',
  'Switchboard Colour',
  'Cordless Phone'
);

-- Verify the changes
SELECT 
  name, 
  is_extension,
  CASE 
    WHEN is_extension THEN 'Extension' 
    ELSE 'Non-Extension' 
  END as type
FROM hardware_items 
ORDER BY is_extension DESC, display_order;
