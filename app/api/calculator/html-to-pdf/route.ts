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
import { PDFDocument } from 'pdf-lib';

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

    // Convert relative paths to absolute URLs for the production domain
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://deals.smartintegrate.co.za';
    let htmlWithAbsoluteUrls = html
      // Convert image paths
      .replace(/src="Pictures\//g, `src="${baseUrl}/Pictures/`)
      // Replace local Font Awesome with CDN version for reliable icon loading
      .replace(/href="\/fonts\/fontawesome\/all\.min\.css"/g, 'href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"')
      // Convert font CSS paths (for Google Fonts)
      .replace(/href="\/fonts\/google\//g, `href="${baseUrl}/fonts/google/`)
      // Convert any remaining font file paths in CSS
      .replace(/url\(\/fonts\//g, `url(${baseUrl}/fonts/`);

    console.log('[HTML-to-PDF] Converted relative paths to absolute URLs and using Font Awesome CDN');

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
    }, { timeout: 5000 }).catch(() => {
      console.log('[HTML-to-PDF] Tailwind check timed out, continuing anyway');
    });

    // Wait for Font Awesome icons to load
    console.log('[HTML-to-PDF] Waiting for Font Awesome to load...');
    await page.waitForFunction(() => {
      const icons = document.querySelectorAll('.fa, .fa-solid, .far, .fab');
      if (icons.length === 0) return true; // No icons, continue
      
      // Check if Font Awesome fonts are loaded by checking if the icon content is rendered
      const firstIcon = icons[0] as HTMLElement;
      const styles = window.getComputedStyle(firstIcon);
      const content = window.getComputedStyle(firstIcon, ':before').content;
      
      // Font Awesome icons use :before pseudo-element with unicode content
      // If content is not 'none' or empty, the font is loaded
      return styles.fontFamily.includes('Font Awesome') && content !== 'none' && content !== '""';
    }, { timeout: 15000 }).catch(() => {
      console.log('[HTML-to-PDF] Font Awesome check timed out, continuing anyway');
    });

    // Wait for Google Fonts (Inter and Space Grotesk) to load
    console.log('[HTML-to-PDF] Waiting for Google Fonts to load...');
    await page.waitForFunction(() => {
      // Check if fonts are loaded by testing computed font-family
      const testElement = document.body;
      const styles = window.getComputedStyle(testElement);
      return styles.fontFamily.includes('Inter');
    }, { timeout: 5000 }).catch(() => {
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
    console.log('[HTML-to-PDF] Waiting for all fonts to load using document.fonts API...');
    await page.evaluate(() => {
      return document.fonts.ready;
    }).catch(() => {
      console.log('[HTML-to-PDF] document.fonts.ready not supported or timed out');
    });
    
    console.log('[HTML-to-PDF] Final rendering wait...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Increased from 2000 to 3000

    console.log('[HTML-to-PDF] Generating rasterized PDF for consistent rendering across all viewers...');
    
    // Count total pages in the document
    const pageCount = await page.evaluate(() => {
      return document.querySelectorAll('.page').length;
    });
    console.log(`[HTML-to-PDF] Found ${pageCount} pages to render`);

    // Create a new PDF document using pdf-lib
    const pdfDoc = await PDFDocument.create();
    
    // A4 dimensions in points (72 DPI)
    const A4_WIDTH = 595.28;  // 210mm
    const A4_HEIGHT = 841.89; // 297mm
    
    // Capture each page as a high-resolution screenshot
    for (let i = 0; i < pageCount; i++) {
      console.log(`[HTML-to-PDF] Rendering page ${i + 1}/${pageCount}...`);
      
      // Get the specific page element
      const pageElement = await page.evaluateHandle((index) => {
        return document.querySelectorAll('.page')[index];
      }, i);
      
      // Take a screenshot of this specific page at high resolution
      // Using 2x device scale factor gives us ~150 DPI effective resolution
      // Combined with quality 92 JPEG compression for optimal file size
      const screenshotBuffer = await (pageElement as any).screenshot({
        type: 'jpeg',
        quality: 92,
        omitBackground: false,
      });
      
      // Embed the image in the PDF
      const jpegImage = await pdfDoc.embedJpg(screenshotBuffer);
      
      // Add a new page with A4 dimensions
      const pdfPage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
      
      // Get the image dimensions
      const imgDims = jpegImage.scale(1);
      
      // Calculate scaling to fit A4 page perfectly
      const scaleX = A4_WIDTH / imgDims.width;
      const scaleY = A4_HEIGHT / imgDims.height;
      const scale = Math.min(scaleX, scaleY);
      
      // Center the image on the page
      const scaledWidth = imgDims.width * scale;
      const scaledHeight = imgDims.height * scale;
      const x = (A4_WIDTH - scaledWidth) / 2;
      const y = (A4_HEIGHT - scaledHeight) / 2;
      
      // Draw the image
      pdfPage.drawImage(jpegImage, {
        x,
        y,
        width: scaledWidth,
        height: scaledHeight,
      });
      
      console.log(`[HTML-to-PDF] Page ${i + 1}/${pageCount} rendered successfully`);
    }
    
    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    await page.close();
    console.log('[HTML-to-PDF] Rasterized PDF generated successfully');

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
          filename,
          file_path,
          file_size,
          mime_type,
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
