import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { pool } from '@/lib/db';

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const listName = formData.get('listName') as string;
    const fieldMappingStr = formData.get('fieldMapping') as string;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (!listName || listName.trim() === '') {
      return NextResponse.json({ error: 'List name is required' }, { status: 400 });
    }

    // Parse field mapping if provided, otherwise use auto-detection
    let fieldMapping: any = {};
    if (fieldMappingStr) {
      try {
        fieldMapping = JSON.parse(fieldMappingStr);
      } catch (e) {
        return NextResponse.json({ error: 'Invalid field mapping format' }, { status: 400 });
      }
    }

    // Parse Excel file
    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    // Auto-detect column mappings if not provided (case-insensitive)
    if (Object.keys(fieldMapping).length === 0) {
      const firstRow: any = jsonData[0];
      const headers = Object.keys(firstRow);
      
      // Map common column names (case-insensitive)
      const mappings: { [key: string]: string[] } = {
        name: ['name', 'business name', 'company', 'business', 'lead name'],
        phone: ['phone', 'telephone', 'tel', 'phone number', 'contact number', 'mobile'],
        provider: ['provider', 'internet provider', 'isp', 'service provider'],
        mapsAddress: ['maps address', 'google maps', 'maps url', 'map link', 'location', 'maps_address'],
        address: ['address', 'street address', 'physical address', 'full address'],
        town: ['town', 'city', 'suburb', 'area'],
        typeOfBusiness: ['type of business', 'business type', 'category', 'industry', 'type_of_business'],
        notes: ['notes', 'comments', 'description', 'remarks']
      };

      for (const header of headers) {
        const lowerHeader = header.toLowerCase().trim();
        for (const [field, aliases] of Object.entries(mappings)) {
          if (aliases.some(alias => lowerHeader === alias || lowerHeader.includes(alias))) {
            fieldMapping[field] = header;
            break;
          }
        }
      }
    }

    // Start transaction
    await client.query('BEGIN');

    // Get the highest number for this user
    const maxNumberResult = await client.query(
      'SELECT COALESCE(MAX(number), 0) as max_number FROM leads WHERE user_id = $1::uuid',
      [decoded.userId]
    );
    let currentNumber = maxNumberResult.rows[0].max_number;

    // Import leads
    let importedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < jsonData.length; i++) {
      const row: any = jsonData[i];
      const rowNumber = i + 2; // +2 because Excel is 1-indexed and first row is headers
      
      try {
        currentNumber++;

        const leadData: any = {
          userId: decoded.userId,
          number: currentNumber,
          status: 'new',
          listName: listName.trim(),
          name: fieldMapping.name ? row[fieldMapping.name] : null,
          phone: fieldMapping.phone ? row[fieldMapping.phone] : null,
          provider: fieldMapping.provider ? row[fieldMapping.provider] : null,
          mapsAddress: fieldMapping.mapsAddress ? row[fieldMapping.mapsAddress] : null,
          address: fieldMapping.address ? row[fieldMapping.address] : null,
          town: fieldMapping.town ? row[fieldMapping.town] : null,
          typeOfBusiness: fieldMapping.typeOfBusiness ? row[fieldMapping.typeOfBusiness] : null,
          notes: fieldMapping.notes ? row[fieldMapping.notes] : null
        };

        // Validate required fields
        if (!leadData.name || leadData.name.toString().trim() === '') {
          errors.push(`Row ${rowNumber}: Missing required field (name)`);
          continue;
        }

        // Convert to strings and trim
        leadData.name = leadData.name.toString().trim();
        if (leadData.phone) leadData.phone = leadData.phone.toString().trim();
        if (leadData.provider) leadData.provider = leadData.provider.toString().trim();
        if (leadData.mapsAddress) leadData.mapsAddress = leadData.mapsAddress.toString().trim();
        if (leadData.address) leadData.address = leadData.address.toString().trim();
        if (leadData.town) leadData.town = leadData.town.toString().trim();
        if (leadData.typeOfBusiness) leadData.typeOfBusiness = leadData.typeOfBusiness.toString().trim();
        if (leadData.notes) leadData.notes = leadData.notes.toString().trim();

        // Insert lead
        await client.query(
          `INSERT INTO leads (
            user_id, number, status, list_name, name, phone, provider, 
            maps_address, address, town, type_of_business, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            leadData.userId,
            leadData.number,
            leadData.status,
            leadData.listName,
            leadData.name,
            leadData.phone,
            leadData.provider,
            leadData.mapsAddress,
            leadData.address,
            leadData.town,
            leadData.typeOfBusiness,
            leadData.notes
          ]
        );

        importedCount++;
      } catch (error: any) {
        console.error(`Error importing row ${rowNumber}:`, error);
        errors.push(`Row ${rowNumber}: ${error.message}`);
      }
    }

    // Create import_session record
    await client.query(
      `INSERT INTO import_sessions (
        user_id, source_type, list_name, imported_records, status, error_message, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        decoded.userId,
        'excel',
        listName.trim(),
        importedCount,
        errors.length > 0 ? 'completed' : 'completed', // Still completed even with some errors
        errors.length > 0 ? errors.slice(0, 10).join('; ') : null, // Limit error message length
        JSON.stringify({ 
          fileName: file.name, 
          totalRows: jsonData.length, 
          errorCount: errors.length,
          fieldMapping 
        })
      ]
    );

    // Commit transaction
    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      importedCount,
      totalRows: jsonData.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error importing from Excel:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import from Excel' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
