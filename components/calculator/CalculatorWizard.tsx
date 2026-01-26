'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCalculatorStore } from '@/lib/store/calculator';
import { useConfigStore } from '@/lib/store/config';
import { useAuthStore } from '@/lib/store/auth-simple';
import { useToast } from '@/components/ui/Toast/useToast';
import DealDetailsStep from './DealDetailsStep';
import HardwareStep from './HardwareStep';
import ConnectivityStep from './ConnectivityStep';
import LicensingStep from './LicensingStep';
import SettlementStep from './SettlementStep';
import TotalCostsStep from './TotalCostsStep';
import ResetCalculationButton from './ResetCalculationButton';

const STEPS = [
  { id: 'deal-details', label: 'Deal Details', number: 1 },
  { id: 'hardware', label: 'Hardware', number: 2 },
  { id: 'connectivity', label: 'Connectivity', number: 3 },
  { id: 'licensing', label: 'Licensing', number: 4 },
  { id: 'settlement', label: 'Settlement', number: 5 },
  { id: 'total-costs', label: 'Total Costs', number: 6 },
] as const;

export default function CalculatorWizard() {
  const router = useRouter();
  const { currentStep, setCurrentStep, nextStep, previousStep, goToStep } = useCalculatorStore();
  const { 
    fetchHardware, 
    fetchConnectivity, 
    fetchLicensing, 
    fetchFactors, 
    fetchScales,
    isLoadingHardware,
    isLoadingConnectivity,
    isLoadingLicensing,
    isLoadingFactors,
    isLoadingScales,
  } = useConfigStore();
  const { token } = useAuthStore();
  const { toast } = useToast();

  // State for navigation feedback notification
  const [navigationNotification, setNavigationNotification] = useState<string | null>(null);
  
  // State for validation errors
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // State for configuration loading errors
  const [configError, setConfigError] = useState<string | null>(null);
  
  // State for exit confirmation
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Initialize all configs when component mounts
  useEffect(() => {
    const initConfigs = async () => {
      console.log('[CALCULATOR WIZARD] Initializing configs with token...');
      setConfigError(null);
      
      try {
        // Load hardware, connectivity, and licensing (required for UI)
        await Promise.all([
          fetchHardware(token),
          fetchConnectivity(token),
          fetchLicensing(token),
        ]);
        console.log('[CALCULATOR WIZARD] Core configs loaded successfully');
        
        // Try to load factors and scales, but don't block if they fail
        try {
          await Promise.all([
            fetchFactors(token),
            fetchScales(token),
          ]);
          console.log('[CALCULATOR WIZARD] Factors and scales loaded successfully');
        } catch (error) {
          console.warn('[CALCULATOR WIZARD] Factors/scales failed to load, calculator will use mock data:', error);
          // Don't set configError - just log the warning
          // Calculator will work with mock data for calculations
        }
      } catch (error) {
        console.error('[CALCULATOR WIZARD] Error loading core configs:', error);
        // Only show error if core configs fail
        setConfigError('Failed to load calculator configuration. Please refresh the page or click retry.');
      }
    };
    
    initConfigs();
  }, [fetchHardware, fetchConnectivity, fetchLicensing, fetchFactors, fetchScales, token]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if user is typing in an input field, textarea, or select
      const target = event.target as HTMLElement;
      const isInputField = 
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      // Don't trigger shortcuts when typing in input fields
      if (isInputField) {
        return;
      }

      // Check if user is in a modal or dropdown (has role="dialog" or aria-modal="true" in parent)
      const isInModal = target.closest('[role="dialog"]') || target.closest('[aria-modal="true"]');
      if (isInModal) {
        return;
      }

      const currentStepIndex = STEPS.findIndex((step) => step.id === currentStep);

      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault();
          if (currentStepIndex < STEPS.length - 1) {
            if (validateCurrentStep()) {
              nextStep();
              showNavigationFeedback(STEPS[currentStepIndex + 1].label);
            }
          }
          break;

        case 'ArrowLeft':
          event.preventDefault();
          if (currentStepIndex > 0) {
            previousStep();
            showNavigationFeedback(STEPS[currentStepIndex - 1].label);
          }
          break;

        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
          event.preventDefault();
          const stepNumber = parseInt(event.key);
          if (validateCurrentStep()) {
            goToStep(stepNumber);
            showNavigationFeedback(STEPS[stepNumber - 1].label);
          }
          break;

        case 'Escape':
          event.preventDefault();
          handleEscapeKey();
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, nextStep, previousStep, goToStep]);

  // Show navigation feedback notification
  const showNavigationFeedback = (stepLabel: string) => {
    setNavigationNotification(`Moved to ${stepLabel}`);
    setTimeout(() => {
      setNavigationNotification(null);
    }, 2000);
  };
  
  // Show validation error notification
  const showValidationError = (message: string) => {
    setValidationError(message);
    setTimeout(() => {
      setValidationError(null);
    }, 4000);
  };
  
  // Validate current step before navigation
  const validateCurrentStep = (): boolean => {
    const { dealDetails } = useCalculatorStore.getState();
    
    // Validate Deal Details step
    if (currentStep === 'deal-details') {
      if (!dealDetails.customerName || dealDetails.customerName.trim() === '') {
        showValidationError('Please enter a customer name before proceeding');
        return false;
      }
      if (![36, 48, 60].includes(dealDetails.term)) {
        showValidationError('Please select a valid contract term (36, 48, or 60 months)');
        return false;
      }
      if (![0, 10, 15].includes(dealDetails.escalation)) {
        showValidationError('Please select a valid escalation percentage (0%, 10%, or 15%)');
        return false;
      }
      if (dealDetails.distance < 0) {
        showValidationError('Distance cannot be negative');
        return false;
      }
    }
    
    return true;
  };

  // Handle Escape key - prompt for confirmation
  const handleEscapeKey = () => {
    setShowExitConfirm(true);
  };

  const handleConfirmExit = () => {
    router.push('/dashboard');
  };

  const handleCancelExit = () => {
    setShowExitConfirm(false);
  };

  const currentStepIndex = STEPS.findIndex((step) => step.id === currentStep);
  
  // Show loading state only if core configs (hardware, connectivity, licensing) are still loading
  const isLoading = isLoadingHardware || isLoadingConnectivity || isLoadingLicensing;
  
  // Check if factors/scales failed to load (warning, not blocking)
  const { factors, scales } = useConfigStore();
  const hasFactorsScalesWarning = !isLoadingFactors && !isLoadingScales && (!factors || !scales);
  
  // Show error state if configuration failed to load
  if (configError) {
    return (
      <div className="space-y-6">
        <div className="glass-card p-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            Smart Cost Calculator
          </h1>
          <p className="text-gray-300">
            Configuration Error
          </p>
        </div>
        <div className="glass-card p-12 text-center">
          <div className="text-red-400 text-xl mb-4">⚠️ Configuration Loading Failed</div>
          <div className="text-gray-300 mb-6">{configError}</div>
          <button
            onClick={() => {
              setConfigError(null);
              fetchHardware(token);
              fetchConnectivity(token);
              fetchLicensing(token);
              fetchFactors(token);
              fetchScales(token);
            }}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
          >
            Retry Loading Configuration
          </button>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="glass-card p-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            Smart Cost Calculator
          </h1>
          <p className="text-gray-300">
            Loading configuration data...
          </p>
        </div>
        <div className="glass-card p-12 text-center">
          <div className="text-white text-xl">Loading calculator configuration...</div>
          <div className="mt-4 text-gray-400">Please wait while we load hardware, connectivity, and licensing data</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-2xl shadow-2xl max-w-md w-full border border-purple-500/30 p-6">
            <h3 className="text-xl font-bold text-white mb-3">Return to Dashboard?</h3>
            <p className="text-purple-200 mb-6">
              Are you sure you want to return to the dashboard? Any unsaved changes may be lost.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelExit}
                className="flex-1 px-6 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmExit}
                className="flex-1 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-semibold"
              >
                Exit Calculator
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Factors/Scales Warning Banner */}
      {hasFactorsScalesWarning && (
        <div className="glass-card p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h3 className="text-yellow-300 font-semibold mb-1">Limited Functionality</h3>
              <p className="text-yellow-200 text-sm">
                Factors and scales configuration could not be loaded. The calculator will use mock data for calculations. 
                Some features may not work correctly until the configuration API endpoints are implemented.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Navigation Feedback Notification */}
      {navigationNotification && (
        <div className="fixed top-4 right-4 z-50 animate-slide-up">
          <div className="glass-card px-6 py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
            <p className="text-white font-medium">{navigationNotification}</p>
          </div>
        </div>
      )}
      
      {/* Validation Error Notification */}
      {validationError && (
        <div className="fixed top-4 right-4 z-50 animate-shake">
          <div className="glass-card px-6 py-3 bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30">
            <p className="text-red-300 font-medium">⚠️ {validationError}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Smart Cost Calculator
            </h1>
            <p className="text-gray-300">
              Calculate costs for smart technology solutions with role-based pricing
            </p>
          </div>
          <ResetCalculationButton />
        </div>
      </div>

      {/* Mobile Step Indicator - shown only on mobile */}
      <div className="glass-card p-4 block lg:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Step {currentStepIndex + 1} of {STEPS.length}</span>
          <span className="text-sm font-semibold text-white">{STEPS[currentStepIndex].label}</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop Step Tabs - hidden on mobile */}
      <div className="glass-card p-4 hidden lg:block">
        <div className="flex flex-wrap gap-2">
          {STEPS.map((step, index) => {
            const isCurrentStep = currentStep === step.id;
            const isCompletedStep = index < currentStepIndex;
            
            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(step.id as any)}
                className={`
                  flex-1 min-w-[120px] px-4 py-3 rounded-lg font-medium transition-all
                  ${
                    isCurrentStep
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }
                `}
              >
                <div className="flex items-center justify-center gap-2">
                  {isCompletedStep ? (
                    <span className="text-sm">✓</span>
                  ) : (
                    <span className="text-sm font-bold">{step.number}</span>
                  )}
                  <span className="hidden md:inline">{step.label}</span>
                </div>
              </button>
            );
          })}
        </div>
        
        {/* Keyboard shortcuts hint */}
        <div className="mt-4 text-center text-sm text-gray-400">
          Use <kbd className="px-2 py-1 bg-white/10 rounded">←</kbd> <kbd className="px-2 py-1 bg-white/10 rounded">→</kbd> or <kbd className="px-2 py-1 bg-white/10 rounded">1-6</kbd> to navigate
        </div>
      </div>

      {/* Step Content */}
      <div className="glass-card p-6">
        {currentStep === 'deal-details' && <DealDetailsStep />}
        {currentStep === 'hardware' && <HardwareStep />}
        {currentStep === 'connectivity' && <ConnectivityStep />}
        {currentStep === 'licensing' && <LicensingStep />}
        {currentStep === 'settlement' && <SettlementStep />}
        {currentStep === 'total-costs' && <TotalCostsStep />}
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <button
          onClick={previousStep}
          disabled={currentStepIndex === 0}
          className={`
            px-6 py-3 sm:py-2 rounded-lg font-medium transition-all h-12 sm:h-auto
            ${
              currentStepIndex === 0
                ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                : 'bg-white/10 text-white hover:bg-white/20'
            }
          `}
        >
          ← Previous
        </button>
        
        <button
          onClick={() => {
            if (validateCurrentStep()) {
              nextStep();
            }
          }}
          disabled={currentStepIndex === STEPS.length - 1}
          className={`
            px-6 py-3 sm:py-2 rounded-lg font-medium transition-all h-12 sm:h-auto
            ${
              currentStepIndex === STEPS.length - 1
                ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg'
            }
          `}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
