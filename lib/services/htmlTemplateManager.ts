import { HtmlProposalData, HtmlProposalDataMapper } from './htmlProposalDataMapper';

export class HtmlTemplateManager {
  private static templateUrl = '/templates/proposal-template.html';

  /**
   * Process the HTML template with proposal data
   */
  static async processTemplate(
    proposalData: HtmlProposalData,
    calculatorData: any
  ): Promise<string> {
    // Fetch the template from public folder
    const response = await fetch(this.templateUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch proposal template');
    }
    let html = await response.text();

    // Map all the data using the same calculations as PDF generator
    const mappedData = HtmlProposalDataMapper.mapProposalData(proposalData, calculatorData);

    // Replace basic placeholders
    html = this.replaceBasicPlaceholders(html, proposalData, mappedData);

    // Insert client logo
    html = await this.insertClientLogo(html, proposalData.clientLogo);

    // Generate proposal pages based on type
    html = this.generateProposalPages(html, proposalData.proposalType, mappedData);

    // Filter feature pages based on selection
    html = this.filterFeaturePages(html, proposalData.selectedPages, mappedData);

    // Replace placeholders again after feature pages are inserted
    html = this.replaceBasicPlaceholders(html, proposalData, mappedData);

    // Set PDF filename
    html = this.setPdfFilename(html, mappedData.customerName);

    return html;
  }

  /**
   * Replace basic placeholders in template
   */
  private static replaceBasicPlaceholders(
    html: string,
    proposalData: HtmlProposalData,
    mappedData: any
  ): string {
    return html
      .replace(/{{CLIENT_NAME}}/g, proposalData.customerName)
      .replace(/{{PDF_FILENAME}}/g, HtmlProposalDataMapper.generatePdfFilename(proposalData.customerName));
  }

  /**
   * Insert client logo or use default
   */
  private static async insertClientLogo(html: string, logoFile?: File): Promise<string> {
    let clientLogoSrc = ''; // Default to empty if no client logo

    if (logoFile) {
      try {
        // Convert logo to base64
        const arrayBuffer = await logoFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        const mimeType = logoFile.type || 'image/png';
        clientLogoSrc = `data:${mimeType};base64,${base64}`;
      } catch (error) {
        console.error('Error processing logo:', error);
        // Keep empty on error
      }
    }

    // Replace with conditional rendering
    if (clientLogoSrc) {
      return html.replace(/{{CLIENT_LOGO_SECONDARY}}/g, clientLogoSrc);
    } else {
      // Remove the img tag entirely if no logo
      return html.replace(/<img src="{{CLIENT_LOGO_SECONDARY}}"[^>]*>/g, '');
    }
  }

  /**
   * Generate the appropriate proposal page based on type
   */
  private static generateProposalPages(
    html: string,
    proposalType: string,
    mappedData: any
  ): string {
    const normalPage = this.generateNormalProposalPage(mappedData, mappedData.monthToMonth);
    const comparativePage = this.generateComparativeProposalPage(mappedData, mappedData.monthToMonth);
    const cashPage = this.generateCashProposalPage(mappedData);

    // Replace placeholders with appropriate pages
    html = html.replace('{{NORMAL_PROPOSAL_PAGE}}', proposalType === 'normal' ? normalPage : '');
    html = html.replace('{{COMPARATIVE_PROPOSAL_PAGE}}', proposalType === 'comparative' ? comparativePage : '');
    html = html.replace('{{CASH_PROPOSAL_PAGE}}', proposalType === 'cash' ? cashPage : '');

    return html;
  }

  /**
   * Generate Normal Proposal page (Page 3)
   */
  private static generateNormalProposalPage(mappedData: any, monthToMonth: boolean = false): string {
    const hardwareRows = this.generateHardwareRows(mappedData.hardwareItems);
    const monthlyServiceRows = this.generateMonthlyServiceRows(mappedData.connectivityItems, mappedData.licensingItems);

    // Determine what to display for term/escalation
    const termEscalationDisplay = monthToMonth 
      ? '<div class="text-[10px] font-normal text-zinc-600 whitespace-nowrap">Month-To-Month</div>'
      : `<div class="text-[10px] font-normal text-zinc-600 whitespace-nowrap">${mappedData.dealDetails.term} Months</div>
                                        <div class="text-[10px] font-normal text-zinc-600 whitespace-nowrap">${mappedData.dealDetails.escalation}% Escalation</div>`;

    return `
        <!-- PAGE 3: NORMAL PROPOSAL -->
        <div class="page p-12 flex flex-col">
            <div class="flex justify-between items-end mb-8">
                <h2 class="section-title text-6xl font-semibold text-zinc-900">Proposed Investment</h2>
                <div class="px-8 py-3 bg-orange-100 text-orange-600 text-sm font-semibold rounded-3xl">EITHER RENT-TO-OWN OR OUTRIGHT PURCHASE — NOT BOTH</div>
            </div>

            <div class="mb-6">
                <div class="bg-orange-600 text-white px-12 py-4 text-xs font-semibold rounded-t-3xl">TOTAL PROPOSED COST</div>
                <table class="w-full border border-orange-100 text-sm">
                    <tbody class="divide-y divide-orange-100 text-zinc-700">
                        <tr>
                            <td class="px-12 py-2 font-medium text-zinc-700 text-xs">HARDWARE</td>
                            <td class="px-12 py-2 text-right font-mono text-zinc-700 text-xs">${HtmlProposalDataMapper.formatCurrencyWithR(mappedData.costs.hardwareRental)}</td>
                        </tr>
                        <tr>
                            <td class="px-12 py-2 font-medium text-zinc-700 text-xs">MONTHLY SERVICE</td>
                            <td class="px-12 py-2 text-right font-mono text-zinc-700 text-xs">${HtmlProposalDataMapper.formatCurrencyWithR(mappedData.costs.monthlyServiceTotal)}</td>
                        </tr>
                        <tr class="bg-orange-50">
                            <td class="px-12 py-2 font-bold text-zinc-900 text-xs">TOTAL</td>
                            <td class="px-12 py-2 text-right font-mono font-bold text-zinc-900 text-xs">${HtmlProposalDataMapper.formatCurrencyWithR(mappedData.costs.proposedNewTotalCost)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="mb-6">
                <div class="bg-orange-600 text-white px-12 py-4 text-xs font-semibold rounded-t-3xl">HARDWARE COST</div>
                <table class="w-full border border-orange-100 text-sm">
                    <thead>
                        <tr class="bg-orange-50">
                            <th class="text-left py-2 px-12 font-medium w-20 text-xs">QTY</th>
                            <th class="text-left py-2 px-12 font-medium text-xs">HARDWARE</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-orange-100 text-zinc-700">
                        ${hardwareRows}
                        <tr class="bg-orange-50 font-bold">
                            <td class="py-2 px-12 text-zinc-900 text-xs">TOTAL</td>
                            <td class="py-2 px-12 text-right text-zinc-900 text-xs">
                                <div class="flex items-center justify-end gap-8">
                                    <div class="font-mono text-center whitespace-nowrap">${HtmlProposalDataMapper.formatCurrencyWithR(mappedData.costs.hardwareRental)}</div>
                                    <div class="text-center">
                                        ${termEscalationDisplay}
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="mb-6">
                <div class="bg-orange-600 text-white px-12 py-4 text-xs font-semibold rounded-t-3xl">MONTHLY SERVICE COSTS</div>
                <table class="w-full border border-orange-100 text-sm">
                    <thead>
                        <tr class="bg-orange-50">
                            <th class="text-left py-2 px-12 font-medium w-20 text-xs">QTY</th>
                            <th class="text-left py-2 px-12 font-medium text-xs">MONTHLY SERVICES</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-orange-100 text-zinc-700">
                        ${monthlyServiceRows}
                        <tr class="bg-orange-50 font-bold">
                            <td class="py-2 px-12 text-zinc-900 text-xs">TOTAL</td>
                            <td class="py-2 px-12 text-right text-zinc-900 text-xs">
                                <div class="flex items-center justify-end gap-8">
                                    <div class="font-mono text-center whitespace-nowrap">${HtmlProposalDataMapper.formatCurrencyWithR(mappedData.costs.monthlyServiceTotal)}</div>
                                    <div class="text-center">
                                        <div class="text-[10px] font-normal text-zinc-600 whitespace-nowrap">Month-To-Month</div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="mt-auto flex-shrink-0 pt-6 text-xs flex justify-between text-zinc-500 border-t border-orange-100">
                <div>All prices ex VAT • Valid 30 days</div>
            </div>
        </div>
    `;
  }

  /**
   * Generate Comparative Proposal page (Page 4) - with all calculations
   */
  private static generateComparativeProposalPage(mappedData: any, monthToMonth: boolean = false): string {
    const hardwareRows = this.generateComparativeHardwareRows(mappedData.hardwareItems, mappedData.dealDetails);
    const monthlyServiceRows = this.generateMonthlyServiceRows(mappedData.connectivityItems, mappedData.licensingItems);
    const projectionRows = this.generateProjectionRows(mappedData.projections);

    // Determine what to display for term/escalation
    const termEscalationDisplay = monthToMonth 
      ? '<div class="text-[10px] font-normal text-zinc-600 whitespace-nowrap">Month-To-Month</div>'
      : `<div class="text-[10px] font-normal text-zinc-600 whitespace-nowrap">${mappedData.dealDetails.term} Months</div>
                                        <div class="text-[10px] font-normal text-zinc-600 whitespace-nowrap">${mappedData.dealDetails.escalation}% Escalation</div>`;

    return `
        <!-- PAGE 4: COMPARATIVE PROPOSAL -->
        <div class="page p-12 flex flex-col">
            <div class="flex justify-between items-end mb-4">
                <h2 class="section-title text-5xl font-semibold text-zinc-900">Comparative Costings</h2>
                <div class="px-8 py-3 bg-orange-100 text-orange-600 text-sm font-semibold rounded-3xl">EITHER RENT-TO-OWN OR OUTRIGHT PURCHASE — NOT BOTH</div>
            </div>

            <!-- TOTAL PROPOSED COST -->
            <div class="mb-5">
                <div class="bg-orange-600 text-white px-12 py-2 text-xs font-semibold rounded-t-3xl">TOTAL PROPOSED COST</div>
                <table class="w-full border border-orange-100 text-sm">
                    <thead>
                        <tr class="bg-orange-50">
                            <th class="text-left py-1.5 px-12 font-medium text-xs">CURRENT COSTS</th>
                            <th class="text-center py-1.5 px-12 font-medium text-xs">ITEM</th>
                            <th class="text-right py-1.5 px-12 font-medium text-xs">NEW COSTINGS</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-orange-100 text-zinc-700">
                        <tr>
                            <td class="py-1.5 px-12 font-mono text-xs">${HtmlProposalDataMapper.formatCurrencyWithR(mappedData.costs.currentHardwareRental)}</td>
                            <td class="py-1.5 px-12 text-center font-medium text-xs">Hardware</td>
                            <td class="py-1.5 px-12 text-right font-mono text-xs">${HtmlProposalDataMapper.formatCurrencyWithR(mappedData.costs.hardwareRental)}</td>
                        </tr>
                        <tr>
                            <td class="py-1.5 px-12 font-mono text-xs">${HtmlProposalDataMapper.formatCurrencyWithR(mappedData.costs.currentMRC)}</td>
                            <td class="py-1.5 px-12 text-center font-medium text-xs">Monthly</td>
                            <td class="py-1.5 px-12 text-right font-mono text-xs">${HtmlProposalDataMapper.formatCurrencyWithR(mappedData.costs.monthlyServiceTotal)}</td>
                        </tr>
                        <tr class="bg-orange-50 font-bold">
                            <td class="py-1.5 px-12 font-mono text-zinc-900 text-xs">${HtmlProposalDataMapper.formatCurrencyWithR(mappedData.costs.proposedCurrentTotalCost)}</td>
                            <td class="py-1.5 px-12 text-center text-zinc-900 text-xs">TOTAL</td>
                            <td class="py-1.5 px-12 text-right font-mono text-zinc-900 text-xs">${HtmlProposalDataMapper.formatCurrencyWithR(mappedData.costs.proposedNewTotalCost)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- PROJECTION -->
            <div class="mb-5">
                <div class="bg-orange-600 text-white px-12 py-2 text-xs font-semibold rounded-t-3xl">PROJECTION</div>
                <table class="w-full border border-orange-100 text-sm">
                    <thead>
                        <tr class="bg-orange-50">
                            <th class="text-left py-1.5 px-12 font-medium text-xs">CURRENT COSTS</th>
                            <th class="text-center py-1.5 px-12 font-medium text-xs">YEAR</th>
                            <th class="text-right py-1.5 px-12 font-medium text-xs">NEW COSTINGS</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-orange-100 text-zinc-700">
                        ${projectionRows}
                        <tr class="bg-orange-50 font-bold">
                            <td class="py-1.5 px-12 font-mono text-zinc-900 text-xs">${HtmlProposalDataMapper.formatCurrencyWithR(mappedData.costs.projectionCurrentTotal)}</td>
                            <td class="py-1.5 px-12 text-center text-zinc-900 text-xs">TOTAL OVER PERIOD</td>
                            <td class="py-1.5 px-12 text-right font-mono text-zinc-900 text-xs">${HtmlProposalDataMapper.formatCurrencyWithR(mappedData.costs.projectionTotal)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- HARDWARE COST -->
            <div class="mb-5">
                <div class="bg-orange-600 text-white px-12 py-2 text-xs font-semibold rounded-t-3xl">HARDWARE COST</div>
                <table class="w-full border border-orange-100 text-sm">
                    <thead>
                        <tr class="bg-orange-50">
                            <th class="text-left py-1.5 px-12 font-medium w-20 text-xs">QTY</th>
                            <th class="text-left py-1.5 px-12 font-medium text-xs">HARDWARE</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-orange-100 text-zinc-700">
                        ${hardwareRows}
                        <tr class="bg-orange-50 font-bold">
                            <td class="py-2 px-12 text-zinc-900 text-xs">TOTAL</td>
                            <td class="py-2 px-12 text-right text-zinc-900 text-xs">
                                <div class="flex items-center justify-end gap-8">
                                    <div class="font-mono text-center whitespace-nowrap">${HtmlProposalDataMapper.formatCurrencyWithR(mappedData.costs.hardwareRental)}</div>
                                    <div class="text-center">
                                        ${termEscalationDisplay}
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- MONTHLY SERVICE COSTS -->
            <div class="mb-5">
                <div class="bg-orange-600 text-white px-12 py-2 text-xs font-semibold rounded-t-3xl">MONTHLY SERVICE COSTS</div>
                <table class="w-full border border-orange-100 text-sm">
                    <thead>
                        <tr class="bg-orange-50">
                            <th class="text-left py-1.5 px-12 font-medium w-20 text-xs">QTY</th>
                            <th class="text-left py-1.5 px-12 font-medium text-xs">MONTHLY SERVICES</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-orange-100 text-zinc-700">
                        ${monthlyServiceRows}
                        <tr class="bg-orange-50 font-bold">
                            <td class="py-1.5 px-12 text-zinc-900 text-xs">TOTAL</td>
                            <td class="py-1.5 px-12 text-right text-zinc-900 text-xs">
                                <div class="flex items-center justify-end gap-8">
                                    <div class="font-mono text-center whitespace-nowrap">${HtmlProposalDataMapper.formatCurrencyWithR(mappedData.costs.monthlyServiceTotal)}</div>
                                    <div class="text-center">
                                        <div class="text-[10px] font-normal text-zinc-600 whitespace-nowrap">Month-To-Month</div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="mt-auto flex-shrink-0 pt-3 text-xs flex justify-between text-zinc-500 border-t border-orange-100">
                <div>All prices ex VAT • Valid 30 days</div>
            </div>
        </div>
    `;
  }

  /**
   * Generate Cash Proposal page (Page 5)
   */
  private static generateCashProposalPage(mappedData: any): string {
    const hardwareRows = this.generateHardwareRows(mappedData.hardwareItems);
    const monthlyServiceRows = this.generateMonthlyServiceRows(mappedData.connectivityItems, mappedData.licensingItems);

    return `
        <!-- PAGE 5: CASH PROPOSAL -->
        <div class="page p-12 flex flex-col">
            <div class="flex justify-between items-end mb-8">
                <h2 class="section-title text-6xl font-semibold text-zinc-900">Cash Investment</h2>
                <div class="px-8 py-3 bg-orange-100 text-orange-600 text-sm font-semibold rounded-3xl">OUTRIGHT PURCHASE</div>
            </div>

            <div class="mb-6">
                <div class="bg-orange-600 text-white px-12 py-4 text-xs font-semibold rounded-t-3xl">TOTAL CASH COST</div>
                <table class="w-full border border-orange-100 text-sm">
                    <tbody class="divide-y divide-orange-100 text-zinc-700">
                        <tr>
                            <td class="px-12 py-2 font-medium text-zinc-700 text-xs">HARDWARE (CASH PRICE)</td>
                            <td class="px-12 py-2 text-right font-mono text-zinc-700 text-xs">${HtmlProposalDataMapper.formatCurrencyWithR(mappedData.costs.totalPayout)}</td>
                        </tr>
                        <tr>
                            <td class="px-12 py-2 font-medium text-zinc-700 text-xs">MONTHLY SERVICE</td>
                            <td class="px-12 py-2 text-right font-mono text-zinc-700 text-xs">${HtmlProposalDataMapper.formatCurrencyWithR(mappedData.costs.monthlyServiceTotal)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="mb-6">
                <div class="bg-orange-600 text-white px-12 py-4 text-xs font-semibold rounded-t-3xl">HARDWARE COST</div>
                <table class="w-full border border-orange-100 text-sm">
                    <thead>
                        <tr class="bg-orange-50">
                            <th class="text-left py-2 px-12 font-medium w-20 text-xs">QTY</th>
                            <th class="text-left py-2 px-12 font-medium text-xs">HARDWARE</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-orange-100 text-zinc-700">
                        ${hardwareRows}
                        <tr class="bg-orange-50 font-bold">
                            <td class="py-2 px-12 text-zinc-900 text-xs">TOTAL</td>
                            <td class="py-2 px-12 text-right font-mono text-zinc-900 text-xs whitespace-nowrap">${HtmlProposalDataMapper.formatCurrencyWithR(mappedData.costs.totalPayout)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="mb-6">
                <div class="bg-orange-600 text-white px-12 py-4 text-xs font-semibold rounded-t-3xl">MONTHLY SERVICE COSTS</div>
                <table class="w-full border border-orange-100 text-sm">
                    <thead>
                        <tr class="bg-orange-50">
                            <th class="text-left py-2 px-12 font-medium w-20 text-xs">QTY</th>
                            <th class="text-left py-2 px-12 font-medium text-xs">MONTHLY SERVICES</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-orange-100 text-zinc-700">
                        ${monthlyServiceRows}
                        <tr class="bg-orange-50 font-bold">
                            <td class="py-2 px-12 text-zinc-900 text-xs">TOTAL</td>
                            <td class="py-2 px-12 text-right text-zinc-900 text-xs">
                                <div class="flex items-center justify-end gap-8">
                                    <div class="font-mono text-center whitespace-nowrap">${HtmlProposalDataMapper.formatCurrencyWithR(mappedData.costs.monthlyServiceTotal)}</div>
                                    <div class="text-center">
                                        <div class="text-[10px] font-normal text-zinc-600 whitespace-nowrap">Month-To-Month</div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="mt-auto flex-shrink-0 pt-6 text-xs flex justify-between text-zinc-500 border-t border-orange-100">
                <div>All prices ex VAT • Valid 30 days</div>
            </div>
        </div>
    `;
  }

  /**
   * Generate hardware table rows (no individual prices, just items and quantities)
   */
  private static generateHardwareRows(hardwareItems: any[]): string {
    let rows = '';
    
    // Only generate rows for actual hardware items
    hardwareItems.forEach(item => {
      if (item && item.selectedQuantity > 0) {
        rows += `
          <tr>
            <td class="py-1.5 px-12 text-xs">${item.selectedQuantity}</td>
            <td class="py-1.5 px-12 text-xs">${item.name}</td>
          </tr>
        `;
      }
    });
    
    return rows;
  }

  /**
   * Generate comparative hardware rows (with term column, no individual prices)
   */
  private static generateComparativeHardwareRows(hardwareItems: any[], dealDetails: any): string {
    let rows = '';
    
    // Only generate rows for actual hardware items
    hardwareItems.forEach(item => {
      if (item && item.selectedQuantity > 0) {
        rows += `
          <tr>
            <td class="py-1 px-12 text-xs">${item.selectedQuantity}</td>
            <td class="py-1 px-12 text-xs">${item.name}</td>
          </tr>
        `;
      }
    });
    
    return rows;
  }

  /**
   * Generate monthly service rows (individual rows per item, proper text sizing)
   */
  private static generateMonthlyServiceRows(connectivityItems: any[], licensingItems: any[]): string {
    let rows = '';
    
    // Add connectivity items
    connectivityItems.forEach(item => {
      if (item && item.selectedQuantity > 0) {
        rows += `
          <tr>
            <td class="py-1.5 px-12 text-xs">${item.selectedQuantity}</td>
            <td class="py-1.5 px-12 text-xs">${item.name}</td>
          </tr>
        `;
      }
    });

    // Add licensing items
    licensingItems.forEach(item => {
      if (item && item.selectedQuantity > 0) {
        rows += `
          <tr>
            <td class="py-1.5 px-12 text-xs">${item.selectedQuantity}</td>
            <td class="py-1.5 px-12 text-xs">${item.name}</td>
          </tr>
        `;
      }
    });
    
    return rows;
  }

  /**
   * Generate projection rows for comparative proposal
   */
  private static generateProjectionRows(projections: any): string {
    let rows = '';
    
    for (let i = 0; i < 5; i++) {
      rows += `
        <tr>
          <td class="py-1 px-12 font-mono text-xs">${HtmlProposalDataMapper.formatCurrencyWithR(projections.current[i])}</td>
          <td class="py-1 px-12 text-center text-xs">${projections.years[i]}</td>
          <td class="py-1 px-12 text-right font-mono text-xs">${HtmlProposalDataMapper.formatCurrencyWithR(projections.new[i])}</td>
        </tr>
      `;
    }
    
    return rows;
  }

  /**
   * Filter feature pages based on user selection
   */
  private static filterFeaturePages(html: string, selectedPages: any, mappedData?: any): string {
    const featurePages = this.generateFeaturePages(selectedPages, mappedData);
    return html.replace('{{FEATURE_PAGES}}', featurePages);
  }

  /**
   * Generate feature pages based on selection
   */
  private static generateFeaturePages(selectedPages: any, mappedData?: any): string {
    let pages = '';

    if (selectedPages.telephones) {
      pages += this.getTelephonesPages();
    }

    if (selectedPages.network) {
      pages += this.getNetworkPage();
    }

    if (selectedPages.printing) {
      pages += this.getPrintingPage();
    }

    if (selectedPages.cctv) {
      pages += this.getCctvPage();
    }

    if (selectedPages.accessControl) {
      pages += this.getAccessControlPage();
    }

    if (selectedPages.signalEnhancement) {
      pages += this.getSignalEnhancementPage();
    }

    if (selectedPages.computerSolutions) {
      pages += this.getComputerSolutionsPage();
    }

    // Always include the final pages with contact info
    pages += this.getFinalPages(mappedData);

    return pages;
  }

  /**
   * Set PDF filename in the template
   */
  private static setPdfFilename(html: string, customerName: string): string {
    const filename = HtmlProposalDataMapper.generatePdfFilename(customerName);
    return html.replace(/{{PDF_FILENAME}}/g, filename);
  }

  // Feature page templates (actual HTML content from the original template)
  private static getTelephonesPages(): string {
    return `
        <!-- PAGE 6: HARDWARE -->
        <div class="page p-12 flex flex-col">
            <div class="flex items-center gap-8 mb-10">
                <i class="fa-solid fa-phone-volume text-6xl text-orange-500"></i>
                <div>
                    <div class="uppercase text-orange-600 tracking-[4px] text-xs font-semibold">HARDWARE</div>
                    <h2 class="section-title text-5xl font-semibold text-zinc-900">Premium Hardware</h2>
                </div>
            </div>

            <div class="grid grid-cols-3 gap-3">
                <div class="feature-card bg-white border border-orange-100 rounded-3xl overflow-hidden shadow">
                    <div class="aspect-[4/3] overflow-hidden bg-white flex items-center justify-center">
                        <img src="Pictures/Page 5/Image 1.png" alt="Reception Phone" class="w-full h-full object-contain p-4">
                    </div>
                    <div class="px-5 py-7">
                        <div class="font-semibold text-xl mb-4 text-zinc-900">Reception Phones</div>
                        <p class="text-zinc-600 text-[13px] leading-relaxed">Your reception will receive high-capacity phones with large color screens and multiple buttons, perfect for handling busy call volumes. These phones allow easy call transfers, hold functions, and quick access to features like call parking, ensuring professional interactions. Smart Integrate configures these phones to work seamlessly with the Smart Hosted Cloud PBX, so your reception team can manage calls efficiently from the start, tailored to your business needs.</p>
                    </div>
                </div>

                <div class="feature-card bg-white border border-orange-100 rounded-3xl overflow-hidden shadow">
                    <div class="aspect-[4/3] overflow-hidden bg-white flex items-center justify-center">
                        <img src="Pictures/Page 5/Image 2.png" alt="Cordless Phone" class="w-full h-full object-contain p-4">
                    </div>
                    <div class="px-5 py-7">
                        <div class="font-semibold text-xl mb-4 text-zinc-900">Cordless Phones</div>
                        <p class="text-zinc-600 text-[13px] leading-relaxed">For staff who need mobility, we offer cordless phones with clear displays and crisp audio, allowing your team to take calls while moving around the office. These phones are user-friendly, with simple controls for call handling and messaging. Smart Integrate sets them up to integrate perfectly with the Smart Hosted Cloud PBX, ensuring reliable communication for employees who work across different areas of your workplace.</p>
                    </div>
                </div>

                <div class="feature-card bg-white border border-orange-100 rounded-3xl overflow-hidden shadow">
                    <div class="aspect-[4/3] overflow-hidden bg-white flex items-center justify-center">
                        <img src="Pictures/Page 5/Image 3.png" alt="Desk Phone" class="w-full h-full object-contain p-4">
                    </div>
                    <div class="px-5 py-7">
                        <div class="font-semibold text-xl mb-4 text-zinc-900">Desk Phones</div>
                        <p class="text-zinc-600 text-[13px] leading-relaxed">Alternatively, we provide desk phones with color screens and straightforward buttons, ideal for staff at fixed workstations needing dependable call features. These phones offer clear audio and easy access to call transfers or voicemail, enhancing productivity. Smart Integrate ensures these phones are fully configured to work with the Smart Hosted Cloud PBX, providing a consistent and professional communication experience for your team.</p>
                    </div>
                </div>
            </div>

            <div class="mt-auto flex-shrink-0 pt-12 text-xs flex justify-between text-zinc-500 border-t border-orange-100">
                <div>SMART INTEGRATE • Smart Solutions Simplified</div>
            </div>
        </div>

        <!-- PAGE 7: HOSTED PBX -->
        <div class="page p-12 flex flex-col">
            <div class="flex items-center gap-8 mb-10">
                <i class="fa-solid fa-cloud-arrow-up text-6xl text-orange-500"></i>
                <div>
                    <div class="uppercase text-orange-600 tracking-[4px] text-xs font-semibold">TELEPHONY</div>
                    <h2 class="section-title text-5xl font-semibold text-zinc-900">Hosted PBX Telephony</h2>
                </div>
            </div>

            <div class="space-y-8">
                <div class="grid grid-cols-2 gap-8 items-center">
                    <div class="pr-3">
                        <img src="Pictures/Page 4/Image 1.png" alt="Smart Hosted Cloud PBX Dashboard" class="rounded-3xl shadow-2xl w-full h-auto object-contain max-h-[200px]">
                    </div>
                    <div class="pl-3">
                        <div class="font-semibold text-xl mb-4 text-zinc-900">Your Smart Hosted Cloud PBX</div>
                        <p class="text-zinc-600 text-[13px] leading-relaxed">The Smart Hosted Cloud PBX is a cloud-based phone system delivering clear calls, video meetings, team messaging, and call center features without any equipment in your office. Your web-based dashboard provides a clear view of call activity, showing answered, missed, or queued calls in simple charts tailored to your priorities. Smart Integrate customizes and manages the system, ensuring your team communicates effortlessly, whether in the office or remote, with all features ready to support your business growth.</p>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-8 items-center">
                    <div class="pr-3">
                        <div class="font-semibold text-xl mb-4 text-zinc-900">Flexible Apps and Backup</div>
                        <p class="text-zinc-600 text-[13px] leading-relaxed">With the Smart Hosted Cloud PBX, you get mobile and desktop apps to make calls, join video meetings, or send messages from anywhere using any internet connection. If your main internet fails, these apps keep you connected, and calls can forward to your mobile number, ensuring no call is missed. Smart Integrate can add a secondary internet connection later if needed, and our remote management keeps your system reliable, with Crown IT Inc ready for local support.</p>
                    </div>
                    <div class="pl-3">
                        <img src="Pictures/Page 4/Image 2.png" alt="Mobile Apps" class="rounded-3xl shadow-2xl w-full h-auto object-contain max-h-[200px]">
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-8 items-center">
                    <div class="pr-3">
                        <img src="Pictures/Page 4/Image 3.png" alt="Call Features" class="rounded-3xl shadow-2xl w-full h-auto object-contain max-h-[200px]">
                    </div>
                    <div class="pl-3">
                        <div class="font-semibold text-xl mb-4 text-zinc-900">Smart Call Features</div>
                        <p class="text-zinc-600 text-[13px] leading-relaxed">The Smart Hosted Cloud PBX includes an auto attendant that greets callers with a professional message, letting them press a number to reach the right person or department. You can customize call flows, such as ringing multiple phones at once or in sequence, and voicemails are emailed as audio files for easy access. Smart Integrate configures these features to match your workflow, ensuring secure, efficient communication that enhances your business operations.</p>
                    </div>
                </div>
            </div>

            <div class="mt-auto flex-shrink-0 pt-10 text-xs flex justify-between text-zinc-500 border-t border-orange-100">
                <div>SMART INTEGRATE • Smart Solutions Simplified</div>
            </div>
        </div>

        <!-- PAGE 9: EVERYTHING YOU NEED -->
        <div class="page p-12 flex flex-col">
            <div class="flex items-center gap-8 mb-10">
                <i class="fa-solid fa-gem text-6xl text-orange-500"></i>
                <div>
                    <div class="uppercase text-orange-600 tracking-[4px] text-xs font-semibold">TELEPHONY • CONTINUED</div>
                    <h2 class="section-title text-5xl font-semibold text-zinc-900">Everything You Need</h2>
                </div>
            </div>

            <div class="grid grid-cols-3 gap-3 mb-8">
                <div class="feature-card bg-white border border-orange-100 rounded-3xl overflow-hidden shadow">
                    <div class="aspect-[4/3] overflow-hidden bg-orange-100 flex items-center justify-center">
                        <i class="fa-solid fa-envelope text-7xl text-orange-600"></i>
                    </div>
                    <div class="px-5 py-7">
                        <div class="font-semibold text-xl mb-4 text-zinc-900">Voicemail to Email</div>
                        <p class="text-zinc-600 text-[13px] leading-relaxed">Missed calls go to voicemail and are sent directly to your email as audio files. Your dashboard tracks waiting messages, ensuring you never miss important communications from clients or partners.</p>
                    </div>
                </div>

                <div class="feature-card bg-white border border-orange-100 rounded-3xl overflow-hidden shadow">
                    <div class="aspect-[4/3] overflow-hidden bg-orange-100 flex items-center justify-center">
                        <i class="fa-solid fa-shield-halved text-7xl text-orange-600"></i>
                    </div>
                    <div class="px-5 py-7">
                        <div class="font-semibold text-xl mb-4 text-zinc-900">Secure & Reliable</div>
                        <p class="text-zinc-600 text-[13px] leading-relaxed">Your calls are encrypted and monitored 24/7. Dashboard alerts notify you of any issues, while Smart Integrate ensures continuous, dependable communication for your business operations.</p>
                    </div>
                </div>

                <div class="feature-card bg-white border border-orange-100 rounded-3xl overflow-hidden shadow">
                    <div class="aspect-[4/3] overflow-hidden bg-orange-100 flex items-center justify-center">
                        <i class="fa-solid fa-puzzle-piece text-7xl text-orange-600"></i>
                    </div>
                    <div class="px-5 py-7">
                        <div class="font-semibold text-xl mb-4 text-zinc-900">Powerful Integrations</div>
                        <p class="text-zinc-600 text-[13px] leading-relaxed">Your Smart Hosted Cloud PBX seamlessly connects with business tools like Salesforce, Microsoft 365, SMS, WhatsApp, and Facebook Messenger. Custom call routing ensures your system grows with your business.</p>
                    </div>
                </div>
            </div>

            <!-- Integration Images Row -->
            <div class="grid grid-cols-4 gap-3">
                <div class="bg-white border border-orange-100 p-4 rounded-2xl overflow-hidden shadow-sm">
                    <img src="Pictures/Page 7/Image 3.png" alt="SMS & WhatsApp" class="w-full h-auto object-contain">
                </div>
                <div class="bg-white border border-orange-100 p-4 rounded-2xl overflow-hidden shadow-sm">
                    <img src="Pictures/Page 7/Image 2.png" alt="Salesforce" class="w-full h-auto object-contain">
                </div>
                <div class="bg-white border border-orange-100 p-4 rounded-2xl overflow-hidden shadow-sm">
                    <img src="Pictures/Page 7/Image 1.png" alt="Microsoft 365" class="w-full h-auto object-contain">
                </div>
                <div class="bg-white border border-orange-100 p-4 rounded-2xl overflow-hidden shadow-sm">
                    <img src="Pictures/Page 7/Image 4.png" alt="Custom Routing" class="w-full h-auto object-contain">
                </div>
            </div>

            <div class="mt-auto flex-shrink-0 pt-12 text-xs flex justify-between text-zinc-500 border-t border-orange-100">
                <div>SMART INTEGRATE • Smart Solutions Simplified</div>
            </div>
        </div>
    `;
  }

  private static getNetworkPage(): string {
    return `
        <!-- PAGE 8: NETWORK -->
        <div class="page p-12 flex flex-col">
            <div class="flex items-center gap-8 mb-10">
                <i class="fa-solid fa-wifi text-6xl text-orange-500"></i>
                <div>
                    <div class="uppercase text-orange-600 tracking-[4px] text-xs font-semibold">NETWORK</div>
                    <h2 class="section-title text-5xl font-semibold text-zinc-900">Network Management</h2>
                </div>
            </div>

            <div class="space-y-8">
                <div class="grid grid-cols-2 gap-8 items-center">
                    <div class="pr-3">
                        <img src="Pictures/Page 6/Image 1.png" alt="Cloud Router" class="rounded-3xl shadow-2xl w-full h-auto object-contain max-h-[200px]">
                    </div>
                    <div class="pl-3">
                        <div class="font-semibold text-xl mb-4 text-zinc-900">Network Management</div>
                        <p class="text-zinc-600 text-[13px] leading-relaxed">Our cloud-managed router allows Smart Integrate's technical team to monitor and adjust your network remotely, ensuring your phone system and other devices stay connected without interruption. We can resolve issues quickly without on-site visits, keeping your operations smooth. This router serves as the foundation for your network, supporting all your technology solutions with reliable performance tailored to your business.</p>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-8 items-center">
                    <div class="pr-3">
                        <div class="font-semibold text-xl mb-4 text-zinc-900">Integrated Phone Solution</div>
                        <p class="text-zinc-600 text-[13px] leading-relaxed">The router works seamlessly with the Smart Hosted Cloud PBX, ensuring clear calls, stable video meetings, and reliable messaging. It prioritises phone traffic to maintain quality, even during high network usage, so your communication remains uninterrupted. Smart Integrate's technical team manages this integration, ensuring your phones, apps, and other devices function together as a cohesive system for your business.</p>
                    </div>
                    <div class="pl-3">
                        <img src="Pictures/Page 6/Image 2.png" alt="Integration" class="rounded-3xl shadow-2xl w-full h-auto object-contain max-h-[200px]">
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-8 items-center">
                    <div class="pr-3">
                        <img src="Pictures/Page 6/Image 3.png" alt="WiFi Mesh" class="rounded-3xl shadow-2xl w-full h-auto object-contain max-h-[200px]">
                    </div>
                    <div class="pl-3">
                        <div class="font-semibold text-xl mb-4 text-zinc-900">Office-Wide Wi-Fi Coverage</div>
                        <p class="text-zinc-600 text-[13px] leading-relaxed">Our access points create a Wi-Fi mesh network, providing strong, seamless internet coverage across your entire office. This ensures your mobile apps, phones, and other devices stay connected in every corner, from meeting rooms to workstations. Smart Integrate configures and maintains these access points, delivering consistent Wi-Fi to support your team's productivity and communication needs, no matter your office size.</p>
                    </div>
                </div>
            </div>

            <div class="mt-auto flex-shrink-0 pt-10 text-xs flex justify-between text-zinc-500 border-t border-orange-100">
                <div>SMART INTEGRATE • Smart Solutions Simplified</div>
            </div>
        </div>
    `;
  }

  private static getPrintingPage(): string {
    return `
        <!-- PAGE 10: PRINTING -->
        <div class="page p-12 flex flex-col">
            <div class="flex items-center gap-8 mb-10">
                <i class="fa-solid fa-print text-6xl text-orange-500"></i>
                <div>
                    <div class="uppercase text-orange-600 tracking-[4px] text-xs font-semibold">PRINTING</div>
                    <h2 class="section-title text-5xl font-semibold text-zinc-900">Managed Printing Solutions</h2>
                </div>
            </div>

            <div class="space-y-10">
                <div class="grid grid-cols-2 gap-8 items-center">
                    <div class="pr-3">
                        <img src="Pictures/Page 8/Image 1.png" alt="Modern Copier" class="rounded-3xl shadow-2xl w-full h-auto object-contain">
                    </div>
                    <div class="pl-3">
                        <div class="font-semibold text-xl mb-4 text-zinc-900">Efficient Printing System</div>
                        <p class="text-zinc-600 text-[13px] leading-relaxed">Smart Integrate provides a managed printing solution with modern copiers designed to handle your printing, scanning, and copying needs efficiently. These copiers deliver high-quality output and are tailored to your business's document volume, whether small or large. Our technical team sets up and maintains the system, ensuring your team can focus on work while we keep your printing operations running smoothly with minimal downtime.</p>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-8 items-center">
                    <div class="pr-3">
                        <div class="font-semibold text-xl mb-4 text-zinc-900">Remote Printer Management</div>
                        <p class="text-zinc-600 text-[13px] leading-relaxed">Our copiers allow Smart Integrate's technical team to monitor and manage them remotely, addressing issues or updating settings without visiting your office. We receive alerts when ink or toner is low, enabling us to replace supplies before they run out, so your printing never stops. This proactive service ensures your copiers are always ready for use, keeping your business efficient.</p>
                    </div>
                    <div class="pl-3">
                        <img src="Pictures/Page 8/Image 2.png" alt="Remote Management" class="rounded-3xl shadow-2xl w-full h-auto object-contain">
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-8 items-center">
                    <div class="pr-3">
                        <img src="Pictures/Page 8/Image 3.png" alt="Meter Readings" class="rounded-3xl shadow-2xl w-full h-auto object-contain">
                    </div>
                    <div class="pl-3">
                        <div class="font-semibold text-xl mb-4 text-zinc-900">Automated Meter Readings</div>
                        <p class="text-zinc-600 text-[13px] leading-relaxed">You won't need to report print usage monthly, as our copiers automatically send meter readings to Smart Integrate. We track your printing activity remotely, providing accurate billing and insights into usage patterns without any effort on your part. Our technical team manages this process, ensuring transparency and efficiency, so your printing solution remains cost-effective and hassle-free.</p>
                    </div>
                </div>
            </div>

            <div class="mt-auto flex-shrink-0 pt-12 text-xs flex justify-between text-zinc-500 border-t border-orange-100">
                <div>SMART INTEGRATE • Smart Solutions Simplified</div>
            </div>
        </div>
    `;
  }

  private static getCctvPage(): string {
    return `
        <!-- PAGE 11: SECURITY -->
        <div class="page p-12 flex flex-col">
            <div class="flex items-center gap-8 mb-10">
                <i class="fa-solid fa-shield-halved text-6xl text-orange-500"></i>
                <div>
                    <div class="uppercase text-orange-600 tracking-[4px] text-xs font-semibold">SECURITY</div>
                    <h2 class="section-title text-5xl font-semibold text-zinc-900">CCTV &amp; Security Solutions</h2>
                </div>
            </div>

            <div class="space-y-10">
                <div class="grid grid-cols-2 gap-8 items-center">
                    <div class="pr-3">
                        <img src="Pictures/Page 9/Image 1.png" alt="CCTV Cameras" class="rounded-3xl shadow-2xl w-full h-auto object-contain">
                    </div>
                    <div class="pl-3">
                        <div class="font-semibold text-xl mb-4 text-zinc-900">Security Monitoring</div>
                        <p class="text-zinc-600 text-[13px] leading-relaxed">Our CCTV systems offer high-definition surveillance with cameras strategically placed to cover your entire business premises, adaptable to any size office. You can view live or recorded footage from your phone or computer, giving you confidence in your workplace's safety. Smart Integrate's technical team designs and installs the system to meet your specific security needs, ensuring clear visuals and dependable performance at all times.</p>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-8 items-center">
                    <div class="pr-3">
                        <div class="font-semibold text-xl mb-4 text-zinc-900">Remote Management</div>
                        <p class="text-zinc-600 text-[13px] leading-relaxed">We can access your CCTV system remotely to monitor performance, adjust settings, or troubleshoot issues, keeping your security operational without on-site visits. You can also check footage from anywhere using a secure app, making it easy to stay informed about your business. Smart Integrate's technical team manages this system, with local call-outs available if needed, ensuring your security is always protected.</p>
                    </div>
                    <div class="pl-3">
                        <img src="Pictures/Page 9/Image 2.png" alt="Remote View" class="rounded-3xl shadow-2xl w-full h-auto object-contain">
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-8 items-center">
                    <div class="pr-3">
                        <img src="Pictures/Page 9/Image 3.png" alt="Smart Features" class="rounded-3xl shadow-2xl w-full h-auto object-contain">
                    </div>
                    <div class="pl-3">
                        <div class="font-semibold text-xl mb-4 text-zinc-900">Smart Features for Safety</div>
                        <p class="text-zinc-600 text-[13px] leading-relaxed">Your CCTV system includes motion detection to alert you to unusual activity and night vision for clear footage in low light, enhancing your business's protection. Footage is stored securely, with options for cloud or local storage, and playback is simple for reviewing incidents. Smart Integrate configures these features to maximize security, providing a robust solution to safeguard your workplace effectively, no matter its scale.</p>
                    </div>
                </div>
            </div>

            <div class="mt-auto flex-shrink-0 pt-12 text-xs flex justify-between text-zinc-500 border-t border-orange-100">
                <div>SMART INTEGRATE • Smart Solutions Simplified</div>
            </div>
        </div>
    `;
  }

  private static getAccessControlPage(): string {
    return `
        <!-- PAGE 12: ACCESS CONTROL -->
        <div class="page p-12 flex flex-col">
            <div class="flex items-center gap-8 mb-10">
                <i class="fa-solid fa-fingerprint text-6xl text-orange-500"></i>
                <div>
                    <div class="uppercase text-orange-600 tracking-[4px] text-xs font-semibold">ACCESS CONTROL</div>
                    <h2 class="section-title text-5xl font-semibold text-zinc-900">Access Control Solutions</h2>
                </div>
            </div>

            <div class="space-y-8">
                <div class="grid grid-cols-2 gap-8 items-center">
                    <div class="pr-3">
                        <img src="Pictures/Page 10/Image 1.png" alt="Access Control System" class="rounded-3xl shadow-2xl w-full h-auto object-contain max-h-[200px]">
                    </div>
                    <div class="pl-3">
                        <div class="font-semibold text-xl mb-4 text-zinc-900">Secure Access Management</div>
                        <p class="text-zinc-600 text-[13px] leading-relaxed">Our access control systems provide secure entry management for your business premises, allowing you to control who enters specific areas and when. Using key cards, fingerprint scanners, or PIN codes, you can grant or restrict access to employees, ensuring only authorized personnel enter sensitive areas. Smart Integrate's technical team designs and installs the system to meet your security requirements, providing reliable protection and peace of mind for your workplace.</p>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-8 items-center">
                    <div class="pr-3">
                        <div class="font-semibold text-xl mb-4 text-zinc-900">Time and Attendance Tracking</div>
                        <p class="text-zinc-600 text-[13px] leading-relaxed">The access control system integrates time and attendance tracking, automatically recording when employees clock in and out. This eliminates manual timesheets and provides accurate data for payroll processing, reducing administrative work. You can view attendance reports from your computer or phone, making it easy to monitor staff hours and identify patterns. Smart Integrate configures this feature to streamline your workforce management and improve operational efficiency.</p>
                    </div>
                    <div class="pl-3">
                        <img src="Pictures/Page 10/Image 2.png" alt="Time and Attendance" class="rounded-3xl shadow-2xl w-full h-auto object-contain max-h-[200px]">
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-8 items-center">
                    <div class="pr-3">
                        <img src="Pictures/Page 10/Image 3.png" alt="Remote Management" class="rounded-3xl shadow-2xl w-full h-auto object-contain max-h-[200px]">
                    </div>
                    <div class="pl-3">
                        <div class="font-semibold text-xl mb-4 text-zinc-900">Remote Access Control</div>
                        <p class="text-zinc-600 text-[13px] leading-relaxed">Smart Integrate's technical team can manage your access control system remotely, allowing us to add or remove users, adjust permissions, and monitor entry logs without visiting your site. You can also grant temporary access to visitors or contractors from anywhere using a secure app, ensuring flexibility for your business operations. This remote capability keeps your security system responsive and adaptable to your changing needs, with local support available when required.</p>
                    </div>
                </div>
            </div>

            <div class="mt-auto flex-shrink-0 pt-10 text-xs flex justify-between text-zinc-500 border-t border-orange-100">
                <div>SMART INTEGRATE • Smart Solutions Simplified</div>
            </div>
        </div>
    `;
  }

  /**
   * Generate Signal Enhancement page (Page 13)
   */
  private static getSignalEnhancementPage(): string {
    return `
        <!-- PAGE 13: SIGNAL ENHANCEMENT -->
        <div class="page p-12 flex flex-col">
            <div class="flex items-center gap-8 mb-10">
                <i class="fa-solid fa-signal text-6xl text-orange-500"></i>
                <div>
                    <div class="uppercase text-orange-600 tracking-[4px] text-xs font-semibold">SIGNAL ENHANCEMENT</div>
                    <h2 class="section-title text-5xl font-semibold text-zinc-900">Signal Enhancement Solutions</h2>
                </div>
            </div>

            <div class="space-y-8">
                <div class="grid grid-cols-2 gap-8 items-center">
                    <div class="pr-3">
                        <img src="Pictures/Page 11/Image 1.png" alt="Signal Enhancement System" class="rounded-3xl shadow-2xl w-full h-auto object-contain max-h-[200px]">
                    </div>
                    <div class="pl-3">
                        <div class="font-semibold text-xl mb-4 text-zinc-900">Enhanced Indoor Coverage</div>
                        <p class="text-zinc-600 text-[13px] leading-relaxed">Our signal enhancement systems capture weak outdoor cellular signals and amplify them throughout your building, eliminating dead zones caused by concrete, steel, or distance from towers. The system provides consistent coverage across multiple floors and rooms, ensuring your team stays connected regardless of location. Smart Integrate's technical team designs and installs the solution to maximize signal strength for your specific building requirements.</p>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-8 items-center">
                    <div class="pr-3">
                        <div class="font-semibold text-xl mb-4 text-zinc-900">Intelligent Signal Management</div>
                        <p class="text-zinc-600 text-[13px] leading-relaxed">The enhancement system features smart technology that automatically adjusts amplification levels based on incoming signal strength, preventing network interference while maximizing coverage. This intelligent management ensures optimal performance without manual intervention, adapting to changing conditions and maintaining consistent connectivity. Smart Integrate configures the system to work seamlessly with your infrastructure, providing reliable enhancement that operates efficiently.</p>
                    </div>
                    <div class="pl-3">
                        <img src="Pictures/Page 11/Image 2.png" alt="Intelligent Management" class="rounded-3xl shadow-2xl w-full h-auto object-contain max-h-[200px]">
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-8 items-center">
                    <div class="pr-3">
                        <img src="Pictures/Page 11/Image 3.png" alt="Multi-Network Support" class="rounded-3xl shadow-2xl w-full h-auto object-contain max-h-[200px]">
                    </div>
                    <div class="pl-3">
                        <div class="font-semibold text-xl mb-4 text-zinc-900">Multi-Network Compatibility</div>
                        <p class="text-zinc-600 text-[13px] leading-relaxed">The signal enhancement solution works simultaneously with all major cellular networks, supporting voice calls, data transmission, and messaging across different carriers without requiring separate systems. Your devices will experience improved connectivity regardless of network provider, ensuring comprehensive coverage for your entire team. Smart Integrate optimizes the system for all network frequencies, providing universal signal improvement that enhances productivity and communication reliability.</p>
                    </div>
                </div>
            </div>

            <div class="mt-auto flex-shrink-0 pt-10 text-xs flex justify-between text-zinc-500 border-t border-orange-100">
                <div>SMART INTEGRATE • Smart Solutions Simplified</div>
            </div>
        </div>
    `;
  }

  private static getComputerSolutionsPage(): string {
    return `
        <!-- PAGE 14: COMPUTER SOLUTIONS -->
        <div class="page p-12 flex flex-col">
            <div class="flex items-center gap-8 mb-10">
                <i class="fa-solid fa-desktop text-6xl text-orange-500"></i>
                <div>
                    <div class="uppercase text-orange-600 tracking-[4px] text-xs font-semibold">COMPUTER SOLUTIONS</div>
                    <h2 class="section-title text-5xl font-semibold text-zinc-900">Computer Solutions</h2>
                </div>
            </div>

            <div class="space-y-8">
                <div class="grid grid-cols-2 gap-8 items-center">
                    <div class="pr-3">
                        <img src="Pictures/Page 12/Image 1.png" alt="Laptop Solutions" class="rounded-3xl shadow-2xl w-full h-auto object-contain max-h-[200px]">
                    </div>
                    <div class="pl-3">
                        <div class="font-semibold text-xl mb-4 text-zinc-900">Laptops</div>
                        <p class="text-zinc-600 text-[13px] leading-relaxed">Our laptop solutions provide your team with powerful, portable workstations that deliver desktop-level performance anywhere in your business. These lightweight systems feature long battery life, fast processors, and comprehensive connectivity options, enabling productivity whether in the office, meeting rooms, or remote locations. Smart Integrate configures each laptop with your specific software requirements and security protocols, ensuring seamless integration with your existing network infrastructure.</p>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-8 items-center">
                    <div class="pr-3">
                        <div class="font-semibold text-xl mb-4 text-zinc-900">Mini PCs</div>
                        <p class="text-zinc-600 text-[13px] leading-relaxed">Mini PC solutions maximize workspace efficiency by delivering full desktop functionality in space-saving designs that fit anywhere in your office environment. These powerful compact systems provide excellent performance for daily business tasks while consuming minimal power and generating less heat than traditional towers. Smart Integrate installs and configures these mini PCs to optimize your workspace layout while maintaining the computing power your business operations require.</p>
                    </div>
                    <div class="pl-3">
                        <img src="Pictures/Page 12/Image 2.png" alt="Mini PC Solutions" class="rounded-3xl shadow-2xl w-full h-auto object-contain max-h-[200px]">
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-8 items-center">
                    <div class="pr-3">
                        <img src="Pictures/Page 12/Image 3.png" alt="Desktop PC Solutions" class="rounded-3xl shadow-2xl w-full h-auto object-contain max-h-[200px]">
                    </div>
                    <div class="pl-3">
                        <div class="font-semibold text-xl mb-4 text-zinc-900">Desktop PCs</div>
                        <p class="text-zinc-600 text-[13px] leading-relaxed">Desktop PC solutions deliver maximum processing power for demanding business applications, complex data analysis, and resource-intensive workflows. These robust systems feature expandable configurations, multiple monitor support, and enterprise-grade components designed for continuous operation and reliability. Smart Integrate designs and builds each desktop PC to meet your specific computational requirements, ensuring optimal performance for your most critical business processes.</p>
                    </div>
                </div>
            </div>

            <div class="mt-auto flex-shrink-0 pt-10 text-xs flex justify-between text-zinc-500 border-t border-orange-100">
                <div>SMART INTEGRATE • Smart Solutions Simplified</div>
            </div>
        </div>
    `;
  }

  private static getFinalPages(mappedData?: any): string {
    const repEmail = mappedData?.specialistEmail || 'info@smartintegrate.co.za';
    const repPhone = mappedData?.specialistPhone || '082 123 4567';
    
    return `
        <!-- PAGE 13: SOLUTION BREAKDOWN -->
        <div class="page p-12 flex flex-col">
            <div class="mb-10">
                <h2 class="section-title text-5xl font-semibold text-zinc-900 mb-2">Full Solution Breakdown</h2>
                <p class="text-sm text-zinc-500 italic">Tailored specifically for {{CLIENT_NAME}}</p>
            </div>
            
            <div class="grid grid-cols-2 gap-6">
                <!-- Your Telephony Solution -->
                <div class="bg-gradient-to-br from-orange-50/30 to-white border border-orange-100/50 rounded-2xl p-6 shadow-sm">
                    <div class="flex items-center gap-3 mb-5 pb-3 border-b border-orange-100">
                        <div class="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <i class="fa-solid fa-phone text-orange-600 text-sm"></i>
                        </div>
                        <h3 class="font-semibold text-lg text-zinc-900">Your Telephony Solution</h3>
                    </div>
                    <ul class="space-y-3 text-[13px] text-zinc-700 leading-relaxed">
                        <li class="flex gap-3">
                            <i class="fa-solid fa-circle-check text-orange-500 text-sm mt-0.5 flex-shrink-0"></i>
                            <span>Smart Hosted Cloud PBX system for clear calls, video meetings, team messaging, and call center features with no equipment needed in your office</span>
                        </li>
                        <li class="flex gap-3">
                            <i class="fa-solid fa-circle-check text-orange-500 text-sm mt-0.5 flex-shrink-0"></i>
                            <span>High-capacity reception phones with large color screens and multiple buttons, perfect for managing busy call volumes seamlessly</span>
                        </li>
                        <li class="flex gap-3">
                            <i class="fa-solid fa-circle-check text-orange-500 text-sm mt-0.5 flex-shrink-0"></i>
                            <span>Choice of cordless phones for mobility or desk phones for fixed workstations, all configured to work perfectly with your system</span>
                        </li>
                        <li class="flex gap-3">
                            <i class="fa-solid fa-circle-check text-orange-500 text-sm mt-0.5 flex-shrink-0"></i>
                            <span>Professional auto attendant that greets callers and routes them to the right person or department automatically</span>
                        </li>
                    </ul>
                </div>

                <!-- Management & Monitoring -->
                <div class="bg-gradient-to-br from-orange-50/30 to-white border border-orange-100/50 rounded-2xl p-6 shadow-sm">
                    <div class="flex items-center gap-3 mb-5 pb-3 border-b border-orange-100">
                        <div class="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <i class="fa-solid fa-chart-line text-orange-600 text-sm"></i>
                        </div>
                        <h3 class="font-semibold text-lg text-zinc-900">Management & Monitoring</h3>
                    </div>
                    <ul class="space-y-3 text-[13px] text-zinc-700 leading-relaxed">
                        <li class="flex gap-3">
                            <i class="fa-solid fa-circle-check text-orange-500 text-sm mt-0.5 flex-shrink-0"></i>
                            <span>Web-based dashboard showing real-time call activity in easy-to-read charts, customized specifically for your business needs</span>
                        </li>
                        <li class="flex gap-3">
                            <i class="fa-solid fa-circle-check text-orange-500 text-sm mt-0.5 flex-shrink-0"></i>
                            <span>Mobile and desktop apps allowing your team to make calls, join meetings, and send messages from anywhere with internet access</span>
                        </li>
                        <li class="flex gap-3">
                            <i class="fa-solid fa-circle-check text-orange-500 text-sm mt-0.5 flex-shrink-0"></i>
                            <span>Remote technical support from Smart Integrate's expert team, quickly resolving issues to keep your phones running perfectly</span>
                        </li>
                        <li class="flex gap-3">
                            <i class="fa-solid fa-circle-check text-orange-500 text-sm mt-0.5 flex-shrink-0"></i>
                            <span>Voicemail messages sent directly to your email as audio files, ensuring you never miss important communications</span>
                        </li>
                    </ul>
                </div>

                <!-- Network & Connectivity -->
                <div class="bg-gradient-to-br from-orange-50/30 to-white border border-orange-100/50 rounded-2xl p-6 shadow-sm">
                    <div class="flex items-center gap-3 mb-5 pb-3 border-b border-orange-100">
                        <div class="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <i class="fa-solid fa-network-wired text-orange-600 text-sm"></i>
                        </div>
                        <h3 class="font-semibold text-lg text-zinc-900">Network & Connectivity</h3>
                    </div>
                    <ul class="space-y-3 text-[13px] text-zinc-700 leading-relaxed">
                        <li class="flex gap-3">
                            <i class="fa-solid fa-circle-check text-orange-500 text-sm mt-0.5 flex-shrink-0"></i>
                            <span>Cloud-managed router allowing our technical team to monitor and adjust your network remotely without on-site visits</span>
                        </li>
                        <li class="flex gap-3">
                            <i class="fa-solid fa-circle-check text-orange-500 text-sm mt-0.5 flex-shrink-0"></i>
                            <span>Automatic failover protection ensuring calls forward to mobile numbers if your main internet connection fails</span>
                        </li>
                        <li class="flex gap-3">
                            <i class="fa-solid fa-circle-check text-orange-500 text-sm mt-0.5 flex-shrink-0"></i>
                            <span>Continuous network monitoring to ensure your phone system and other devices stay connected without interruption</span>
                        </li>
                        <li class="flex gap-3">
                            <i class="fa-solid fa-circle-check text-orange-500 text-sm mt-0.5 flex-shrink-0"></i>
                            <span>Seamless integration with business tools like Salesforce, Microsoft 365, SMS, WhatsApp, and Facebook Messenger</span>
                        </li>
                    </ul>
                </div>

                <!-- What's Included -->
                <div class="bg-gradient-to-br from-orange-50/30 to-white border border-orange-100/50 rounded-2xl p-6 shadow-sm">
                    <div class="flex items-center gap-3 mb-5 pb-3 border-b border-orange-100">
                        <div class="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <i class="fa-solid fa-star text-orange-600 text-sm"></i>
                        </div>
                        <h3 class="font-semibold text-lg text-zinc-900">What's Included</h3>
                    </div>
                    <ul class="space-y-3 text-[13px] text-zinc-700 leading-relaxed">
                        <li class="flex gap-3">
                            <i class="fa-solid fa-circle-check text-orange-500 text-sm mt-0.5 flex-shrink-0"></i>
                            <span>No installation charges or upfront fees, making it easy and cost-effective to start using your new phone system</span>
                        </li>
                        <li class="flex gap-3">
                            <i class="fa-solid fa-circle-check text-orange-500 text-sm mt-0.5 flex-shrink-0"></i>
                            <span>We settle and cancel all your current agreements, ensuring a smooth transition to our solution with no hassle</span>
                        </li>
                        <li class="flex gap-3">
                            <i class="fa-solid fa-circle-check text-orange-500 text-sm mt-0.5 flex-shrink-0"></i>
                            <span>Printing, CCTV, Access Control, Signal Enhancement & Computer Solutions integration available</span>
                        </li>
                        <li class="flex gap-3">
                            <i class="fa-solid fa-circle-check text-orange-500 text-sm mt-0.5 flex-shrink-0"></i>
                            <span>Full system configuration and customization by Smart Integrate to match your specific business requirements</span>
                        </li>
                    </ul>
                </div>
            </div>

            <div class="mt-auto flex-shrink-0 pt-10 text-xs flex justify-between text-zinc-500 border-t border-orange-100">
                <div>SMART INTEGRATE • Smart Solutions Simplified</div>
            </div>
        </div>

        <!-- PAGE 14: CONNECTIVITY -->
        <div class="page p-12 flex flex-col">
            <h2 class="section-title text-5xl font-semibold text-zinc-900 mb-4">How Can We Connect You?</h2>
            <p class="text-xl text-zinc-500 mb-16">What we envision for your business</p>

            <div class="grid grid-cols-3 gap-7">
                <div class="feature-card text-center p-9 border border-orange-100 rounded-3xl hover:border-orange-300 bg-white">
                    <i class="fa-solid fa-plug-circle-bolt text-6xl text-orange-500 mb-7"></i>
                    <div class="font-semibold text-xl text-zinc-900">FIBRE</div>
                    <div class="text-xs text-zinc-500 mt-2">The best of the best</div>
                </div>
                <div class="feature-card text-center p-9 border border-orange-100 rounded-3xl hover:border-orange-300 bg-white">
                    <i class="fa-solid fa-satellite-dish text-6xl text-orange-500 mb-7"></i>
                    <div class="font-semibold text-xl text-zinc-900">SATELLITE</div>
                    <div class="text-xs text-zinc-500 mt-2">Practically everywhere</div>
                </div>
                <div class="feature-card text-center p-9 border border-orange-100 rounded-3xl hover:border-orange-300 bg-white">
                    <i class="fa-solid fa-tower-cell text-6xl text-orange-500 mb-7"></i>
                    <div class="font-semibold text-xl text-zinc-900">FIXED WIRELESS</div>
                    <div class="text-xs text-zinc-500 mt-2">Our next best option</div>
                </div>
                <div class="feature-card text-center p-9 border border-orange-100 rounded-3xl hover:border-orange-300 bg-white">
                    <i class="fa-solid fa-mobile-screen-button text-6xl text-orange-500 mb-7"></i>
                    <div class="font-semibold text-xl text-zinc-900">MOBILE SOLUTION</div>
                    <div class="text-xs text-zinc-500 mt-2">GSM SIM cards</div>
                </div>
                <div class="feature-card text-center p-9 border border-orange-100 rounded-3xl hover:border-orange-300 bg-white">
                    <i class="fa-solid fa-signal text-6xl text-orange-500 mb-7"></i>
                    <div class="font-semibold text-xl text-zinc-900">FIXED LTE / 4G</div>
                    <div class="text-xs text-zinc-500 mt-2">Essential Access</div>
                </div>
                <div class="feature-card text-center p-9 border border-orange-100 rounded-3xl hover:border-orange-300 bg-white">
                    <i class="fa-solid fa-headset text-6xl text-orange-500 mb-7"></i>
                    <div class="font-semibold text-xl text-zinc-900">DEDICATED SERVICE</div>
                    <div class="text-xs text-zinc-500 mt-2">When you need it!</div>
                </div>
                <div class="feature-card text-center p-9 border border-orange-100 rounded-3xl hover:border-orange-300 bg-white">
                    <i class="fa-solid fa-arrows-rotate text-6xl text-orange-500 mb-7"></i>
                    <div class="font-semibold text-xl text-zinc-900">FAILOVER</div>
                    <div class="text-xs text-zinc-500 mt-2">Redundancy & reliability</div>
                </div>
                <div class="feature-card text-center p-9 border border-orange-100 rounded-3xl hover:border-orange-300 bg-white">
                    <i class="fa-solid fa-wifi text-6xl text-orange-500 mb-7"></i>
                    <div class="font-semibold text-xl text-zinc-900">MANAGED WIFI</div>
                    <div class="text-xs text-zinc-500 mt-2">Enterprise wireless solutions</div>
                </div>
                <div class="feature-card text-center p-9 border border-orange-100 rounded-3xl hover:border-orange-300 bg-white">
                    <i class="fa-solid fa-diagram-project text-6xl text-orange-500 mb-7"></i>
                    <div class="font-semibold text-xl text-zinc-900">MULTI-SITE</div>
                    <div class="text-xs text-zinc-500 mt-2">Connect multiple locations</div>
                </div>
            </div>

            <div class="mt-auto flex-shrink-0 pt-12 text-xs flex justify-between text-zinc-500 border-t border-orange-100">
                <div>SMART INTEGRATE • Smart Solutions Simplified</div>
            </div>
        </div>

        <!-- PAGE 15: REFERENCES -->
        <div class="page p-12 flex flex-col">
            <div class="flex items-center gap-8 mb-10">
                <i class="fa-solid fa-users text-6xl text-orange-500"></i>
                <div>
                    <div class="uppercase text-orange-600 tracking-[4px] text-xs font-semibold">CLIENT TESTIMONIALS</div>
                    <h2 class="section-title text-5xl font-semibold text-zinc-900">A Few Of Our Happy Customers</h2>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <!-- Sparkling Auto Care Centre -->
                <div class="feature-card bg-white border border-orange-100 rounded-2xl p-3 shadow-sm hover:shadow-lg transition-all">
                    <div class="flex items-start gap-3">
                        <div class="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <i class="fa-solid fa-building text-lg text-orange-600"></i>
                        </div>
                        <div class="flex-1">
                            <div class="font-bold text-zinc-900 mb-0.5 text-xs leading-tight">Sparkling Auto Care Centre Potchefstroom</div>
                            <div class="text-[10px] text-zinc-600 mb-0.5">Paul, Owner • Potchefstroom</div>
                            <div class="text-[10px] text-orange-600 font-mono">018 293 3973</div>
                        </div>
                    </div>
                </div>

                <!-- Bethal Apteek -->
                <div class="feature-card bg-white border border-orange-100 rounded-2xl p-3 shadow-sm hover:shadow-lg transition-all">
                    <div class="flex items-start gap-3">
                        <div class="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <i class="fa-solid fa-building text-lg text-orange-600"></i>
                        </div>
                        <div class="flex-1">
                            <div class="font-bold text-zinc-900 mb-0.5 text-xs leading-tight">Bethal Apteek - Local Choice Pharmacy</div>
                            <div class="text-[10px] text-zinc-600 mb-0.5">Theresa, Owner • Bethal</div>
                            <div class="text-[10px] text-orange-600 font-mono">017 547 3444</div>
                        </div>
                    </div>
                </div>

                <!-- Lekwa Security Services -->
                <div class="feature-card bg-white border border-orange-100 rounded-2xl p-3 shadow-sm hover:shadow-lg transition-all">
                    <div class="flex items-start gap-3">
                        <div class="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <i class="fa-solid fa-building text-lg text-orange-600"></i>
                        </div>
                        <div class="flex-1">
                            <div class="font-bold text-zinc-900 mb-0.5 text-xs leading-tight">Lekwa Security Services</div>
                            <div class="text-[10px] text-zinc-600 mb-0.5">Mr. Mashigo, Owner • Lephalale</div>
                            <div class="text-[10px] text-orange-600 font-mono">014 004 0336</div>
                        </div>
                    </div>
                </div>

                <!-- Dr. Bham Sasolburg -->
                <div class="feature-card bg-white border border-orange-100 rounded-2xl p-3 shadow-sm hover:shadow-lg transition-all">
                    <div class="flex items-start gap-3">
                        <div class="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <i class="fa-solid fa-building text-lg text-orange-600"></i>
                        </div>
                        <div class="flex-1">
                            <div class="font-bold text-zinc-900 mb-0.5 text-xs leading-tight">Dr. Bham Sasolburg Dental Studio</div>
                            <div class="text-[10px] text-zinc-600 mb-0.5">Dr. Bham, Owner • Sasolburg</div>
                            <div class="text-[10px] text-orange-600 font-mono">016 976 0436</div>
                        </div>
                    </div>
                </div>

                <!-- Domitor Drukkers -->
                <div class="feature-card bg-white border border-orange-100 rounded-2xl p-3 shadow-sm hover:shadow-lg transition-all">
                    <div class="flex items-start gap-3">
                        <div class="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <i class="fa-solid fa-building text-lg text-orange-600"></i>
                        </div>
                        <div class="flex-1">
                            <div class="font-bold text-zinc-900 mb-0.5 text-xs leading-tight">Domitor Drukkers</div>
                            <div class="text-[10px] text-zinc-600 mb-0.5">Sonte, Office Manager • Lephalale</div>
                            <div class="text-[10px] text-orange-600 font-mono">014 763 5388</div>
                        </div>
                    </div>
                </div>

                <!-- Elisiras Propshaft -->
                <div class="feature-card bg-white border border-orange-100 rounded-2xl p-3 shadow-sm hover:shadow-lg transition-all">
                    <div class="flex items-start gap-3">
                        <div class="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <i class="fa-solid fa-building text-lg text-orange-600"></i>
                        </div>
                        <div class="flex-1">
                            <div class="font-bold text-zinc-900 mb-0.5 text-xs leading-tight">Elisiras Propshaft</div>
                            <div class="text-[10px] text-zinc-600 mb-0.5">Lynette, Office Manager • Lephalale</div>
                            <div class="text-[10px] text-orange-600 font-mono">014 763 5320</div>
                        </div>
                    </div>
                </div>

                <!-- Kransberg Electrical -->
                <div class="feature-card bg-white border border-orange-100 rounded-2xl p-3 shadow-sm hover:shadow-lg transition-all">
                    <div class="flex items-start gap-3">
                        <div class="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <i class="fa-solid fa-building text-lg text-orange-600"></i>
                        </div>
                        <div class="flex-1">
                            <div class="font-bold text-zinc-900 mb-0.5 text-xs leading-tight">Kransberg Electrical</div>
                            <div class="text-[10px] text-zinc-600 mb-0.5">Duncan, Owner • Lephalale</div>
                            <div class="text-[10px] text-orange-600 font-mono">014 763 2486</div>
                        </div>
                    </div>
                </div>

                <!-- Fun Vos General Trading -->
                <div class="feature-card bg-white border border-orange-100 rounded-2xl p-3 shadow-sm hover:shadow-lg transition-all">
                    <div class="flex items-start gap-3">
                        <div class="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <i class="fa-solid fa-building text-lg text-orange-600"></i>
                        </div>
                        <div class="flex-1">
                            <div class="font-bold text-zinc-900 mb-0.5 text-xs leading-tight">Fun Vos General Trading</div>
                            <div class="text-[10px] text-zinc-600 mb-0.5">Desiree, Owner • Middelburg</div>
                            <div class="text-[10px] text-orange-600 font-mono">013 246 1538</div>
                        </div>
                    </div>
                </div>

                <!-- Deka Apteek -->
                <div class="feature-card bg-white border border-orange-100 rounded-2xl p-3 shadow-sm hover:shadow-lg transition-all">
                    <div class="flex items-start gap-3">
                        <div class="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <i class="fa-solid fa-building text-lg text-orange-600"></i>
                        </div>
                        <div class="flex-1">
                            <div class="font-bold text-zinc-900 mb-0.5 text-xs leading-tight">Deka Apteek</div>
                            <div class="text-[10px] text-zinc-600 mb-0.5">Billy De Klerk, Owner • Stilfontein</div>
                            <div class="text-[10px] text-orange-600 font-mono">018 484 1821</div>
                        </div>
                    </div>
                </div>

                <!-- Dr. W S Lunda -->
                <div class="feature-card bg-white border border-orange-100 rounded-2xl p-3 shadow-sm hover:shadow-lg transition-all">
                    <div class="flex items-start gap-3">
                        <div class="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <i class="fa-solid fa-building text-lg text-orange-600"></i>
                        </div>
                        <div class="flex-1">
                            <div class="font-bold text-zinc-900 mb-0.5 text-xs leading-tight">Dr. W S Lunda, Family Medicine</div>
                            <div class="text-[10px] text-zinc-600 mb-0.5">Seleste, Office Manager • Vereeniging</div>
                            <div class="text-[10px] text-orange-600 font-mono">016 422 3911</div>
                        </div>
                    </div>
                </div>

                <!-- Latitia Investments -->
                <div class="feature-card bg-white border border-orange-100 rounded-2xl p-3 shadow-sm hover:shadow-lg transition-all">
                    <div class="flex items-start gap-3">
                        <div class="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <i class="fa-solid fa-building text-lg text-orange-600"></i>
                        </div>
                        <div class="flex-1">
                            <div class="font-bold text-zinc-900 mb-0.5 text-xs leading-tight">Latitia Investments</div>
                            <div class="text-[10px] text-zinc-600 mb-0.5">Chantal, Office Manager • Sandton</div>
                            <div class="text-[10px] text-orange-600 font-mono">011 020 8230</div>
                        </div>
                    </div>
                </div>

                <!-- PA Venter Optometrists -->
                <div class="feature-card bg-white border border-orange-100 rounded-2xl p-3 shadow-sm hover:shadow-lg transition-all">
                    <div class="flex items-start gap-3">
                        <div class="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <i class="fa-solid fa-building text-lg text-orange-600"></i>
                        </div>
                        <div class="flex-1">
                            <div class="font-bold text-zinc-900 mb-0.5 text-xs leading-tight">PA Venter Optometrists</div>
                            <div class="text-[10px] text-zinc-600 mb-0.5">Mrs. Venter, Owner's Wife • Springs</div>
                            <div class="text-[10px] text-orange-600 font-mono">083 457 8861</div>
                        </div>
                    </div>
                </div>

                <!-- Malmesbury Panelbeaters -->
                <div class="feature-card bg-white border border-orange-100 rounded-2xl p-3 shadow-sm hover:shadow-lg transition-all">
                    <div class="flex items-start gap-3">
                        <div class="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <i class="fa-solid fa-building text-lg text-orange-600"></i>
                        </div>
                        <div class="flex-1">
                            <div class="font-bold text-zinc-900 mb-0.5 text-xs leading-tight">Malmesbury Panelbeaters</div>
                            <div class="text-[10px] text-zinc-600 mb-0.5">Renata, Owner • Malmesbury</div>
                            <div class="text-[10px] text-orange-600 font-mono">022 482 3655</div>
                        </div>
                    </div>
                </div>

                <!-- Pam Golding Garden Route -->
                <div class="feature-card bg-white border border-orange-100 rounded-2xl p-3 shadow-sm hover:shadow-lg transition-all">
                    <div class="flex items-start gap-3">
                        <div class="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <i class="fa-solid fa-building text-lg text-orange-600"></i>
                        </div>
                        <div class="flex-1">
                            <div class="font-bold text-zinc-900 mb-0.5 text-xs leading-tight">Pam Golding Garden Route</div>
                            <div class="text-[10px] text-zinc-600 mb-0.5">Le Roux, Owner • Garden Route</div>
                            <div class="text-[10px] text-orange-600 font-mono">082 569 2002</div>
                        </div>
                    </div>
                </div>

                <!-- Mr Suit Hire -->
                <div class="feature-card bg-white border border-orange-100 rounded-2xl p-3 shadow-sm hover:shadow-lg transition-all">
                    <div class="flex items-start gap-3">
                        <div class="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <i class="fa-solid fa-building text-lg text-orange-600"></i>
                        </div>
                        <div class="flex-1">
                            <div class="font-bold text-zinc-900 mb-0.5 text-xs leading-tight">Mr Suit Hire</div>
                            <div class="text-[10px] text-zinc-600 mb-0.5">Keith, Office Manager • Cape Town</div>
                            <div class="text-[10px] text-orange-600 font-mono">083 265 9601</div>
                        </div>
                    </div>
                </div>

                <!-- Tychoset Engineering -->
                <div class="feature-card bg-white border border-orange-100 rounded-2xl p-3 shadow-sm hover:shadow-lg transition-all">
                    <div class="flex items-start gap-3">
                        <div class="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <i class="fa-solid fa-building text-lg text-orange-600"></i>
                        </div>
                        <div class="flex-1">
                            <div class="font-bold text-zinc-900 mb-0.5 text-xs leading-tight">Tychoset Engineering</div>
                            <div class="text-[10px] text-zinc-600 mb-0.5">Jessica, Office Manager • Lydenburg</div>
                            <div class="text-[10px] text-orange-600 font-mono">087 711 2772</div>
                        </div>
                    </div>
                </div>

                <!-- Optimum Healthcare Institute -->
                <div class="feature-card bg-white border border-orange-100 rounded-2xl p-3 shadow-sm hover:shadow-lg transition-all">
                    <div class="flex items-start gap-3">
                        <div class="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <i class="fa-solid fa-building text-lg text-orange-600"></i>
                        </div>
                        <div class="flex-1">
                            <div class="font-bold text-zinc-900 mb-0.5 text-xs leading-tight">Optimum Healthcare Institute</div>
                            <div class="text-[10px] text-zinc-600 mb-0.5">Antonia, Practice Manager • Sandton</div>
                            <div class="text-[10px] text-orange-600 font-mono">010 157 9639</div>
                        </div>
                    </div>
                </div>

                <!-- Dr. SBH Zungu -->
                <div class="feature-card bg-white border border-orange-100 rounded-2xl p-3 shadow-sm hover:shadow-lg transition-all">
                    <div class="flex items-start gap-3">
                        <div class="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <i class="fa-solid fa-building text-lg text-orange-600"></i>
                        </div>
                        <div class="flex-1">
                            <div class="font-bold text-zinc-900 mb-0.5 text-xs leading-tight">Dr. SBH Zungu</div>
                            <div class="text-[10px] text-zinc-600 mb-0.5">Andele, Practice Manager • Eshowe</div>
                            <div class="text-[10px] text-orange-600 font-mono">035 474 4468</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="mt-auto flex-shrink-0 pt-10 text-xs flex justify-between text-zinc-500 border-t border-orange-100">
                <div>SMART INTEGRATE • Smart Solutions Simplified</div>
            </div>
        </div>

        <!-- PAGE 16: GET IN TOUCH -->
        <div class="page p-16 flex flex-col">
            <div class="flex-1 flex flex-col items-center justify-center text-center">
                <div class="w-48 h-48 flex items-center justify-center mb-16">
                    <img src="Pictures/Logo/logo.png" alt="Smart Integrate Logo" class="w-full h-full object-contain">
                </div>
                
                <h2 class="section-title text-6xl font-bold text-zinc-900 tracking-[-3px] mb-6">GET IN TOUCH</h2>
                <p class="text-3xl text-orange-600 font-medium max-w-md">We're excited to simplify your technology and deliver exceptional value every day.</p>
                
                <div class="mt-20 grid grid-cols-2 gap-x-24 gap-y-12 text-left w-full max-w-2xl">
                    <div>
                        <i class="fa-solid fa-globe text-4xl text-orange-500 mb-4"></i>
                        <div class="font-medium text-xl">www.smartintegrate.co.za</div>
                    </div>
                    <div>
                        <i class="fa-solid fa-envelope text-4xl text-orange-500 mb-4"></i>
                        <div class="font-medium text-xl">${repEmail}</div>
                    </div>
                    <div>
                        <i class="fa-solid fa-phone text-4xl text-orange-500 mb-4"></i>
                        <div class="font-medium text-xl">010 141 5671</div>
                    </div>
                    <div>
                        <i class="fa-solid fa-mobile-screen-button text-4xl text-orange-500 mb-4"></i>
                        <div class="font-medium text-xl">${repPhone}</div>
                    </div>
                </div>
            </div>
            
            <div class="text-center text-xs text-zinc-400">Thank you for the opportunity to serve your business</div>
            <div class="mt-8 text-center text-xs text-zinc-500">SMART INTEGRATE (PTY) LTD</div>
        </div>
    `;
  }
}
