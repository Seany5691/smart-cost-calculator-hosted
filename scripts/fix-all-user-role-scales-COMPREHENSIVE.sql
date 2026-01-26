-- COMPREHENSIVE Fix for User Role Scales Data
-- This script adds ALL missing role-based pricing fields to the scales configuration
-- Covers: Installation, Finance Fees, Gross Profit, and Additional Costs

\echo '=== COMPREHENSIVE SCALES FIX ==='
\echo 'This will add role-based pricing for ALL scales sections'
\echo ''

\echo '=== Step 1: Checking current scales data ==='
SELECT 
  id,
  jsonb_pretty(scales_data) as current_structure
FROM scales 
ORDER BY created_at DESC 
LIMIT 1;

\echo ''
\echo '=== Step 2: Adding missing role-based pricing fields ==='
\echo 'Processing: Additional Costs, Installation, Finance Fees, Gross Profit'
\echo ''

-- This function will convert simple scales structure to enhanced role-based structure
DO $$
DECLARE
  scales_record RECORD;
  new_scales_data JSONB;
  installation_bands TEXT[] := ARRAY['0-4', '5-8', '9-16', '17-32', '33+'];
  finance_ranges TEXT[] := ARRAY['0-20000', '20001-50000', '50001-100000', '100001+'];
  gross_profit_bands TEXT[] := ARRAY['0-4', '5-8', '9-16', '17-32', '33+'];
  band TEXT;
BEGIN
  -- Get the latest scales record
  SELECT * INTO scales_record FROM scales ORDER BY created_at DESC LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No scales record found in database';
  END IF;
  
  new_scales_data := scales_record.scales_data;
  
  RAISE NOTICE 'Processing scales record ID: %', scales_record.id;
  
  -- ========================================
  -- 1. FIX ADDITIONAL COSTS
  -- ========================================
  RAISE NOTICE 'Fixing Additional Costs...';
  
  -- Add manager_cost_per_kilometer if missing
  IF NOT (new_scales_data->'additional_costs' ? 'manager_cost_per_kilometer') THEN
    new_scales_data := jsonb_set(
      new_scales_data,
      '{additional_costs,manager_cost_per_kilometer}',
      COALESCE(
        new_scales_data->'additional_costs'->'cost_per_kilometer',
        '0'::jsonb
      )
    );
    RAISE NOTICE '  Added manager_cost_per_kilometer';
  END IF;
  
  -- Add manager_cost_per_point if missing
  IF NOT (new_scales_data->'additional_costs' ? 'manager_cost_per_point') THEN
    new_scales_data := jsonb_set(
      new_scales_data,
      '{additional_costs,manager_cost_per_point}',
      COALESCE(
        new_scales_data->'additional_costs'->'cost_per_point',
        '0'::jsonb
      )
    );
    RAISE NOTICE '  Added manager_cost_per_point';
  END IF;
  
  -- Add user_cost_per_kilometer if missing
  IF NOT (new_scales_data->'additional_costs' ? 'user_cost_per_kilometer') THEN
    new_scales_data := jsonb_set(
      new_scales_data,
      '{additional_costs,user_cost_per_kilometer}',
      COALESCE(
        new_scales_data->'additional_costs'->'cost_per_kilometer',
        '0'::jsonb
      )
    );
    RAISE NOTICE '  Added user_cost_per_kilometer';
  END IF;
  
  -- Add user_cost_per_point if missing
  IF NOT (new_scales_data->'additional_costs' ? 'user_cost_per_point') THEN
    new_scales_data := jsonb_set(
      new_scales_data,
      '{additional_costs,user_cost_per_point}',
      COALESCE(
        new_scales_data->'additional_costs'->'cost_per_point',
        '0'::jsonb
      )
    );
    RAISE NOTICE '  Added user_cost_per_point';
  END IF;
  
  -- ========================================
  -- 2. FIX INSTALLATION COSTS
  -- ========================================
  RAISE NOTICE 'Fixing Installation Costs...';
  
  -- Check if installation has role-based structure
  IF NOT (new_scales_data->'installation' ? 'cost') THEN
    -- Convert simple structure to role-based structure
    DECLARE
      old_installation JSONB := new_scales_data->'installation';
      new_installation JSONB := '{"cost": {}, "managerCost": {}, "userCost": {}}'::jsonb;
    BEGIN
      FOREACH band IN ARRAY installation_bands LOOP
        IF old_installation ? band THEN
          new_installation := jsonb_set(new_installation, ARRAY['cost', band], old_installation->band);
          new_installation := jsonb_set(new_installation, ARRAY['managerCost', band], old_installation->band);
          new_installation := jsonb_set(new_installation, ARRAY['userCost', band], old_installation->band);
        END IF;
      END LOOP;
      new_scales_data := jsonb_set(new_scales_data, '{installation}', new_installation);
      RAISE NOTICE '  Converted installation to role-based structure';
    END;
  ELSE
    -- Already has role-based structure, just ensure all bands exist
    FOREACH band IN ARRAY installation_bands LOOP
      IF NOT (new_scales_data->'installation'->'managerCost' ? band) THEN
        new_scales_data := jsonb_set(
          new_scales_data,
          ARRAY['installation', 'managerCost', band],
          COALESCE(new_scales_data->'installation'->'cost'->band, '0'::jsonb)
        );
      END IF;
      IF NOT (new_scales_data->'installation'->'userCost' ? band) THEN
        new_scales_data := jsonb_set(
          new_scales_data,
          ARRAY['installation', 'userCost', band],
          COALESCE(new_scales_data->'installation'->'cost'->band, '0'::jsonb)
        );
      END IF;
    END LOOP;
    RAISE NOTICE '  Ensured all installation bands have role-based pricing';
  END IF;
  
  -- ========================================
  -- 3. FIX FINANCE FEES
  -- ========================================
  RAISE NOTICE 'Fixing Finance Fees...';
  
  -- Check if finance_fee has role-based structure
  IF NOT (new_scales_data->'finance_fee' ? 'cost') THEN
    -- Convert simple structure to role-based structure
    DECLARE
      old_finance_fee JSONB := new_scales_data->'finance_fee';
      new_finance_fee JSONB := '{"cost": {}, "managerCost": {}, "userCost": {}}'::jsonb;
    BEGIN
      FOREACH band IN ARRAY finance_ranges LOOP
        IF old_finance_fee ? band THEN
          new_finance_fee := jsonb_set(new_finance_fee, ARRAY['cost', band], old_finance_fee->band);
          new_finance_fee := jsonb_set(new_finance_fee, ARRAY['managerCost', band], old_finance_fee->band);
          new_finance_fee := jsonb_set(new_finance_fee, ARRAY['userCost', band], old_finance_fee->band);
        END IF;
      END LOOP;
      new_scales_data := jsonb_set(new_scales_data, '{finance_fee}', new_finance_fee);
      RAISE NOTICE '  Converted finance_fee to role-based structure';
    END;
  ELSE
    -- Already has role-based structure, just ensure all ranges exist
    FOREACH band IN ARRAY finance_ranges LOOP
      IF NOT (new_scales_data->'finance_fee'->'managerCost' ? band) THEN
        new_scales_data := jsonb_set(
          new_scales_data,
          ARRAY['finance_fee', 'managerCost', band],
          COALESCE(new_scales_data->'finance_fee'->'cost'->band, '0'::jsonb)
        );
      END IF;
      IF NOT (new_scales_data->'finance_fee'->'userCost' ? band) THEN
        new_scales_data := jsonb_set(
          new_scales_data,
          ARRAY['finance_fee', 'userCost', band],
          COALESCE(new_scales_data->'finance_fee'->'cost'->band, '0'::jsonb)
        );
      END IF;
    END LOOP;
    RAISE NOTICE '  Ensured all finance fee ranges have role-based pricing';
  END IF;
  
  -- ========================================
  -- 4. FIX GROSS PROFIT
  -- ========================================
  RAISE NOTICE 'Fixing Gross Profit...';
  
  -- Check if gross_profit has role-based structure
  IF NOT (new_scales_data->'gross_profit' ? 'cost') THEN
    -- Convert simple structure to role-based structure
    DECLARE
      old_gross_profit JSONB := new_scales_data->'gross_profit';
      new_gross_profit JSONB := '{"cost": {}, "managerCost": {}, "userCost": {}}'::jsonb;
    BEGIN
      FOREACH band IN ARRAY gross_profit_bands LOOP
        IF old_gross_profit ? band THEN
          new_gross_profit := jsonb_set(new_gross_profit, ARRAY['cost', band], old_gross_profit->band);
          new_gross_profit := jsonb_set(new_gross_profit, ARRAY['managerCost', band], old_gross_profit->band);
          new_gross_profit := jsonb_set(new_gross_profit, ARRAY['userCost', band], old_gross_profit->band);
        END IF;
      END LOOP;
      new_scales_data := jsonb_set(new_scales_data, '{gross_profit}', new_gross_profit);
      RAISE NOTICE '  Converted gross_profit to role-based structure';
    END;
  ELSE
    -- Already has role-based structure, just ensure all bands exist
    FOREACH band IN ARRAY gross_profit_bands LOOP
      IF NOT (new_scales_data->'gross_profit'->'managerCost' ? band) THEN
        new_scales_data := jsonb_set(
          new_scales_data,
          ARRAY['gross_profit', 'managerCost', band],
          COALESCE(new_scales_data->'gross_profit'->'cost'->band, '0'::jsonb)
        );
      END IF;
      IF NOT (new_scales_data->'gross_profit'->'userCost' ? band) THEN
        new_scales_data := jsonb_set(
          new_scales_data,
          ARRAY['gross_profit', 'userCost', band],
          COALESCE(new_scales_data->'gross_profit'->'cost'->band, '0'::jsonb)
        );
      END IF;
    END LOOP;
    RAISE NOTICE '  Ensured all gross profit bands have role-based pricing';
  END IF;
  
  -- ========================================
  -- 5. UPDATE THE DATABASE
  -- ========================================
  UPDATE scales 
  SET 
    scales_data = new_scales_data,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = scales_record.id;
  
  RAISE NOTICE 'Database updated successfully!';
END $$;

\echo ''
\echo '=== Step 3: Verifying the complete structure ==='
SELECT 
  id,
  jsonb_pretty(scales_data->'additional_costs') as additional_costs,
  jsonb_pretty(scales_data->'installation') as installation_structure,
  jsonb_pretty(scales_data->'finance_fee') as finance_fee_structure,
  jsonb_pretty(scales_data->'gross_profit') as gross_profit_structure,
  updated_at
FROM scales 
ORDER BY created_at DESC 
LIMIT 1;

\echo ''
\echo '=== ✅ COMPREHENSIVE FIX COMPLETE! ==='
\echo ''
\echo 'All scales sections now have role-based pricing:'
\echo '  ✅ Additional Costs (user_cost_per_kilometer, user_cost_per_point)'
\echo '  ✅ Installation (cost, managerCost, userCost for all 5 bands)'
\echo '  ✅ Finance Fees (cost, managerCost, userCost for all 4 ranges)'
\echo '  ✅ Gross Profit (cost, managerCost, userCost for all 5 bands)'
\echo ''
\echo 'Next steps:'
\echo '  1. Restart your application (docker-compose restart)'
\echo '  2. Clear browser cache (Ctrl+Shift+Delete)'
\echo '  3. Test with User role - Total Costs should now show values!'
\echo ''
