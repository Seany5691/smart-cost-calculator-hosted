/**
 * POST /api/scrape/start
 * 
 * Initiates a new scraping session
 */

import { NextRequest, NextResponse } from 'next/server';
import { StartScrapeRequest, StartScrapeResponse, ScrapingConfig } from '@/lib/scraper/types';
import { randomUUID } from 'crypto';
import { createSession } from '@/lib/scraper/postgresqlSessionStore';
import { errorLogger } from '@/lib/scraper/ErrorLogger';
import { requireScraperAuth, getAuthenticatedUser } from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
  // Get user from auth store (simplified for PostgreSQL)
    const user = { id: '550e8400-e29b-41d4-a716-446655440000' }; // Default admin for now

  try {
    // Parse request body
    const body: StartScrapeRequest = await request.json();

    // Validate request body
    if (!body.towns || !Array.isArray(body.towns) || body.towns.length === 0) {
      errorLogger.logValidationError('towns', body.towns, 'At least one town is required', {
        operation: 'start_scrape'
      });
      return NextResponse.json(
        { error: 'At least one town is required' },
        { status: 400 }
      );
    }

    if (!body.industries || !Array.isArray(body.industries) || body.industries.length === 0) {
      errorLogger.logValidationError('industries', body.industries, 'At least one industry is required', {
        operation: 'start_scrape'
      });
      return NextResponse.json(
        { error: 'At least one industry is required' },
        { status: 400 }
      );
    }

    if (!body.config) {
      errorLogger.logValidationError('config', body.config, 'Configuration is required', {
        operation: 'start_scrape'
      });
      return NextResponse.json(
        { error: 'Configuration is required' },
        { status: 400 }
      );
    }

    // Validate concurrency settings
    const { simultaneousTowns, simultaneousIndustries, simultaneousLookups } = body.config;

    if (simultaneousTowns < 1 || simultaneousTowns > 5) {
      return NextResponse.json(
        { error: 'simultaneousTowns must be between 1 and 5' },
        { status: 400 }
      );
    }

    if (simultaneousIndustries < 1 || simultaneousIndustries > 10) {
      return NextResponse.json(
        { error: 'simultaneousIndustries must be between 1 and 10' },
        { status: 400 }
      );
    }

    if (simultaneousLookups < 1 || simultaneousLookups > 20) {
      return NextResponse.json(
        { error: 'simultaneousLookups must be between 1 and 20' },
        { status: 400 }
      );
    }

    // Trim whitespace from towns
    const cleanedTowns = body.towns.map(town => town.trim()).filter(town => town.length > 0);

    if (cleanedTowns.length === 0) {
      return NextResponse.json(
        { error: 'At least one valid town is required after trimming' },
        { status: 400 }
      );
    }

    // Create full scraping config with defaults
    const config: ScrapingConfig = {
      simultaneousTowns: body.config.simultaneousTowns,
      simultaneousIndustries: body.config.simultaneousIndustries,
      simultaneousLookups: body.config.simultaneousLookups,
      retryAttempts: 3,
      retryDelay: 2000,
      browserHeadless: true,
      lookupBatchSize: 5,
      outputFolder: 'output'
    };

    // Generate unique session ID
    const sessionId = randomUUID();

    // Get user info
    const user = getAuthenticatedUser(request);
    const userId = user?.id || 'anonymous';

    // Create session in PostgreSQL
    const sessionConfig = {
      towns: cleanedTowns,
      industries: body.industries,
      ...config
    };
    await createSession(userId, sessionConfig);
    
    // Log that we're starting
    console.log(`[INFO] Scraping session ${sessionId} created for ${cleanedTowns.length} town(s) and ${body.industries.length} industry(ies)`);

    // Return session ID immediately
    const response: StartScrapeResponse = {
      sessionId,
      status: 'started'
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    errorLogger.logApiError('/api/scrape/start', error, {
      operation: 'start_scrape_request'
    });
    console.error('Error starting scraping session:', error);
    return NextResponse.json(
      { error: 'Failed to start scraping session' },
      { status: 500 }
    );
  }
}
