/**
 * API Route: Business Lookup
 * POST /api/business-lookup
 * 
 * Looks up businesses on Google Maps and returns top 3 results with provider info
 * Uses the new ProviderLookupService for provider lookups
 */

import { NextRequest, NextResponse } from 'next/server';
import { BusinessLookupScraper } from '@/lib/scraper/business-lookup-scraper';
import { ProviderLookupService } from '@/lib/scraper/provider-lookup-service';
import puppeteer from 'puppeteer';

export async function POST(request: NextRequest) {
  let browser = null;
  let providerLookup: ProviderLookupService | null = null;

  try {
    const body = await request.json();
    const { businessQuery } = body;

    // Validate input
    if (!businessQuery || typeof businessQuery !== 'string') {
      return NextResponse.json(
        { error: 'Business query is required' },
        { status: 400 }
      );
    }

    console.log(`[API /api/business-lookup] Looking up businesses for: ${businessQuery}`);

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
    const scraper = new BusinessLookupScraper(page, businessQuery);

    // Scrape businesses (top 3)
    const businesses = await scraper.scrape();

    console.log(`[API /api/business-lookup] Found ${businesses.length} businesses`);

    // Extract phone numbers for provider lookup
    const phoneNumbers = businesses
      .map(b => b.phone)
      .filter(phone => phone && phone !== 'No phone' && phone.trim() !== '');

    // Lookup providers if we have phone numbers using the new ProviderLookupService
    let providerMap = new Map<string, string>();
    if (phoneNumbers.length > 0) {
      console.log(`[API /api/business-lookup] Looking up providers for ${phoneNumbers.length} phone numbers`);
      
      // Use the new ProviderLookupService (handles browser management, caching, batching, captcha detection)
      providerLookup = new ProviderLookupService({
        maxConcurrentBatches: 1,
      });

      // Service handles phone number cleaning (27/+27 -> 0, removes spaces)
      providerMap = await providerLookup.lookupProviders(phoneNumbers);
      
      console.log(`[API /api/business-lookup] Provider lookup complete, found ${providerMap.size} results`);
    }

    // Attach providers to businesses
    const results = businesses.map(business => ({
      name: business.name,
      phone: business.phone || 'No phone',
      provider: business.phone ? (providerMap.get(business.phone) || 'Unknown') : 'N/A',
    }));

    console.log(`[API /api/business-lookup] Returning ${results.length} results`);

    return NextResponse.json({ results }, { status: 200 });
  } catch (error: any) {
    console.error('[API /api/business-lookup] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  } finally {
    // Cleanup provider lookup service (closes its browsers)
    if (providerLookup) {
      await providerLookup.cleanup();
    }
    
    // Close business scraping browser
    if (browser) {
      await browser.close();
    }
  }
}
