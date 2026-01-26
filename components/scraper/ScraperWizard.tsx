'use client';

/**
 * Scraper Wizard Component
 * Main UI for configuring and running scraping sessions
 */

import { useState, useEffect } from 'react';
import { SessionStatus } from '@/lib/scraper/types';

const INDUSTRIES = [
  'Restaurants',
  'Hotels',
  'Retail Stores',
  'Medical Practices',
  'Law Firms',
  'Accounting Firms',
  'Real Estate Agencies',
  'Insurance Agencies',
  'Auto Repair Shops',
  'Beauty Salons',
  'Gyms',
  'Schools',
  'Churches',
  'Non-Profits',
];

export default function ScraperWizard() {
  const [sessionName, setSessionName] = useState('');
  const [towns, setTowns] = useState('');
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [simultaneousTowns, setSimultaneousTowns] = useState(2);
  const [simultaneousIndustries, setSimultaneousIndustries] = useState(5);
  const [simultaneousLookups, setSimultaneousLookups] = useState(10);
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll for status updates every 2 seconds
  useEffect(() => {
    if (!sessionId) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/scraper/status?sessionId=${sessionId}`);
        if (response.ok) {
          const status = await response.json();
          setSessionStatus(status);

          // Stop polling if session is completed, stopped, or error
          if (['completed', 'stopped', 'error'].includes(status.status)) {
            clearInterval(interval);
          }
        }
      } catch (error) {
        console.error('Error fetching session status:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [sessionId]);

  const handleIndustryToggle = (industry: string) => {
    setSelectedIndustries((prev) =>
      prev.includes(industry)
        ? prev.filter((i) => i !== industry)
        : [...prev, industry]
    );
  };

  const handleStart = async () => {
    setError(null);
    setIsLoading(true);

    try {
      // Validate inputs
      if (!sessionName.trim()) {
        throw new Error('Session name is required');
      }

      const townList = towns
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      if (townList.length === 0) {
        throw new Error('At least one town is required');
      }

      if (selectedIndustries.length === 0) {
        throw new Error('At least one industry is required');
      }

      // Start scraping session
      const response = await fetch('/api/scraper/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sessionName,
          config: {
            towns: townList,
            industries: selectedIndustries,
            simultaneousTowns,
            simultaneousIndustries,
            simultaneousLookups,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start scraping session');
      }

      const data = await response.json();
      setSessionId(data.sessionId);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch('/api/scraper/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to pause session');
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleResume = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch('/api/scraper/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to resume session');
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleStop = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch('/api/scraper/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to stop session');
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Smart Scraper</h1>

      {!sessionId ? (
        // Configuration Form
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Configure Scraping Session</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session Name
              </label>
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Cape Town Restaurants"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Towns (comma-separated)
              </label>
              <input
                type="text"
                value={towns}
                onChange={(e) => setTowns(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Cape Town, Johannesburg, Durban"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industries
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {INDUSTRIES.map((industry) => (
                  <label key={industry} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedIndustries.includes(industry)}
                      onChange={() => handleIndustryToggle(industry)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">{industry}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Simultaneous Towns
                </label>
                <input
                  type="number"
                  value={simultaneousTowns}
                  onChange={(e) => setSimultaneousTowns(parseInt(e.target.value))}
                  min="1"
                  max="5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Simultaneous Industries
                </label>
                <input
                  type="number"
                  value={simultaneousIndustries}
                  onChange={(e) => setSimultaneousIndustries(parseInt(e.target.value))}
                  min="1"
                  max="10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Simultaneous Lookups
                </label>
                <input
                  type="number"
                  value={simultaneousLookups}
                  onChange={(e) => setSimultaneousLookups(parseInt(e.target.value))}
                  min="1"
                  max="20"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              onClick={handleStart}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Starting...' : 'Start Scraping'}
            </button>
          </div>
        </div>
      ) : (
        // Progress Display
        <div className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Progress Bar */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Scraping Progress</h2>

            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Progress</span>
                <span>{sessionStatus?.progress || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${sessionStatus?.progress || 0}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-600">Status</div>
                <div className="text-lg font-semibold capitalize">
                  {sessionStatus?.status || 'Unknown'}
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-600">Businesses Scraped</div>
                <div className="text-lg font-semibold">
                  {sessionStatus?.businessesScraped || 0}
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-600">Towns Remaining</div>
                <div className="text-lg font-semibold">
                  {sessionStatus?.townsRemaining || 0}
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-600">Est. Time Remaining</div>
                <div className="text-lg font-semibold">
                  {sessionStatus?.estimatedTimeRemaining
                    ? formatTime(sessionStatus.estimatedTimeRemaining)
                    : 'Calculating...'}
                </div>
              </div>
            </div>

            {sessionStatus?.currentTown && (
              <div className="text-sm text-gray-600 mb-4">
                Current: {sessionStatus.currentTown}
                {sessionStatus.currentIndustry && ` - ${sessionStatus.currentIndustry}`}
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex space-x-2">
              {sessionStatus?.status === 'running' && (
                <button
                  onClick={handlePause}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                >
                  Pause
                </button>
              )}

              {sessionStatus?.status === 'paused' && (
                <button
                  onClick={handleResume}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Resume
                </button>
              )}

              {sessionStatus?.status !== 'stopped' &&
                sessionStatus?.status !== 'completed' && (
                  <button
                    onClick={handleStop}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Stop
                  </button>
                )}

              {(sessionStatus?.status === 'completed' ||
                sessionStatus?.status === 'stopped') && (
                <button
                  onClick={() => {
                    setSessionId(null);
                    setSessionStatus(null);
                    setSessionName('');
                    setTowns('');
                    setSelectedIndustries([]);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  New Session
                </button>
              )}
            </div>
          </div>

          {/* Logs */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Logs</h2>
            <div className="bg-gray-50 rounded p-4 max-h-96 overflow-y-auto font-mono text-sm">
              {sessionStatus?.logs && sessionStatus.logs.length > 0 ? (
                sessionStatus.logs.map((log, index) => (
                  <div
                    key={index}
                    className={`mb-1 ${
                      log.level === 'error'
                        ? 'text-red-600'
                        : (log.level as string) === 'warn'
                        ? 'text-yellow-600'
                        : 'text-gray-700'
                    }`}
                  >
                    [{new Date(log.timestamp).toLocaleTimeString()}] {log.message}
                  </div>
                ))
              ) : (
                <div className="text-gray-500">No logs yet...</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
