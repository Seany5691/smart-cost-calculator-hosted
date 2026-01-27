/**
 * API Routes: Single Template Operations
 * GET /api/scraper/templates/[id] - Get template details
 * PUT /api/scraper/templates/[id] - Update template
 * DELETE /api/scraper/templates/[id] - Delete template
 * POST /api/scraper/templates/[id]/use - Increment use count
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';
import { getPool } from '@/lib/db';

// GET - Get template details
export async function GET(
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
        `SELECT * FROM scraping_templates WHERE id = $1 AND user_id = $2`,
        [id, user.userId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }

      const row = result.rows[0];
      const template = {
        id: row.id,
        name: row.name,
        description: row.description,
        towns: row.towns,
        industries: row.industries,
        config: row.config,
        isFavorite: row.is_favorite,
        useCount: row.use_count,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      return NextResponse.json({ template });
    } catch (error: any) {
      console.error('Error getting template:', error);
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  })(request);
}

// PUT - Update template
export async function PUT(
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
      const body = await request.json();
      const { name, description, towns, industries, config, isFavorite } = body;

      const pool = getPool();

      // Verify ownership
      const checkResult = await pool.query(
        `SELECT id FROM scraping_templates WHERE id = $1 AND user_id = $2`,
        [id, user.userId]
      );

      if (checkResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }

      // Update template
      const result = await pool.query(
        `UPDATE scraping_templates 
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             towns = COALESCE($3, towns),
             industries = COALESCE($4, industries),
             config = COALESCE($5, config),
             is_favorite = COALESCE($6, is_favorite),
             updated_at = NOW()
         WHERE id = $7 AND user_id = $8
         RETURNING *`,
        [
          name?.trim() || null,
          description?.trim() || null,
          towns || null,
          industries || null,
          config || null,
          isFavorite !== undefined ? isFavorite : null,
          id,
          user.userId,
        ]
      );

      const row = result.rows[0];
      const template = {
        id: row.id,
        name: row.name,
        description: row.description,
        towns: row.towns,
        industries: row.industries,
        config: row.config,
        isFavorite: row.is_favorite,
        useCount: row.use_count,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      return NextResponse.json({ template });
    } catch (error: any) {
      console.error('Error updating template:', error);
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  })(request);
}

// DELETE - Delete template
export async function DELETE(
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
        `DELETE FROM scraping_templates WHERE id = $1 AND user_id = $2 RETURNING id`,
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
        message: 'Template deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting template:', error);
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  })(request);
}
