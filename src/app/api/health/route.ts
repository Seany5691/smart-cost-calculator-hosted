/**
 * Health check endpoint for Docker/Kubernetes
 * GET /api/health
 */

import { NextResponse } from 'next/server';
import { postgresql } from '@/lib/postgresql';

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    await postgresql.query('SELECT 1');

    const requiredTables = [
      'users',
      'leads',
      'routes',
      'hardware_items',
      'connectivity_items',
      'licensing_items',
      'factors',
      'scales',
      'activity_logs',
      'import_sessions',
      'deal_calculations',
    ];

    const { rows } = await postgresql.query(
      `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
      `
    );

    const existing = new Set((rows || []).map((r: any) => r.table_name));
    const missingTables = requiredTables.filter((t) => !existing.has(t));

    return NextResponse.json({
      status: missingTables.length === 0 ? 'healthy' : 'degraded',
      timestamp,
      uptime: process.uptime(),
      database: {
        connected: true,
        missingTables,
      },
    });
  } catch (error) {
    console.error('Health check database failure:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp,
        uptime: process.uptime(),
        database: {
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
