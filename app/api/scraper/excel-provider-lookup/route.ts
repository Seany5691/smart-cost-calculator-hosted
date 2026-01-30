import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/middleware';
import { ProviderLookupService } from '@/lib/scraper/provider-lookup-service';
import { EventEmitter } from 'events';

/**
 * POST /api/scraper/excel-provider-lookup
 * 
 * Performs provider lookups for businesses uploaded from Excel
 * 
 * Request body:
 * {
 *   businesses: Array<{
 *     name: string;
 *     phone: string;
 *     address?: string;
 *     town?: string;
 *     industry?: string;
 *     mapsUrl?: string;
 *   }>
 * }
 * 
 * Response:
 * {
 *   businesses: Array<Business with provider field added>;
 *   successCount: number;
 *   failedCount: number;
 * }
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

    const user = authResult.user;

    // Check user role - only admin, manager, and telesales can use scraper
    if (!['admin', 'manager', 'telesales'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { businesses } = body;

    if (!businesses || !Array.isArray(businesses) || businesses.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request - businesses array is required' },
        { status: 400 }
      );
    }

    // Validate each business has required fields
    for (const business of businesses) {
      if (!business.name || !business.phone) {
        return NextResponse.json(
          { error: 'Invalid request - each business must have name and phone' },
          { status: 400 }
        );
      }
    }

    console.log(`[Excel Provider Lookup] Starting lookups for ${businesses.length} businesses`);

    // Extract and clean phone numbers
    const phoneNumbers = businesses
      .map(b => b.phone)
      .filter(phone => phone && phone.trim() !== '');

    // Clean phone numbers in bulk
    const cleanedPhones = phoneNumbers.map(phone => cleanPhoneNumber(phone));

    console.log(`[Excel Provider Lookup] Cleaned ${cleanedPhones.length} phone numbers`);

    // Create event emitter for progress tracking (optional - not used in this endpoint)
    const eventEmitter = new EventEmitter();

    // Create provider lookup service
    const providerService = new ProviderLookupService({
      maxConcurrentBatches: 2, // Use 2 concurrent batches for Excel import
      eventEmitter,
    });

    // Perform provider lookups
    const providerMap = await providerService.lookupProviders(cleanedPhones);

    console.log(`[Excel Provider Lookup] Completed: ${providerMap.size} providers found`);

    // Update businesses with provider information
    const updatedBusinesses = businesses.map(business => {
      const cleanedPhone = cleanPhoneNumber(business.phone);
      const provider = providerMap.get(cleanedPhone) || 'Unknown';
      
      return {
        ...business,
        provider,
      };
    });

    // Count successes and failures
    const successCount = updatedBusinesses.filter(b => b.provider && b.provider !== 'Unknown').length;
    const failedCount = updatedBusinesses.length - successCount;

    // Cleanup
    await providerService.cleanup();

    return NextResponse.json({
      businesses: updatedBusinesses,
      successCount,
      failedCount,
    });

  } catch (error) {
    console.error('[Excel Provider Lookup] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Clean phone number - remove non-digits and convert +27 to 0
 * Same logic as provider-lookup-service cleanPhoneNumber
 * 
 * @param phoneNumber - Raw phone number (e.g., "+27 18 771 2345" or "018 771 2345")
 * @returns Cleaned phone number in SA format (e.g., "0187712345")
 */
function cleanPhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Convert international format (+27...) to local format (0...)
  // South African country code is 27
  if (cleaned.startsWith('27')) {
    cleaned = '0' + cleaned.substring(2);
  }
  
  return cleaned;
}
