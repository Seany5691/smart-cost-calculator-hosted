/**
 * API Routes for Critical Error Management
 * 
 * GET /api/admin/critical-errors - Get unacknowledged critical errors
 * GET /api/admin/critical-errors?stats=true - Get error statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/middleware';
import { notificationService } from '@/lib/notifications';
import { handleApiError, AuthorizationError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication and admin role
    const { authenticated, user } = await verifyAuth(request);
    if (!authenticated || !user) {
      throw new AuthorizationError('Authentication required');
    }

    if (user.role !== 'admin') {
      throw new AuthorizationError('Admin access required');
    }

    const { searchParams } = new URL(request.url);
    const getStats = searchParams.get('stats') === 'true';
    const days = parseInt(searchParams.get('days') || '7');

    if (getStats) {
      // Get error statistics
      const stats = await notificationService.getErrorStats(days);
      
      logger.info('Critical error stats retrieved', {
        userId: user.userId,
        username: user.username,
        role: user.role,
      }, { days });

      return NextResponse.json(stats);
    } else {
      // Get unacknowledged errors
      const errors = await notificationService.getUnacknowledgedErrors();
      
      logger.info('Unacknowledged critical errors retrieved', {
        userId: user.userId,
        username: user.username,
        role: user.role,
      }, { count: errors.length });

      return NextResponse.json(errors);
    }
  } catch (error) {
    return handleApiError(error, {
      requestId: request.headers.get('x-request-id') || undefined,
    });
  }
}
