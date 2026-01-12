/**
 * POST /api/scrape/process
 * 
 * Processes a single town/industry combination (serverless-friendly)
 * This endpoint is called repeatedly to process the queue
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireScraperAuth } from '@/lib/auth-middleware';
import { getSession, updateSessionStatus, updateSessionProgress, addBusinesses, addLog } from '@/lib/scraper/postgresqlSessionStore';
import { getPuppeteer, getChromiumPath, getBrowserLaunchOptions } from '@/lib/scraper/browserConfig';
import { IndustryScraper } from '@/lib/scraper/IndustryScraper';
import { ProviderLookupService } from '@/lib/scraper/ProviderLookupService';

export const maxDuration = 300; // 5 minutes max
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Check authentication
  const authError = requireScraperAuth(request);
  if (authError) return authError;

  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Get session from PostgreSQL
    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if session is still active
    if (session.status !== 'running' && session.status !== 'pending') {
      return NextResponse.json({ 
        status: session.status,
        message: 'Session not active'
      });
    }

    // Calculate what to process next
    const { towns, industries, progress } = session;
    const sessionProgress: { completedTowns: number; totalBusinesses: number } = typeof progress === 'object' ? progress : { completedTowns: 0, totalBusinesses: 0 };
    const currentTownIndex = sessionProgress.completedTowns || 0;
    
    if (!towns || currentTownIndex >= towns.length) {
      // All done!
      await updateSessionStatus(sessionId, 'completed');
      await addLog(sessionId, `✅ Scraping completed! Total businesses: ${sessionProgress.totalBusinesses}`, 'info');
      
      return NextResponse.json({
        status: 'completed',
        progress: progress,
        hasMore: false
      });
    }

    const currentTown = towns[currentTownIndex];
    
    if (!currentTown) {
      return NextResponse.json({
        status: 'error',
        message: 'Current town not found',
        hasMore: false
      });
    }
    
    await addLog(sessionId, `Processing town: ${currentTown} (${currentTownIndex + 1}/${towns.length})`, 'info');

    // Update status to running
    if (session.status === 'pending') {
      await updateSessionStatus(sessionId, 'running');
    }

    // Process all industries for this town
    const townBusinesses: any[] = [];
    
    if (!industries || industries.length === 0) {
      await addLog(sessionId, `No industries to process for ${currentTown}`, 'warning');
      return NextResponse.json({
        status: 'completed',
        message: 'No industries to process',
        hasMore: false
      });
    }
    
    for (const industry of industries) {
      try {
        await addLog(sessionId, `Starting scrape for ${industry} in ${currentTown}`, 'info');

        // Launch browser and scrape
        const puppeteer = await getPuppeteer();
        const launchOptions = getBrowserLaunchOptions(true);
        const chromiumPath = await getChromiumPath();
        
        if (chromiumPath) {
          launchOptions.executablePath = chromiumPath;
        }

        const browser = await puppeteer.default.launch(launchOptions);
        const page = await browser.newPage();

        const scraper = new IndustryScraper(page, currentTown, industry);
        const businesses = await scraper.scrape();

        await browser.close();

        // Lookup providers for phone numbers
        const phoneNumbers = businesses
          .map(b => b.phone)
          .filter(phone => phone && phone !== 'No phone');

        if (phoneNumbers.length > 0) {
          try {
            await addLog(sessionId, `Looking up providers for ${phoneNumbers.length} phone numbers...`, 'info');

            const providerService = new ProviderLookupService({
              maxConcurrentBatches: 1,
              batchSize: phoneNumbers.length
            });

            const providerResults = await providerService.lookupProviders(phoneNumbers);
            await providerService.cleanup();

            // Debug: Log what's in the results map
            console.log('[Process] Provider results map keys:', Array.from(providerResults.keys()));
            console.log('[Process] Business phone numbers:', businesses.map(b => b.phone));
            
            // Debug: Log the actual provider values in the map
            const providerValues = Array.from(providerResults.entries());
            console.log('[Process] Provider map entries:', providerValues);
            
            await addLog(sessionId, `Debug - Map has ${providerResults.size} entries. Sample: ${providerValues.slice(0, 2).map(([k, v]) => `${k}=${v}`).join(', ')}`, 'info');

            businesses.forEach(business => {
              if (business.phone && business.phone !== 'No phone') {
                const provider = providerResults.get(business.phone);
                console.log(`[Process] Mapping ${business.phone} -> ${provider || 'Unknown'}`);
                business.provider = provider || 'Unknown';
              } else {
                business.provider = 'Unknown';
              }
            });

            await addLog(sessionId, `Provider lookup completed: ${providerResults.size} providers found`, 'info');
          } catch (providerError) {
            await addLog(sessionId, `Provider lookup failed: ${providerError instanceof Error ? providerError.message : 'Unknown error'}. Setting all to Unknown.`, 'warning');
            
            // Set all providers to Unknown if lookup fails
            businesses.forEach(business => {
              business.provider = 'Unknown';
            });
          }
        } else {
          // No phone numbers to lookup
          businesses.forEach(business => {
            business.provider = 'Unknown';
          });
        }

        townBusinesses.push(...businesses);

        await addLog(sessionId, `Found ${businesses.length} businesses for ${industry} in ${currentTown}`, 'info');

      } catch (error) {
        await addLog(sessionId, `Error scraping ${industry} in ${currentTown}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      }
    }

    // Save businesses to PostgreSQL
    if (townBusinesses.length > 0) {
      await addBusinesses(sessionId, townBusinesses);
    }

    // Update progress
    await updateSessionProgress(sessionId, sessionProgress.completedTowns + 1);

    await addLog(sessionId, `Completed ${currentTown}: ${townBusinesses.length} businesses found`, 'info');

    // Check if this was the last town
    const hasMore = currentTownIndex + 1 < towns.length;
    const finalStatus = hasMore ? 'running' : 'completed';
    
    // If completed, update status in database
    if (!hasMore) {
      await updateSessionStatus(sessionId, 'completed');
      await addLog(sessionId, `✅ Scraping completed! Total businesses: ${sessionProgress.totalBusinesses}`, 'info');
    }
    
    // Return status
    return NextResponse.json({
      status: finalStatus,
      progress: {
        completedTowns: currentTownIndex + 1,
        totalTowns: towns.length,
        totalBusinesses: (sessionProgress.totalBusinesses || 0) + townBusinesses.length
      },
      hasMore
    });

  } catch (error) {
    console.error('Error processing scrape:', error);
    return NextResponse.json(
      { error: 'Failed to process scraping' },
      { status: 500 }
    );
  }
}
