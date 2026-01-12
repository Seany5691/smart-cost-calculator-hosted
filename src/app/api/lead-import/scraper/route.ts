// API route for importing data from Smart Cost Calculator scraper
import { NextRequest, NextResponse } from 'next/server';
import { databaseHelpers } from '@/lib/databaseAdapter';
import { postgresqlLeads } from '@/lib/leads/postgresqlLeads';
import {
  transformScraperData,
  validateImportData,
  detectDuplicates,
  batchData,
  normalizeProviderName,
  normalizePhoneNumber,
  validateScraperData,
} from '@/lib/leads/importUtils';
import { extractCoordinates, getNextLeadNumber } from '@/lib/leads/leadUtils';

// POST /api/import/scraper - Import data from scraper session
export async function POST(request: NextRequest) {
  try {
    // Get user from auth store (simplified for PostgreSQL)
    const user = { id: '550e8400-e29b-41d4-a716-446655440000' }; // Default admin for now

    // Parse request body
    const body = await request.json();
    const { sessionId, duplicateStrategy = 'skip' } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Scraper session ID is required', success: false, data: null },
        { status: 400 }
      );
    }

    // Fetch scraper session and results (simplified - using databaseHelpers for session management)
    // In a real implementation, you would have a scraper_sessions table
    const scraperSession = { id: sessionId, status: 'completed' };
    const scraperResults: any[] = []; // In a real implementation, you'd fetch from database

    if (scraperSession.status !== 'completed') {
      return NextResponse.json(
        {
          error: 'Scraper session is not completed',
          success: false,
          data: null,
        },
        { status: 400 }
      );
    }

    // Validate scraper data structure
    const scraperValidation = validateScraperData(scraperResults);
    if (!scraperValidation.isValid) {
      return NextResponse.json(
        {
          error: 'Invalid scraper data format',
          success: false,
          data: null,
          validationErrors: scraperValidation.errors,
        },
        { status: 400 }
      );
    }

    // Create import session
    const importSession = await databaseHelpers.createImportSession({
      source_type: 'scraper',
      source_id: sessionId,
      total_records: scraperResults.length,
      imported_records: 0,
      failed_records: 0,
      status: 'processing',
      user_id: user.id,
    });

    // Transform scraper data to lead format
    const transformedData = transformScraperData(scraperResults);

    // Normalize data
    const normalizedData = transformedData.map(lead => ({
      ...lead,
      provider: normalizeProviderName(lead.provider) || undefined,
      phone: normalizePhoneNumber(lead.phone) || undefined,
    }));

    // Validate data
    const { validRecords, invalidRecords } = validateImportData(normalizedData);

    // Get existing leads for duplicate detection
    const existingLeads = await postgresqlLeads.getLeads(user.id, {} as any);

    // Detect duplicates
    const { duplicates, unique } = detectDuplicates(validRecords, existingLeads);

    // Determine which leads to import based on duplicate strategy
    let leadsToImport = unique;
    if (duplicateStrategy === 'create_new') {
      leadsToImport = [...unique, ...duplicates.map(d => d.lead)];
    }

    const batches = batchData(leadsToImport, 50);
    let importedCount = 0;
    const errors: any[] = [];

    for (const batch of batches) {
      try {
        // Get next number for 'leads' status (Main Sheet)
        const currentLeads = await postgresqlLeads.getLeadsByStatus(user.id, 'leads');
        let nextNumber = getNextLeadNumber(currentLeads);

        // Prepare leads for insertion
        const leadsToInsert = batch.map(lead => {
          const coordinates = lead.maps_address 
            ? extractCoordinates(lead.maps_address) 
            : null;

          return {
            ...lead,
            number: nextNumber++,
            coordinates,
            user_id: user.id,
            import_session_id: importSession.id,
          };
        });

        // Insert batch using PostgreSQL bulk insert for speed
        const { data, error } = await postgresqlLeads.bulkCreateLeads(user.id, leadsToInsert as any);
        if (error) {
          throw error;
        }
        importedCount += data?.length || 0;
      } catch (error) {
        console.error('Error importing batch:', error);
        errors.push({
          batch: batch.map(l => l.name),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Update import session
    await databaseHelpers.updateImportSession(importSession.id, {
      status: errors.length > 0 ? 'completed' : 'completed',
      imported_records: importedCount,
      failed_records: invalidRecords.length + errors.length,
      error_log: [
        ...invalidRecords.map(r => ({
          row: r.index,
          field: 'validation',
          value: r.data.name,
          error: r.errors.join(', '),
          timestamp: new Date().toISOString(),
        })),
        ...errors,
      ],
    });

    return NextResponse.json(
      {
        data: {
          sessionId: importSession.id,
          total: scraperResults.length,
          imported: importedCount,
          failed: invalidRecords.length,
          duplicates: duplicates.length,
          skipped: duplicates.length,
        },
        success: true,
        error: null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error processing scraper import:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process scraper import',
        success: false,
        data: null,
      },
      { status: 500 }
    );
  }
}
