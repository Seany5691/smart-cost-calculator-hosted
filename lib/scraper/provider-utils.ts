/**
 * Provider Utility Functions
 * Helper functions for provider lookups and data conversion
 */

import { ProviderInfo } from './types';

/**
 * Helper function to convert provider string to ProviderInfo format
 */
export function convertToProviderInfo(provider: string): ProviderInfo {
  // Map Unknown to Other for type compatibility
  const mappedProvider = provider === 'Unknown' ? 'Other' : provider;
  return {
    provider: mappedProvider as 'Telkom' | 'Vodacom' | 'MTN' | 'Cell C' | 'Other',
    confidence: provider !== 'Unknown' ? 1 : 0,
  };
}

/**
 * Get provider priority for sorting (Telkom:1, Vodacom:2, MTN:3, Cell C:4, Other:5)
 */
export function getProviderPriority(provider: string): number {
  const priorities: Record<string, number> = {
    Telkom: 1,
    Vodacom: 2,
    MTN: 3,
    'Cell C': 4,
    Other: 5,
    Unknown: 5,
  };

  return priorities[provider] || 5;
}

/**
 * DEPRECATED: Prefix-based identification is NOT reliable due to number porting
 * This function is kept only for testing purposes
 * DO NOT USE in production - always use porting.co.za lookup
 */
export function identifyProviderByPrefix(_phoneNumber: string): ProviderInfo {
  console.warn('[ProviderUtils] WARNING: Prefix-based identification is deprecated and unreliable due to number porting');
  return { provider: 'Other', confidence: 0 };
}
