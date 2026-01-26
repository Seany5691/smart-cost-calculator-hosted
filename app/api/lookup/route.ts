/**
 * API Route: Provider Lookup
 * POST /api/lookup
 * 
 * Looks up the provider for a single phone number
 */

import { NextRequest, NextResponse } from 'next/server';
import { ProviderLookupService } from '@/lib/scraper/provider-lookup-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber } = body;

    // Validate input
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    console.log(`[API /api/lookup] Looking up provider for: ${phoneNumber}`);

    // Create provider lookup service
    const providerLookup = new ProviderLookupService({
      maxConcurrentBatches: 1, // Single lookup, one browser
    });

    // Lookup provider
    const results = await providerLookup.lookupProviders([phoneNumber]);
    const provider = results.get(phoneNumber) || 'Unknown';

    console.log(`[API /api/lookup] Result: ${provider}`);

    return NextResponse.json({ provider }, { status: 200 });
  } catch (error: any) {
    console.error('[API /api/lookup] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
