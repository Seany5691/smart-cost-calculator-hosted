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

    const body = await request.json();
    const { sessionIds, listName } = body;

    console.log('[SCRAPER IMPORT] Request received:', { sessionIds, listName, userId: decoded.userId });

    if (!sessionIds || !Array.isArray(sessionIds) || sessionIds.length === 0) {
      return NextResponse.json({ error: 'At least one session ID is required' }, { status: 400 });
    }

    if (!listName || listName.trim() === '') {
      return NextResponse.json({ error: 'List name is required' }, { status: 400 });
    }

    // Start transaction
    await client.query('BEGIN');

    // Fetch scraper session data for all selected sessions
    let allResults: any[] = [];
    for (const sessionId of sessionIds) {
      console.log('[SCRAPER IMPORT] Fetching session:', sessionId);
      
      // Use internal API call instead of external fetch
      // This avoids ECONNREFUSED errors on VPS
      const sessionResponse = await fetch(`${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/scraper/sessions/${sessionId}/businesses`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!sessionResponse.ok) {
        const errorText = await sessionResponse.text();
        console.error('[SCRAPER IMPORT] Failed to fetch session:', sessionId, errorText);
        throw new Error(`Failed to fetch scraper session ${sessionId}: ${sessionResponse.status}`);
      }

      const sessionData = await sessionResponse.json();
      console.log('[SCRAPER IMPORT] Session data received:', { sessionId, businessCount: sessionData.businesses?.length || 0 });
      
      if (sessionData.businesses && Array.isArray(sessionData.businesses)) {
        allResults = allResults.concat(sessionData.businesses);
      }
    }

    console.log('[SCRAPER IMPORT] Total results to import:', allResults.length);

    if (allResults.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'No results found in selected sessions' }, { status: 400 });
    }

    // Get the highest number for this user
    const maxNumberResult = await client.query(
      'SELECT COALESCE(MAX(number), 0) as max_number FROM leads WHERE user_id = $1::uuid',
      [decoded.userId]
    );
    let currentNumber = maxNumberResult.rows[0].max_number;
    console.log('[SCRAPER IMPORT] Starting from lead number:', currentNumber + 1);

    // Import leads
    let importedCount = 0;
    const errors: string[] = [];

    for (const result of allResults) {
      try {
        currentNumber++;

        const leadData: any = {
          userId: decoded.userId,
          number: currentNumber,
          status: 'new',
          listName: listName.trim(),
          name: result.name,
          phone: result.phone,
          provider: result.provider,
          mapsAddress: result.website, // Changed from maps_address to website
          address: result.address,
          typeOfBusiness: result.industry, // Changed from type_of_business to industry
          notes: null
        };

        // Validate required fields
        if (!leadData.name) {
          errors.push(`Result ${importedCount + 1}: Missing required field (name)`);
          continue;
        }

        // Insert lead
        await client.query(
          `INSERT INTO leads (
            user_id, number, status, list_name, name, phone, provider, 
            maps_address, address, type_of_business, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
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
            leadData.typeOfBusiness,
            leadData.notes
          ]
        );

        importedCount++;
      } catch (error: any) {
        console.error('Error importing result:', error);
        errors.push(`Result ${importedCount + 1}: ${error.message}`);
      }
    }

    // Create import_session record
    await client.query(
      `INSERT INTO import_sessions (
        user_id, source_type, list_name, imported_records, status, error_message, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        decoded.userId,
        'scraper',
        listName.trim(),
        importedCount,
        errors.length > 0 ? 'completed' : 'completed', // Still completed even with some errors
        errors.length > 0 ? errors.join('; ') : null,
        JSON.stringify({ sessionIds, totalResults: allResults.length, errors: errors.length })
      ]
    );

    // Commit transaction
    await client.query('COMMIT');

    console.log('[SCRAPER IMPORT] Import completed:', { importedCount, totalResults: allResults.length, errors: errors.length });

    return NextResponse.json({
      success: true,
      importedCount,
      totalResults: allResults.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('[SCRAPER IMPORT] Error importing from scraper:', error);
    console.error('[SCRAPER IMPORT] Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Failed to import from scraper' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
