/**
 * API Routes: Scraping Templates
 * GET /api/scraper/templates - List all templates
 * POST /api/scraper/templates - Create new template
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';
import { getPool } from '@/lib/db';

// GET - List all templates for user
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const user = request.user;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pool = getPool();
    const result = await pool.query(
      `SELECT 
        id,
        name,
        description,
        towns,
        industries,
        config,
        is_favorite,
        use_count,
        created_at,
        updated_at
       FROM scraping_templates
       WHERE user_id = $1
       ORDER BY is_favorite DESC, use_count DESC, created_at DESC`,
      [user.userId]
    );

    const templates = result.rows.map(row => ({
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
    }));

    return NextResponse.json({ templates });
  } catch (error: any) {
    console.error('Error listing templates:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});

// POST - Create new template
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const user = request.user;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, towns, industries, config } = body;

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 }
      );
    }

    if (!towns || !Array.isArray(towns) || towns.length === 0) {
      return NextResponse.json(
        { error: 'At least one town is required' },
        { status: 400 }
      );
    }

    // Industries are optional - can be empty for business-only search
    if (!industries || !Array.isArray(industries)) {
      return NextResponse.json(
        { error: 'Industries must be an array (can be empty for business-only search)' },
        { status: 400 }
      );
    }

    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO scraping_templates 
        (user_id, name, description, towns, industries, config, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id, name, description, towns, industries, config, is_favorite, use_count, created_at, updated_at`,
      [
        user.userId,
        name.trim(),
        description?.trim() || null,
        towns,
        industries,
        config || null,
      ]
    );

    const template = {
      id: result.rows[0].id,
      name: result.rows[0].name,
      description: result.rows[0].description,
      towns: result.rows[0].towns,
      industries: result.rows[0].industries,
      config: result.rows[0].config,
      isFavorite: result.rows[0].is_favorite,
      useCount: result.rows[0].use_count,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    };

    return NextResponse.json({ template }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});
