/**
 * Utility functions for scraper operations
 * Handles filename sanitization, Excel export, provider extraction, and file downloads
 */

import ExcelJS from 'exceljs';
import { ScrapedBusiness } from './types';

/**
 * Sanitize filename by removing invalid characters
 * Replaces spaces with underscores and removes characters that are invalid in filenames
 * 
 * Invalid characters: \ / : * ? " < > | and control characters (0x00-0x1f)
 * 
 * @param filename - The filename to sanitize
 * @returns Sanitized filename safe for file system
 */
export function sanitizeFilename(filename: string): string {
  // Replace spaces with underscores
  let sanitized = filename.replace(/\s+/g, '_');
  
  // Remove invalid characters: \ / : * ? " < > | and control characters
  sanitized = sanitized.replace(/[\\/:*?"<>|\x00-\x1f]/g, '');
  
  return sanitized;
}

/**
 * Create Excel workbook with hyperlinks and specific column ordering
 * 
 * Column order: maps_address, name, phone, provider, address, type_of_business, notes, town
 * 
 * @param businesses - Array of businesses to export
 * @param addHyperlinks - Whether to add clickable hyperlinks to maps_address column
 * @returns Excel workbook buffer
 */
export async function createExcelWithHyperlinks(
  businesses: ScrapedBusiness[],
  addHyperlinks: boolean = true
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Businesses');

  // Define columns in exact order specified in requirements
  worksheet.columns = [
    { header: 'Maps Address', key: 'maps_address', width: 50 },
    { header: 'Name', key: 'name', width: 30 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Provider', key: 'provider', width: 15 },
    { header: 'Address', key: 'address', width: 40 },
    { header: 'Type of Business', key: 'type_of_business', width: 25 },
    { header: 'Notes', key: 'notes', width: 30 },
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
  businesses.forEach((business, index) => {
    const row = worksheet.addRow({
      maps_address: business.maps_address || '',
      name: business.name,
      phone: business.phone || '',
      provider: business.provider || '',
      address: business.address || '',
      type_of_business: business.type_of_business || '',
      notes: '', // Notes field from requirements
      town: business.town || '',
    });

    // Add hyperlink to maps_address if enabled and URL exists
    if (addHyperlinks && business.maps_address) {
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
  if (businesses.length > 0) {
    worksheet.autoFilter = {
      from: 'A1',
      to: `H${businesses.length + 1}`,
    };
  }

  // Freeze header row
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Extract unique providers from businesses, excluding "Unknown"
 * 
 * @param businesses - Array of businesses
 * @returns Array of unique provider names (excluding "Unknown")
 */
export function extractUniqueProviders(businesses: ScrapedBusiness[]): string[] {
  const providerSet = new Set<string>();
  
  businesses.forEach(business => {
    if (business.provider && business.provider !== 'Unknown') {
      providerSet.add(business.provider);
    }
  });
  
  return Array.from(providerSet).sort();
}

/**
 * Auto-export businesses grouped by town
 * Creates separate Excel file for each town
 * 
 * @param businesses - Array of businesses to export
 * @param addHyperlinks - Whether to add hyperlinks to maps_address
 * @returns Array of objects containing town name and Excel buffer
 */
export async function autoExportByTown(
  businesses: ScrapedBusiness[],
  addHyperlinks: boolean = true
): Promise<Array<{ town: string; buffer: Buffer; filename: string }>> {
  // Group businesses by town
  const businessesByTown = new Map<string, ScrapedBusiness[]>();
  
  businesses.forEach(business => {
    const town = business.town || 'Unknown';
    if (!businessesByTown.has(town)) {
      businessesByTown.set(town, []);
    }
    businessesByTown.get(town)!.push(business);
  });
  
  // Create Excel file for each town
  const exports: Array<{ town: string; buffer: Buffer; filename: string }> = [];
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  
  for (const [town, townBusinesses] of businessesByTown.entries()) {
    const buffer = await createExcelWithHyperlinks(townBusinesses, addHyperlinks);
    const sanitizedTown = sanitizeFilename(town);
    const filename = `${sanitizedTown}_${timestamp}.xlsx`;
    
    exports.push({
      town,
      buffer,
      filename,
    });
  }
  
  return exports;
}

/**
 * Trigger browser download of a file
 * Creates a blob and triggers download via temporary anchor element
 * 
 * @param buffer - File buffer to download
 * @param filename - Name for the downloaded file
 * @param mimeType - MIME type of the file (default: Excel)
 */
export function downloadFile(
  buffer: Buffer,
  filename: string,
  mimeType: string = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
): void {
  // Create blob from buffer - convert to Uint8Array first
  const uint8Array = new Uint8Array(buffer);
  const blob = new Blob([uint8Array], { type: mimeType });
  
  // Create temporary URL
  const url = URL.createObjectURL(blob);
  
  // Create temporary anchor element
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  
  // Trigger download
  document.body.appendChild(anchor);
  anchor.click();
  
  // Cleanup
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Generate timestamp string for filenames
 * Format: YYYY-MM-DD_HH-mm-ss
 * 
 * @returns Formatted timestamp string
 */
export function generateTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

/**
 * Export businesses filtered by selected providers
 * 
 * @param businesses - Array of all businesses
 * @param selectedProviders - Array of provider names to include
 * @param addHyperlinks - Whether to add hyperlinks to maps_address
 * @returns Excel buffer with filtered businesses
 */
export async function exportByProvider(
  businesses: ScrapedBusiness[],
  selectedProviders: string[],
  addHyperlinks: boolean = true
): Promise<Buffer> {
  // Filter businesses to only selected providers
  const filteredBusinesses = businesses.filter(business =>
    selectedProviders.includes(business.provider)
  );
  
  // Group by town for better organization
  const businessesByTown = new Map<string, ScrapedBusiness[]>();
  
  filteredBusinesses.forEach(business => {
    const town = business.town || 'Unknown';
    if (!businessesByTown.has(town)) {
      businessesByTown.set(town, []);
    }
    businessesByTown.get(town)!.push(business);
  });
  
  // Create workbook with sheet per town
  const workbook = new ExcelJS.Workbook();
  
  for (const [town, townBusinesses] of businessesByTown.entries()) {
    const worksheet = workbook.addWorksheet(sanitizeFilename(town).slice(0, 31)); // Excel sheet name limit
    
    // Define columns
    worksheet.columns = [
      { header: 'Maps Address', key: 'maps_address', width: 50 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Provider', key: 'provider', width: 15 },
      { header: 'Address', key: 'address', width: 40 },
      { header: 'Type of Business', key: 'type_of_business', width: 25 },
      { header: 'Notes', key: 'notes', width: 30 },
      { header: 'Town', key: 'town', width: 20 },
    ];
    
    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    
    // Add data rows
    townBusinesses.forEach((business, index) => {
      const row = worksheet.addRow({
        maps_address: business.maps_address || '',
        name: business.name,
        phone: business.phone || '',
        provider: business.provider || '',
        address: business.address || '',
        type_of_business: business.type_of_business || '',
        notes: '',
        town: business.town || '',
      });
      
      // Add hyperlink
      if (addHyperlinks && business.maps_address) {
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
    if (townBusinesses.length > 0) {
      worksheet.autoFilter = {
        from: 'A1',
        to: `H${townBusinesses.length + 1}`,
      };
    }
    
    // Freeze header row
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  }
  
  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
