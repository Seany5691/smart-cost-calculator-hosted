/**
 * Queue Management Page
 * Admin interface for managing scraping queue and clearing stale sessions
 */

'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import QueueManagement from '@/components/scraper/QueueManagement';

export default function QueueManagementPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/scraper"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Scraper
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">
            Queue Management
          </h1>
          <p className="text-slate-400">
            Manage scraping queue, clear stale sessions, and monitor active scrapes
          </p>
        </div>

        {/* Queue Management Component */}
        <QueueManagement />
      </div>
    </div>
  );
}
