/**
 * Unit and Property-Based Tests for ProviderLookupService
 * 
 * Unit tests verify specific examples and edge cases.
 * Property tests verify universal properties that should hold across all valid inputs
 * using fast-check for property-based testing with minimum 100 iterations.
 * 
 * Requirements: 3.2, 3.5, 3.6, 3.7, 25.2, 25.3, 25.4
 */

import * as fc from 'fast-check';
import { ProviderLookupService } from '../../../lib/scraper/provider-lookup-service';

describe('ProviderLookupService - Unit Tests', () => {
  describe('Edge Cases', () => {
    /**
     * Test provider lookup failure returns "Unknown"
     * Requirement 3.7: When provider lookup fails, return "Unknown"
     * 
     * Note: We test this indirectly through parseProvider since lookupSingleProvider
     * catches errors and returns "Unknown" when extraction fails.
     */
    it('should return "Unknown" when provider extraction fails', () => {
      const service = new ProviderLookupService({ maxConcurrentBatches: 1 });
      
      // Test various failure scenarios that would occur during provider lookup
      expect(service.parseProvider('')).toBe('Unknown');
      expect(service.parseProvider('No provider information')).toBe('Unknown');
      expect(service.parseProvider('Error: Not found')).toBe('Unknown');
    });

    it('should handle empty phone number list', async () => {
      const service = new ProviderLookupService({ maxConcurrentBatches: 2 });
      const results = await service.lookupProviders([]);
      
      expect(results.size).toBe(0);
    });

    it('should filter out empty phone numbers', async () => {
      const service = new ProviderLookupService({ maxConcurrentBatches: 2 });
      const results = await service.lookupProviders(['', '  ', '\t']);
      
      expect(results.size).toBe(0);
    });

    it('should handle phone numbers with only non-digit characters', () => {
      const service = new ProviderLookupService({ maxConcurrentBatches: 1 });
      const cleaned = service.cleanPhoneNumber('abc-def-ghij');
      
      expect(cleaned).toBe('');
    });

    it('should handle text without "serviced by" marker', () => {
      const service = new ProviderLookupService({ maxConcurrentBatches: 1 });
      const parsed = service.parseProvider('This is some random text');
      
      expect(parsed).toBe('Unknown');
    });

    it('should handle "serviced by" with no provider name after it', () => {
      const service = new ProviderLookupService({ maxConcurrentBatches: 1 });
      const parsed = service.parseProvider('serviced by ');
      
      expect(parsed).toBe('Unknown');
    });

    it('should handle "serviced by" with only whitespace after it', () => {
      const service = new ProviderLookupService({ maxConcurrentBatches: 1 });
      const parsed = service.parseProvider('serviced by    ');
      
      expect(parsed).toBe('Unknown');
    });

    it('should handle "serviced by" with only punctuation after it', () => {
      const service = new ProviderLookupService({ maxConcurrentBatches: 1 });
      const parsed = service.parseProvider('serviced by ...');
      
      expect(parsed).toBe('Unknown');
    });
  });

  describe('Phone Number Cleaning', () => {
    it('should convert +27 prefix to 0', () => {
      const service = new ProviderLookupService({ maxConcurrentBatches: 1 });
      
      expect(service.cleanPhoneNumber('+27123456789')).toBe('0123456789');
      expect(service.cleanPhoneNumber('27123456789')).toBe('0123456789');
    });

    it('should remove all non-digit characters', () => {
      const service = new ProviderLookupService({ maxConcurrentBatches: 1 });
      
      expect(service.cleanPhoneNumber('(012) 345-6789')).toBe('0123456789');
      expect(service.cleanPhoneNumber('012 345 6789')).toBe('0123456789');
      expect(service.cleanPhoneNumber('012-345-6789')).toBe('0123456789');
    });

    it('should handle phone numbers that already start with 0', () => {
      const service = new ProviderLookupService({ maxConcurrentBatches: 1 });
      
      expect(service.cleanPhoneNumber('0123456789')).toBe('0123456789');
    });
  });

  describe('Provider Parsing', () => {
    it('should extract provider name after "serviced by" (case insensitive)', () => {
      const service = new ProviderLookupService({ maxConcurrentBatches: 1 });
      
      expect(service.parseProvider('serviced by Telkom')).toBe('Telkom');
      expect(service.parseProvider('Serviced By Vodacom')).toBe('Vodacom');
      expect(service.parseProvider('SERVICED BY MTN')).toBe('MTN');
      expect(service.parseProvider('SeRvIcEd bY CellC')).toBe('CellC');
    });

    it('should remove trailing punctuation from provider name', () => {
      const service = new ProviderLookupService({ maxConcurrentBatches: 1 });
      
      expect(service.parseProvider('serviced by Telkom.')).toBe('Telkom');
      expect(service.parseProvider('serviced by Vodacom,')).toBe('Vodacom');
      expect(service.parseProvider('serviced by MTN!')).toBe('MTN');
      expect(service.parseProvider('serviced by CellC;')).toBe('CellC');
      expect(service.parseProvider('serviced by Other...')).toBe('Other');
    });

    it('should extract only first word after "serviced by"', () => {
      const service = new ProviderLookupService({ maxConcurrentBatches: 1 });
      
      expect(service.parseProvider('serviced by Telkom South Africa')).toBe('Telkom');
      expect(service.parseProvider('serviced by Vodacom (Pty) Ltd')).toBe('Vodacom');
    });
  });

  describe('Batching', () => {
    it('should create batches of exactly 5 or less', () => {
      const service = new ProviderLookupService({ maxConcurrentBatches: 2 });
      
      const batches1 = service.createBatchesOfFive(['1', '2', '3']);
      expect(batches1).toEqual([['1', '2', '3']]);
      
      const batches2 = service.createBatchesOfFive(['1', '2', '3', '4', '5']);
      expect(batches2).toEqual([['1', '2', '3', '4', '5']]);
      
      const batches3 = service.createBatchesOfFive(['1', '2', '3', '4', '5', '6']);
      expect(batches3).toEqual([['1', '2', '3', '4', '5'], ['6']]);
      
      const batches4 = service.createBatchesOfFive(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']);
      expect(batches4).toEqual([['1', '2', '3', '4', '5'], ['6', '7', '8', '9', '10'], ['11']]);
    });

    it('should handle empty array', () => {
      const service = new ProviderLookupService({ maxConcurrentBatches: 2 });
      const batches = service.createBatchesOfFive([]);
      
      expect(batches).toEqual([]);
    });
  });

  describe('Configuration', () => {
    it('should accept maxConcurrentBatches configuration', () => {
      const service1 = new ProviderLookupService({ maxConcurrentBatches: 1 });
      expect(service1.getActiveLookups()).toBe(0);
      
      const service2 = new ProviderLookupService({ maxConcurrentBatches: 3 });
      expect(service2.getActiveLookups()).toBe(0);
    });
  });
});

describe('ProviderLookupService - Property-Based Tests', () => {
  /**
   * Property 7: Phone numbers are batched in groups of 5
   * 
   * **Validates: Requirements 3.2**
   * 
   * For any list of phone numbers, when creating batches for provider lookup,
   * each batch should contain at most 5 phone numbers.
   */
  it('Property 7: Phone numbers are batched in groups of 5', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 7, maxLength: 15 }), { minLength: 0, maxLength: 50 }),
        (phoneNumbers) => {
          const service = new ProviderLookupService({ maxConcurrentBatches: 2 });
          const batches = service.createBatchesOfFive(phoneNumbers);

          // Each batch should have at most 5 phone numbers
          for (const batch of batches) {
            expect(batch.length).toBeLessThanOrEqual(5);
            expect(batch.length).toBeGreaterThan(0);
          }

          // All phone numbers should be included in batches
          const allBatchedNumbers = batches.flat();
          expect(allBatchedNumbers).toEqual(phoneNumbers);

          // If we have phone numbers, we should have at least one batch
          if (phoneNumbers.length > 0) {
            expect(batches.length).toBeGreaterThan(0);
          }

          // Number of batches should be correct
          const expectedBatches = Math.ceil(phoneNumbers.length / 5);
          expect(batches.length).toBe(expectedBatches);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8: Phone number cleaning removes non-digits and converts +27
   * 
   * **Validates: Requirements 3.5, 25.3**
   * 
   * For any phone number string, after cleaning:
   * (1) all non-digit characters should be removed, and
   * (2) if it started with "27", it should now start with "0".
   */
  it('Property 8: Phone number cleaning removes non-digits and converts +27', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Generate phone numbers with various formats
          fc.string({ minLength: 7, maxLength: 15 }).map(s => s.replace(/[a-zA-Z]/g, '')), // Mixed
          fc.tuple(
            fc.constantFrom('+27', '27', '0'),
            fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 8, maxLength: 9 })
          ).map(([prefix, digits]) => prefix + digits.join('')), // Valid SA numbers
          fc.tuple(
            fc.constantFrom('+27 ', '27-', '0'),
            fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 8, maxLength: 9 })
          ).map(([prefix, digits]) => {
            // Add random separators
            const digitStr = digits.join('');
            return prefix + digitStr.slice(0, 2) + ' ' + digitStr.slice(2, 5) + '-' + digitStr.slice(5);
          })
        ),
        (phoneNumber) => {
          const service = new ProviderLookupService({ maxConcurrentBatches: 1 });
          const cleaned = service.cleanPhoneNumber(phoneNumber);

          // (1) All non-digit characters should be removed
          expect(cleaned).toMatch(/^\d*$/);

          // (2) If original started with +27 or 27, cleaned should start with 0
          const digitsOnly = phoneNumber.replace(/\D/g, '');
          if (digitsOnly.startsWith('27') && digitsOnly.length > 2) {
            expect(cleaned).toMatch(/^0/);
            // The rest should be the digits after '27'
            expect(cleaned).toBe('0' + digitsOnly.substring(2));
          } else if (digitsOnly === '27') {
            // Edge case: exactly "27" with no digits after becomes "0"
            expect(cleaned).toBe('0');
          } else {
            // Otherwise, cleaned should be just the digits
            expect(cleaned).toBe(digitsOnly);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9: Provider parsing extracts name after "serviced by"
   * 
   * **Validates: Requirements 3.6**
   * 
   * For any text containing "serviced by [provider name]", the parsed provider
   * should be the first word after "serviced by" with trailing punctuation removed.
   */
  it('Property 9: Provider parsing extracts name after "serviced by"', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => {
          const trimmed = s.trim();
          // Must have at least one alphanumeric character and no spaces
          return trimmed.length > 0 && !/\s/.test(trimmed) && /[a-zA-Z0-9]/.test(trimmed);
        }), // Provider name (single word with at least one alphanumeric)
        fc.constantFrom('', '.', ',', '!', '?', ';', ':', '...'), // Trailing punctuation
        fc.string({ minLength: 0, maxLength: 50 }), // Additional text after provider
        fc.constantFrom('serviced by ', 'Serviced By ', 'SERVICED BY ', 'SeRvIcEd bY '), // Case variations
        (providerName, punctuation, additionalText, marker) => {
          const service = new ProviderLookupService({ maxConcurrentBatches: 1 });
          
          // Construct text with "serviced by" marker
          const text = `${marker}${providerName}${punctuation}${additionalText ? ' ' + additionalText : ''}`;
          const parsed = service.parseProvider(text);

          // The implementation does:
          // 1. afterMarker.split(/\s+/)[0] - takes first word (removes trailing spaces)
          // 2. .replace(/[.,;:!?]+$/, '') - removes trailing punctuation
          const afterMarker = (providerName + punctuation).trim();
          const firstWord = afterMarker.split(/\s+/)[0];
          const expectedProvider = firstWord.replace(/[.,;:!?]+$/, '');
          
          // Should extract the provider name without trailing punctuation
          // If after processing we have nothing left, it should be "Unknown"
          if (expectedProvider.length > 0) {
            expect(parsed).toBe(expectedProvider);
          } else {
            expect(parsed).toBe('Unknown');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 17: Phone numbers match valid format
   * 
   * **Validates: Requirements 25.2**
   * 
   * For any phone number that passes validation, it should match the pattern
   * of at least 7 digits with optional spaces, dashes, parentheses, or plus sign.
   */
  it('Property 17: Phone numbers match valid format', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.constantFrom('+27', '27', '0', ''), // Prefix
          fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 7, maxLength: 10 }), // Digits
          fc.constantFrom('', ' ', '-', '(', ')') // Separators
        ).map(([prefix, digits, separator]) => {
          // Build a valid phone number with separators
          const digitStr = digits.join('');
          if (separator && digitStr.length >= 4) {
            // Insert separator in the middle
            const mid = Math.floor(digitStr.length / 2);
            return prefix + digitStr.slice(0, mid) + separator + digitStr.slice(mid);
          }
          return prefix + digitStr;
        }),
        (phoneNumber) => {
          const service = new ProviderLookupService({ maxConcurrentBatches: 1 });
          const cleaned = service.cleanPhoneNumber(phoneNumber);

          // After cleaning, should have at least 7 digits (or be empty if input was invalid)
          if (cleaned.length > 0) {
            expect(cleaned.length).toBeGreaterThanOrEqual(7);
            expect(cleaned).toMatch(/^\d+$/);
          }

          // Original should contain at least 7 digits
          const digitCount = (phoneNumber.match(/\d/g) || []).length;
          if (digitCount >= 7) {
            expect(cleaned.length).toBeGreaterThanOrEqual(7);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 18: Provider names are non-empty after parsing
   * 
   * **Validates: Requirements 25.4**
   * 
   * For any successfully parsed provider result, the provider name should be
   * non-empty (not empty string, not just whitespace).
   */
  it('Property 18: Provider names are non-empty after parsing', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Valid cases: text with "serviced by" marker
          fc.tuple(
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
            fc.constantFrom('serviced by ', 'Serviced By ')
          ).map(([provider, marker]) => marker + provider),
          
          // Invalid cases: no marker or empty provider
          fc.string({ minLength: 0, maxLength: 50 }).filter(s => !s.toLowerCase().includes('serviced by'))
        ),
        (text) => {
          const service = new ProviderLookupService({ maxConcurrentBatches: 1 });
          const parsed = service.parseProvider(text);

          // Provider should never be null or undefined
          expect(parsed).toBeDefined();
          expect(parsed).not.toBeNull();

          // Provider should be a string
          expect(typeof parsed).toBe('string');

          // If parsing succeeded (not "Unknown"), provider should be non-empty
          if (parsed !== 'Unknown') {
            expect(parsed.trim().length).toBeGreaterThan(0);
            expect(parsed).not.toBe('');
          }

          // If text contains "serviced by" with a word after it, should not be "Unknown"
          const lowerText = text.toLowerCase();
          if (lowerText.includes('serviced by ')) {
            const afterMarker = text.substring(lowerText.indexOf('serviced by ') + 'serviced by '.length).trim();
            if (afterMarker.length > 0 && /\w/.test(afterMarker)) {
              expect(parsed).not.toBe('Unknown');
              expect(parsed.trim().length).toBeGreaterThan(0);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Empty input handling
   * 
   * For any empty or whitespace-only input, the service should handle it gracefully.
   */
  it('Property: Empty input handling', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('', '   ', '\t', '\n', '  \t\n  '),
        (emptyInput) => {
          const service = new ProviderLookupService({ maxConcurrentBatches: 1 });
          
          // Cleaning empty input should return empty string
          const cleaned = service.cleanPhoneNumber(emptyInput);
          expect(cleaned).toBe('');

          // Parsing empty input should return "Unknown"
          const parsed = service.parseProvider(emptyInput);
          expect(parsed).toBe('Unknown');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Batch count is correct
   * 
   * For any list of N phone numbers, the number of batches should be ceil(N/5).
   */
  it('Property: Batch count is correct', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 7, maxLength: 15 }), { minLength: 0, maxLength: 100 }),
        (phoneNumbers) => {
          const service = new ProviderLookupService({ maxConcurrentBatches: 2 });
          const batches = service.createBatchesOfFive(phoneNumbers);

          const expectedBatchCount = Math.ceil(phoneNumbers.length / 5);
          expect(batches.length).toBe(expectedBatchCount);

          // Total number of items in all batches should equal input length
          const totalItems = batches.reduce((sum, batch) => sum + batch.length, 0);
          expect(totalItems).toBe(phoneNumbers.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Phone number cleaning is idempotent
   * 
   * For any phone number, cleaning it twice should give the same result as cleaning it once.
   */
  it('Property: Phone number cleaning is idempotent', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 30 }),
        (phoneNumber) => {
          const service = new ProviderLookupService({ maxConcurrentBatches: 1 });
          
          const cleanedOnce = service.cleanPhoneNumber(phoneNumber);
          const cleanedTwice = service.cleanPhoneNumber(cleanedOnce);

          expect(cleanedOnce).toBe(cleanedTwice);
        }
      ),
      { numRuns: 100 }
    );
  });
});
