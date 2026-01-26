import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getPool } from '@/lib/db';

export async function POST(request: NextRequest) {
  const pool = getPool();
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

    const body = await request.json();
    const { businesses, listName } = body;

    console.log('[SCRAPER-DIRECT] Received request:', {
      businessCount: businesses?.length,
      listName,
      firstBusiness: businesses?.[0]
    });

    if (!businesses || !Array.isArray(businesses) || businesses.length === 0) {
      return NextResponse.json({ error: 'At least one business is required' }, { status: 400 });
    }

    if (!listName || listName.trim() === '') {
      return NextResponse.json({ error: 'List name is required' }, { status: 400 });
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
    let skippedCount = 0;
    const errors: string[] = [];

    console.log('[SCRAPER-DIRECT] Starting lead import...');
    console.log('[SCRAPER-DIRECT] List name to use:', listName.trim());

    for (const business of businesses) {
      try {
        // Validate required fields
        if (!business.name || business.name.trim() === '') {
          skippedCount++;
          errors.push(`Business ${importedCount + skippedCount}: Missing required field (name)`);
          continue;
        }

        currentNumber++;

        const leadData: any = {
          userId: decoded.userId,
          number: currentNumber,
          status: 'new',
          listName: listName.trim(),
          name: business.name.trim(),
          phone: business.phone || '',
          provider: business.provider || '',
          mapsAddress: business.mapsUrl || '',
          address: business.address || '',
          town: business.town || '',
          typeOfBusiness: business.typeOfBusiness || '',
        };

        console.log(`[SCRAPER-DIRECT] Inserting lead ${importedCount + 1}:`, {
          name: leadData.name,
          list_name: leadData.listName,
          status: leadData.status
        });

        // Insert lead
        const insertResult = await client.query(
          `INSERT INTO leads (
            user_id, number, status, list_name, name, phone, provider, 
            maps_address, address, town, type_of_business, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
          RETURNING id, name, list_name`,
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
          ]
        );

        console.log(`[SCRAPER-DIRECT] Successfully inserted lead:`, insertResult.rows[0]);
        importedCount++;
      } catch (error: any) {
        console.error('[SCRAPER-DIRECT] Error importing business:', error);
        skippedCount++;
        errors.push(`Business ${importedCount + skippedCount}: ${error.message}`);
      }
    }

    console.log('[SCRAPER-DIRECT] Import complete:', {
      imported: importedCount,
      skipped: skippedCount,
      errors: errors.length
    });

    // Create import_session record
    await client.query(
      `INSERT INTO import_sessions (
        user_id, source_type, list_name, imported_records, status, error_message, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        decoded.userId,
        'scraper',
        listName.trim(),
        importedCount,
        errors.length > 0 ? 'completed_with_errors' : 'completed',
        errors.length > 0 ? errors.slice(0, 10).join('; ') : null,
        JSON.stringify({ 
          totalBusinesses: businesses.length, 
          imported: importedCount,
          skipped: skippedCount,
          errorCount: errors.length,
          importMethod: 'scraper-direct'
        })
      ]
    );

    // Commit transaction
    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      importedCount,
      skippedCount,
      totalBusinesses: businesses.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error importing from scraper:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import from scraper' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
