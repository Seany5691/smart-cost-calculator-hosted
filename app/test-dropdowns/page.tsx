'use client';

import { useState } from 'react';

export default function TestDropdownsPage() {
  const [leadsValue, setLeadsValue] = useState('');
  const [calculatorValue, setCalculatorValue] = useState('');
  const [scraperValue, setScraperValue] = useState('');
  const [multiValue, setMultiValue] = useState<string[]>([]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Dropdown Styles Test Page
          </h1>
          <p className="text-gray-300">
            Testing global dropdown styles across all sections
          </p>
        </div>

        {/* Leads Section - Emerald Theme */}
        <div className="glass-card p-6 leads-section">
          <h2 className="text-2xl font-bold text-emerald-400 mb-4">
            Leads Section (Emerald Theme)
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-white font-medium mb-2">
                Lead Status
              </label>
              <select
                value={leadsValue}
                onChange={(e) => setLeadsValue(e.target.value)}
                className="w-full leads-dropdown"
              >
                <option value="">-- Select Status --</option>
                <option value="new">New Lead</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="proposal">Proposal Sent</option>
                <option value="negotiation">In Negotiation</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </div>

            <div>
              <label className="block text-white font-medium mb-2">
                Priority Level
              </label>
              <select className="w-full leads-dropdown">
                <option value="">-- Select Priority --</option>
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-white font-medium mb-2">
                Disabled Dropdown
              </label>
              <select disabled className="w-full leads-dropdown">
                <option value="">-- Disabled --</option>
              </select>
            </div>
          </div>
        </div>

        {/* Calculator Section - Purple Theme */}
        <div className="glass-card p-6 calculator-section">
          <h2 className="text-2xl font-bold text-purple-400 mb-4">
            Calculator Section (Purple Theme)
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-white font-medium mb-2">
                Hardware Type
              </label>
              <select
                value={calculatorValue}
                onChange={(e) => setCalculatorValue(e.target.value)}
                className="w-full calculator-dropdown"
              >
                <option value="">-- Select Hardware --</option>
                <option value="server">Server</option>
                <option value="workstation">Workstation</option>
                <option value="laptop">Laptop</option>
                <option value="tablet">Tablet</option>
                <option value="phone">Phone</option>
              </select>
            </div>

            <div>
              <label className="block text-white font-medium mb-2">
                License Type
              </label>
              <select className="w-full calculator-dropdown">
                <option value="">-- Select License --</option>
                <option value="standard">Standard License</option>
                <option value="professional">Professional License</option>
                <option value="enterprise">Enterprise License</option>
              </select>
            </div>

            <div>
              <label className="block text-white font-medium mb-2">
                Multi-Select Example
              </label>
              <select
                multiple
                size={5}
                className="w-full calculator-dropdown"
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions).map(
                    (option) => option.value
                  );
                  setMultiValue(selected);
                }}
              >
                <option value="option1">Option 1</option>
                <option value="option2">Option 2</option>
                <option value="option3">Option 3</option>
                <option value="option4">Option 4</option>
                <option value="option5">Option 5</option>
              </select>
              {multiValue.length > 0 && (
                <p className="text-sm text-purple-300 mt-2">
                  Selected: {multiValue.join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Scraper Section - Teal Theme */}
        <div className="glass-card p-6 scraper-section">
          <h2 className="text-2xl font-bold text-teal-400 mb-4">
            Scraper Section (Teal Theme)
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-white font-medium mb-2">
                Industry Category
              </label>
              <select
                value={scraperValue}
                onChange={(e) => setScraperValue(e.target.value)}
                className="w-full scraper-dropdown"
              >
                <option value="">-- Select Industry --</option>
                <option value="retail">Retail</option>
                <option value="healthcare">Healthcare</option>
                <option value="finance">Finance</option>
                <option value="technology">Technology</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="education">Education</option>
              </select>
            </div>

            <div>
              <label className="block text-white font-medium mb-2">
                Search Provider
              </label>
              <select className="w-full scraper-dropdown">
                <option value="">-- Select Provider --</option>
                <option value="google">Google</option>
                <option value="bing">Bing</option>
                <option value="yellowpages">Yellow Pages</option>
                <option value="yelp">Yelp</option>
              </select>
            </div>

            <div>
              <label className="block text-white font-medium mb-2">
                Results Per Page
              </label>
              <select className="w-full scraper-dropdown">
                <option value="10">10 results</option>
                <option value="25">25 results</option>
                <option value="50">50 results</option>
                <option value="100">100 results</option>
              </select>
            </div>
          </div>
        </div>

        {/* Default Section - No specific theme */}
        <div className="glass-card p-6">
          <h2 className="text-2xl font-bold text-white mb-4">
            Default Section (No Theme)
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-white font-medium mb-2">
                Generic Dropdown
              </label>
              <select className="w-full">
                <option value="">-- Select Option --</option>
                <option value="1">Option 1</option>
                <option value="2">Option 2</option>
                <option value="3">Option 3</option>
              </select>
            </div>
          </div>
        </div>

        {/* Testing Instructions */}
        <div className="glass-card p-6 bg-blue-500/10 border-blue-500/30">
          <h3 className="text-xl font-bold text-blue-400 mb-4">
            Testing Instructions
          </h3>
          <ul className="space-y-2 text-gray-300">
            <li>✓ Verify dropdowns have glassmorphic background (white/10)</li>
            <li>✓ Verify borders are visible (white/20)</li>
            <li>✓ Verify text is white and readable</li>
            <li>✓ Verify border radius is 0.5rem</li>
            <li>✓ Verify options have dark background (#1f2937)</li>
            <li>✓ Verify hover states work on options (#374151)</li>
            <li>✓ Verify focus states show section-specific colors</li>
            <li>✓ Test on Chrome, Firefox, and Safari</li>
            <li>✓ Test on mobile devices</li>
            <li>✓ Verify disabled state has reduced opacity</li>
            <li>✓ Verify multi-select styling works</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
