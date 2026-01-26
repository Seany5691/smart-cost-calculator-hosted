'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store/auth-simple';

interface CalculatorStats {
  totalDeals: number;
  activeProjects: number;
  calculations: number;
}

interface LeadStats {
  totalLeads: number;
  leadsCount: number;
  workingCount: number;
  badCount: number;
  laterCount: number;
  signedCount: number;
  callbacksToday: number;
  callbacksUpcoming: number;
}

interface ScraperStats {
  totalSessions: number;
  businessesScraped: number;
  recentActivity: string;
}

interface DashboardStatsData {
  calculator: CalculatorStats;
  leads: LeadStats;
  scraper: ScraperStats;
}

export default function DashboardStats() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
    // Refresh stats every minute
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const token = useAuthStore.getState().token;
      const headers: HeadersInit = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/dashboard/stats', { headers });
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card rounded-2xl p-6 lg:p-4 animate-pulse">
            <div className="h-4 bg-white/10 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-white/10 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <p className="text-red-400">Error loading stats: {error}</p>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const showScraperStats = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Calculator Stats */}
      <div className="glass-card rounded-2xl p-6 lg:p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-300">Calculator</h3>
          <span className="text-3xl">🧮</span>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-400">Total Deals</p>
            <p className="text-3xl lg:text-2xl font-bold text-white">{stats.calculator.totalDeals}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-400">Active Projects</p>
              <p className="text-xl font-semibold text-white">{stats.calculator.activeProjects}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Calculations</p>
              <p className="text-xl font-semibold text-white">{stats.calculator.calculations}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lead Stats */}
      <div className="glass-card rounded-2xl p-6 lg:p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-300">Leads</h3>
          <span className="text-3xl">📊</span>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-400">Total Leads</p>
            <p className="text-3xl lg:text-2xl font-bold text-white">{stats.leads.totalLeads}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <p className="text-gray-400">Leads</p>
              <p className="text-lg font-semibold text-purple-400">{stats.leads.leadsCount}</p>
            </div>
            <div>
              <p className="text-gray-400">Working</p>
              <p className="text-lg font-semibold text-yellow-400">{stats.leads.workingCount}</p>
            </div>
            <div>
              <p className="text-gray-400">Signed</p>
              <p className="text-lg font-semibold text-green-400">{stats.leads.signedCount}</p>
            </div>
          </div>
          <div className="pt-2 border-t border-white/10">
            <p className="text-xs text-gray-400">Callbacks Today</p>
            <p className="text-lg font-semibold text-blue-400">{stats.leads.callbacksToday}</p>
          </div>
        </div>
      </div>

      {/* Scraper Stats (only for admin/manager) */}
      {showScraperStats && (
        <div className="glass-card rounded-2xl p-6 lg:p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-300">Scraper</h3>
            <span className="text-3xl">🔍</span>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-400">Total Sessions</p>
              <p className="text-3xl lg:text-2xl font-bold text-white">{stats.scraper.totalSessions}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Businesses Scraped</p>
              <p className="text-xl font-semibold text-cyan-400">{stats.scraper.businessesScraped}</p>
            </div>
            <div className="pt-2 border-t border-white/10">
              <p className="text-xs text-gray-400">Recent Activity</p>
              <p className="text-sm text-white truncate">{stats.scraper.recentActivity}</p>
            </div>
          </div>
        </div>
      )}

      {/* Additional Stats Card for non-admin/manager users */}
      {!showScraperStats && (
        <div className="glass-card rounded-2xl p-6 lg:p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-300">Reminders</h3>
            <span className="text-3xl">⏰</span>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-400">Upcoming Callbacks</p>
              <p className="text-3xl lg:text-2xl font-bold text-white">{stats.leads.callbacksUpcoming}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-400">Later Status</p>
                <p className="text-xl font-semibold text-orange-400">{stats.leads.laterCount}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Bad Leads</p>
                <p className="text-xl font-semibold text-red-400">{stats.leads.badCount}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
