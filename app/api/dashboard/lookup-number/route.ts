import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/middleware';
import { ProviderLookupService } from '@/lib/scraper/provider-lookup-service';

/**
 * POST /api/dashboard/lookup-number
 * Looks up provider information for a phone number using the new ProviderLookupService
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

    console.log(`[API /api/dashboard/lookup-number] Looking up provider for: ${cleanedPhone}`);

    // Use the new ProviderLookupService (handles browser management, caching, batching, captcha detection)
    const providerLookup = new ProviderLookupService({
      maxConcurrentBatches: 1,
    });

    // Lookup provider - service handles phone number cleaning (27/+27 -> 0, removes spaces)
    const results = await providerLookup.lookupProviders([cleanedPhone]);
    
    // Cleanup service
    await providerLookup.cleanup();

    const provider = results.get(cleanedPhone);

    if (!provider || provider === 'Unknown') {
      return NextResponse.json({
        phoneNumber: cleanedPhone,
        provider: 'Unknown',
        confidence: 0,
      });
    }

    return NextResponse.json({
      phoneNumber: cleanedPhone,
      provider: provider,
      confidence: 1, // New service returns provider name directly, assume high confidence
    });

  } catch (error) {
    console.error('[API] Number lookup error:', error);
    return NextResponse.json(
      { error: 'Failed to lookup phone number' },
      { status: 500 }
    );
  }
}
