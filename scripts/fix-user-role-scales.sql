-- Fix User Role Scales Data
-- This script adds the missing role-based pricing fields to the scales configuration
-- so that User role can see proper pricing in the Total Costs section

\echo '=== Checking current scales data ==='
SELECT 
  id,
  scales_data->'additional_costs' as additional_costs,
  created_at
FROM scales 
ORDER BY created_at DESC 
LIMIT 1;

\echo ''
\echo '=== Updating scales data to add missing fields ==='

-- Update the scales data to include role-based pricing fields
-- This copies the base cost values to manager and user fields if they don't exist
UPDATE scales 
SET scales_data = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        scales_data,
        '{additional_costs,manager_cost_per_kilometer}',
        COALESCE(
          scales_data->'additional_costs'->'manager_cost_per_kilometer',
          scales_data->'additional_costs'->'cost_per_kilometer',
          '0'::jsonb
        )
      ),
      '{additional_costs,manager_cost_per_point}',
      COALESCE(
        scales_data->'additional_costs'->'manager_cost_per_point',
        scales_data->'additional_costs'->'cost_per_point',
        '0'::jsonb
      )
    ),
    '{additional_costs,user_cost_per_kilometer}',
    COALESCE(
      scales_data->'additional_costs'->'user_cost_per_kilometer',
      scales_data->'additional_costs'->'cost_per_kilometer',
      '0'::jsonb
    )
  ),
  '{additional_costs,user_cost_per_point}',
  COALESCE(
    scales_data->'additional_costs'->'user_cost_per_point',
    scales_data->'additional_costs'->'cost_per_point',
    '0'::jsonb
  )
),
updated_at = CURRENT_TIMESTAMP
WHERE id = (SELECT id FROM scales ORDER BY created_at DESC LIMIT 1);

\echo ''
\echo '=== Verifying the update ==='
SELECT 
  id,
  scales_data->'additional_costs' as additional_costs,
  updated_at
FROM scales 
ORDER BY created_at DESC 
LIMIT 1;

\echo ''
\echo '=== Fix complete! ==='
\echo 'Expected output should show all 6 fields:'
\echo '  - cost_per_kilometer'
\echo '  - cost_per_point'
\echo '  - manager_cost_per_kilometer'
\echo '  - manager_cost_per_point'
\echo '  - user_cost_per_kilometer'
\echo '  - user_cost_per_point'
\echo ''
\echo 'Next steps:'
\echo '  1. Restart your application'
\echo '  2. Clear browser cache'
\echo '  3. Test with User role'
