/**
 * IndustryScraper
 * Scrapes Google Maps for businesses by industry and town
 */

import { Page } from 'puppeteer';
import { ScrapedBusiness } from './types';
import { ErrorLogger } from './error-logger';
import { EventEmitter } from 'events';

export class IndustryScraper {
  private page: Page;
  private town: string;
  private industry: string;
  private errorLogger: ErrorLogger;
  private eventEmitter?: EventEmitter;

  constructor(page: Page, town: string, industry: string, eventEmitter?: EventEmitter) {
    this.page = page;
    this.town = town;
    this.industry = industry;
    this.errorLogger = ErrorLogger.getInstance();
    this.eventEmitter = eventEmitter;
  }

  /**
   * Main scraping method
   * Navigates to Google Maps and extracts businesses
   */
  async scrape(): Promise<ScrapedBusiness[]> {
    const maxRetries = 2;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Navigate to Google Maps search
        // Build search query: "industry in town" or just "town" if no industry
        // Don't add "South Africa" if town already contains location info (province, country, etc.)
        const townLower = this.town.toLowerCase();
        const hasLocationInfo = 
          townLower.includes('south africa') || 
          townLower.includes('gauteng') || 
          townLower.includes('western cape') || 
          townLower.includes('eastern cape') || 
          townLower.includes('northern cape') || 
          townLower.includes('free state') || 
          townLower.includes('kwazulu-natal') || 
          townLower.includes('limpopo') || 
          townLower.includes('mpumalanga') || 
          townLower.includes('north west') || 
          townLower.includes('northwest');
        
        let searchQuery;
        if (this.industry === '') {
          // No industry - just search for the town/business name
          searchQuery = hasLocationInfo ? this.town : `${this.town}, South Africa`;
        } else {
          // With industry - search "industry in town"
          searchQuery = hasLocationInfo 
            ? `${this.industry} in ${this.town}` 
            : `${this.industry} in ${this.town}, South Africa`;
        }
        
        const url = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;

        console.log(`[IndustryScraper] Attempt ${attempt}/${maxRetries} - Navigating to: ${searchQuery}`);
        
        await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Wait a bit for page to load
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if we have a list view (multiple results) or single business view
        const hasFeed = await this.page.$('div[role="feed"]');
        
        let businesses: ScrapedBusiness[];
        
        if (hasFeed) {
          // Multiple results - use list view extraction
          console.log(`[IndustryScraper] Found list view for ${searchQuery}`);
          businesses = await this.extractFromListView();
        } else {
          // Single business result - extract from business card
          console.log(`[IndustryScraper] Found single business view for ${searchQuery}`);
          businesses = await this.extractFromSingleBusinessView();
        }

        console.log(`[IndustryScraper] Successfully scraped ${businesses.length} businesses for ${searchQuery}`);
        return businesses;
        
      } catch (error: any) {
        lastError = error;
        console.error(`[IndustryScraper] Attempt ${attempt}/${maxRetries} failed for ${this.industry} in ${this.town}:`, error.message);
        
        // If this is a timeout and we have retries left, wait and try again
        if (attempt < maxRetries && (error.message?.includes('timeout') || error.message?.includes('Navigation'))) {
          console.log(`[IndustryScraper] Waiting 3 seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
          continue;
        }
        
        // If we're out of retries or it's not a timeout error, throw
        this.errorLogger.logScrapingError(this.town, this.industry, error);
        throw error;
      }
    }

    // If we get here, all retries failed
    this.errorLogger.logScrapingError(this.town, this.industry, lastError);
    throw lastError;
  }

  /**
   * Extract businesses from list view with scrolling
   */
  async extractFromListView(): Promise<ScrapedBusiness[]> {
    const businesses: ScrapedBusiness[] = [];
    let previousCount = 0;
    let noChangeCount = 0;
    const maxNoChangeIterations = 3;

    while (true) {
      // Scroll the feed
      await this.scrollFeed();

      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if we've reached the end
      const reachedEnd = await this.hasReachedEndOfList();
      if (reachedEnd) {
        break;
      }

      // Extract business cards
      const currentCards = await this.page.$$('div[role="feed"] .Nv2PK');
      
      // If no new cards appeared, increment counter
      if (currentCards.length === previousCount) {
        noChangeCount++;
        if (noChangeCount >= maxNoChangeIterations) {
          break;
        }
      } else {
        noChangeCount = 0;
        previousCount = currentCards.length;
      }
    }

    // Parse all business cards
    const cards = await this.page.$$('div[role="feed"] .Nv2PK');
    
    for (const card of cards) {
      try {
        const business = await this.parseBusinessCard(card);
        if (business) {
          businesses.push(business);
          
          // Emit individual business for real-time display (Phase 2)
          if (this.eventEmitter) {
            this.eventEmitter.emit('business', business);
          }
        }
      } catch (error) {
        // Log error but continue with next card
        this.errorLogger.logError(
          `Failed to parse business card in ${this.town}, ${this.industry}`,
          error
        );
      }
    }

    return businesses;
  }

  /**
   * Parse a single business card element
   */
  async parseBusinessCard(cardElement: any): Promise<ScrapedBusiness | null> {
    try {
      // Extract name from qBF1Pd element (REQUIRED - return null if missing)
      let name = '';
      try {
        name = await cardElement.$eval(
          '.qBF1Pd',
          (el: Element) => el.textContent?.trim() || ''
        );
      } catch (error) {
        this.errorLogger.logError('Failed to extract business name', error);
      }

      // Return null if name is missing (required field)
      if (!name) {
        return null;
      }

      // Extract Google Maps URL from anchor tag (OPTIONAL - set to empty string if missing)
      let mapsUrl = '';
      try {
        // Use evaluate to extract href in browser context (more reliable)
        mapsUrl = await cardElement.evaluate((el: Element) => {
          const anchor = el.querySelector('a');
          if (anchor) {
            // Get the full resolved href (not just the attribute)
            const href = (anchor as HTMLAnchorElement).href;
            console.log('[IndustryScraper] Found anchor href:', href);
            return href || '';
          }
          console.log('[IndustryScraper] No anchor found in card');
          return '';
        });
        
        if (mapsUrl) {
          console.log(`[IndustryScraper] Extracted maps URL for ${name}: ${mapsUrl}`);
        } else {
          console.log(`[IndustryScraper] No maps URL found for ${name}`);
        }
      } catch (error) {
        console.log(`[IndustryScraper] Error extracting maps URL for ${name}:`, error);
        mapsUrl = '';
      }

      // Get all W4Efsd info elements
      const infoElements = await cardElement.$$('.W4Efsd');

      let phone = '';
      let address = '';

      // Process each W4Efsd container
      for (const infoEl of infoElements) {
        // Parse phone number (look for UsdlK class)
        try {
          const phoneSpan = await infoEl.$('.UsdlK').catch(() => null);
          if (phoneSpan) {
            const phoneText = await phoneSpan.evaluate((el: Element) => el.textContent?.trim() || '');
            if (phoneText && !phone) {
              phone = phoneText;
            }
          }
        } catch (error) {
          // Phone is optional, continue
        }

        // Get all span elements
        try {
          const spans = await infoEl.$$('span');

          // Collect all span texts, checking if they contain UsdlK (phone) class
          for (const span of spans) {
            // Skip if this span contains the phone number (has UsdlK class)
            const hasPhoneClass = await span.evaluate((el: Element) => {
              return el.classList.contains('UsdlK') || el.querySelector('.UsdlK') !== null;
            });

            if (hasPhoneClass) {
              continue;
            }

            let spanText = await span.evaluate((el: Element) => el.textContent?.trim() || '');

            // Remove leading separator character if present
            if (spanText.startsWith('·')) {
              spanText = spanText.substring(1).trim();
            }

            // Skip empty spans, separator characters, opening hours, ratings, and icons
            if (!spanText ||
              spanText === '·' ||
              spanText === '' ||
              this.isOpeningHours(spanText) ||
              this.looksLikeRating(spanText) ||
              this.looksLikePhoneNumber(spanText) ||
              spanText.toLowerCase().includes('open') ||
              spanText.toLowerCase().includes('close') ||
              spanText.toLowerCase().includes('wheelchair')) {
              continue;
            }

            // Check if this looks like a business type (first meaningful text)
            const isBusinessType = spanText.split(' ').length <= 3 && !address;

            // If we haven't found an address yet and this isn't a business type, it's likely the address
            if (!isBusinessType && !address) {
              // Address typically contains street indicators or is a location name
              const addressIndicators = ['street', 'ave', 'avenue', 'road', 'rd', 'drive', 'dr', 'lane', 'ln', 'way', 'blvd', 'boulevard'];
              const lowerText = spanText.toLowerCase();
              const hasAddressIndicator = addressIndicators.some(indicator => lowerText.includes(indicator));

              // If it has address indicators or is longer than typical business type, treat as address
              if (hasAddressIndicator || spanText.length > 10) {
                address = spanText;
                break;
              }
            }
          }
        } catch (error) {
          // Address is optional, continue
        }
      }

      // Create business object with empty strings for missing optional fields
      const business: ScrapedBusiness = {
        maps_address: mapsUrl,
        name: name,
        phone: phone,
        provider: '', // Will be filled by provider lookup
        address: address,
        type_of_business: this.industry,
        town: this.town,
      };

      return business;
    } catch (error) {
      this.errorLogger.logError('Failed to parse business card', error);
      return null;
    }
  }

  /**
   * Scroll the feed element
   */
  private async scrollFeed(): Promise<void> {
    await this.page.evaluate(() => {
      const feed = document.querySelector('div[role="feed"]');
      if (feed) {
        feed.scrollTop = feed.scrollHeight;
      }
    });
  }

  /**
   * Check if we've reached the end of the list
   */
  private async hasReachedEndOfList(): Promise<boolean> {
    return await this.page.evaluate(() => {
      const bodyText = document.body.textContent || '';
      return (
        bodyText.includes("You've reached the end of the list") ||
        bodyText.includes("You've reached the end") ||
        bodyText.includes('No more results')
      );
    });
  }

  /**
   * Check if text looks like opening hours
   */
  private isOpeningHours(text: string): boolean {
    const patterns = [
      /^(Open|Closed|Opens|Closes)/i,
      /\d{1,2}:\d{2}\s*(AM|PM|am|pm)/i,
      /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i,
      /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i,
    ];

    return patterns.some(pattern => pattern.test(text));
  }

  /**
   * Check if text looks like a phone number
   */
  private looksLikePhoneNumber(text: string): boolean {
    // Must have at least 7 digits
    const digitCount = (text.match(/\d/g) || []).length;
    if (digitCount < 7) return false;

    // Common phone patterns
    const patterns = [
      /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/, // 123-456-7890
      /\+?\d{10,}/, // +1234567890
      /\(\d{3}\)\s?\d{3}[-.\s]?\d{4}/, // (123) 456-7890
    ];

    return patterns.some(pattern => pattern.test(text));
  }

  /**
   * Check if text looks like a rating
   */
  private looksLikeRating(text: string): boolean {
    const patterns = [
      /^\d+(\.\d+)?\s*\([\d,]+\)/, // 4.5 (123)
      /^\d+(\.\d+)?\s*stars?/i, // 4.5 stars
      /^\d+(\.\d+)?\/5/, // 4.5/5
    ];

    return patterns.some(pattern => pattern.test(text));
  }

  /**
   * Extract business from single business view (when searching for specific business)
   * This is used when Google Maps shows a single business card instead of a list
   */
  async extractFromSingleBusinessView(): Promise<ScrapedBusiness[]> {
    try {
      const data = await this.page.evaluate(() => {
        // Extract name from h1
        const mainPanel = document.querySelector('div[role="main"]');
        const h1 = mainPanel?.querySelector('h1');
        const name = h1?.textContent?.trim() || '';

        // Get current URL as maps_address
        const maps_address = window.location.href;

        // Extract address - look for address elements
        let address = '';
        const addressSelectors = [
          'button[data-item-id="address"]',
          'div[data-item-id="address"]',
          'button[aria-label*="Address"]',
        ];

        for (const selector of addressSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            address = element.textContent?.trim() || '';
            if (address) break;
          }
        }

        return {
          name,
          maps_address,
          address,
        };
      });

      // Extract phone using multiple strategies
      const phone = await this.extractPhoneFromSingleView();

      if (!data.name || data.name.trim() === '') {
        console.log('[IndustryScraper] No business name found in single view');
        return [];
      }

      const business: ScrapedBusiness = {
        maps_address: data.maps_address || '',
        name: data.name,
        phone: phone || 'No phone',
        provider: '', // Will be filled by provider lookup
        address: data.address || '',
        type_of_business: this.industry || 'Business',
        town: this.town,
      };

      console.log(`[IndustryScraper] Extracted single business: ${business.name}`);
      return [business];
    } catch (error) {
      this.errorLogger.logError('Failed to extract from single business view', error);
      return [];
    }
  }

  /**
   * Extract phone number from single business view
   */
  async extractPhoneFromSingleView(): Promise<string> {
    try {
      // Strategy 1: Look for phone button
      const phoneFromButton = await this.page.evaluate(() => {
        const phoneButton = document.querySelector('button[data-item-id="phone:tel:"]');
        if (phoneButton) {
          const ariaLabel = phoneButton.getAttribute('aria-label');
          if (ariaLabel) {
            const match = ariaLabel.match(/\d[\d\s\-\(\)]+\d/);
            if (match) return match[0].trim();
          }
        }
        return null;
      });

      if (phoneFromButton) {
        return this.cleanPhone(phoneFromButton);
      }

      // Strategy 2: Look in all text content
      const phoneFromText = await this.page.evaluate(() => {
        const mainPanel = document.querySelector('div[role="main"]');
        if (!mainPanel) return null;

        const text = mainPanel.textContent || '';
        const phonePattern = /\d{3}[\s\-]?\d{3}[\s\-]?\d{4}/;
        const match = text.match(phonePattern);
        return match ? match[0] : null;
      });

      if (phoneFromText) {
        return this.cleanPhone(phoneFromText);
      }

      return 'No phone';
    } catch (error) {
      this.errorLogger.logError('Failed to extract phone from single view', error);
      return 'No phone';
    }
  }

  /**
   * Clean phone number - remove non-digits and convert +27 to 0
   * Same logic as provider-lookup-service cleanPhoneNumber
   */
  private cleanPhone(phoneNumber: string): string {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Convert international format (+27...) to local format (0...)
    // South African country code is 27
    if (cleaned.startsWith('27')) {
      cleaned = '0' + cleaned.substring(2);
    }
    
    return cleaned;
  }
}

