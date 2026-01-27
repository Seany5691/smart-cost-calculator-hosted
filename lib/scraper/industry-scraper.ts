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
    try {
      // Navigate to Google Maps search
      const searchQuery = `${this.industry} in ${this.town}, South Africa`;
      const url = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;

      await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for results feed to load
      await this.page.waitForSelector('div[role="feed"]', { timeout: 10000 });

      // Extract businesses from list view
      const businesses = await this.extractFromListView();

      return businesses;
    } catch (error) {
      this.errorLogger.logScrapingError(this.town, this.industry, error);
      throw error;
    }
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
        mapsUrl = await cardElement.$eval(
          'a[href*="/maps/place/"]',
          (el: Element) => el.getAttribute('href') || ''
        );
      } catch (error) {
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

            const spanText = await span.evaluate((el: Element) => el.textContent?.trim() || '');

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
}
