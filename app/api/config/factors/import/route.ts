import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/middleware';
import { query } from '@/lib/db';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or super_admin
    if (authResult.user.role !== 'admin' && authResult.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fieldMappingStr = formData.get('fieldMapping') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!fieldMappingStr) {
      return NextResponse.json({ error: 'No field mapping provided' }, { status: 400 });
    }

    const fieldMapping = JSON.parse(fieldMappingStr);

    // Read file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    // Build factor data structure
    const factorData: any = {
      cost: {},
      managerFactors: {},
      userFactors: {}
    };

    const errors: string[] = [];
    let rowsProcessed = 0;

    // Process each row
    for (let i = 0; i < jsonData.length; i++) {
      const row: any = jsonData[i];
      
      try {
        // Extract fields using mapping
        let term = row[fieldMapping.term]?.toString().trim();
        const escalation = row[fieldMapping.escalation]?.toString().trim();
        const range = row[fieldMapping.range]?.toString().trim();
        const costFactor = parseFloat(row[fieldMapping.costFactor]) || 0;
        const managerFactor = parseFloat(row[fieldMapping.managerFactor]) || 0;
        const userFactor = parseFloat(row[fieldMapping.userFactor]) || 0;

        // Validate required fields
        if (!term || !escalation || !range) {
          errors.push(`Row ${i + 2}: Missing required fields (term, escalation, range)`);
          continue;
        }

        // Normalize term format (convert "36 months" to "36_months")
        term = term.toLowerCase().replace(/\s+/g, '_');
        if (!term.includes('_months')) {
          term = term.replace(/(\d+)/, '$1_months');
        }

        // Validate term
        const validTerms = ['36_months', '48_months', '60_months'];
        if (!validTerms.includes(term)) {
          errors.push(`Row ${i + 2}: Invalid term "${term}". Must be one of: ${validTerms.join(', ')}`);
          continue;
        }

        // Validate escalation
        const validEscalations = ['0%', '10%', '15%'];
        if (!validEscalations.includes(escalation)) {
          errors.push(`Row ${i + 2}: Invalid escalation "${escalation}". Must be one of: ${validEscalations.join(', ')}`);
          continue;
        }

        // Validate range
        const validRanges = ['0-20000', '20001-50000', '50001-100000', '100000+'];
        if (!validRanges.includes(range)) {
          errors.push(`Row ${i + 2}: Invalid range "${range}". Must be one of: ${validRanges.join(', ')}`);
          continue;
        }

        // Validate factors are positive numbers
        if (costFactor < 0 || managerFactor < 0 || userFactor < 0) {
          errors.push(`Row ${i + 2}: Factors must be positive numbers`);
          continue;
        }

        // Initialize nested objects if they don't exist
        if (!factorData.cost[term]) factorData.cost[term] = {};
        if (!factorData.cost[term][escalation]) factorData.cost[term][escalation] = {};
        
        if (!factorData.managerFactors[term]) factorData.managerFactors[term] = {};
        if (!factorData.managerFactors[term][escalation]) factorData.managerFactors[term][escalation] = {};
        
        if (!factorData.userFactors[term]) factorData.userFactors[term] = {};
        if (!factorData.userFactors[term][escalation]) factorData.userFactors[term][escalation] = {};

        // Set factor values
        factorData.cost[term][escalation][range] = costFactor;
        factorData.managerFactors[term][escalation][range] = managerFactor;
        factorData.userFactors[term][escalation][range] = userFactor;

        rowsProcessed++;
      } catch (error: any) {
        errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }

    // Validate that all required combinations are present
    const terms = ['36_months', '48_months', '60_months'];
    const escalations = ['0%', '10%', '15%'];
    const ranges = ['0-20000', '20001-50000', '50001-100000', '100000+'];
    
    const requiredCombinations = terms.length * escalations.length * ranges.length;
    if (rowsProcessed < requiredCombinations) {
      return NextResponse.json({
        error: `Incomplete factor data. Expected ${requiredCombinations} rows, got ${rowsProcessed}. Please ensure all term/escalation/range combinations are present.`,
        errors
      }, { status: 400 });
    }

    // Get the most recent factor sheet ID or create if none exists
    const checkResult = await query('SELECT id FROM factors ORDER BY created_at DESC LIMIT 1');
    
    if (checkResult.rows.length === 0) {
      // No factors exist, insert new
      await query(
        `INSERT INTO factors (factors_data, created_at, updated_at)
         VALUES ($1, NOW(), NOW())`,
        [JSON.stringify(factorData)]
      );
    } else {
      // Update existing factors
      const currentId = checkResult.rows[0].id;
      await query(
        `UPDATE factors 
         SET factors_data = $1, updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(factorData), currentId]
      );
    }

    // Invalidate cache (optional - table may not exist)
    try {
      await query('UPDATE config_cache SET updated_at = NOW() WHERE config_type = $1', ['factors']);
    } catch (error) {
      // Config cache table doesn't exist yet, skip cache invalidation
      console.log('Config cache table not found, skipping cache invalidation');
    }

    return NextResponse.json({
      success: true,
      created: 0,
      updated: rowsProcessed,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Factors import error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import factors configuration' },
      { status: 500 }
    );
  }
}
