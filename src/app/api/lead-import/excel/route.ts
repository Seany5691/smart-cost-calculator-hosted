// API route for Excel file import
import { NextRequest, NextResponse } from 'next/server';
import { databaseHelpers } from '@/lib/databaseAdapter';
import { getLeadsAdapter } from '@/lib/leads/leadsAdapter';
import {
  validateImportFile,
  detectFieldMapping,
  validateFieldMapping,
  transformImportData,
  validateImportData,
  detectDuplicates,
  batchData,
  normalizeProviderName,
  normalizePhoneNumber,
} from '@/lib/leads/importUtils';
import { extractCoordinates, getNextLeadNumber } from '@/lib/leads/leadUtils';
import * as XLSX from 'xlsx';

// POST /api/import/excel - Process Excel file import
export async function POST(request: NextRequest) {
  try {
    // Get user from auth store (simplified for PostgreSQL)
    const user = { id: '550e8400-e29b-41d4-a716-446655440000' }; // Default admin for now

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fieldMappingStr = formData.get('fieldMapping') as string;
    const duplicateStrategy = (formData.get('duplicateStrategy') as string) || 'skip';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided', success: false, data: null },
        { status: 400 }
      );
    }

    // Validate file
    const fileValidation = validateImportFile(file);
    if (!fileValidation.isValid) {
      return NextResponse.json(
        {
          error: 'File validation failed',
          success: false,
          data: null,
          validationErrors: fileValidation.errors,
        },
        { status: 400 }
      );
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Parse Excel file
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];

    if (rawData.length === 0) {
      return NextResponse.json(
        { error: 'Excel file is empty', success: false, data: null },
        { status: 400 }
      );
    }

    // Detect or use provided field mapping
    let fieldMapping: Record<string, string>;
    if (fieldMappingStr) {
      fieldMapping = JSON.parse(fieldMappingStr);
    } else {
      const headers = Object.keys(rawData[0] || {});
      fieldMapping = detectFieldMapping(headers);
    }

    // Validate field mapping
    const mappingValidation = validateFieldMapping(fieldMapping);
    if (!mappingValidation.isValid) {
      return NextResponse.json(
        {
          error: 'Field mapping validation failed',
          success: false,
          data: null,
          missingFields: mappingValidation.missingFields,
        },
        { status: 400 }
      );
    }

    // Get leads adapter
    const leadsAdapter = getLeadsAdapter();
    if (!leadsAdapter) {
      return NextResponse.json(
        { error: 'Database adapter not available', success: false, data: null },
        { status: 500 }
      );
    }

    // Create import session (simplified - using databaseHelpers for session management)
    const importSession = await databaseHelpers.createImportSession({
      source_type: 'excel',
      file_name: file.name,
      total_records: rawData.length,
      imported_records: 0,
      failed_records: 0,
      status: 'processing',
      user_id: user.id,
    });

    // Transform data
    const transformedData = transformImportData(rawData, fieldMapping);

    // Normalize data
    const normalizedData = transformedData.map(lead => ({
      ...lead,
      provider: normalizeProviderName(lead.provider) || undefined,
      phone: normalizePhoneNumber(lead.phone) || undefined,
    }));

    // Validate data
    const { validRecords, invalidRecords } = validateImportData(normalizedData);

    // Get existing leads for duplicate detection
    const existingLeads = await leadsAdapter.getLeads(user.id);

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
        // Get next number for 'new' status (Main Sheet)
        const currentLeads = await leadsAdapter.getLeadsByStatus(user.id, 'new');
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

        // Insert batch using leads adapter
        for (const leadToInsert of leadsToInsert) {
          await leadsAdapter.createLead(user.id, leadToInsert);
        }
        importedCount += batch.length;
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
          total: rawData.length,
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
    console.error('Error processing Excel import:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process Excel import',
        success: false,
        data: null,
      },
      { status: 500 }
    );
  }
}
