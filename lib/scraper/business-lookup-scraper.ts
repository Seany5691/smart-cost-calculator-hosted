/**
 * BusinessLookupScraper
 * Scrapes Google Maps for specific business queries
 * Handles both list view (multiple results) and details view (single business)
 */

import { Page } from 'puppeteer';
import { ScrapedBusiness } from './types';
import { ErrorLogger } from './error-logger';

export class BusinessLookupScraper {
  private page: Page;
  private businessQuery: string;
  private errorLogger: ErrorLogger;

  constructor(page: Page, businessQuery: string) {
    this.page = page;
    this.businessQuery = businessQuery;
    this.errorLogger = ErrorLogger.getInstance();
  }

  /**
   * Main scraping method
   * Detects view type and extracts accordingly
   */
  async scrape(): Promise<ScrapedBusiness[]> {
    try {
      // Format query: convert "Business, Town" to "Business in Town"
      let searchQuery = this.businessQuery;
      if (searchQuery.includes(',')) {
        searchQuery = searchQuery.replace(/,\s*/g, ' in ');
      }

      console.log(`[BusinessLookup] Original query: "${this.businessQuery}"`);
      console.log(`[BusinessLookup] Formatted query: "${searchQuery}"`);

      // Navigate to Google Maps search
      const url = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;
      console.log(`[BusinessLookup] Navigating to: ${url}`);
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

      // Wait for page to load
      console.log(`[BusinessLookup] Waiting 2 seconds for page to load...`);
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Detect view type
      console.log(`[BusinessLookup] Detecting view type...`);
      const viewType = await this.detectViewType();
      console.log(`[BusinessLookup] Detected view type: ${viewType}`);

      if (viewType === 'details') {
        // Single business details view
        console.log(`[BusinessLookup] Extracting from details view...`);
        const business = await this.extractFromDetailsView();
        return business ? [business] : [];
      } else {
        // List view with multiple results
        console.log(`[BusinessLookup] Extracting from list view...`);
        return await this.extractFromListView();
      }
    } catch (error) {
      console.error(`[BusinessLookup] Error scraping business:`, error);
      this.errorLogger.logError(`Failed to scrape business: ${this.businessQuery}`, error);
      throw error;
    }
  }

  /**
   * Detect whether we're in list view or details view
   */
  async detectViewType(): Promise<'list' | 'details'> {
    try {
      // Check for feed element (list view)
      const hasFeed = await this.page.evaluate(() => {
        return document.querySelector('div[role="feed"]') !== null;
      });

      console.log(`[BusinessLookup] Has feed element: ${hasFeed}`);

      if (hasFeed) {
        return 'list';
      }

      // Check for main panel with h1 (details view)
      const hasDetailsPanel = await this.page.evaluate(() => {
        const mainPanel = document.querySelector('div[role="main"]');
        if (!mainPanel) return false;
        
        const h1 = mainPanel.querySelector('h1');
        return h1 !== null;
      });

      console.log(`[BusinessLookup] Has details panel: ${hasDetailsPanel}`);

      if (hasDetailsPanel) {
        return 'details';
      }

      // Default to list view
      console.log(`[BusinessLookup] No feed or details panel found, defaulting to list view`);
      return 'list';
    } catch (error) {
      console.error(`[BusinessLookup] Error detecting view type:`, error);
      this.errorLogger.logError('Failed to detect view type', error);
      return 'list';
    }
  }

  /**
   * Extract business from details view (single business page)
   */
  async extractFromDetailsView(): Promise<ScrapedBusiness | null> {
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
      const phone = await this.extractPhoneFromDetails();

      if (!data.name || data.name.trim() === '') {
        return null;
      }

      const business: ScrapedBusiness = {
        maps_address: data.maps_address || '',
        name: data.name,
        phone: phone || 'No phone',
        provider: '', // Will be filled by provider lookup
        address: data.address || '',
        type_of_business: this.businessQuery,
        town: '', // Not available in details view
      };

      return business;
    } catch (error) {
      this.errorLogger.logError('Failed to extract from details view', error);
      return null;
    }
  }

  /**
   * Extract phone number from details view using multiple strategies
   */
  async extractPhoneFromDetails(): Promise<string> {
    try {
      // Strategy 1: Look for phone button with aria-label
      let phone = await this.page.evaluate(() => {
        const phoneButton = document.querySelector('button[aria-label*="Phone"]');
        if (phoneButton) {
          const ariaLabel = phoneButton.getAttribute('aria-label') || '';
          // Extract phone from aria-label like "Phone: 555-1234"
          const match = ariaLabel.match(/Phone:\s*(.+)/i);
          if (match) {
            return match[1].trim();
          }
        }
        return '';
      });

      if (phone) return phone;

      // Strategy 2: Look for phone button text
      phone = await this.page.evaluate(() => {
        const phoneButtons = Array.from(document.querySelectorAll('button'));
        for (const button of phoneButtons) {
          const text = button.textContent || '';
          // Check if text looks like a phone number
          if (/\d{3}.*\d{3}.*\d{4}/.test(text) || /\+?\d{10,}/.test(text)) {
            return text.trim();
          }
        }
        return '';
      });

      if (phone) return phone;

      // Strategy 3: Tree walker to find phone-like text
      phone = await this.page.evaluate(() => {
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null
        );

        let node;
        while ((node = walker.nextNode())) {
          const text = node.textContent?.trim() || '';
          // Look for phone patterns
          if (/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(text) || /\+?\d{10,}/.test(text)) {
            // Make sure it's not part of a larger number (like a rating count)
            if (!/\d{5,}/.test(text.replace(/[-.\s]/g, ''))) {
              return text;
            }
          }
        }
        return '';
      });

      if (phone) return phone;

      // No phone found
      return 'No phone';
    } catch (error) {
      this.errorLogger.logError('Failed to extract phone from details view', error);
      return 'No phone';
    }
  }

  /**
   * Extract businesses from list view (limit to 3)
   */
  async extractFromListView(): Promise<ScrapedBusiness[]> {
      try {
        // Wait for feed to load
        console.log(`[BusinessLookup] Waiting for feed element...`);
        await this.page.waitForSelector('div[role="feed"]', { timeout: 10000 });
        console.log(`[BusinessLookup] Feed element found`);

        // Get business cards (limit to 3) - FIXED: Use $$() to get array of elements
        const cards = await this.page.$$('div[role="feed"] > div > div');
        console.log(`[BusinessLookup] Found ${cards.length} business cards in list view`);

        const limitedCards = cards.slice(0, 3);
        console.log(`[BusinessLookup] Processing ${limitedCards.length} cards (limited to 3)`);

        const businesses: ScrapedBusiness[] = [];

        for (let i = 0; i < limitedCards.length; i++) {
          try {
            console.log(`[BusinessLookup] Parsing card ${i + 1}/${limitedCards.length}`);
            const business = await this.parseBusinessCard(limitedCards[i]);
            if (business) {
              console.log(`[BusinessLookup] Card ${i + 1}: ${business.name}`);
              businesses.push(business);
            } else {
              console.log(`[BusinessLookup] Card ${i + 1}: Skipped (no name)`);
            }
          } catch (error) {
            // Log error but continue with next card
            console.error(`[BusinessLookup] Failed to parse card ${i + 1}:`, error);
            this.errorLogger.logError('Failed to parse business card in list view', error);
          }
        }

        console.log(`[BusinessLookup] Extracted ${businesses.length} businesses from list view`);
        return businesses;
      } catch (error) {
        console.error('[BusinessLookup] Failed to extract from list view:', error);
        this.errorLogger.logError('Failed to extract from list view', error);
        return [];
      }
    }


  /**
   * Parse a single business card from list view
   */
  async parseBusinessCard(cardElement: any): Promise<ScrapedBusiness | null> {
    try {
      const data = await cardElement.evaluate((element: Element) => {
        // Find the link element
        const linkElement = element.querySelector('a');
        const href = linkElement?.getAttribute('href') || '';

        // Extract name
        let name = '';
        const nameSelectors = [
          'div[class*="fontHeadlineSmall"]',
          'div[class*="fontHeadline"]',
          'div.qBF1Pd',
          'div[aria-label]',
        ];

        for (const selector of nameSelectors) {
          const nameElement = element.querySelector(selector);
          if (nameElement) {
            name = nameElement.textContent?.trim() || '';
            if (name) break;
          }
        }

        // Extract all text content
        const allText = element.textContent || '';
        const lines = allText.split('\n').map(line => line.trim()).filter(line => line);

        // Extract phone and address
        let phone = '';
        let address = '';

        for (const line of lines) {
          if (line === name) continue;

          // Remove leading separator character if present
          let cleanLine = line;
          if (cleanLine.startsWith('·')) {
            cleanLine = cleanLine.substring(1).trim();
          }

          // Skip empty lines after cleaning
          if (!cleanLine) continue;

          // Skip opening hours
          if (/^(Open|Closed|Opens|Closes)/i.test(cleanLine)) continue;
          if (/\d{1,2}:\d{2}\s*(AM|PM|am|pm)/i.test(cleanLine)) continue;

          // Skip ratings
          if (/^\d+(\.\d+)?\s*\([\d,]+\)/.test(cleanLine)) continue;

          // Check for phone
          if (/\d{3}.*\d{3}.*\d{4}/.test(cleanLine) || /\+?\d{10,}/.test(cleanLine)) {
            if (!/^\d+(\.\d+)?\s*\(/.test(cleanLine)) {
              phone = cleanLine;
              continue;
            }
          }

          // Everything else is address
          if (!address && cleanLine.length > 5) {
            address = cleanLine;
          }
        }

        return {
          maps_address: href,
          name,
          phone,
          address,
        };
      });

      // Skip if no name
      if (!data.name || data.name.trim() === '') {
        return null;
      }

      const business: ScrapedBusiness = {
        maps_address: data.maps_address || '',
        name: data.name,
        phone: data.phone || '',
        provider: '', // Will be filled by provider lookup
        address: data.address || '',
        type_of_business: this.businessQuery,
        town: '', // Not available in list view
      };

      return business;
    } catch (error) {
      this.errorLogger.logError('Failed to parse business card', error);
      return null;
    }
  }
}
