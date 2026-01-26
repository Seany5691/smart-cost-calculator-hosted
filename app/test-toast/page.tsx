'use client';

import { useToast } from '@/components/ui/Toast/useToast';

export default function TestToastPage() {
  const { toast } = useToast();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Toast Notification Test</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Success Toasts */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Success Toasts</h2>
            <div className="space-y-3">
              <button
                onClick={() => toast.success('Operation successful!')}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Simple Success
              </button>
              <button
                onClick={() => toast.success('Lead updated', { 
                  message: 'Changes have been saved successfully',
                  section: 'leads'
                })}
                className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
              >
                Success with Message (Leads)
              </button>
            </div>
          </div>

          {/* Error Toasts */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Error Toasts</h2>
            <div className="space-y-3">
              <button
                onClick={() => toast.error('Operation failed!')}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Simple Error
              </button>
              <button
                onClick={() => toast.error('Failed to save', { 
                  message: 'Please check your connection and try again',
                  section: 'calculator'
                })}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Error with Message
              </button>
            </div>
          </div>

          {/* Warning Toasts */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Warning Toasts</h2>
            <div className="space-y-3">
              <button
                onClick={() => toast.warning('Unsaved changes')}
                className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
              >
                Simple Warning
              </button>
              <button
                onClick={() => toast.warning('Session expiring soon', { 
                  message: 'Your session will expire in 5 minutes',
                  section: 'scraper'
                })}
                className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
              >
                Warning with Message
              </button>
            </div>
          </div>

          {/* Info Toasts */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Info Toasts</h2>
            <div className="space-y-3">
              <button
                onClick={() => toast.info('New feature available')}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Simple Info
              </button>
              <button
                onClick={() => toast.info('Dashboard updated', { 
                  message: 'Check out the new analytics section',
                  section: 'leads'
                })}
                className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
              >
                Info with Message (Leads Theme)
              </button>
              <button
                onClick={() => toast.info('Calculator updated', { 
                  message: 'New pricing options available',
                  section: 'calculator'
                })}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Info with Message (Calculator Theme)
              </button>
              <button
                onClick={() => toast.info('Scraper updated', { 
                  message: 'Improved performance and reliability',
                  section: 'scraper'
                })}
                className="w-full px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
              >
                Info with Message (Scraper Theme)
              </button>
            </div>
          </div>

          {/* Multiple Toasts Test */}
          <div className="glass-card p-6 md:col-span-2">
            <h2 className="text-xl font-semibold text-white mb-4">Multiple Toasts Test</h2>
            <div className="space-y-3">
              <button
                onClick={() => {
                  toast.success('First toast');
                  setTimeout(() => toast.info('Second toast'), 200);
                  setTimeout(() => toast.warning('Third toast'), 400);
                  setTimeout(() => toast.error('Fourth toast'), 600);
                  setTimeout(() => toast.success('Fifth toast'), 800);
                }}
                className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-colors"
              >
                Show 5 Toasts (Max Stack)
              </button>
              <button
                onClick={() => {
                  for (let i = 1; i <= 7; i++) {
                    setTimeout(() => {
                      toast.info(`Toast ${i}`, { message: 'Testing max stack limit' });
                    }, i * 200);
                  }
                }}
                className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg transition-colors"
              >
                Show 7 Toasts (Test Max Limit)
              </button>
            </div>
          </div>

          {/* Custom Duration Test */}
          <div className="glass-card p-6 md:col-span-2">
            <h2 className="text-xl font-semibold text-white mb-4">Custom Duration Test</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={() => toast.info('Quick toast', { duration: 1000 })}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                1 Second
              </button>
              <button
                onClick={() => toast.info('Normal toast', { duration: 3000 })}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                3 Seconds
              </button>
              <button
                onClick={() => toast.info('Long toast', { duration: 10000 })}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                10 Seconds
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 glass-card p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Accessibility Test</h2>
          <p className="text-gray-300 mb-4">
            Toasts use ARIA live regions for screen reader announcements. They can be dismissed with keyboard navigation.
          </p>
          <button
            onClick={() => toast.success('Accessible toast', { 
              message: 'This toast is announced to screen readers'
            })}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            Test Accessibility
          </button>
        </div>
      </div>
    </div>
  );
}
