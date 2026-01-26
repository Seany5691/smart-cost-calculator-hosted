/**
 * Excel Export Service for Scraped Businesses
 * Generates Excel files with hyperlinks and provider organization
 */

import ExcelJS from 'exceljs';
import { ScrapedBusiness } from './types';
import { getProviderPriority } from './provider-lookup';

/**
 * Export scraped businesses to Excel
 * Creates a single sheet with all businesses
 */
export async function exportToExcel(
  businesses: ScrapedBusiness[],
  sessionName: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  // Sort businesses by provider priority
  const sortedBusinesses = [...businesses].sort((a, b) => {
    const priorityA = getProviderPriority(a.provider);
    const priorityB = getProviderPriority(b.provider);
    return priorityA - priorityB;
  });

  // Create a single worksheet with all businesses
  const worksheet = workbook.addWorksheet('All Businesses');

  // Add header row - match old app column order
  worksheet.columns = [
    { header: 'maps_address', key: 'maps_address', width: 50 },
    { header: 'Name', key: 'name', width: 30 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Provider', key: 'provider', width: 20 },
    { header: 'Address', key: 'address', width: 40 },
    { header: 'Type of Business', key: 'type_of_business', width: 25 },
    { header: 'Town', key: 'town', width: 20 },
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Add data rows for all businesses
  sortedBusinesses.forEach((business, index) => {
    const row = worksheet.addRow({
      maps_address: business.maps_address || '',
      name: business.name,
      phone: business.phone || 'N/A',
      provider: business.provider || 'Unknown',
      address: business.address,
      type_of_business: business.type_of_business,
      town: business.town,
    });

    // Add hyperlink to maps_address cell (make the URL clickable)
    if (business.maps_address) {
      const cell = row.getCell('maps_address');
      cell.value = {
        text: business.maps_address,
        hyperlink: business.maps_address,
      };
      cell.font = { color: { argb: 'FF0000FF' }, underline: true };
    }

    // Alternate row colors
    if (index % 2 === 1) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' },
      };
    }
  });

  // Auto-filter
  worksheet.autoFilter = {
    from: 'A1',
    to: `G${sortedBusinesses.length + 1}`,
  };

  // Freeze header row
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Export scraped businesses to Excel with provider-based sheets
 * Used by the "Export by Provider" feature
 */
export async function exportToExcelByProvider(
  businesses: ScrapedBusiness[],
  sessionName: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  // Sort businesses by provider priority
  const sortedBusinesses = [...businesses].sort((a, b) => {
    const priorityA = getProviderPriority(a.provider);
    const priorityB = getProviderPriority(b.provider);
    return priorityA - priorityB;
  });

  // Group businesses by provider
  const businessesByProvider = sortedBusinesses.reduce((acc, business) => {
    const provider = business.provider || 'Other';
    if (!acc[provider]) {
      acc[provider] = [];
    }
    acc[provider].push(business);
    return acc;
  }, {} as Record<string, ScrapedBusiness[]>);

  // Create a worksheet for each provider
  for (const [provider, providerBusinesses] of Object.entries(businessesByProvider)) {
    const worksheet = workbook.addWorksheet(provider);

    // Add header row - match old app column order
    worksheet.columns = [
      { header: 'maps_address', key: 'maps_address', width: 50 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Provider', key: 'provider', width: 20 },
      { header: 'Address', key: 'address', width: 40 },
      { header: 'Type of Business', key: 'type_of_business', width: 25 },
      { header: 'Town', key: 'town', width: 20 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add data rows
    providerBusinesses.forEach((business, index) => {
      const row = worksheet.addRow({
        maps_address: business.maps_address || '',
        name: business.name,
        phone: business.phone || 'N/A',
        provider: business.provider || 'Unknown',
        address: business.address,
        type_of_business: business.type_of_business,
        town: business.town,
      });

      // Add hyperlink to maps_address cell (make the URL clickable)
      if (business.maps_address) {
        const cell = row.getCell('maps_address');
        cell.value = {
          text: business.maps_address,
          hyperlink: business.maps_address,
        };
        cell.font = { color: { argb: 'FF0000FF' }, underline: true };
      }

      // Alternate row colors
      if (index % 2 === 1) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' },
        };
      }
    });

    // Auto-filter
    worksheet.autoFilter = {
      from: 'A1',
      to: `G${providerBusinesses.length + 1}`,
    };

    // Freeze header row
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  // Create summary worksheet
  const summarySheet = workbook.addWorksheet('Summary', { state: 'visible' });
  summarySheet.columns = [
    { header: 'Provider', key: 'provider', width: 20 },
    { header: 'Count', key: 'count', width: 15 },
  ];

  // Style header
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Add summary data
  Object.entries(businessesByProvider).forEach(([provider, providerBusinesses]) => {
    summarySheet.addRow({
      provider,
      count: providerBusinesses.length,
    });
  });

  // Add total row
  const totalRow = summarySheet.addRow({
    provider: 'Total',
    count: businesses.length,
  });
  totalRow.font = { bold: true };

  // Move summary sheet to first position
  const summaryIndex = workbook.worksheets.findIndex(ws => ws.name === 'Summary');
  if (summaryIndex > 0) {
    const [summary] = workbook.worksheets.splice(summaryIndex, 1);
    workbook.worksheets.unshift(summary);
  }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Get scraped businesses for a session
 */
export async function getScrapedBusinesses(
  sessionId: string
): Promise<ScrapedBusiness[]> {
  const { pool } = await import('../db');

  const result = await pool.query(
    `SELECT maps_address, name, phone, provider, address, town, type_of_business
     FROM scraped_businesses
     WHERE session_id = $1
     ORDER BY created_at`,
    [sessionId]
  );

  return result.rows;
}
