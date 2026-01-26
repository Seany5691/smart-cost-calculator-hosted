import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/middleware';
import { batchLookupProviders } from '@/lib/scraper/provider-lookup';

/**
 * POST /api/dashboard/lookup-number
 * Looks up provider information for a phone number
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { phoneNumber } = body;

    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Clean phone number
    const cleanedPhone = phoneNumber.trim();
    if (cleanedPhone === '') {
      return NextResponse.json(
        { error: 'Phone number cannot be empty' },
        { status: 400 }
      );
    }

    // Lookup provider using the scraper service
    const results = await batchLookupProviders([cleanedPhone], 1);
    const providerInfo = results.get(cleanedPhone);

    if (!providerInfo) {
      return NextResponse.json({
        phoneNumber: cleanedPhone,
        provider: 'Unknown',
        confidence: 0,
      });
    }

    return NextResponse.json({
      phoneNumber: cleanedPhone,
      provider: providerInfo.provider,
      confidence: providerInfo.confidence,
    });

  } catch (error) {
    console.error('[API] Number lookup error:', error);
    return NextResponse.json(
      { error: 'Failed to lookup phone number' },
      { status: 500 }
    );
  }
}
