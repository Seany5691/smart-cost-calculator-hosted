/**
 * API Route: Clear Scraped Businesses
 * POST /api/scraper/clear
 * 
 * Permanently deletes all scraped businesses for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/middleware';
import { getPool } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log('[SCRAPER CLEAR API] Received POST request to /api/scraper/clear');
    
    // Verify authentication
    const authResult = await verifyAuth(request);
    
    if (!authResult.authenticated || !authResult.user) {
      console.error('[SCRAPER CLEAR API] Authentication failed:', authResult.error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = authResult.user;
    console.log('[SCRAPER CLEAR API] Authenticated user:', { userId: user.userId, username: user.username });

    const pool = getPool();

    // Delete all scraped businesses for this user's sessions
    console.log(`[SCRAPER CLEAR API] Deleting all scraped businesses for user ${user.userId}`);
    const deleteResult = await pool.query(
      `DELETE FROM scraped_businesses 
       WHERE session_id IN (
         SELECT id FROM scraping_sessions WHERE user_id = $1
       )`,
      [user.userId]
    );
    
    const deletedCount = deleteResult.rowCount || 0;
    console.log(`[SCRAPER CLEAR API] Deleted ${deletedCount} scraped businesses`);

    // Log activity
    await pool.query(
      `INSERT INTO activity_log (user_id, activity_type, entity_type, metadata)
       VALUES ($1, $2, $3, $4)`,
      [
        user.userId,
        'scraping_data_cleared',
        'scraped_businesses',
        JSON.stringify({
          businesses_deleted: deletedCount,
        })
      ]
    );

    return NextResponse.json({ 
      success: true,
      deletedCount,
      message: `Successfully deleted ${deletedCount} scraped businesses`
    }, { status: 200 });

  } catch (error: any) {
    console.error('[SCRAPER CLEAR API] Error clearing scraped businesses:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
