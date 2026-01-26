const { Pool } = require('pg');

async function fixScales() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔍 Checking current scales data...');
    
    const checkResult = await pool.query(`
      SELECT id, scales_data->'additional_costs' as additional_costs
      FROM scales 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    console.log('Current data:', JSON.stringify(checkResult.rows[0], null, 2));
    
    console.log('\n📝 Updating scales data...');
    
    const updateResult = await pool.query(`
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
      WHERE id = (SELECT id FROM scales ORDER BY created_at DESC LIMIT 1)
      RETURNING id
    `);
    
    console.log('✅ Updated:', updateResult.rowCount, 'row(s)');
    
    console.log('\n🔍 Verifying update...');
    
    const verifyResult = await pool.query(`
      SELECT id, scales_data->'additional_costs' as additional_costs
      FROM scales 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    console.log('Updated data:', JSON.stringify(verifyResult.rows[0], null, 2));
    console.log('\n✅ Fix complete!');
    console.log('\nYou should see all 6 fields:');
    console.log('  - cost_per_kilometer');
    console.log('  - cost_per_point');
    console.log('  - manager_cost_per_kilometer');
    console.log('  - manager_cost_per_point');
    console.log('  - user_cost_per_kilometer ✅');
    console.log('  - user_cost_per_point ✅');
    console.log('\nNext steps:');
    console.log('  1. Restart your application');
    console.log('  2. Clear browser cache');
    console.log('  3. Test with User role');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixScales();
