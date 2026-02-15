/**
 * API Route: Check for Duplicate Scraping Sessions
 * POST /api/scraper/check-duplicates
 * 
 * Checks if user has already scraped the same town/industry combinations
 * Phase 2: Duplicate Detection
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';
import { getPool } from '@/lib/db';

export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const user = request.user;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { towns, industries } = body;

    if (!towns || !Array.isArray(towns) || towns.length === 0) {
      return NextResponse.json(
        { error: 'Towns array is required' },
        { status: 400 }
      );
    }

    if (!industries || !Array.isArray(industries) || industries.length === 0) {
      return NextResponse.json(
        { error: 'Industries array is required' },
        { status: 400 }
      );
    }

    const pool = getPool();

    // Find existing sessions with overlapping towns and industries
    const result = await pool.query(
      `SELECT 
        s.id,
        s.name,
        s.config,
        s.status,
        s.created_at,
        COUNT(b.id) as business_count
       FROM scraping_sessions s
       LEFT JOIN scraped_businesses b ON s.id = b.session_id
       WHERE s.user_id = $1
         AND s.status = 'completed'
       GROUP BY s.id, s.name, s.config, s.status, s.created_at
       ORDER BY s.created_at DESC
       LIMIT 50`,
      [user.userId]
    );

    // Check for overlaps
    const duplicates: any[] = [];
    
    for (const row of result.rows) {
      try {
        const config = typeof row.config === 'string' 
          ? JSON.parse(row.config) 
          : row.config;
        
        const existingTowns = config.towns || [];
        const existingIndustries = config.industries || [];

        // Find overlapping towns and industries
        const overlappingTowns = towns.filter((t: string) => 
          existingTowns.some((et: string) => 
            et.toLowerCase() === t.toLowerCase()
          )
        );

        const overlappingIndustries = industries.filter((i: string) => 
          existingIndustries.some((ei: string) => 
            ei.toLowerCase() === i.toLowerCase()
          )
        );

        // If there are overlaps, add to duplicates
        if (overlappingTowns.length > 0 && overlappingIndustries.length > 0) {
          duplicates.push({
            sessionId: row.id,
            sessionName: row.name,
            businessCount: parseInt(row.business_count) || 0,
            createdAt: row.created_at,
            overlappingTowns,
            overlappingIndustries,
            overlapPercentage: Math.round(
              ((overlappingTowns.length / towns.length) * 
               (overlappingIndustries.length / industries.length)) * 100
            ),
          });
        }
      } catch (error) {
        console.error('Error parsing session config:', error);
        // Continue with next session
      }
    }

    // Sort by overlap percentage (highest first)
    duplicates.sort((a, b) => b.overlapPercentage - a.overlapPercentage);

    return NextResponse.json({
      hasDuplicates: duplicates.length > 0,
      duplicates: duplicates.slice(0, 5), // Return top 5 matches
      totalMatches: duplicates.length,
    });
  } catch (error: any) {
    console.error('Error checking duplicates:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});
