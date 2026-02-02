/**
 * API Route: Export Scraped Businesses to Excel
 * POST /api/scraper/export
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';
import { exportToExcel } from '@/lib/scraper/excel-export';

export async function POST(request: NextRequest) {
  return withAuth(async (authRequest: AuthenticatedRequest) => {
    try {
      const user = authRequest.user;
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const body = await authRequest.json();
      const { businesses, filename } = body;

      if (!businesses || !Array.isArray(businesses)) {
        return NextResponse.json(
          { error: 'Invalid businesses data' },
          { status: 400 }
        );
      }

      // Create Excel file using the exportToExcel function
      const sessionName = filename?.replace('.xlsx', '') || 'businesses';
      
      // Convert Business format (from store) to ScrapedBusiness format (for Excel export)
      const scrapedBusinesses = businesses.map((b: any) => ({
        maps_address: b.website || '',
        name: b.name,
        phone: b.phone || 'N/A',
        provider: b.provider || 'Unknown',
        address: b.address || '',
        type_of_business: b.industry || '',
        town: b.town,
      }));
      
      const buffer = await exportToExcel(scrapedBusinesses, sessionName);

      // Convert Buffer to Uint8Array for NextResponse
      const uint8Array = new Uint8Array(buffer);

      // Return as downloadable file
      return new NextResponse(uint8Array, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename || 'businesses.xlsx'}"`,
        },
      });
    } catch (error: any) {
      console.error('Error exporting businesses:', error);
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  })(request);
}
