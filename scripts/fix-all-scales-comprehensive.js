const { Pool } = require('pg');

const INSTALLATION_BANDS = ['0-4', '5-8', '9-16', '17-32', '33+'];
const FINANCE_RANGES = ['0-20000', '20001-50000', '50001-100000', '100001+'];
const GROSS_PROFIT_BANDS = ['0-4', '5-8', '9-16', '17-32', '33+'];

async function fixAllScales() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔍 COMPREHENSIVE SCALES FIX');
    console.log('This will add role-based pricing for ALL scales sections\n');
    
    console.log('📋 Step 1: Checking current scales data...');
    
    const checkResult = await pool.query(`
      SELECT id, scales_data
      FROM scales 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (checkResult.rows.length === 0) {
      throw new Error('No scales record found in database');
    }
    
    const scalesRecord = checkResult.rows[0];
    console.log('Found scales record ID:', scalesRecord.id);
    
    let scalesData = scalesRecord.scales_data;
    let changesMade = [];
    
    // ========================================
    // 1. FIX ADDITIONAL COSTS
    // ========================================
    console.log('\n📝 Step 2: Fixing Additional Costs...');
    
    if (!scalesData.additional_costs) {
      scalesData.additional_costs = {};
    }
    
    const baseCostPerKm = scalesData.additional_costs.cost_per_kilometer || 0;
    const baseCostPerPoint = scalesData.additional_costs.cost_per_point || 0;
    
    if (!scalesData.additional_costs.manager_cost_per_kilometer) {
      scalesData.additional_costs.manager_cost_per_kilometer = baseCostPerKm;
      changesMade.push('  ✅ Added manager_cost_per_kilometer');
    }
    
    if (!scalesData.additional_costs.manager_cost_per_point) {
      scalesData.additional_costs.manager_cost_per_point = baseCostPerPoint;
      changesMade.push('  ✅ Added manager_cost_per_point');
    }
    
    if (!scalesData.additional_costs.user_cost_per_kilometer) {
      scalesData.additional_costs.user_cost_per_kilometer = baseCostPerKm;
      changesMade.push('  ✅ Added user_cost_per_kilometer');
    }
    
    if (!scalesData.additional_costs.user_cost_per_point) {
      scalesData.additional_costs.user_cost_per_point = baseCostPerPoint;
      changesMade.push('  ✅ Added user_cost_per_point');
    }
    
    // ========================================
    // 2. FIX INSTALLATION COSTS
    // ========================================
    console.log('\n📝 Step 3: Fixing Installation Costs...');
    
    if (!scalesData.installation.cost) {
      // Convert simple structure to role-based structure
      const oldInstallation = scalesData.installation;
      const newInstallation = { cost: {}, managerCost: {}, userCost: {} };
      
      INSTALLATION_BANDS.forEach(band => {
        const value = oldInstallation[band] || 0;
        newInstallation.cost[band] = value;
        newInstallation.managerCost[band] = value;
        newInstallation.userCost[band] = value;
      });
      
      scalesData.installation = newInstallation;
      changesMade.push('  ✅ Converted installation to role-based structure');
    } else {
      // Ensure all bands have role-based pricing
      INSTALLATION_BANDS.forEach(band => {
        if (!scalesData.installation.managerCost) {
          scalesData.installation.managerCost = {};
        }
        if (!scalesData.installation.userCost) {
          scalesData.installation.userCost = {};
        }
        
        if (!scalesData.installation.managerCost[band]) {
          scalesData.installation.managerCost[band] = scalesData.installation.cost[band] || 0;
        }
        if (!scalesData.installation.userCost[band]) {
          scalesData.installation.userCost[band] = scalesData.installation.cost[band] || 0;
        }
      });
      changesMade.push('  ✅ Ensured all installation bands have role-based pricing');
    }
    
    // ========================================
    // 3. FIX FINANCE FEES
    // ========================================
    console.log('\n📝 Step 4: Fixing Finance Fees...');
    
    if (!scalesData.finance_fee.cost) {
      // Convert simple structure to role-based structure
      const oldFinanceFee = scalesData.finance_fee;
      const newFinanceFee = { cost: {}, managerCost: {}, userCost: {} };
      
      FINANCE_RANGES.forEach(range => {
        const value = oldFinanceFee[range] || 0;
        newFinanceFee.cost[range] = value;
        newFinanceFee.managerCost[range] = value;
        newFinanceFee.userCost[range] = value;
      });
      
      scalesData.finance_fee = newFinanceFee;
      changesMade.push('  ✅ Converted finance_fee to role-based structure');
    } else {
      // Ensure all ranges have role-based pricing
      FINANCE_RANGES.forEach(range => {
        if (!scalesData.finance_fee.managerCost) {
          scalesData.finance_fee.managerCost = {};
        }
        if (!scalesData.finance_fee.userCost) {
          scalesData.finance_fee.userCost = {};
        }
        
        if (!scalesData.finance_fee.managerCost[range]) {
          scalesData.finance_fee.managerCost[range] = scalesData.finance_fee.cost[range] || 0;
        }
        if (!scalesData.finance_fee.userCost[range]) {
          scalesData.finance_fee.userCost[range] = scalesData.finance_fee.cost[range] || 0;
        }
      });
      changesMade.push('  ✅ Ensured all finance fee ranges have role-based pricing');
    }
    
    // ========================================
    // 4. FIX GROSS PROFIT
    // ========================================
    console.log('\n📝 Step 5: Fixing Gross Profit...');
    
    if (!scalesData.gross_profit.cost) {
      // Convert simple structure to role-based structure
      const oldGrossProfit = scalesData.gross_profit;
      const newGrossProfit = { cost: {}, managerCost: {}, userCost: {} };
      
      GROSS_PROFIT_BANDS.forEach(band => {
        const value = oldGrossProfit[band] || 0;
        newGrossProfit.cost[band] = value;
        newGrossProfit.managerCost[band] = value;
        newGrossProfit.userCost[band] = value;
      });
      
      scalesData.gross_profit = newGrossProfit;
      changesMade.push('  ✅ Converted gross_profit to role-based structure');
    } else {
      // Ensure all bands have role-based pricing
      GROSS_PROFIT_BANDS.forEach(band => {
        if (!scalesData.gross_profit.managerCost) {
          scalesData.gross_profit.managerCost = {};
        }
        if (!scalesData.gross_profit.userCost) {
          scalesData.gross_profit.userCost = {};
        }
        
        if (!scalesData.gross_profit.managerCost[band]) {
          scalesData.gross_profit.managerCost[band] = scalesData.gross_profit.cost[band] || 0;
        }
        if (!scalesData.gross_profit.userCost[band]) {
          scalesData.gross_profit.userCost[band] = scalesData.gross_profit.cost[band] || 0;
        }
      });
      changesMade.push('  ✅ Ensured all gross profit bands have role-based pricing');
    }
    
    // ========================================
    // 5. UPDATE THE DATABASE
    // ========================================
    console.log('\n📝 Step 6: Updating database...');
    
    const updateResult = await pool.query(`
      UPDATE scales 
      SET 
        scales_data = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id
    `, [JSON.stringify(scalesData), scalesRecord.id]);
    
    console.log('✅ Database updated successfully!');
    
    // ========================================
    // 6. VERIFY THE UPDATE
    // ========================================
    console.log('\n📋 Step 7: Verifying the complete structure...');
    
    const verifyResult = await pool.query(`
      SELECT id, scales_data, updated_at
      FROM scales 
      WHERE id = $1
    `, [scalesRecord.id]);
    
    const updatedData = verifyResult.rows[0].scales_data;
    
    console.log('\n✅ COMPREHENSIVE FIX COMPLETE!\n');
    console.log('Changes made:');
    changesMade.forEach(change => console.log(change));
    
    console.log('\n📊 Verification:');
    console.log('  ✅ Additional Costs:', {
      cost_per_kilometer: updatedData.additional_costs.cost_per_kilometer,
      cost_per_point: updatedData.additional_costs.cost_per_point,
      manager_cost_per_kilometer: updatedData.additional_costs.manager_cost_per_kilometer,
      manager_cost_per_point: updatedData.additional_costs.manager_cost_per_point,
      user_cost_per_kilometer: updatedData.additional_costs.user_cost_per_kilometer,
      user_cost_per_point: updatedData.additional_costs.user_cost_per_point
    });
    
    console.log('  ✅ Installation has role-based structure:', 
      updatedData.installation.cost && updatedData.installation.managerCost && updatedData.installation.userCost ? 'YES' : 'NO');
    
    console.log('  ✅ Finance Fees has role-based structure:', 
      updatedData.finance_fee.cost && updatedData.finance_fee.managerCost && updatedData.finance_fee.userCost ? 'YES' : 'NO');
    
    console.log('  ✅ Gross Profit has role-based structure:', 
      updatedData.gross_profit.cost && updatedData.gross_profit.managerCost && updatedData.gross_profit.userCost ? 'YES' : 'NO');
    
    console.log('\n🎉 Next steps:');
    console.log('  1. Restart your application (docker-compose restart)');
    console.log('  2. Clear browser cache (Ctrl+Shift+Delete)');
    console.log('  3. Test with User role - Total Costs should now show values!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixAllScales();
