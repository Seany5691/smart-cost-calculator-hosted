import { ProposalData } from '@/components/calculator/ProposalModal';

export interface HtmlProposalData extends ProposalData {
  clientLogo?: File;
  selectedPages: {
    telephones: boolean;
    network: boolean;
    printing: boolean;
    cctv: boolean;
    accessControl: boolean;
  };
  generationMethod: 'pdf' | 'html';
}

export interface CalculatorData {
  sectionsData: any;
  dealDetails: any;
  totalsData: any;
  settlementDetails: any;
}

export class HtmlProposalDataMapper {
  
  /**
   * Maps all calculator data for HTML proposal generation
   * Replicates exact calculations from ProposalGenerator.tsx
   */
  static mapProposalData(
    proposalData: HtmlProposalData,
    calculatorData: CalculatorData
  ) {
    const { sectionsData, dealDetails, totalsData, settlementDetails } = calculatorData;
    const currentYear = new Date().getFullYear();

    // Calculate current hardware rental from settlement details (exact replica)
    let currentHardwareRental = 0;
    
    if (dealDetails.settlement > 0 && settlementDetails.calculatorInputs) {
      const inputs = settlementDetails.calculatorInputs;
      
      if (inputs.rentalType === 'current') {
        currentHardwareRental = inputs.rentalAmount;
      } else if (inputs.rentalType === 'starting' && inputs.startDate && inputs.escalationRate) {
        const startDate = new Date(inputs.startDate);
        const currentDate = new Date();
        const escalation = inputs.escalationRate / 100;
        
        const yearsElapsed = Math.floor(
          (currentDate.getTime() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
        );
        
        currentHardwareRental = inputs.rentalAmount * Math.pow(1 + escalation, yearsElapsed);
      }
    }

    // Calculate projections (exact replica)
    const currentEscalation = (settlementDetails.calculatorInputs?.escalationRate || 0) / 100;
    const newEscalation = dealDetails.escalation / 100;
    const contractYears = Math.ceil(dealDetails.term / 12);

    // Current projections
    const projectionCurrent1 = currentHardwareRental + proposalData.currentMRC;
    const projectionCurrent2 = projectionCurrent1 * (1 + currentEscalation);
    const projectionCurrent3 = projectionCurrent2 * (1 + currentEscalation);
    const projectionCurrent4 = projectionCurrent3 * (1 + currentEscalation);
    const projectionCurrent5 = projectionCurrent4 * (1 + currentEscalation);

    // Calculate hardware rentals based on contract term
    const hardwareRentals = [];
    let currentRental = totalsData?.hardwareRental || 0;
    
    for (let year = 1; year <= 5; year++) {
      if (year <= contractYears) {
        hardwareRentals.push(currentRental);
        currentRental = currentRental * (1 + newEscalation);
      } else {
        hardwareRentals.push(0);
      }
    }

    // New projections
    const connectivityCost = totalsData?.connectivityTotal || 0;
    const licensingCost = totalsData?.licensingTotal || 0;
    
    const projectionNew1 = hardwareRentals[0] + connectivityCost + licensingCost;
    const projectionNew2 = hardwareRentals[1] + connectivityCost + licensingCost;
    const projectionNew3 = hardwareRentals[2] + connectivityCost + licensingCost;
    const projectionNew4 = hardwareRentals[3] + connectivityCost + licensingCost;
    const projectionNew5 = hardwareRentals[4] + connectivityCost + licensingCost;

    // Get hardware items (exact filtering logic)
    const hardwareItems = sectionsData.hardware.filter((item: any) => {
      if (item.selectedQuantity === 0) return false;
      
      if (item.isTemporary) {
        return item.showOnProposal === true;
      }
      
      return item.locked === true;
    }).slice(0, 9);

    // Get connectivity and licensing items
    const connectivityItems = sectionsData.connectivity.filter((item: any) => item.selectedQuantity > 0);
    const licensingItems = sectionsData.licensing.filter((item: any) => item.selectedQuantity > 0);

    // Calculate totals
    const proposedCurrentTotalCost = currentHardwareRental + proposalData.currentMRC;
    const proposedNewTotalCost = (totalsData?.hardwareRental || 0) + licensingCost + connectivityCost;
    const projectionCurrentTotal = (projectionCurrent1 * 12) + (projectionCurrent2 * 12) + (projectionCurrent3 * 12) + (projectionCurrent4 * 12) + (projectionCurrent5 * 12);
    const projectionTotal = (projectionNew1 * 12) + (projectionNew2 * 12) + (projectionNew3 * 12) + (projectionNew4 * 12) + (projectionNew5 * 12);
    const monthlyServiceTotal = licensingCost + connectivityCost;

    return {
      // Basic info
      customerName: proposalData.customerName,
      currentYear,
      
      // Hardware rental calculations
      currentHardwareRental,
      
      // Projections
      projections: {
        current: [projectionCurrent1, projectionCurrent2, projectionCurrent3, projectionCurrent4, projectionCurrent5],
        new: [projectionNew1, projectionNew2, projectionNew3, projectionNew4, projectionNew5],
        years: [currentYear, currentYear + 1, currentYear + 2, currentYear + 3, currentYear + 4]
      },
      
      // Items
      hardwareItems,
      connectivityItems,
      licensingItems,
      
      // Costs
      costs: {
        currentHardwareRental,
        currentMRC: proposalData.currentMRC,
        hardwareRental: totalsData?.hardwareRental || 0,
        connectivityCost,
        licensingCost,
        proposedCurrentTotalCost,
        proposedNewTotalCost,
        projectionCurrentTotal,
        projectionTotal,
        monthlyServiceTotal,
        totalPayout: proposalData.proposalType === 'cash' && proposalData.cashPrice !== undefined
          ? proposalData.cashPrice
          : (totalsData?.totalPayout || 0)
      },
      
      // Deal details
      dealDetails: {
        term: dealDetails.term,
        escalation: dealDetails.escalation
      },
      
      // Specialist info
      specialistEmail: proposalData.specialistEmail,
      specialistPhone: proposalData.specialistPhone
    };
  }

  /**
   * Helper function to format currency with R prefix (exact replica)
   */
  static formatCurrencyWithR(amount: number): string {
    const formatted = amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `R ${formatted}`;
  }

  /**
   * Generate PDF filename
   */
  static generatePdfFilename(customerName: string): string {
    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    return `${customerName.replace(/[^a-zA-Z0-9]/g, '_')} - Proposal - ${timestamp}`;
  }
}