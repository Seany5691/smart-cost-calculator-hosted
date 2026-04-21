'use client';

/**
 * ProposalModal Component
 * 
 * NOTE: The "Current PDF Method" option is DEPRECATED and no longer used.
 * Only the "New HTML Template" method is actively maintained and used for proposal generation.
 * The PDF method code remains for backward compatibility but should not be used for new proposals.
 */

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useCalculatorStore } from '@/lib/store/calculator';
import { useAuthStore } from '@/lib/store/auth-simple';
import { useToast } from '@/components/ui/Toast/useToast';

interface ProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (proposalData: ProposalData) => void;
  onHtmlSubmit?: (proposalData: HtmlProposalData) => void;
}

export interface ProposalData {
  customerName: string;
  currentHardwareRental: number; // NEW - auto-filled from hardware settlement, editable
  currentMRC: number; // Existing - now auto-filled from connectivity/licensing settlement, editable
  specialistEmail: string;
  specialistPhone: string;
  proposalType: 'normal' | 'comparative' | 'cash';
  cashPrice?: number; // Optional: Only used for cash proposals
  monthToMonth: boolean; // NEW - Month-To-Month checkbox for term/escalation display
}

export interface HtmlProposalData extends ProposalData {
  clientLogo?: File;
  selectedPages: {
    telephones: boolean;
    network: boolean;
    printing: boolean;
    cctv: boolean;
    accessControl: boolean;
    signalEnhancement: boolean;
    computerSolutions: boolean;
  };
  generationMethod: 'pdf' | 'html';
}

export default function ProposalModal({ isOpen, onClose, onSubmit, onHtmlSubmit }: ProposalModalProps) {
  const { dealDetails, totalsData, settlementDetails } = useCalculatorStore();
  const { user } = useAuthStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // CRITICAL: Mounted state for SSR safety - prevents hydration mismatch
  const [mounted, setMounted] = useState(false);
  
  // Month-To-Month checkbox state
  const [monthToMonth, setMonthToMonth] = useState(false);
  
  const [formData, setFormData] = useState<ProposalData>({
    customerName: dealDetails.customerName || '',
    currentHardwareRental: 0, // Will be auto-filled
    currentMRC: 0, // Will be auto-filled
    specialistEmail: '',
    specialistPhone: '',
    proposalType: 'normal',
    cashPrice: totalsData?.totalPayout || 0, // Initialize with Total Payout
    monthToMonth: false // Default: unchecked
  });

  // New HTML proposal fields (PDF method is deprecated, only HTML is used)
  const [clientLogo, setClientLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [selectedPages, setSelectedPages] = useState({
    telephones: true,
    network: true,
    printing: false,
    cctv: false,
    accessControl: false,
    signalEnhancement: false,
    computerSolutions: false
  });

  // Set mounted state on client side only
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Update customer name when deal details change
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      customerName: dealDetails.customerName || ''
    }));
  }, [dealDetails.customerName]);

  // Update cash price when totalsData changes or when switching to cash proposal
  useEffect(() => {
    if (formData.proposalType === 'cash') {
      setFormData(prev => ({
        ...prev,
        cashPrice: totalsData?.totalPayout || 0
      }));
    }
  }, [totalsData?.totalPayout, formData.proposalType]);

  // Auto-fill current hardware rental, current MRC, specialist email, and specialist phone
  useEffect(() => {
    if (!isOpen) return;

    // Calculate current hardware rental from hardware settlement
    let currentHardwareRental = 0;
    if (settlementDetails.calculatorInputs) {
      const inputs = settlementDetails.calculatorInputs;
      
      if (inputs.rentalType === 'current') {
        currentHardwareRental = inputs.rentalAmount || 0;
      } else if (inputs.rentalType === 'starting' && inputs.startDate && inputs.escalationRate) {
        const startDate = new Date(inputs.startDate);
        const today = new Date();
        const yearsElapsed = (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        const escalation = inputs.escalationRate / 100;
        currentHardwareRental = inputs.rentalAmount * Math.pow(1 + escalation, yearsElapsed);
      }
    }

    // Calculate current MRC from connectivity/licensing settlement
    let currentMRC = 0;
    if (settlementDetails.useConnectivityLicensingSettlement && settlementDetails.connectivityLicensingCalculatorInputs) {
      const inputs = settlementDetails.connectivityLicensingCalculatorInputs;
      
      if (inputs.rentalType === 'current') {
        currentMRC = inputs.rentalAmount || 0;
      } else if (inputs.rentalType === 'starting' && inputs.startDate && inputs.escalationRate) {
        const startDate = new Date(inputs.startDate);
        const today = new Date();
        const yearsElapsed = (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        const escalation = inputs.escalationRate / 100;
        currentMRC = inputs.rentalAmount * Math.pow(1 + escalation, yearsElapsed);
      }
    }

    // Ensure values are valid numbers (not NaN) and round to 2 decimal places
    currentHardwareRental = isNaN(currentHardwareRental) ? 0 : Math.round(currentHardwareRental * 100) / 100;
    currentMRC = isNaN(currentMRC) ? 0 : Math.round(currentMRC * 100) / 100;

    // Update form data with calculated values and auto-fill user email/phone
    setFormData(prev => ({
      ...prev,
      currentHardwareRental,
      currentMRC,
      specialistEmail: user?.email || prev.specialistEmail,
      specialistPhone: user?.cellphoneNumber || prev.specialistPhone
    }));
  }, [isOpen, settlementDetails, user]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleInputChange = (field: keyof ProposalData, value: string | number) => {
    // Ensure numeric fields are valid numbers and round to 2 decimal places
    if (field === 'currentHardwareRental' || field === 'currentMRC' || field === 'cashPrice') {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      const validValue = isNaN(numValue) ? 0 : Math.round(numValue * 100) / 100;
      setFormData(prev => ({
        ...prev,
        [field]: validValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setClientLogo(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoRemove = () => {
    setClientLogo(null);
    setLogoPreview(null);
    // Clear the file input
    const fileInput = document.getElementById('clientLogo') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handlePageToggle = (page: keyof typeof selectedPages) => {
    setSelectedPages(prev => ({
      ...prev,
      [page]: !prev[page]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.customerName.trim()) {
      toast.error('Missing Customer Name', {
        message: 'Please enter a customer name',
        section: 'calculator'
      });
      return;
    }
    if (!formData.specialistEmail.trim()) {
      toast.error('Missing Email Address', {
        message: 'Please enter a specialist email address',
        section: 'calculator'
      });
      return;
    }
    if (!formData.specialistPhone.trim()) {
      toast.error('Missing Phone Number', {
        message: 'Please enter a specialist phone number',
        section: 'calculator'
      });
      return;
    }
    
    // Validate comparative proposal specific fields
    if (formData.proposalType === 'comparative') {
      if (isNaN(formData.currentHardwareRental) || formData.currentHardwareRental < 0) {
        toast.error('Invalid Hardware Rental', {
          message: 'Please enter a valid current hardware rental amount',
          section: 'calculator'
        });
        return;
      }
      if (isNaN(formData.currentMRC) || formData.currentMRC < 0) {
        toast.error('Invalid Monthly Amount', {
          message: 'Please enter a valid current monthly amount',
          section: 'calculator'
        });
        return;
      }
    }
    
    // Validate cash proposal specific fields
    if (formData.proposalType === 'cash') {
      if (isNaN(formData.cashPrice || 0) || (formData.cashPrice || 0) < 0) {
        toast.error('Invalid Cash Price', {
          message: 'Please enter a valid cash price',
          section: 'calculator'
        });
        return;
      }
    }
    
    // Always use HTML method (PDF method is deprecated)
    if (onHtmlSubmit) {
      const htmlProposalData: HtmlProposalData = {
        ...formData,
        monthToMonth,
        clientLogo: clientLogo || undefined,
        selectedPages,
        generationMethod: 'html' // Always use HTML method
      };
      onHtmlSubmit(htmlProposalData);
    } else {
      // Fallback to regular PDF method if onHtmlSubmit is not provided (backward compatibility)
      const proposalDataWithMonthToMonth: ProposalData = {
        ...formData,
        monthToMonth
      };
      onSubmit(proposalDataWithMonthToMonth);
    }
  };

  const handleClose = () => {
    setFormData({
      customerName: dealDetails.customerName || '',
      currentHardwareRental: 0,
      currentMRC: 0,
      specialistEmail: '',
      specialistPhone: '',
      proposalType: 'normal',
      cashPrice: totalsData?.totalPayout || 0,
      monthToMonth: false
    });
    setMonthToMonth(false);
    setClientLogo(null);
    setLogoPreview(null);
    setSelectedPages({
      telephones: true,
      network: true,
      printing: false,
      cctv: false,
      accessControl: false,
      signalEnhancement: false,
      computerSolutions: false
    });
    onClose();
  };

  // Don't render until mounted (prevents SSR hydration issues)
  if (!mounted || !isOpen) return null;

  // Use createPortal to render at document.body level - ensures modal appears above ALL content
  return createPortal(
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="proposal-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div 
        ref={modalRef} 
        className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-2xl sm:rounded-none shadow-2xl max-w-4xl sm:max-w-full w-full max-h-[90vh] sm:h-screen overflow-hidden border border-purple-500/30 sm:m-0"
      >
        <div className="flex items-center justify-between p-6 border-b border-purple-500/20">
          <h2 id="proposal-modal-title" className="text-2xl font-bold text-white">Generate Proposal</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] sm:h-[calc(100vh-80px)] custom-scrollbar space-y-4">
          {/* Logo Upload */}
          <div className="space-y-2">
            <label htmlFor="clientLogo" className="text-white font-medium">
              Client Logo (Optional)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                id="clientLogo"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <label
                htmlFor="clientLogo"
                className="px-4 py-2 bg-white/10 border border-purple-500/30 rounded-lg text-white cursor-pointer hover:bg-white/20 transition-colors"
              >
                Choose Logo
              </label>
              {logoPreview && (
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 border border-purple-500/30 rounded-lg overflow-hidden">
                    <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain bg-white/10" />
                  </div>
                  <button
                    type="button"
                    onClick={handleLogoRemove}
                    className="px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 hover:bg-red-500/30 transition-colors text-sm"
                    title="Remove logo"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
            <p className="text-sm text-purple-300/70">Upload a logo to display on the proposal cover page</p>
          </div>

          {/* Page Selection */}
          <div className="space-y-3 pb-4 border-b border-purple-500/20">
            <label className="text-white font-medium">
              Include Pages
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-purple-500/30 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
                <input
                  type="checkbox"
                  checked={selectedPages.telephones}
                  onChange={() => handlePageToggle('telephones')}
                  className="w-4 h-4 text-purple-600 bg-white/10 border-purple-500/30 focus:ring-purple-500 focus:ring-2 rounded"
                />
                <span className="text-white">Telephones</span>
              </label>
              
              <label className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-purple-500/30 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
                <input
                  type="checkbox"
                  checked={selectedPages.network}
                  onChange={() => handlePageToggle('network')}
                  className="w-4 h-4 text-purple-600 bg-white/10 border-purple-500/30 focus:ring-purple-500 focus:ring-2 rounded"
                />
                <span className="text-white">Network Solutions</span>
              </label>
              
              <label className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-purple-500/30 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
                <input
                  type="checkbox"
                  checked={selectedPages.printing}
                  onChange={() => handlePageToggle('printing')}
                  className="w-4 h-4 text-purple-600 bg-white/10 border-purple-500/30 focus:ring-purple-500 focus:ring-2 rounded"
                />
                <span className="text-white">Printing Solutions</span>
              </label>
              
              <label className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-purple-500/30 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
                <input
                  type="checkbox"
                  checked={selectedPages.cctv}
                  onChange={() => handlePageToggle('cctv')}
                  className="w-4 h-4 text-purple-600 bg-white/10 border-purple-500/30 focus:ring-purple-500 focus:ring-2 rounded"
                />
                <span className="text-white">CCTV & Security</span>
              </label>
              
              <label className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-purple-500/30 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
                <input
                  type="checkbox"
                  checked={selectedPages.accessControl}
                  onChange={() => handlePageToggle('accessControl')}
                  className="w-4 h-4 text-purple-600 bg-white/10 border-purple-500/30 focus:ring-purple-500 focus:ring-2 rounded"
                />
                <span className="text-white">Access Control</span>
              </label>

              <label className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-purple-500/30 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
                <input
                  type="checkbox"
                  checked={selectedPages.signalEnhancement}
                  onChange={() => handlePageToggle('signalEnhancement')}
                  className="w-4 h-4 text-purple-600 bg-white/10 border-purple-500/30 focus:ring-purple-500 focus:ring-2 rounded"
                />
                <span className="text-white">Signal Enhancement</span>
              </label>

              <label className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-purple-500/30 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
                <input
                  type="checkbox"
                  checked={selectedPages.computerSolutions}
                  onChange={() => handlePageToggle('computerSolutions')}
                  className="w-4 h-4 text-purple-600 bg-white/10 border-purple-500/30 focus:ring-purple-500 focus:ring-2 rounded"
                />
                <span className="text-white">Computer Solutions</span>
              </label>
            </div>
            <p className="text-sm text-purple-300/70">Select which feature pages to include in the proposal</p>
          </div>

          {/* Proposal Type Selection */}
          <div className="space-y-3 pb-4 border-b border-purple-500/20">
            <label className="text-white font-medium">
              Proposal Type <span className="text-red-400">*</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Normal Proposal */}
              <label className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-purple-500/30 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
                <input
                  type="radio"
                  name="proposalType"
                  value="normal"
                  checked={formData.proposalType === 'normal'}
                  onChange={(e) => handleInputChange('proposalType', e.target.value)}
                  className="w-4 h-4 text-purple-600 bg-white/10 border-purple-500/30 focus:ring-purple-500 focus:ring-2"
                />
                <span className="text-white font-medium">Normal Proposal</span>
              </label>
              
              {/* Comparative Proposal */}
              <label className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-purple-500/30 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
                <input
                  type="radio"
                  name="proposalType"
                  value="comparative"
                  checked={formData.proposalType === 'comparative'}
                  onChange={(e) => handleInputChange('proposalType', e.target.value)}
                  className="w-4 h-4 text-purple-600 bg-white/10 border-purple-500/30 focus:ring-purple-500 focus:ring-2"
                />
                <span className="text-white font-medium">Comparative Proposal</span>
              </label>
              
              {/* Cash Proposal */}
              <label className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-purple-500/30 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
                <input
                  type="radio"
                  name="proposalType"
                  value="cash"
                  checked={formData.proposalType === 'cash'}
                  onChange={(e) => handleInputChange('proposalType', e.target.value)}
                  className="w-4 h-4 text-purple-600 bg-white/10 border-purple-500/30 focus:ring-purple-500 focus:ring-2"
                />
                <span className="text-white font-medium">Cash Proposal</span>
              </label>
            </div>
          </div>

          {/* Month-To-Month Checkbox - Only show for Normal and Comparative */}
          {(formData.proposalType === 'normal' || formData.proposalType === 'comparative') && (
            <div className="space-y-2 pb-4 border-b border-purple-500/20">
              <label className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-purple-500/30 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
                <input
                  type="checkbox"
                  checked={monthToMonth}
                  onChange={(e) => setMonthToMonth(e.target.checked)}
                  className="w-4 h-4 text-purple-600 bg-white/10 border-purple-500/30 focus:ring-purple-500 focus:ring-2 rounded"
                />
                <span className="text-white font-medium">Month-To-Month</span>
              </label>
              <p className="text-sm text-purple-300/70">
                Check this to display "Month-To-Month" instead of term and escalation on the proposal
              </p>
            </div>
          )}

          {/* Customer Name */}
          <div className="space-y-2">
            <label htmlFor="customerName" className="text-white font-medium">
              Customer Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              id="customerName"
              value={formData.customerName}
              onChange={(e) => handleInputChange('customerName', e.target.value)}
              placeholder="Enter customer name"
              className="w-full px-4 py-3 h-12 bg-white/10 border border-purple-500/30 rounded-lg text-white text-base placeholder-purple-300/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500 transition-all"
              required
            />
            <p className="text-sm text-purple-300/70">Enter the customer's full name for the proposal</p>
          </div>

          {/* Current Hardware Rental - Only show for Comparative Proposal */}
          {formData.proposalType === 'comparative' && (
            <div className="space-y-2 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <label htmlFor="currentHardwareRental" className="text-white font-medium flex items-center gap-2">
                Current Hardware Rental <span className="text-red-400">*</span>
                <span className="text-xs text-orange-300/70 font-normal">(Auto-filled from Hardware Settlement)</span>
              </label>
              <input
                type="number"
                id="currentHardwareRental"
                value={formData.currentHardwareRental}
                onChange={(e) => handleInputChange('currentHardwareRental', e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full px-4 py-3 h-12 bg-white/10 border border-orange-500/30 rounded-lg text-white text-base placeholder-orange-300/50 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500 transition-all"
                required
              />
              <p className="text-sm text-orange-300/70">Current hardware rental amount (R) - editable</p>
            </div>
          )}

          {/* Current Monthly Amounts - Only show for Comparative Proposal */}
          {formData.proposalType === 'comparative' && (
            <div className="space-y-2 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <label htmlFor="currentMRC" className="text-white font-medium flex items-center gap-2">
                Current Monthly Amounts <span className="text-red-400">*</span>
                <span className="text-xs text-orange-300/70 font-normal">(Auto-filled from Connectivity & Licensing Settlement)</span>
              </label>
              <input
                type="number"
                id="currentMRC"
                value={formData.currentMRC}
                onChange={(e) => handleInputChange('currentMRC', e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full px-4 py-3 h-12 bg-white/10 border border-orange-500/30 rounded-lg text-white text-base placeholder-orange-300/50 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500 transition-all"
                required
              />
              <p className="text-sm text-orange-300/70">Monthly amounts excluding hardware rental (R) - editable</p>
            </div>
          )}

          {/* Cash Price - Only show for Cash Proposal */}
          {formData.proposalType === 'cash' && (
            <div className="space-y-2 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <label htmlFor="cashPrice" className="text-white font-medium flex items-center gap-2">
                Cash Price <span className="text-red-400">*</span>
                <span className="text-xs text-purple-300/70 font-normal">(Defaults to Total Payout)</span>
              </label>
              <input
                type="number"
                id="cashPrice"
                value={formData.cashPrice || 0}
                onChange={(e) => handleInputChange('cashPrice', e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full px-4 py-3 h-12 bg-white/10 border border-purple-500/30 rounded-lg text-white text-base placeholder-purple-300/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500 transition-all"
                required
              />
              <p className="text-sm text-purple-300/70">
                This amount will be used as the Total Payout on the cash proposal. Default: R {(totalsData?.totalPayout || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              </p>
            </div>
          )}

          {/* Specialist Email */}
          <div className="space-y-2">
            <label htmlFor="specialistEmail" className="text-white font-medium">
              Specialist Email Address <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              id="specialistEmail"
              value={formData.specialistEmail}
              onChange={(e) => handleInputChange('specialistEmail', e.target.value)}
              placeholder="specialist@company.com"
              className="w-full px-4 py-3 h-12 bg-white/10 border border-purple-500/30 rounded-lg text-white text-base placeholder-purple-300/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500 transition-all"
              required
            />
            <p className="text-sm text-purple-300/70">Email address for proposal correspondence</p>
          </div>

          {/* Specialist Phone */}
          <div className="space-y-2">
            <label htmlFor="specialistPhone" className="text-white font-medium">
              Specialist Phone Number <span className="text-red-400">*</span>
            </label>
            <input
              type="tel"
              id="specialistPhone"
              value={formData.specialistPhone}
              onChange={(e) => handleInputChange('specialistPhone', e.target.value)}
              placeholder="+27 XX XXX XXXX"
              className="w-full px-4 py-3 h-12 bg-white/10 border border-purple-500/30 rounded-lg text-white text-base placeholder-purple-300/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500 transition-all"
              required
            />
            <p className="text-sm text-purple-300/70">Contact number for follow-up questions</p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-6 py-2 h-12 bg-white/10 border border-white/20 text-white text-base rounded-lg hover:bg-white/20 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-2 h-12 bg-purple-600 hover:bg-purple-700 text-white text-base rounded-lg transition-colors font-semibold flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Generate Proposal</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body // CRITICAL: Render at document.body level to escape parent stacking context
  );
}
