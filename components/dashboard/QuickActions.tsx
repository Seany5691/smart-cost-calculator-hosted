'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-simple';
import { 
  Calculator, 
  Briefcase, 
  Search, 
  BarChart3, 
  Clock, 
  Settings, 
  Users,
  FileText
} from 'lucide-react';

interface QuickAction {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  gradient: string;
  roles: ('admin' | 'manager' | 'user' | 'telesales')[];
}

const quickActions: QuickAction[] = [
  {
    title: 'Calculator',
    description: 'Create cost calculations for smart technology solutions',
    icon: Calculator,
    href: '/calculator',
    gradient: 'from-purple-500 to-pink-500',
    roles: ['admin', 'manager', 'user'],
  },
  {
    title: 'All Deals',
    description: 'View and manage saved calculator deals',
    icon: FileText,
    href: '/deals',
    gradient: 'from-orange-500 to-amber-500',
    roles: ['admin', 'manager', 'user'],
  },
  {
    title: 'Scraper',
    description: 'Scrape business data from Google Maps',
    icon: Search,
    href: '/scraper',
    gradient: 'from-teal-500 to-cyan-500',
    roles: ['admin', 'manager', 'telesales'],
  },
  {
    title: 'Leads',
    description: 'Manage sales leads and track your pipeline',
    icon: BarChart3,
    href: '/leads',
    gradient: 'from-emerald-500 to-green-500',
    roles: ['admin', 'manager', 'user', 'telesales'],
  },
  {
    title: 'Reminders',
    description: 'View and manage your reminders and callbacks',
    icon: Clock,
    href: '/reminders',
    gradient: 'from-sky-500 to-blue-500',
    roles: ['admin', 'manager', 'user'],
  },
  {
    title: 'Admin Panel',
    description: 'Manage pricing, configurations, and system settings',
    icon: Settings,
    href: '/admin',
    gradient: 'from-orange-500 to-red-500',
    roles: ['admin'],
  },
];

export default function QuickActions() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Filter actions based on user role
  const visibleActions = quickActions.filter((action) =>
    action.roles.includes(user?.role as 'admin' | 'manager' | 'user' | 'telesales')
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
      {visibleActions.map((action) => {
        const IconComponent = action.icon;
        return (
          <button
            key={action.title}
            onClick={() => router.push(action.href)}
            className="glass-card-hover rounded-2xl p-4 lg:p-6 text-left group relative overflow-hidden aspect-square lg:aspect-auto flex flex-col items-center lg:items-start justify-center min-h-[88px]"
          >
            {/* Subtle gradient background on hover */}
            <div className={`absolute inset-0 bg-gradient-to-r ${action.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
            
            {/* Content */}
            <div className="relative z-10 flex flex-col items-center lg:items-start w-full">
              {/* Icon and Title - stacked on mobile, side by side on desktop */}
              <div className="flex flex-col lg:flex-row items-center lg:items-center gap-2 lg:gap-3 mb-2 lg:mb-4 w-full">
                {/* Dark glassmorphism icon container */}
                <div className="flex-shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 group-hover:bg-gray-700/50 group-hover:border-gray-600/50 transition-all duration-300">
                  <IconComponent className="w-6 h-6 text-gray-300 group-hover:text-white transition-colors" />
                </div>
                
                {/* Title with enhanced styling */}
                <h3 className="text-lg lg:text-2xl font-bold text-white text-center lg:text-left group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:from-white group-hover:to-gray-300 transition-all">
                  {action.title}
                </h3>
              </div>
              
              {/* Description - hidden on mobile, visible on desktop */}
              <p className="hidden lg:block text-sm text-gray-300 mb-4 leading-relaxed">
                {action.description}
              </p>
              
              {/* Arrow indicator with blue/indigo theme - hidden on mobile */}
              <div className="hidden lg:flex items-center text-sm text-blue-400 group-hover:text-blue-300 transition-colors">
                <span className="font-medium">Open</span>
                <svg
                  className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
