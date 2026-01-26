'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/store/auth-simple';

interface ProviderResult {
  phoneNumber: string;
  provider: string;
  confidence: number;
}

export default function NumberLookup() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProviderResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter a phone number');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const token = useAuthStore.getState().token;
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/dashboard/lookup-number', {
        method: 'POST',
        headers,
        body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to lookup phone number');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLookup();
    }
  };

  const getProviderColor = (provider: string) => {
    const colors: Record<string, string> = {
      Telkom: 'text-blue-400',
      Vodacom: 'text-red-400',
      MTN: 'text-yellow-400',
      'Cell C': 'text-green-400',
      Other: 'text-gray-400',
      Unknown: 'text-gray-400',
    };
    return colors[provider] || 'text-gray-400';
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <h2 className="text-2xl font-bold mb-4 gradient-text">Number Lookup</h2>
      <p className="text-sm text-gray-300 mb-4">
        Check which provider services a phone number
      </p>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter phone number (e.g., 018 771 2345)"
          className="input flex-1"
          disabled={loading}
        />
        <button
          onClick={handleLookup}
          disabled={loading}
          className="btn btn-info px-6"
        >
          {loading ? 'Looking up...' : 'Lookup'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="p-4 bg-white/5 border border-white/10 rounded-lg animate-fade-in-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Phone Number</p>
              <p className="text-lg font-semibold text-white">{result.phoneNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Provider</p>
              <p className={`text-lg font-bold ${getProviderColor(result.provider)}`}>
                {result.provider}
              </p>
            </div>
          </div>
          {result.confidence > 0 && (
            <div className="mt-2 pt-2 border-t border-white/10">
              <p className="text-xs text-gray-400">
                Confidence: {(result.confidence * 100).toFixed(0)}%
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
