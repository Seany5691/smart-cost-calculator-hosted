import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/middleware';
import { pool } from '@/lib/db';

/**
 * GET /api/dashboard/stats
 * Aggregates stats from all components (calculator, leads, scraper)
 * Implements caching with 1-minute TTL
 */

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = authResult.user.userId;
    const userRole = authResult.user.role;

    // Check cache
    const cacheKey = `dashboard-stats-${userId}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    const client = await pool.connect();
    try {
      // Calculator Stats
      const calculatorStatsQuery = userRole === 'admin'
        ? `
          SELECT 
            COUNT(*) as total_deals,
            COUNT(DISTINCT user_id) as active_users,
            COUNT(*) as calculations
          FROM deal_calculations
        `
        : `
          SELECT 
            COUNT(*) as total_deals,
            1 as active_users,
            COUNT(*) as calculations
          FROM deal_calculations
          WHERE user_id = $1
        `;

      const calculatorParams = userRole === 'admin' ? [] : [userId];
      const calculatorResult = await client.query(calculatorStatsQuery, calculatorParams);
      const calculatorStats = {
        totalDeals: parseInt(calculatorResult.rows[0]?.total_deals || '0'),
        activeProjects: parseInt(calculatorResult.rows[0]?.active_users || '0'),
        calculations: parseInt(calculatorResult.rows[0]?.calculations || '0'),
      };

      // Lead Stats
      const leadStatsQuery = userRole === 'admin'
        ? `
          SELECT 
            COUNT(*) as total_leads,
            COUNT(*) FILTER (WHERE status = 'leads') as leads_count,
            COUNT(*) FILTER (WHERE status = 'working') as working_count,
            COUNT(*) FILTER (WHERE status = 'bad') as bad_count,
            COUNT(*) FILTER (WHERE status = 'later') as later_count,
            COUNT(*) FILTER (WHERE status = 'signed') as signed_count,
            COUNT(*) FILTER (WHERE date_to_call_back = CURRENT_DATE) as callbacks_today,
            COUNT(*) FILTER (WHERE date_to_call_back > CURRENT_DATE) as callbacks_upcoming
          FROM leads
        `
        : `
          SELECT 
            COUNT(*) as total_leads,
            COUNT(*) FILTER (WHERE status = 'leads') as leads_count,
            COUNT(*) FILTER (WHERE status = 'working') as working_count,
            COUNT(*) FILTER (WHERE status = 'bad') as bad_count,
            COUNT(*) FILTER (WHERE status = 'later') as later_count,
            COUNT(*) FILTER (WHERE status = 'signed') as signed_count,
            COUNT(*) FILTER (WHERE date_to_call_back = CURRENT_DATE) as callbacks_today,
            COUNT(*) FILTER (WHERE date_to_call_back > CURRENT_DATE) as callbacks_upcoming
          FROM leads
          WHERE user_id = $1 OR user_id IS NULL
        `;

      const leadParams = userRole === 'admin' ? [] : [userId];
      const leadResult = await client.query(leadStatsQuery, leadParams);
      const leadStats = {
        totalLeads: parseInt(leadResult.rows[0]?.total_leads || '0'),
        leadsCount: parseInt(leadResult.rows[0]?.leads_count || '0'),
        workingCount: parseInt(leadResult.rows[0]?.working_count || '0'),
        badCount: parseInt(leadResult.rows[0]?.bad_count || '0'),
        laterCount: parseInt(leadResult.rows[0]?.later_count || '0'),
        signedCount: parseInt(leadResult.rows[0]?.signed_count || '0'),
        callbacksToday: parseInt(leadResult.rows[0]?.callbacks_today || '0'),
        callbacksUpcoming: parseInt(leadResult.rows[0]?.callbacks_upcoming || '0'),
      };

      // Scraper Stats (only for admin and manager)
      let scraperStats = {
        totalSessions: 0,
        businessesScraped: 0,
        recentActivity: 'No scraping activity',
      };

      if (userRole === 'admin' || userRole === 'manager') {
        const scraperStatsQuery = userRole === 'admin'
          ? `
            SELECT 
              COUNT(*) as total_sessions,
              (SELECT COUNT(*) FROM scraped_businesses) as businesses_scraped,
              (SELECT name FROM scraping_sessions ORDER BY created_at DESC LIMIT 1) as recent_session
            FROM scraping_sessions
          `
          : `
            SELECT 
              COUNT(*) as total_sessions,
              (SELECT COUNT(*) FROM scraped_businesses WHERE session_id IN (SELECT id FROM scraping_sessions WHERE user_id = $1)) as businesses_scraped,
              (SELECT name FROM scraping_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1) as recent_session
            FROM scraping_sessions
            WHERE user_id = $1
          `;

        const scraperParams = userRole === 'admin' ? [] : [userId];
        const scraperResult = await client.query(scraperStatsQuery, scraperParams);
        scraperStats = {
          totalSessions: parseInt(scraperResult.rows[0]?.total_sessions || '0'),
          businessesScraped: parseInt(scraperResult.rows[0]?.businesses_scraped || '0'),
          recentActivity: scraperResult.rows[0]?.recent_session || 'No scraping activity',
        };
      }

      const stats = {
        calculator: calculatorStats,
        leads: leadStats,
        scraper: scraperStats,
      };

      // Cache the results
      cache.set(cacheKey, { data: stats, timestamp: Date.now() });

      return NextResponse.json(stats);

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('[API] Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
