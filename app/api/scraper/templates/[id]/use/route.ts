/**
 * API Route: Increment Template Use Count
 * POST /api/scraper/templates/[id]/use
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';
import { getPool } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (authRequest: AuthenticatedRequest) => {
    try {
      const user = authRequest.user;
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { id } = params;
      const pool = getPool();

      const result = await pool.query(
        `UPDATE scraping_templates 
         SET use_count = use_count + 1,
             updated_at = NOW()
         WHERE id = $1 AND user_id = $2
         RETURNING use_count`,
        [id, user.userId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        useCount: result.rows[0].use_count,
      });
    } catch (error: any) {
      console.error('Error incrementing template use count:', error);
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  })(request);
}
