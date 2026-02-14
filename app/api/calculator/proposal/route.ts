import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/middleware';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// POST /api/calculator/proposal - Generate custom proposal PDF
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { user } = authResult;
    const body = await request.json();
    const { dealDetails, sectionsData, totalsData, originalUserRole, proposalContent } = body;

    // Validate proposal content
    if (!proposalContent || !proposalContent.title) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Proposal title is required' } },
        { status: 400 }
      );
    }

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size
    const { width, height } = page.getSize();
    
    // Load fonts
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    let yPosition = height - 50;
    const leftMargin = 50;
    const rightMargin = width - 50;
    const lineHeight = 20;
    const maxWidth = rightMargin - leftMargin;
    
    // Helper function to add text
    const addText = (text: string, x: number, y: number, size: number = 12, isBold: boolean = false) => {
      page.drawText(text, {
        x,
        y,
        size,
        font: isBold ? fontBold : font,
        color: rgb(0, 0, 0),
      });
    };
    
    // Helper function to wrap text
    const wrapText = (text: string, maxWidth: number, fontSize: number): string[] => {
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';
      
      words.forEach(word => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = testLine.length * (fontSize * 0.5); // Approximate width
        
        if (testWidth > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });
      
      if (currentLine) {
        lines.push(currentLine);
      }
      
      return lines;
    };
    
    // Title
    addText(proposalContent.title, leftMargin, yPosition, 24, true);
    yPosition -= lineHeight * 2;
    
    // Company branding
    addText('Smart Technology Solutions', leftMargin, yPosition, 14, true);
    yPosition -= lineHeight;
    addText('Professional Cost Proposal', leftMargin, yPosition, 12);
    yPosition -= lineHeight * 2;
    
    // Introduction (if provided)
    if (proposalContent.introduction && proposalContent.introduction.trim()) {
      addText('Introduction', leftMargin, yPosition, 16, true);
      yPosition -= lineHeight;
      
      const introLines = wrapText(proposalContent.introduction, maxWidth, 10);
      introLines.forEach(line => {
        addText(line, leftMargin, yPosition, 10);
        yPosition -= lineHeight * 0.8;
      });
      yPosition -= lineHeight;
    }
    
    // Deal Details
    addText('Deal Information', leftMargin, yPosition, 16, true);
    yPosition -= lineHeight;
    addText(`Customer: ${dealDetails.customerName}`, leftMargin, yPosition);
    yPosition -= lineHeight;
    addText(`Deal Name: ${dealDetails.dealName}`, leftMargin, yPosition);
    yPosition -= lineHeight;
    addText(`Contract Term: ${dealDetails.term} months`, leftMargin, yPosition);
    yPosition -= lineHeight;
    addText(`Escalation: ${dealDetails.escalation}%`, leftMargin, yPosition);
    yPosition -= lineHeight * 2;
    
    // Hardware Breakdown (only items with showOnProposal=true)
    const visibleHardware = sectionsData.hardware?.filter((item: any) => item.showOnProposal !== false) || [];
    if (visibleHardware.length > 0) {
      addText('Hardware Items', leftMargin, yPosition, 16, true);
      yPosition -= lineHeight;
      
      visibleHardware.forEach((item: any) => {
        const price = originalUserRole === 'admin' ? item.cost : 
                     originalUserRole === 'manager' ? item.managerCost : item.userCost;
        const total = price * item.selectedQuantity;
        addText(`${item.name} x${item.selectedQuantity}`, leftMargin + 10, yPosition, 10);
        addText(`R ${total.toFixed(2)}`, width - 150, yPosition, 10);
        yPosition -= lineHeight * 0.8;
      });
      yPosition -= lineHeight;
    }
    
    // Connectivity Breakdown (only items with showOnProposal=true)
    const visibleConnectivity = sectionsData.connectivity?.filter((item: any) => item.showOnProposal !== false) || [];
    if (visibleConnectivity.length > 0) {
      addText('Connectivity Options', leftMargin, yPosition, 16, true);
      yPosition -= lineHeight;
      
      visibleConnectivity.forEach((item: any) => {
        const price = originalUserRole === 'admin' ? item.cost : 
                     originalUserRole === 'manager' ? item.managerCost : item.userCost;
        const total = price * item.selectedQuantity;
        addText(`${item.name} x${item.selectedQuantity}`, leftMargin + 10, yPosition, 10);
        addText(`R ${total.toFixed(2)}/mo`, width - 150, yPosition, 10);
        yPosition -= lineHeight * 0.8;
      });
      yPosition -= lineHeight;
    }
    
    // Licensing Breakdown (only items with showOnProposal=true)
    const visibleLicensing = sectionsData.licensing?.filter((item: any) => item.showOnProposal !== false) || [];
    if (visibleLicensing.length > 0) {
      addText('Licensing Packages', leftMargin, yPosition, 16, true);
      yPosition -= lineHeight;
      
      visibleLicensing.forEach((item: any) => {
        const price = originalUserRole === 'admin' ? item.cost : 
                     originalUserRole === 'manager' ? item.managerCost : item.userCost;
        const total = price * item.quantity;
        addText(`${item.name} x${item.quantity}`, leftMargin + 10, yPosition, 10);
        addText(`R ${total.toFixed(2)}/mo`, width - 150, yPosition, 10);
        yPosition -= lineHeight * 0.8;
      });
      yPosition -= lineHeight;
    }
    
    // Installation Costs
    addText('Installation & Setup', leftMargin, yPosition, 16, true);
    yPosition -= lineHeight;
    addText(`Installation: R ${totalsData.installationTotal?.toFixed(2) || '0.00'}`, leftMargin + 10, yPosition, 10);
    yPosition -= lineHeight * 0.8;
    addText(`Extensions: R ${totalsData.extensionTotal?.toFixed(2) || '0.00'}`, leftMargin + 10, yPosition, 10);
    yPosition -= lineHeight * 0.8;
    addText(`Fuel: R ${totalsData.fuelTotal?.toFixed(2) || '0.00'}`, leftMargin + 10, yPosition, 10);
    yPosition -= lineHeight * 2;
    
    // Settlement Calculations
    addText('Settlement Summary', leftMargin, yPosition, 16, true);
    yPosition -= lineHeight;
    addText(`Representative Settlement: R ${totalsData.representativeSettlement?.toFixed(2) || '0.00'}`, leftMargin + 10, yPosition, 10);
    yPosition -= lineHeight * 0.8;
    addText(`Actual Settlement: R ${totalsData.actualSettlement?.toFixed(2) || '0.00'}`, leftMargin + 10, yPosition, 10);
    yPosition -= lineHeight * 0.8;
    addText(`Finance Fee: R ${totalsData.financeFee?.toFixed(2) || '0.00'}`, leftMargin + 10, yPosition, 10);
    yPosition -= lineHeight * 0.8;
    addText(`Total Payout: R ${totalsData.totalPayout?.toFixed(2) || '0.00'}`, leftMargin + 10, yPosition, 10, true);
    yPosition -= lineHeight * 2;
    
    // Monthly Costs
    addText('Monthly Recurring Costs', leftMargin, yPosition, 16, true);
    yPosition -= lineHeight;
    addText(`Hardware Rental: R ${totalsData.hardwareRental?.toFixed(2) || '0.00'}`, leftMargin + 10, yPosition, 10);
    yPosition -= lineHeight * 0.8;
    addText(`Connectivity: R ${totalsData.connectivityTotal?.toFixed(2) || '0.00'}`, leftMargin + 10, yPosition, 10);
    yPosition -= lineHeight * 0.8;
    addText(`Licensing: R ${totalsData.licensingTotal?.toFixed(2) || '0.00'}`, leftMargin + 10, yPosition, 10);
    yPosition -= lineHeight * 0.8;
    addText(`Total MRC (ex VAT): R ${totalsData.totalMRC?.toFixed(2) || '0.00'}`, leftMargin + 10, yPosition, 10, true);
    yPosition -= lineHeight * 0.8;
    addText(`Total MRC (inc VAT): R ${totalsData.totalWithVAT?.toFixed(2) || '0.00'}`, leftMargin + 10, yPosition, 12, true);
    yPosition -= lineHeight * 2;
    
    // Terms & Conditions (if provided)
    if (proposalContent.terms && proposalContent.terms.trim()) {
      // Check if we need a new page
      if (yPosition < 200) {
        const newPage = pdfDoc.addPage([595, 842]);
        yPosition = height - 50;
      }
      
      addText('Terms & Conditions', leftMargin, yPosition, 16, true);
      yPosition -= lineHeight;
      
      const termsLines = wrapText(proposalContent.terms, maxWidth, 10);
      termsLines.forEach(line => {
        if (yPosition < 100) {
          const newPage = pdfDoc.addPage([595, 842]);
          yPosition = height - 50;
        }
        addText(line, leftMargin, yPosition, 10);
        yPosition -= lineHeight * 0.8;
      });
      yPosition -= lineHeight;
    }
    
    // Additional Notes (if provided)
    if (proposalContent.notes && proposalContent.notes.trim()) {
      // Check if we need a new page
      if (yPosition < 150) {
        const newPage = pdfDoc.addPage([595, 842]);
        yPosition = height - 50;
      }
      
      addText('Additional Notes', leftMargin, yPosition, 16, true);
      yPosition -= lineHeight;
      
      const notesLines = wrapText(proposalContent.notes, maxWidth, 10);
      notesLines.forEach(line => {
        if (yPosition < 100) {
          const newPage = pdfDoc.addPage([595, 842]);
          yPosition = height - 50;
        }
        addText(line, leftMargin, yPosition, 10);
        yPosition -= lineHeight * 0.8;
      });
    }
    
    // Footer on last page
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    const lastPageHeight = lastPage.getSize().height;
    
    lastPage.drawText('This proposal is valid for 30 days from the date of issue.', {
      x: leftMargin,
      y: 50,
      size: 8,
      font,
      color: rgb(0, 0, 0),
    });
    
    lastPage.drawText(`Generated on: ${new Date().toLocaleDateString()}`, {
      x: leftMargin,
      y: 35,
      size: 8,
      font,
      color: rgb(0, 0, 0),
    });
    
    // Save PDF
    const pdfBytes = await pdfDoc.save();
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'pdfs');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }
    
    // Generate unique filename
    const filename = `proposal-${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`;
    const filepath = join(uploadsDir, filename);
    
    // Write PDF to file
    await writeFile(filepath, pdfBytes);
    
    // Return URL
    const pdfUrl = `/uploads/pdfs/${filename}`;
    
    // Log activity
    const { pool } = await import('@/lib/db');
    await pool.query(
      `INSERT INTO activity_log (user_id, activity_type, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        user.userId,
        'proposal_created',
        'proposal',
        filename,
        JSON.stringify({
          deal_name: dealDetails.dealName,
          customer_name: dealDetails.customerName,
          proposal_title: proposalContent.title,
        })
      ]
    );
    
    return NextResponse.json({
      pdfUrl,
      message: 'Proposal generated successfully',
    });
  } catch (error) {
    console.error('Error generating proposal:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to generate proposal' } },
      { status: 500 }
    );
  }
}
