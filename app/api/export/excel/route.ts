/**
 * API Route: Export Businesses to Excel
 * POST /api/export/excel
 * 
 * This route handles exporting businesses to Excel format.
 * Used by ProviderExport component for filtered exports.
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
      const { businesses, filename, byProvider } = body;

      if (!businesses || !Array.isArray(businesses)) {
        return NextResponse.json(
          { error: 'Invalid businesses data' },
          { status: 400 }
        );
      }

      // Create Excel file using the appropriate export function
      const sessionName = filename?.replace('.xlsx', '') || 'businesses';
      let buffer;
      
      if (byProvider) {
        // Use provider-based export (separate sheets per provider)
        const { exportToExcelByProvider } = await import('@/lib/scraper/excel-export');
        buffer = await exportToExcelByProvider(businesses, sessionName);
      } else {
        // Use standard export (single sheet with all businesses)
        buffer = await exportToExcel(businesses, sessionName);
      }

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
