'use client';

import { useCalculatorStore } from '@/lib/store/calculator';
import { useState, useEffect } from 'react';

interface ValidationErrors {
  customerName?: string;
  term?: string;
  escalation?: string;
  distance?: string;
}

export default function DealDetailsStep() {
  const { dealDetails, setDealDetails } = useCalculatorStore();
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Validate fields
  const validateField = (field: keyof ValidationErrors, value: any): string | undefined => {
    switch (field) {
      case 'customerName':
        if (!value || value.trim() === '') {
          return 'Please enter a customer name before proceeding';
        }
        break;
      case 'term':
        if (![36, 48, 60].includes(value)) {
          return 'Please enter a valid contract term (36, 48, or 60 months)';
        }
        break;
      case 'escalation':
        if (![0, 10, 15].includes(value)) {
          return 'Please enter a valid escalation percentage (0%, 10%, or 15%)';
        }
        break;
      case 'distance':
        if (value < 0) {
          return 'Distance cannot be negative';
        }
        break;
    }
    return undefined;
  };

  // Validate all fields
  const validateAll = (): ValidationErrors => {
    const newErrors: ValidationErrors = {};
    
    const customerNameError = validateField('customerName', dealDetails.customerName);
    if (customerNameError) newErrors.customerName = customerNameError;
    
    const termError = validateField('term', dealDetails.term);
    if (termError) newErrors.term = termError;
    
    const escalationError = validateField('escalation', dealDetails.escalation);
    if (escalationError) newErrors.escalation = escalationError;
    
    const distanceError = validateField('distance', dealDetails.distance);
    if (distanceError) newErrors.distance = distanceError;
    
    return newErrors;
  };

  // Update errors when dealDetails change
  useEffect(() => {
    const newErrors = validateAll();
    setErrors(newErrors);
  }, [dealDetails]);

  // Check if all fields are valid
  const isValid = Object.keys(errors).length === 0;

  // Handle field blur
  const handleBlur = (field: string) => {
    setTouched({ ...touched, [field]: true });
  };

  // Get field class based on validation state
  const getFieldClass = (field: keyof ValidationErrors, baseClass: string): string => {
    if (!touched[field]) return baseClass;
    if (errors[field]) {
      return `${baseClass} border-red-500 focus:ring-red-500`;
    }
    return `${baseClass} border-green-500 focus:ring-green-500`;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-4">Deal Details</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Name */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Customer Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={dealDetails.customerName}
            onChange={(e) => setDealDetails({ customerName: e.target.value })}
            onBlur={() => handleBlur('customerName')}
            className={getFieldClass('customerName', 'w-full px-4 py-3 h-12 bg-white/10 border border-white/20 rounded-lg text-white text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500')}
            placeholder="Enter customer name"
            required
          />
          {touched.customerName && errors.customerName && (
            <p className="mt-1 text-sm text-red-400">{errors.customerName}</p>
          )}
        </div>

        {/* Deal Name */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Deal Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={dealDetails.dealName}
            onChange={(e) => setDealDetails({ dealName: e.target.value })}
            className="w-full px-4 py-3 h-12 bg-white/10 border border-white/20 rounded-lg text-white text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Enter deal name"
            required
          />
        </div>

        {/* Contract Term */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Contract Term (months) <span className="text-red-400">*</span>
          </label>
          <select
            value={dealDetails.term}
            onChange={(e) => setDealDetails({ term: parseInt(e.target.value) as 36 | 48 | 60 })}
            onBlur={() => handleBlur('term')}
            className={getFieldClass('term', 'w-full px-3 py-2 h-12 bg-white/10 border border-purple-500/30 rounded-lg text-white text-base focus:ring-2 focus:ring-purple-500 focus:border-transparent')}
          >
            <option value={36}>36 months</option>
            <option value={48}>48 months</option>
            <option value={60}>60 months</option>
          </select>
          {touched.term && errors.term && (
            <p className="mt-1 text-sm text-red-400">{errors.term}</p>
          )}
        </div>

        {/* Escalation Percentage */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Escalation Percentage <span className="text-red-400">*</span>
          </label>
          <select
            value={dealDetails.escalation}
            onChange={(e) => setDealDetails({ escalation: parseInt(e.target.value) as 0 | 10 | 15 })}
            onBlur={() => handleBlur('escalation')}
            className={getFieldClass('escalation', 'w-full px-3 py-2 h-12 bg-white/10 border border-purple-500/30 rounded-lg text-white text-base focus:ring-2 focus:ring-purple-500 focus:border-transparent')}
          >
            <option value={0}>0%</option>
            <option value={10}>10%</option>
            <option value={15}>15%</option>
          </select>
          {touched.escalation && errors.escalation && (
            <p className="mt-1 text-sm text-red-400">{errors.escalation}</p>
          )}
        </div>

        {/* Distance */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Distance (kilometers) <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={dealDetails.distance}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              setDealDetails({ distance: isNaN(value) ? 0 : value });
            }}
            onBlur={() => handleBlur('distance')}
            className={getFieldClass('distance', 'w-full px-4 py-3 h-12 bg-white/10 border border-white/20 rounded-lg text-white text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500')}
            placeholder="0"
          />
          {touched.distance && errors.distance && (
            <p className="mt-1 text-sm text-red-400">{errors.distance}</p>
          )}
        </div>
      </div>

      {/* Summary Card - shown when all fields are valid */}
      {isValid && dealDetails.customerName.trim() !== '' && (
        <div className="mt-6 p-6 bg-green-500/10 border border-green-500/30 rounded-lg">
          <h3 className="text-lg font-semibold text-green-300 mb-4">Deal Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Customer Name:</span>
              <span className="ml-2 text-white font-medium">{dealDetails.customerName}</span>
            </div>
            <div>
              <span className="text-gray-400">Deal Name:</span>
              <span className="ml-2 text-white font-medium">{dealDetails.dealName || 'Not specified'}</span>
            </div>
            <div>
              <span className="text-gray-400">Contract Term:</span>
              <span className="ml-2 text-white font-medium">{dealDetails.term} months</span>
            </div>
            <div>
              <span className="text-gray-400">Escalation:</span>
              <span className="ml-2 text-white font-medium">{dealDetails.escalation}%</span>
            </div>
            <div>
              <span className="text-gray-400">Distance:</span>
              <span className="ml-2 text-white font-medium">{dealDetails.distance} km</span>
            </div>
          </div>
        </div>
      )}

      {/* Validation Tip */}
      {!isValid && Object.keys(touched).length > 0 && (
        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-300">
            <strong>Please correct the errors above before proceeding.</strong>
          </p>
        </div>
      )}

      {/* Info Tip */}
      {Object.keys(touched).length === 0 && (
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-sm text-blue-300">
            <strong>Tip:</strong> Fill in all required fields marked with * to proceed to the next step.
          </p>
        </div>
      )}
    </div>
  );
}
