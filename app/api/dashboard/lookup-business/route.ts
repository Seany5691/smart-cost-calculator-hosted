import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/middleware';
import { BusinessLookupScraper } from '@/lib/scraper/business-lookup-scraper';
import { ProviderLookupService } from '@/lib/scraper/provider-lookup-service';
import puppeteer from 'puppeteer';

/**
 * POST /api/dashboard/lookup-business
 * Searches Google Maps for businesses and returns results with provider info
 * Uses the same logic as the scraper business lookup
 */
export async function POST(request: NextRequest) {
  let browser = null;
  let providerLookup: ProviderLookupService | null = null;

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
    const { query } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const searchQuery = query.trim();
    if (searchQuery === '') {
      return NextResponse.json(
        { error: 'Search query cannot be empty' },
        { status: 400 }
      );
    }

    console.log(`[API /api/dashboard/lookup-business] Looking up businesses for: ${searchQuery}`);

    // Launch browser for business scraping
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();

    // Create business lookup scraper
    const scraper = new BusinessLookupScraper(page, searchQuery);

    // Scrape businesses (top 3)
    const businesses = await scraper.scrape();

    console.log(`[API /api/dashboard/lookup-business] Found ${businesses.length} businesses`);

    // Close browser before provider lookup
    await browser.close();
    browser = null;

    // Extract phone numbers for provider lookup
    const phoneNumbers = businesses
      .map(b => b.phone)
      .filter(phone => phone && phone !== 'No phone' && phone.trim() !== '');

    // Lookup providers if we have phone numbers using the ProviderLookupService
    let providerMap = new Map<string, string>();
    if (phoneNumbers.length > 0) {
      console.log(`[API /api/dashboard/lookup-business] Looking up providers for ${phoneNumbers.length} phone numbers`);
      
      // Use the ProviderLookupService (handles browser management, caching, batching, captcha detection)
      providerLookup = new ProviderLookupService({
        maxConcurrentBatches: 2, // Increased from 1 to 2 for faster business lookup
      });

      // Service handles phone number cleaning (27/+27 -> 0, removes spaces)
      providerMap = await providerLookup.lookupProviders(phoneNumbers);
      
      console.log(`[API /api/dashboard/lookup-business] Provider lookup complete, found ${providerMap.size} results`);
    }

    // Attach providers to businesses
    const results = businesses.map(business => ({
      name: business.name,
      phone: business.phone || 'No phone',
      provider: business.phone ? (providerMap.get(business.phone) || 'Unknown') : 'N/A',
      address: business.address || '',
      mapsAddress: business.maps_address || '',
      typeOfBusiness: business.type_of_business || '',
    }));

    console.log(`[API /api/dashboard/lookup-business] Returning ${results.length} results`);

    return NextResponse.json({
      query: searchQuery,
      results: results,
      count: results.length,
    });

  } catch (error) {
    console.error('[API /api/dashboard/lookup-business] Error:', error);
    return NextResponse.json(
      { error: 'Failed to search businesses' },
      { status: 500 }
    );
  } finally {
    // Cleanup provider lookup service (closes its browsers)
    if (providerLookup) {
      await providerLookup.cleanup();
    }
    
    // Close business scraping browser if still open
    if (browser) {
      await browser.close();
    }
  }
}
