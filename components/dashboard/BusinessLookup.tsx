'use client';

import React, { useState } from 'react';
import { Building2, Search, Loader2, Phone } from 'lucide-react';

interface BusinessResult {
  name: string;
  phone: string;
  provider: string;
}

export default function BusinessLookup() {
  const [businessQuery, setBusinessQuery] = useState('');
  const [results, setResults] = useState<BusinessResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async () => {
    if (!businessQuery.trim()) {
      setError('Please enter a business name and location');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = await fetch('/api/business-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessQuery }),
      });

      if (!response.ok) {
        throw new Error('Lookup failed');
      }

      const data = await response.json();
      setResults(data.results || []);
      
      if (data.results.length === 0) {
        setError('No businesses found. Try a different search.');
      }
    } catch (err) {
      setError('Failed to lookup businesses. Please try again.');
      console.error('Business lookup error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLookup();
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold gradient-text">Business Lookup</h2>
          <p className="text-sm text-gray-300">Find top 3 businesses on Google Maps</p>
        </div>
      </div>

      {/* Input and Button */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          value={businessQuery}
          onChange={(e) => setBusinessQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g., Shoprite, Stilfontein"
          className="input flex-1 w-full h-12 text-base"
          disabled={isLoading}
        />
        <button
          onClick={handleLookup}
          disabled={isLoading || !businessQuery.trim()}
          className="btn btn-info px-6 h-12 w-full sm:w-auto flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Search
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && !isLoading && (
        <div className="space-y-2 animate-fade-in-up">
          {results.map((business, index) => (
            <div
              key={index}
              className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-bold text-white mb-1">
                    {index + 1}. {business.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">{business.phone}</span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-green-500/30 to-emerald-500/30 text-green-400 border border-green-500/30">
                    {business.provider}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Help Text */}
      <p className="text-xs text-gray-500 mt-4">
        Enter business name and location (e.g., "Shoprite, Stilfontein")
      </p>
    </div>
  );
}
