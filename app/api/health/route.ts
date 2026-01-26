import { NextResponse } from 'next/server';
import { healthCheck } from '@/lib/db';
import { handleApiError } from '@/lib/errors';
import { logger } from '@/lib/logger';

// Force dynamic rendering - this route needs database connection
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const dbHealthy = await healthCheck();
    
    if (!dbHealthy) {
      logger.warn('Health check failed: database disconnected');
      return NextResponse.json(
        { status: 'unhealthy', database: 'disconnected' },
        { status: 503 }
      );
    }
    
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Health check error', error instanceof Error ? error : undefined);
    return handleApiError(error);
  }
}
