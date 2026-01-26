import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/middleware';
import { pool } from '@/lib/db';

/**
 * POST /api/dashboard/lookup-business
 * Searches for businesses in scraped_businesses and leads tables
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const searchQuery = query.trim();
    if (searchQuery === '') {
      return NextResponse.json(
        { error: 'Search query cannot be empty' },
        { status: 400 }
      );
    }

    // Search in both scraped_businesses and leads tables
    // Use ILIKE for case-insensitive search
    const searchPattern = `%${searchQuery}%`;

    const client = await pool.connect();
    try {
      // Search scraped businesses
      const scrapedQuery = `
        SELECT 
          'scraped' as source,
          id,
          name,
          phone,
          provider,
          address,
          town,
          type_of_business,
          maps_address,
          created_at
        FROM scraped_businesses
        WHERE 
          name ILIKE $1 OR
          phone ILIKE $1 OR
          address ILIKE $1 OR
          town ILIKE $1 OR
          type_of_business ILIKE $1
        ORDER BY created_at DESC
        LIMIT 10
      `;

      // Search leads
      const leadsQuery = `
        SELECT 
          'lead' as source,
          id,
          name,
          phone,
          provider,
          address,
          town,
          type_of_business,
          maps_address,
          status,
          created_at
        FROM leads
        WHERE 
          name ILIKE $1 OR
          phone ILIKE $1 OR
          address ILIKE $1 OR
          town ILIKE $1 OR
          type_of_business ILIKE $1 OR
          contact_person ILIKE $1
        ORDER BY created_at DESC
        LIMIT 10
      `;

      const [scrapedResults, leadsResults] = await Promise.all([
        client.query(scrapedQuery, [searchPattern]),
        client.query(leadsQuery, [searchPattern]),
      ]);

      // Combine and format results
      const results = [
        ...scrapedResults.rows.map(row => ({
          source: row.source,
          id: row.id,
          name: row.name,
          phone: row.phone,
          provider: row.provider,
          address: row.address,
          town: row.town,
          typeOfBusiness: row.type_of_business,
          mapsAddress: row.maps_address,
          status: row.status || null,
          createdAt: row.created_at,
        })),
        ...leadsResults.rows.map(row => ({
          source: row.source,
          id: row.id,
          name: row.name,
          phone: row.phone,
          provider: row.provider,
          address: row.address,
          town: row.town,
          typeOfBusiness: row.type_of_business,
          mapsAddress: row.maps_address,
          status: row.status || null,
          createdAt: row.created_at,
        })),
      ];

      // Sort by created_at descending
      results.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Limit to 20 total results
      const limitedResults = results.slice(0, 20);

      return NextResponse.json({
        query: searchQuery,
        results: limitedResults,
        count: limitedResults.length,
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('[API] Business lookup error:', error);
    return NextResponse.json(
      { error: 'Failed to search businesses' },
      { status: 500 }
    );
  }
}
