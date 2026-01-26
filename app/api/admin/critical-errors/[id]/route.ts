/**
 * API Routes for Individual Critical Error Management
 * 
 * PATCH /api/admin/critical-errors/[id] - Acknowledge a critical error
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/middleware';
import { notificationService } from '@/lib/notifications';
import { handleApiError, AuthorizationError, ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication and admin role
    const { authenticated, user } = await verifyAuth(request);
    if (!authenticated || !user) {
      throw new AuthorizationError('Authentication required');
    }

    if (user.role !== 'admin') {
      throw new AuthorizationError('Admin access required');
    }

    const { id } = params;
    if (!id) {
      throw new ValidationError('Error ID is required');
    }

    // Acknowledge the error
    await notificationService.acknowledgeError(id, user.userId);

    logger.info('Critical error acknowledged', {
      userId: user.userId,
      username: user.username,
      role: user.role,
    }, { errorId: id });

    return NextResponse.json({
      success: true,
      message: 'Critical error acknowledged',
    });
  } catch (error) {
    return handleApiError(error, {
      requestId: request.headers.get('x-request-id') || undefined,
    });
  }
}
