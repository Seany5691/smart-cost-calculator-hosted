'use client';

/**
 * TEMPORARY TEST BUTTON - Remove after testing
 * Floating button to test 1-day-before batched email
 */

import { useState } from 'react';
import { Mail, Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function TestEmailButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestEmail = async () => {
    setLoading(true);
    setResult(null);

    try {
      // Get auth token
      const stored = localStorage.getItem('auth-storage');
      let token = null;
      if (stored) {
        const data = JSON.parse(stored);
        token = data.state?.token || data.token;
      }

      if (!token) {
        setResult({ success: false, message: 'Not authenticated' });
        setLoading(false);
        return;
      }

      const response = await fetch('/api/reminders/test-1day-email', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult({
          success: true,
          message: `✅ Email sent! ${data.reminderCount} reminder(s) included. Check ${data.reminders?.[0] ? 'your email' : 'inbox'}.`,
        });
      } else {
        setResult({
          success: false,
          message: data.message || data.error || 'Failed to send email',
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Network error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={handleTestEmail}
        disabled={loading}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        title="Test 1-Day Before Email"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Mail className="w-5 h-5" />
        )}
        <span className="font-medium">Test 1-Day Email</span>
      </button>

      {/* Result Toast */}
      {result && (
        <div
          className={`fixed bottom-24 right-6 z-50 max-w-md p-4 rounded-lg shadow-xl ${
            result.success
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
          }`}
        >
          <div className="flex items-start gap-3">
            {result.success ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">{result.message}</p>
            </div>
            <button
              onClick={() => setResult(null)}
              className="text-white hover:text-gray-200 transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}
