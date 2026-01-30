'use client';

import React from 'react';
import { MapPin } from 'lucide-react';

interface TownInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function TownInput({ value, onChange, disabled }: TownInputProps) {
  const townCount = value.split('\n').filter(t => t.trim()).length;
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg">
          <MapPin className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">
            Towns/Businesses to Scrape
          </h3>
          <p className="text-xs text-gray-400">
            {townCount} {townCount !== 1 ? 'entries' : 'entry'} • One per line
          </p>
        </div>
      </div>

      {/* Input */}
      <textarea
        id="town-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="e.g.&#10;Johannesburg, Gauteng&#10;Cape Town, Western Cape&#10;REGAL VANDERBIJLPARK&#10;REGAL XAVIER (JHB SOUTH)"
        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none h-80"
      />
      
      {/* Help text */}
      <p className="text-sm text-gray-400 font-medium">
        💡 Enter each town on a new line. Include province for better accuracy.
      </p>
      <p className="text-sm text-amber-400 font-medium mt-2">
        ℹ️ To search for specific businesses: Unselect all industries and enter business names above (e.g., "REGAL VANDERBIJLPARK")
      </p>
    </div>
  );
}
