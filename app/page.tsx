'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-simple';
import QuickActions from '@/components/dashboard/QuickActions';
import NumberLookup from '@/components/dashboard/NumberLookup';
import BusinessLookup from '@/components/dashboard/BusinessLookup';
import DashboardStats from '@/components/dashboard/DashboardStats';
import ActivityTimeline from '@/components/dashboard/ActivityTimeline';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [isMobile, setIsMobile] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Hydrate auth store from localStorage
    useAuthStore.getState().hydrate();
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (user && !['admin', 'manager', 'user', 'telesales'].includes(user.role)) {
        // Fallback - should never happen but just in case
        router.push('/login');
      }
    }
  }, [isHydrated, isAuthenticated, user, router]);

  // Detect mobile device for optimized queries
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isHydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-blue-400 animate-spin mb-4" />
          <div className="text-white text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background with unique blue/indigo theme */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        {/* Animated gradient blobs */}
        <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-sky-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen py-6 px-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Welcome Section with Blue/Indigo Gradient Text */}
          <div className="glass-card rounded-2xl p-6 md:p-8">
            <h1 className="text-3xl md:text-5xl font-bold mb-2 md:mb-4">
              <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-sky-400 bg-clip-text text-transparent">
                Welcome back, {user?.name || user?.username}!
              </span>
            </h1>
            <p className="text-base md:text-lg text-gray-200">
              Smart Cost Calculator Dashboard
            </p>
            <p className="mt-1 md:mt-2 text-xs md:text-sm text-gray-300">
              Role: <span className="font-semibold capitalize">{user?.role}</span>
            </p>
          </div>

          {/* Lookup Tools - Moved above Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <NumberLookup />
            <BusinessLookup />
          </div>

          {/* Quick Action Cards */}
          <div>
            <QuickActions />
          </div>

          {/* Stats Section */}
          <div>
            <DashboardStats />
          </div>

          {/* Activity Timeline */}
          <div>
            <ActivityTimeline />
          </div>
        </div>
      </div>

      {/* Animation styles */}
      <style jsx global>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        /* Blue/Indigo gradient animation for login/dashboard */
        @keyframes gradient-blue {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        
        .bg-gradient-to-r.from-blue-400 {
          background-size: 200% 200%;
          animation: gradient-blue 3s ease infinite;
        }
      `}</style>
    </div>
  );
}
