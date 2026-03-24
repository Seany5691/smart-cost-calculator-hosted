/**
 * HTML to PDF Conversion API
 * Converts HTML proposal to PDF using Puppeteer (server-side)
 * Auto-attaches to lead if leadId is provided
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { verifyAuth } from '@/lib/middleware';
import { browserManager } from '@/lib/scraper/browser-manager';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: NextRequest) {
  let browser = null;
  
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.userId;
    const body = await request.json();
    const { html, leadId, leadName, fileName } = body;

    if (!html) {
      return NextResponse.json({ error: 'HTML content is required' }, { status: 400 });
    }

    console.log('[HTML-to-PDF] Starting PDF generation...');
    console.log('[HTML-to-PDF] Lead ID:', leadId);
    console.log('[HTML-to-PDF] File name:', fileName);

    // Convert relative image paths to absolute URLs for the production domain
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://deals.smartintegrate.co.za';
    const htmlWithAbsoluteUrls = html.replace(
      /src="Pictures\//g,
      `src="${baseUrl}/Pictures/`
    );

    console.log('[HTML-to-PDF] Converted relative image paths to absolute URLs');

    // Get browser instance from the manager (reuses existing scraper setup)
    console.log('[HTML-to-PDF] Getting browser instance...');
    browser = await browserManager.getBrowser('pdf-generation');
    
    console.log('[HTML-to-PDF] Creating new page...');
    const page = await browser.newPage();
    
    // Set viewport for consistent rendering
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 2, // Higher quality
    });

    console.log('[HTML-to-PDF] Setting HTML content...');
    // Load the HTML content with absolute URLs
    await page.setContent(htmlWithAbsoluteUrls, {
      waitUntil: ['networkidle0', 'load', 'domcontentloaded'],
      timeout: 60000, // Increased timeout for external resources
    });

    // Wait for Tailwind CSS to load and process
    console.log('[HTML-to-PDF] Waiting for Tailwind CSS to load...');
    await page.waitForFunction(() => {
      // Check if Tailwind has processed the page
      const element = document.querySelector('.page');
      if (!element) return false;
      const styles = window.getComputedStyle(element);
      // Check if Tailwind classes are applied (width should be set)
      return styles.width !== '' && styles.width !== 'auto';
    }, { timeout: 30000 }).catch(() => {
      console.log('[HTML-to-PDF] Tailwind check timed out, continuing anyway');
    });

    // Wait for Font Awesome icons to load
    console.log('[HTML-to-PDF] Waiting for Font Awesome to load...');
    await page.waitForFunction(() => {
      const icons = document.querySelectorAll('.fa, .fas, .far, .fab');
      if (icons.length === 0) return true; // No icons, continue
      // Check if at least one icon has loaded
      const firstIcon = icons[0] as HTMLElement;
      const styles = window.getComputedStyle(firstIcon);
      return styles.fontFamily.includes('Font Awesome');
    }, { timeout: 30000 }).catch(() => {
      console.log('[HTML-to-PDF] Font Awesome check timed out, continuing anyway');
    });

    // Wait for Google Fonts (Inter and Space Grotesk) to load
    console.log('[HTML-to-PDF] Waiting for Google Fonts to load...');
    await page.waitForFunction(() => {
      // Check if fonts are loaded by testing computed font-family
      const testElement = document.body;
      const styles = window.getComputedStyle(testElement);
      return styles.fontFamily.includes('Inter');
    }, { timeout: 30000 }).catch(() => {
      console.log('[HTML-to-PDF] Google Fonts check timed out, continuing anyway');
    });

    // Wait for images to load
    console.log('[HTML-to-PDF] Waiting for images to load...');
    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images)
          .filter(img => !img.complete)
          .map(img => new Promise(resolve => {
            img.onload = img.onerror = resolve;
            // Set a timeout for each image
            setTimeout(resolve, 5000);
          }))
      );
    });

    // Extra wait for fonts and dynamic content to fully render
    console.log('[HTML-to-PDF] Waiting for fonts and final rendering...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('[HTML-to-PDF] Generating PDF...');
    // Generate PDF with optimal settings
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0',
      },
      preferCSSPageSize: true,
    });

    await page.close();
    console.log('[HTML-to-PDF] PDF generated successfully');

    // Generate filename if not provided
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const finalFileName = fileName || `proposal-${timestamp}.pdf`;

    // Save PDF to uploads directory (same location as attachments)
    const uploadsDir = join(process.cwd(), 'uploads', 'pdfs');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    const filePath = join(uploadsDir, finalFileName);
    await writeFile(filePath, pdfBuffer);
    console.log('[HTML-to-PDF] PDF saved to:', filePath);

    // Use API route for file serving (works with standalone builds)
    const publicPath = `/api/uploads/pdfs/${finalFileName}`;
    const fileSize = pdfBuffer.length;

    // If leadId is provided, attach the PDF to the lead
    let attachmentId = null;
    if (leadId) {
      console.log('[HTML-to-PDF] Attaching PDF to lead...');
      
      // Store relative path (just the filename, directory is implied)
      const storagePath = finalFileName;
      
      const attachmentResult = await pool.query(
        `INSERT INTO attachments (
          lead_id,
          user_id,
          file_name,
          storage_path,
          file_size,
          file_type,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        RETURNING id`,
        [leadId, userId, finalFileName, storagePath, fileSize, 'application/pdf']
      );

      attachmentId = attachmentResult.rows[0].id;

      // Log interaction
      await pool.query(
        `INSERT INTO interactions (
          lead_id,
          user_id,
          interaction_type,
          new_value,
          metadata
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          leadId,
          userId,
          'attachment_added',
          finalFileName,
          JSON.stringify({ 
            filename: finalFileName, 
            file_size: fileSize,
            type: 'html_proposal'
          }),
        ]
      );

      console.log('[HTML-to-PDF] PDF attached to lead successfully');
    }

    // Release browser back to pool
    await browserManager.releaseBrowser(browser);

    return NextResponse.json({
      success: true,
      pdfUrl: publicPath,
      fileName: finalFileName,
      fileSize,
      attachmentId,
      message: leadId 
        ? `Proposal generated and attached to ${leadName || 'lead'}` 
        : 'Proposal generated successfully',
    });

  } catch (error) {
    console.error('[HTML-to-PDF] Error:', error);
    
    // Release browser on error
    if (browser) {
      try {
        await browserManager.releaseBrowser(browser);
      } catch (releaseError) {
        console.error('[HTML-to-PDF] Error releasing browser:', releaseError);
      }
    }

    return NextResponse.json(
      { 
        error: 'Failed to generate PDF',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
