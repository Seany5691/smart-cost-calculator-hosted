import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/middleware';
import { invalidateCache } from '@/lib/cache';

// POST /api/config/invalidate - Invalidate configuration cache
export async function POST(request: NextRequest) {
  try {
    // Verify authentication and admin role
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    if (authResult.user.role !== 'admin') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { cacheKeys } = body;

    // Invalidate specified cache keys or all if not specified
    if (cacheKeys && Array.isArray(cacheKeys)) {
      for (const key of cacheKeys) {
        invalidateCache(key);
      }
    } else {
      // Invalidate all config caches
      invalidateCache('hardware');
      invalidateCache('connectivity');
      invalidateCache('licensing');
      invalidateCache('factors');
      invalidateCache('scales');
    }

    return NextResponse.json({
      message: 'Cache invalidated successfully',
      invalidatedKeys: cacheKeys || ['all'],
    });
  } catch (error) {
    console.error('Error invalidating cache:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to invalidate cache' } },
      { status: 500 }
    );
  }
}
