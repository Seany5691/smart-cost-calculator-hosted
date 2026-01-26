/**
 * Property-Based Tests for Scraper Utility Functions
 * 
 * These tests verify universal properties that should hold across all valid inputs
 * using fast-check for property-based testing with minimum 100 iterations.
 */

import * as fc from 'fast-check';
import ExcelJS from 'exceljs';
import {
  sanitizeFilename,
  createExcelWithHyperlinks,
  extractUniqueProviders,
  autoExportByTown,
  generateTimestamp,
  exportByProvider,
} from '../../../lib/scraper/utils';
import { ScrapedBusiness } from '../../../lib/scraper/types';

describe('Scraper Utils - Property-Based Tests', () => {
  /**
   * Property 14: Excel export has correct column order
   * 
   * **Validates: Requirements 11.1, 11.3**
   * 
   * For any list of businesses exported to Excel, the columns should appear
   * in this exact order: maps_address, name, phone, provider, address,
   * type_of_business, notes, town.
   */
  it('Property 14: Excel export has correct column order', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            maps_address: fc.string(),
            name: fc.string({ minLength: 1 }), // Name is required
            phone: fc.string(),
            provider: fc.string(),
            address: fc.string(),
            type_of_business: fc.string(),
            town: fc.string(),
          }),
          { minLength: 1, maxLength: 10 } // At least 1 business
        ),
        async (businesses) => {
          // Create Excel with the businesses
          const buffer = await createExcelWithHyperlinks(businesses, false);
          
          // Parse the Excel buffer to verify column order
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buffer);
          
          const worksheet = workbook.worksheets[0];
          const headerRow = worksheet.getRow(1);
          
          // Expected column order from requirements
          const expectedColumns = [
            'Maps Address',
            'Name',
            'Phone',
            'Provider',
            'Address',
            'Type of Business',
            'Notes',
            'Town',
          ];
          
          // Verify each column header matches expected order
          expectedColumns.forEach((expectedHeader, index) => {
            const cell = headerRow.getCell(index + 1); // Excel is 1-indexed
            expect(cell.value).toBe(expectedHeader);
          });
          
          // Verify we have exactly 8 columns
          expect(headerRow.cellCount).toBe(8);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15: Businesses are grouped by town correctly
   * 
   * **Validates: Requirements 13.1**
   * 
   * For any list of businesses, when grouping by town, each group should
   * contain only businesses with the same town value.
   */
  it('Property 15: Businesses are grouped by town correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            maps_address: fc.string(),
            name: fc.string({ minLength: 1 }),
            phone: fc.string(),
            provider: fc.string(),
            address: fc.string(),
            type_of_business: fc.string(),
            town: fc.oneof(
              fc.constant('Cape Town'),
              fc.constant('Johannesburg'),
              fc.constant('Durban'),
              fc.constant('Pretoria'),
              fc.constant(''),
            ),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (businesses) => {
          // Export by town
          const exports = await autoExportByTown(businesses, false);
          
          // For each export, verify all businesses in that town's Excel
          // have the same town value
          for (const exportData of exports) {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(exportData.buffer);
            
            const worksheet = workbook.worksheets[0];
            const townColumnIndex = 8; // Town is the 8th column
            
            // Get all town values from the data rows (skip header)
            const townValues: string[] = [];
            worksheet.eachRow((row, rowNumber) => {
              if (rowNumber > 1) { // Skip header row
                const townCell = row.getCell(townColumnIndex);
                townValues.push(String(townCell.value || ''));
              }
            });
            
            // All town values should be the same
            if (townValues.length > 0) {
              const expectedTown = exportData.town === 'Unknown' ? '' : exportData.town;
              townValues.forEach(townValue => {
                expect(townValue).toBe(expectedTown);
              });
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 16: Filenames are sanitized correctly
   * 
   * **Validates: Requirements 13.3, 13.4**
   * 
   * For any filename string, after sanitization, it should not contain
   * any of these characters: \ / : * ? " < > | or control characters (0x00-0x1f).
   */
  it('Property 16: Filenames are sanitized correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        async (filename) => {
          const sanitized = sanitizeFilename(filename);
          
          // Invalid characters that should not appear in sanitized filename
          const invalidChars = /[\\/:*?"<>|\x00-\x1f]/;
          
          // Verify no invalid characters exist
          expect(sanitized).not.toMatch(invalidChars);
          
          // Verify spaces are replaced with underscores
          expect(sanitized).not.toContain(' ');
          
          // If original had spaces, sanitized should have underscores
          if (filename.includes(' ')) {
            // Count spaces in original
            const spaceCount = (filename.match(/\s+/g) || []).length;
            // Should have at least some underscores (spaces get replaced)
            // Note: consecutive spaces become single underscore
            if (spaceCount > 0) {
              expect(sanitized.includes('_') || sanitized === '').toBe(true);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: extractUniqueProviders excludes "Unknown"
   * 
   * For any list of businesses, the unique providers list should not
   * contain "Unknown" even if businesses have "Unknown" as provider.
   */
  it('Property: extractUniqueProviders excludes "Unknown"', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            maps_address: fc.string(),
            name: fc.string({ minLength: 1 }),
            phone: fc.string(),
            provider: fc.oneof(
              fc.constant('Telkom'),
              fc.constant('Vodacom'),
              fc.constant('MTN'),
              fc.constant('Cell C'),
              fc.constant('Unknown'),
              fc.constant(''),
            ),
            address: fc.string(),
            type_of_business: fc.string(),
            town: fc.string(),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (businesses) => {
          const uniqueProviders = extractUniqueProviders(businesses);
          
          // "Unknown" should never appear in the result
          expect(uniqueProviders).not.toContain('Unknown');
          
          // Empty strings should not appear
          expect(uniqueProviders).not.toContain('');
          
          // All values should be unique
          const uniqueSet = new Set(uniqueProviders);
          expect(uniqueProviders.length).toBe(uniqueSet.size);
          
          // Should be sorted
          const sorted = [...uniqueProviders].sort();
          expect(uniqueProviders).toEqual(sorted);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Sanitized filenames are non-empty for non-empty input
   * 
   * For any non-empty string that contains at least one valid character,
   * the sanitized filename should be non-empty.
   */
  it('Property: Sanitized filenames preserve valid characters', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 })
          .filter(s => /[a-zA-Z0-9]/.test(s)), // Must have at least one alphanumeric
        async (filename) => {
          const sanitized = sanitizeFilename(filename);
          
          // Should not be empty if input had valid characters
          expect(sanitized.length).toBeGreaterThan(0);
          
          // Should not contain invalid filename characters
          const invalidChars = /[\\/:*?"<>|\x00-\x1f]/;
          expect(sanitized).not.toMatch(invalidChars);
          
          // Should not contain spaces (replaced with underscores)
          expect(sanitized).not.toContain(' ');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Excel export includes all businesses
   * 
   * For any list of businesses, the Excel export should contain
   * exactly the same number of data rows as businesses in the input.
   */
  it('Property: Excel export includes all businesses', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            maps_address: fc.string(),
            name: fc.string({ minLength: 1 }),
            phone: fc.string(),
            provider: fc.string(),
            address: fc.string(),
            type_of_business: fc.string(),
            town: fc.string(),
          }),
          { minLength: 1, maxLength: 15 }
        ),
        async (businesses) => {
          const buffer = await createExcelWithHyperlinks(businesses, false);
          
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buffer);
          
          const worksheet = workbook.worksheets[0];
          
          // Count data rows (excluding header)
          let dataRowCount = 0;
          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
              dataRowCount++;
            }
          });
          
          // Should match input business count
          expect(dataRowCount).toBe(businesses.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: autoExportByTown creates one file per unique town
   * 
   * For any list of businesses, the number of export files should equal
   * the number of unique town values (treating empty as "Unknown").
   */
  it('Property: autoExportByTown creates one file per unique town', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            maps_address: fc.string(),
            name: fc.string({ minLength: 1 }),
            phone: fc.string(),
            provider: fc.string(),
            address: fc.string(),
            type_of_business: fc.string(),
            town: fc.oneof(
              fc.constant('Town A'),
              fc.constant('Town B'),
              fc.constant('Town C'),
              fc.constant(''),
            ),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (businesses) => {
          const exports = await autoExportByTown(businesses, false);
          
          // Count unique towns in input (treating empty as "Unknown")
          const uniqueTowns = new Set(
            businesses.map(b => b.town || 'Unknown')
          );
          
          // Should have one export per unique town
          expect(exports.length).toBe(uniqueTowns.size);
          
          // Each export should have a unique town name
          const exportTowns = new Set(exports.map(e => e.town));
          expect(exportTowns.size).toBe(exports.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: generateTimestamp produces valid format
   * 
   * The timestamp should always match the format YYYY-MM-DD_HH-mm-ss
   */
  it('Property: generateTimestamp produces valid format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null), // No input needed
        async () => {
          const timestamp = generateTimestamp();
          
          // Should match format YYYY-MM-DD_HH-mm-ss
          const timestampRegex = /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/;
          expect(timestamp).toMatch(timestampRegex);
          
          // Should be parseable as a date
          const parts = timestamp.split('_');
          const datePart = parts[0];
          const timePart = parts[1].replace(/-/g, ':');
          const dateStr = `${datePart}T${timePart}`;
          const date = new Date(dateStr);
          
          expect(date.toString()).not.toBe('Invalid Date');
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Unit Tests for Scraper Utility Functions
 * 
 * These tests verify specific examples and edge cases
 */
describe('Scraper Utils - Unit Tests', () => {
  describe('sanitizeFilename', () => {
    it('should replace spaces with underscores', () => {
      expect(sanitizeFilename('my file name')).toBe('my_file_name');
    });

    it('should remove invalid characters', () => {
      expect(sanitizeFilename('file\\name/with:invalid*chars?')).toBe('filenamewithinvalidchars');
    });

    it('should handle empty string', () => {
      expect(sanitizeFilename('')).toBe('');
    });

    it('should handle string with only invalid characters', () => {
      expect(sanitizeFilename('\\/:*?"<>|')).toBe('');
    });

    it('should preserve valid characters', () => {
      expect(sanitizeFilename('valid-file_name.txt')).toBe('valid-file_name.txt');
    });

    it('should remove control characters', () => {
      expect(sanitizeFilename('file\x00name\x1f')).toBe('filename');
    });
  });

  describe('extractUniqueProviders', () => {
    it('should extract unique providers', () => {
      const businesses: ScrapedBusiness[] = [
        { name: 'B1', provider: 'Telkom', maps_address: '', phone: '', address: '', type_of_business: '', town: '' },
        { name: 'B2', provider: 'Vodacom', maps_address: '', phone: '', address: '', type_of_business: '', town: '' },
        { name: 'B3', provider: 'Telkom', maps_address: '', phone: '', address: '', type_of_business: '', town: '' },
      ];

      const providers = extractUniqueProviders(businesses);
      expect(providers).toEqual(['Telkom', 'Vodacom']);
    });

    it('should exclude "Unknown" provider', () => {
      const businesses: ScrapedBusiness[] = [
        { name: 'B1', provider: 'Telkom', maps_address: '', phone: '', address: '', type_of_business: '', town: '' },
        { name: 'B2', provider: 'Unknown', maps_address: '', phone: '', address: '', type_of_business: '', town: '' },
      ];

      const providers = extractUniqueProviders(businesses);
      expect(providers).toEqual(['Telkom']);
      expect(providers).not.toContain('Unknown');
    });

    it('should handle empty array', () => {
      const providers = extractUniqueProviders([]);
      expect(providers).toEqual([]);
    });

    it('should sort providers alphabetically', () => {
      const businesses: ScrapedBusiness[] = [
        { name: 'B1', provider: 'Vodacom', maps_address: '', phone: '', address: '', type_of_business: '', town: '' },
        { name: 'B2', provider: 'MTN', maps_address: '', phone: '', address: '', type_of_business: '', town: '' },
        { name: 'B3', provider: 'Telkom', maps_address: '', phone: '', address: '', type_of_business: '', town: '' },
      ];

      const providers = extractUniqueProviders(businesses);
      expect(providers).toEqual(['MTN', 'Telkom', 'Vodacom']);
    });
  });

  describe('generateTimestamp', () => {
    it('should generate timestamp in correct format', () => {
      const timestamp = generateTimestamp();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/);
    });

    it('should generate different timestamps when called at different times', async () => {
      const timestamp1 = generateTimestamp();
      await new Promise(resolve => setTimeout(resolve, 1100)); // Wait 1.1 seconds
      const timestamp2 = generateTimestamp();
      
      expect(timestamp1).not.toBe(timestamp2);
    });
  });

  describe('createExcelWithHyperlinks', () => {
    it('should create Excel with correct structure', async () => {
      const businesses: ScrapedBusiness[] = [
        {
          maps_address: 'https://maps.google.com/1',
          name: 'Business 1',
          phone: '0123456789',
          provider: 'Telkom',
          address: '123 Main St',
          type_of_business: 'Restaurant',
          town: 'Cape Town',
        },
      ];

      const buffer = await createExcelWithHyperlinks(businesses, false);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should handle empty businesses array', async () => {
      const buffer = await createExcelWithHyperlinks([], false);
      expect(buffer).toBeInstanceOf(Buffer);
    });
  });

  describe('autoExportByTown', () => {
    it('should group businesses by town', async () => {
      const businesses: ScrapedBusiness[] = [
        { name: 'B1', town: 'Cape Town', maps_address: '', phone: '', provider: '', address: '', type_of_business: '' },
        { name: 'B2', town: 'Durban', maps_address: '', phone: '', provider: '', address: '', type_of_business: '' },
        { name: 'B3', town: 'Cape Town', maps_address: '', phone: '', provider: '', address: '', type_of_business: '' },
      ];

      const exports = await autoExportByTown(businesses, false);
      
      expect(exports.length).toBe(2);
      expect(exports.map(e => e.town).sort()).toEqual(['Cape Town', 'Durban']);
      expect(exports.every(e => e.buffer instanceof Buffer)).toBe(true);
      expect(exports.every(e => e.filename.endsWith('.xlsx'))).toBe(true);
    });

    it('should sanitize town names in filenames', async () => {
      const businesses: ScrapedBusiness[] = [
        { name: 'B1', town: 'Cape Town/City', maps_address: '', phone: '', provider: '', address: '', type_of_business: '' },
      ];

      const exports = await autoExportByTown(businesses, false);
      
      expect(exports[0].filename).not.toContain('/');
      expect(exports[0].filename).toContain('_');
    });
  });
});
