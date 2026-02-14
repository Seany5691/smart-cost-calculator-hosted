import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/middleware';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// POST /api/calculator/pdf - Generate PDF proposal
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
    const { dealDetails, sectionsData, totalsData, originalUserRole } = body;

    // Determine effective role for pricing
    const effectiveRole = originalUserRole || user.role;
    
    // Helper function to format currency
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency: 'ZAR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    };

    // Helper function to get role price
    const getRolePrice = (item: any) => {
      switch (effectiveRole) {
        case 'admin':
          return item.cost || 0;
        case 'manager':
          return item.managerCost || 0;
        case 'user':
          return item.userCost || 0;
        default:
          return item.userCost || 0;
      }
    };

    // Calculate Total Hardware Installed (matches TotalCostsStep.tsx exactly)
    const totalHardwareInstalled = 
      (totalsData.hardwareTotal || 0) + 
      (totalsData.installationBase || 0) + 
      (totalsData.extensionTotal || 0) + 
      (totalsData.fuelTotal || 0);
    
    // Calculate VAT
    const vatAmount = (totalsData.totalWithVAT || 0) - (totalsData.totalExVAT || 0);

    // Generate HTML content with glassmorphic styling
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Smart Cost Calculator - Deal Summary</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #1a202c;
      padding: 40px 20px;
      line-height: 1.6;
    }
    
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 3px solid #667eea;
    }
    
    .header h1 {
      font-size: 32px;
      font-weight: 700;
      color: #667eea;
      margin-bottom: 10px;
    }
    
    .header p {
      font-size: 16px;
      color: #718096;
    }
    
    .section {
      margin-bottom: 35px;
      background: rgba(255, 255, 255, 0.6);
      border-radius: 12px;
      padding: 25px;
      border: 1px solid rgba(102, 126, 234, 0.2);
    }
    
    .section-title {
      font-size: 20px;
      font-weight: 700;
      color: #667eea;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid rgba(102, 126, 234, 0.3);
    }
    
    .item-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    }
    
    .item-row:last-child {
      border-bottom: none;
    }
    
    .item-label {
      color: #4a5568;
      font-size: 14px;
    }
    
    .item-value {
      color: #2d3748;
      font-weight: 600;
      font-size: 14px;
    }
    
    .item-row.total {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 2px solid rgba(102, 126, 234, 0.3);
      border-bottom: none;
    }
    
    .item-row.total .item-label {
      font-weight: 700;
      color: #2d3748;
      font-size: 15px;
    }
    
    .item-row.total .item-value {
      font-weight: 700;
      color: #667eea;
      font-size: 16px;
    }
    
    .item-row.grand-total {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
      padding: 15px;
      border-radius: 8px;
      margin-top: 15px;
    }
    
    .item-row.grand-total .item-label {
      font-size: 18px;
      color: #667eea;
    }
    
    .item-row.grand-total .item-value {
      font-size: 20px;
      color: #667eea;
    }
    
    .items-list {
      margin-top: 15px;
    }
    
    .item-detail {
      display: flex;
      justify-content: space-between;
      padding: 8px 15px;
      background: rgba(255, 255, 255, 0.5);
      margin-bottom: 8px;
      border-radius: 6px;
      font-size: 13px;
    }
    
    .item-detail .name {
      color: #4a5568;
    }
    
    .item-detail .price {
      color: #2d3748;
      font-weight: 600;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 25px;
      border-top: 2px solid rgba(102, 126, 234, 0.2);
      text-align: center;
      color: #718096;
      font-size: 12px;
    }
    
    .footer p {
      margin: 5px 0;
    }
    
    .pricing-tier {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 20px;
    }
    
    .print-instructions {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
      border: 2px solid #667eea;
      border-radius: 12px;
      padding: 15px 20px;
      margin-bottom: 30px;
      text-align: center;
    }
    
    .print-instructions p {
      color: #667eea;
      font-weight: 600;
      margin: 5px 0;
    }
    
    .print-instructions code {
      background: rgba(102, 126, 234, 0.2);
      padding: 2px 8px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
    }
    
    /* Print styles */
    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .container {
        box-shadow: none;
        border-radius: 0;
        max-width: 100%;
      }
      
      .section {
        page-break-inside: avoid;
      }
      
      .header {
        page-break-after: avoid;
      }
      
      .print-instructions {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="print-instructions">
      <p>📄 To save as PDF: Press <code>Ctrl+P</code> (Windows) or <code>Cmd+P</code> (Mac)</p>
      <p>Then select "Save as PDF" as your printer destination</p>
    </div>
    
    <div class="header">
      <h1>Smart Cost Calculator</h1>
      <p>Professional Deal Summary</p>
      <div class="pricing-tier">Pricing Tier: ${effectiveRole === 'admin' ? 'Cost' : effectiveRole === 'manager' ? 'Manager' : 'User'} Pricing</div>
    </div>

    <!-- Deal Information -->
    <div class="section">
      <h2 class="section-title">Deal Information</h2>
      <div class="item-row">
        <span class="item-label">Customer Name:</span>
        <span class="item-value">${dealDetails.customerName || 'Not set'}</span>
      </div>
      <div class="item-row">
        <span class="item-label">Deal Name:</span>
        <span class="item-value">${dealDetails.dealName || 'Not set'}</span>
      </div>
      <div class="item-row">
        <span class="item-label">Contract Term:</span>
        <span class="item-value">${dealDetails.term} months</span>
      </div>
      <div class="item-row">
        <span class="item-label">Escalation Rate:</span>
        <span class="item-value">${dealDetails.escalation}%</span>
      </div>
      <div class="item-row">
        <span class="item-label">Distance:</span>
        <span class="item-value">${dealDetails.distance} km</span>
      </div>
    </div>

    <!-- Hardware Items -->
    ${sectionsData.hardware && sectionsData.hardware.length > 0 ? `
    <div class="section">
      <h2 class="section-title">Hardware Items</h2>
      <div class="items-list">
        ${sectionsData.hardware.map((item: any) => {
          const price = getRolePrice(item);
          const total = price * (item.selectedQuantity || 0);
          return `
        <div class="item-detail">
          <span class="name">${item.name} × ${item.selectedQuantity}</span>
          <span class="price">${formatCurrency(total)}</span>
        </div>`;
        }).join('')}
      </div>
      <div class="item-row total">
        <span class="item-label">Hardware Total:</span>
        <span class="item-value">${formatCurrency(totalsData.hardwareTotal || 0)}</span>
      </div>
    </div>
    ` : ''}

    <!-- Connectivity Options -->
    ${sectionsData.connectivity && sectionsData.connectivity.length > 0 ? `
    <div class="section">
      <h2 class="section-title">Connectivity Options</h2>
      <div class="items-list">
        ${sectionsData.connectivity.map((item: any) => {
          const price = getRolePrice(item);
          const total = price * (item.selectedQuantity || 0);
          return `
        <div class="item-detail">
          <span class="name">${item.name} × ${item.selectedQuantity}</span>
          <span class="price">${formatCurrency(total)}/mo</span>
        </div>`;
        }).join('')}
      </div>
      <div class="item-row total">
        <span class="item-label">Connectivity Total:</span>
        <span class="item-value">${formatCurrency(totalsData.connectivityTotal || 0)}/mo</span>
      </div>
    </div>
    ` : ''}

    <!-- Licensing Packages -->
    ${sectionsData.licensing && sectionsData.licensing.length > 0 ? `
    <div class="section">
      <h2 class="section-title">Licensing Packages</h2>
      <div class="items-list">
        ${sectionsData.licensing.map((item: any) => {
          const price = getRolePrice(item);
          const total = price * (item.quantity || 0);
          return `
        <div class="item-detail">
          <span class="name">${item.name} × ${item.quantity}</span>
          <span class="price">${formatCurrency(total)}/mo</span>
        </div>`;
        }).join('')}
      </div>
      <div class="item-row total">
        <span class="item-label">Licensing Total:</span>
        <span class="item-value">${formatCurrency(totalsData.licensingTotal || 0)}/mo</span>
      </div>
    </div>
    ` : ''}

    <!-- Hardware & Installation -->
    <div class="section">
      <h2 class="section-title">Hardware & Installation</h2>
      <div class="item-row">
        <span class="item-label">Extension Count:</span>
        <span class="item-value">${totalsData.extensionCount || 0}</span>
      </div>
      <div class="item-row">
        <span class="item-label">Hardware Total:</span>
        <span class="item-value">${formatCurrency(totalsData.hardwareTotal || 0)}</span>
      </div>
      <div class="item-row">
        <span class="item-label">Installation Base:</span>
        <span class="item-value">${formatCurrency(totalsData.installationBase || 0)}</span>
      </div>
      <div class="item-row">
        <span class="item-label">Extension Cost:</span>
        <span class="item-value">${formatCurrency(totalsData.extensionTotal || 0)}</span>
      </div>
      <div class="item-row">
        <span class="item-label">Fuel Cost:</span>
        <span class="item-value">${formatCurrency(totalsData.fuelTotal || 0)}</span>
      </div>
      <div class="item-row total">
        <span class="item-label">Total Hardware Installed:</span>
        <span class="item-value">${formatCurrency(totalHardwareInstalled)}</span>
      </div>
    </div>

    <!-- Gross Profit -->
    <div class="section">
      <h2 class="section-title">Gross Profit</h2>
      <div class="item-row">
        <span class="item-label">${totalsData.customGrossProfit !== undefined ? 'Custom Gross Profit:' : 'Gross Profit (Sliding Scale):'}</span>
        <span class="item-value">${formatCurrency(totalsData.grossProfit || 0)}</span>
      </div>
    </div>

    <!-- Finance & Settlement -->
    <div class="section">
      <h2 class="section-title">Finance & Settlement</h2>
      <div class="item-row">
        <span class="item-label">Settlement Amount:</span>
        <span class="item-value">${formatCurrency(totalsData.actualSettlement || 0)}</span>
      </div>
      <div class="item-row">
        <span class="item-label">Finance Fee:</span>
        <span class="item-value">${formatCurrency(totalsData.financeFee || 0)}</span>
      </div>
      <div class="item-row total">
        <span class="item-label">Total Payout:</span>
        <span class="item-value">${formatCurrency(totalsData.totalPayout || 0)}</span>
      </div>
    </div>

    <!-- Monthly Recurring Costs -->
    <div class="section">
      <h2 class="section-title">Monthly Recurring Costs</h2>
      <div class="item-row">
        <span class="item-label">Hardware Rental:</span>
        <span class="item-value">${formatCurrency(totalsData.hardwareRental || 0)}</span>
      </div>
      <div class="item-row" style="padding-left: 20px; font-size: 12px;">
        <span class="item-label" style="color: #718096;">Factor Used:</span>
        <span class="item-value" style="color: #718096; font-family: 'Courier New', monospace;">${(totalsData.factor || 0).toFixed(5)}</span>
      </div>
      <div class="item-row">
        <span class="item-label">Connectivity:</span>
        <span class="item-value">${formatCurrency(totalsData.connectivityTotal || 0)}</span>
      </div>
      <div class="item-row">
        <span class="item-label">Licensing:</span>
        <span class="item-value">${formatCurrency(totalsData.licensingTotal || 0)}</span>
      </div>
      <div class="item-row total">
        <span class="item-label">Total MRC (Ex VAT):</span>
        <span class="item-value">${formatCurrency(totalsData.totalMRC || 0)}</span>
      </div>
      <div class="item-row">
        <span class="item-label">VAT (15%):</span>
        <span class="item-value">${formatCurrency(vatAmount)}</span>
      </div>
      <div class="item-row grand-total">
        <span class="item-label">Total MRC (Inc VAT):</span>
        <span class="item-value">${formatCurrency(totalsData.totalWithVAT || 0)}</span>
      </div>
    </div>

    <div class="footer">
      <p><strong>This proposal is valid for 30 days from the date of issue.</strong></p>
      <p>Generated on: ${new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <p>Generated by: ${user.username || user.email}</p>
    </div>
  </div>
</body>
</html>
    `;

    // For now, we'll save the HTML and return it
    // In production, you'd use a library like puppeteer to convert HTML to PDF
    // But for immediate functionality, we'll return the HTML that can be printed to PDF
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'pdfs');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }
    
    // Generate unique filename
    const filename = `proposal-${Date.now()}-${Math.random().toString(36).substring(7)}.html`;
    const filepath = join(uploadsDir, filename);
    
    // Write HTML to file
    await writeFile(filepath, htmlContent);
    
    // Return URL
    const pdfUrl = `/uploads/pdfs/${filename}`;
    
    // Log activity
    const { pool } = await import('@/lib/db');
    await pool.query(
      `INSERT INTO activity_log (user_id, activity_type, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        user.userId,
        'pdf_generated',
        'pdf',
        filename,
        JSON.stringify({
          deal_name: dealDetails.dealName,
          customer_name: dealDetails.customerName,
        })
      ]
    );
    
    return NextResponse.json({
      pdfUrl,
      message: 'PDF generated successfully',
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to generate PDF' } },
      { status: 500 }
    );
  }
}
