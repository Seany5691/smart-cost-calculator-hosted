/**
 * Excel Export Utility for Admin Config
 * Handles exporting Hardware, Licensing, Connectivity, and Factors configurations to Excel
 */

import * as XLSX from 'xlsx';

// Hardware Config Export
export interface HardwareExportItem {
  name: string;
  cost: number;
  managerCost: number;
  userCost: number;
  isExtension: boolean;
  locked: boolean;
}

export function exportHardwareToExcel(items: any[]): void {
  const exportData: HardwareExportItem[] = items
    .filter(item => item.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map(item => ({
      name: item.name,
      cost: parseFloat(item.cost.toFixed(2)),
      managerCost: parseFloat(item.managerCost.toFixed(2)),
      userCost: parseFloat(item.userCost.toFixed(2)),
      isExtension: item.isExtension,
      locked: item.locked
    }));

  const worksheet = XLSX.utils.json_to_sheet(exportData, {
    header: ['name', 'cost', 'managerCost', 'userCost', 'isExtension', 'locked']
  });

  // Set column headers
  XLSX.utils.sheet_add_aoa(worksheet, [['Name', 'Cost', 'Manager Cost', 'User Cost', 'Is Extension', 'Locked']], { origin: 'A1' });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Hardware');

  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `hardware-config-${timestamp}.xlsx`);
}

// Licensing Config Export
export interface LicensingExportItem {
  name: string;
  cost: number;
  managerCost: number;
  userCost: number;
  locked: boolean;
}

export function exportLicensingToExcel(items: any[]): void {
  const exportData: LicensingExportItem[] = items
    .filter(item => item.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map(item => ({
      name: item.name,
      cost: parseFloat(item.cost.toFixed(2)),
      managerCost: parseFloat(item.managerCost.toFixed(2)),
      userCost: parseFloat(item.userCost.toFixed(2)),
      locked: item.locked
    }));

  const worksheet = XLSX.utils.json_to_sheet(exportData, {
    header: ['name', 'cost', 'managerCost', 'userCost', 'locked']
  });

  // Set column headers
  XLSX.utils.sheet_add_aoa(worksheet, [['Name', 'Cost', 'Manager Cost', 'User Cost', 'Locked']], { origin: 'A1' });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Licensing');

  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `licensing-config-${timestamp}.xlsx`);
}

// Connectivity Config Export
export interface ConnectivityExportItem {
  name: string;
  cost: number;
  managerCost: number;
  userCost: number;
  locked: boolean;
}

export function exportConnectivityToExcel(items: any[]): void {
  const exportData: ConnectivityExportItem[] = items
    .filter(item => item.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map(item => ({
      name: item.name,
      cost: parseFloat(item.cost.toFixed(2)),
      managerCost: parseFloat(item.managerCost.toFixed(2)),
      userCost: parseFloat(item.userCost.toFixed(2)),
      locked: item.locked
    }));

  const worksheet = XLSX.utils.json_to_sheet(exportData, {
    header: ['name', 'cost', 'managerCost', 'userCost', 'locked']
  });

  // Set column headers
  XLSX.utils.sheet_add_aoa(worksheet, [['Name', 'Cost', 'Manager Cost', 'User Cost', 'Locked']], { origin: 'A1' });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Connectivity');

  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `connectivity-config-${timestamp}.xlsx`);
}

// Factors Config Export
export interface FactorExportRow {
  term: string;
  escalation: string;
  range: string;
  costFactor: number;
  managerFactor: number;
  userFactor: number;
}

export function exportFactorsToExcel(factorData: any): void {
  const terms = ['36_months', '48_months', '60_months'];
  const escalations = ['0%', '10%', '15%'];
  const ranges = ['0-20000', '20001-50000', '50001-100000', '100000+'];

  const exportData: FactorExportRow[] = [];

  terms.forEach(term => {
    escalations.forEach(escalation => {
      ranges.forEach(range => {
        const costFactor = factorData.cost?.[term]?.[escalation]?.[range] || 0;
        const managerFactor = factorData.managerFactors?.[term]?.[escalation]?.[range] || 0;
        const userFactor = factorData.userFactors?.[term]?.[escalation]?.[range] || 0;

        exportData.push({
          term: term.replace('_', ' '),
          escalation,
          range,
          costFactor: parseFloat(costFactor.toFixed(6)),
          managerFactor: parseFloat(managerFactor.toFixed(6)),
          userFactor: parseFloat(userFactor.toFixed(6))
        });
      });
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData, {
    header: ['term', 'escalation', 'range', 'costFactor', 'managerFactor', 'userFactor']
  });

  // Set column headers
  XLSX.utils.sheet_add_aoa(worksheet, [['Term', 'Escalation', 'Range', 'Cost Factor', 'Manager Factor', 'User Factor']], { origin: 'A1' });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Factors');

  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `factors-config-${timestamp}.xlsx`);
}

// Generate Excel template for import
export function generateHardwareTemplate(): void {
  const templateData = [
    {
      name: 'Example Hardware Item',
      cost: 100.00,
      managerCost: 110.00,
      userCost: 120.00,
      isExtension: false,
      locked: false
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData, {
    header: ['name', 'cost', 'managerCost', 'userCost', 'isExtension', 'locked']
  });

  XLSX.utils.sheet_add_aoa(worksheet, [['Name', 'Cost', 'Manager Cost', 'User Cost', 'Is Extension', 'Locked']], { origin: 'A1' });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Hardware Template');

  XLSX.writeFile(workbook, 'hardware-import-template.xlsx');
}

export function generateLicensingTemplate(): void {
  const templateData = [
    {
      name: 'Example License',
      cost: 50.00,
      managerCost: 55.00,
      userCost: 60.00,
      locked: false
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData, {
    header: ['name', 'cost', 'managerCost', 'userCost', 'locked']
  });

  XLSX.utils.sheet_add_aoa(worksheet, [['Name', 'Cost', 'Manager Cost', 'User Cost', 'Locked']], { origin: 'A1' });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Licensing Template');

  XLSX.writeFile(workbook, 'licensing-import-template.xlsx');
}

export function generateConnectivityTemplate(): void {
  const templateData = [
    {
      name: 'Example Connectivity',
      cost: 200.00,
      managerCost: 220.00,
      userCost: 240.00,
      locked: false
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData, {
    header: ['name', 'cost', 'managerCost', 'userCost', 'locked']
  });

  XLSX.utils.sheet_add_aoa(worksheet, [['Name', 'Cost', 'Manager Cost', 'User Cost', 'Locked']], { origin: 'A1' });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Connectivity Template');

  XLSX.writeFile(workbook, 'connectivity-import-template.xlsx');
}

export function generateFactorsTemplate(): void {
  const templateData = [
    {
      term: '36 months',
      escalation: '0%',
      range: '0-20000',
      costFactor: 0.038140,
      managerFactor: 0.041954,
      userFactor: 0.045768
    },
    {
      term: '36 months',
      escalation: '0%',
      range: '20001-50000',
      costFactor: 0.038140,
      managerFactor: 0.041954,
      userFactor: 0.045768
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData, {
    header: ['term', 'escalation', 'range', 'costFactor', 'managerFactor', 'userFactor']
  });

  XLSX.utils.sheet_add_aoa(worksheet, [['Term', 'Escalation', 'Range', 'Cost Factor', 'Manager Factor', 'User Factor']], { origin: 'A1' });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Factors Template');

  XLSX.writeFile(workbook, 'factors-import-template.xlsx');
}
