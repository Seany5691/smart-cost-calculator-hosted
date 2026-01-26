'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-simple';
import { 
  LayoutDashboard, 
  Calculator, 
  Users, 
  Settings, 
  Search, 
  LogOut, 
  User,
  ChevronDown,
  Menu,
  X,
  FileText
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: ('admin' | 'manager' | 'user' | 'telesales')[];
}

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    path: '/',
    icon: LayoutDashboard,
    // All roles can access dashboard
  },
  {
    name: 'Calculator',
    path: '/calculator',
    icon: Calculator,
    roles: ['admin', 'manager', 'user'], // Admin, Manager, User only
  },
  {
    name: 'Leads',
    path: '/leads',
    icon: Users,
    // All roles can access leads
  },
  {
    name: 'Deals',
    path: '/deals',
    icon: FileText,
    roles: ['admin', 'manager', 'user'], // Admin, Manager, User only (not Telesales)
  },
  {
    name: 'Scraper',
    path: '/scraper',
    icon: Search,
    roles: ['admin', 'manager', 'telesales'], // Admin, Manager, Telesales only
  },
  {
    name: 'Admin',
    path: '/admin',
    icon: Settings,
    roles: ['admin'], // Admin only
  },
];

export default function TopNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't show navigation on login page
  if (!mounted || pathname === '/login' || !isAuthenticated) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const filteredNavItems = navItems.filter(item => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
  });

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <>
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-white/10">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <div className="flex items-center space-x-8">
              <button
                onClick={() => router.push('/')}
                className="flex items-center space-x-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg group-hover:shadow-purple-500/50 transition-all duration-300">
                  <Calculator className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold gradient-text hidden sm:block">
                  Smart Cost Calculator
                </span>
              </button>

              {/* Desktop Navigation Links */}
              <div className="hidden lg:flex items-center space-x-1">
                {filteredNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  
                  return (
                    <button
                      key={item.path}
                      onClick={() => router.push(item.path)}
                      className={`
                        flex items-center space-x-2 px-4 py-2 rounded-lg
                        transition-all duration-200 font-medium text-sm
                        ${active
                          ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border border-purple-500/30 shadow-lg shadow-purple-500/20'
                          : 'text-gray-300 hover:text-white hover:bg-white/10'
                        }
                      `}
                    >
                      <Icon className={`w-4 h-4 ${active ? 'text-purple-400' : ''}`} />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Side - User Menu */}
            <div className="flex items-center space-x-4">
              {/* User Info & Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-3 px-4 py-2 rounded-lg hover:bg-white/10 transition-all duration-200 group"
                >
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-sm font-semibold text-white">
                      {user?.name || user?.username}
                    </span>
                    <span className="text-xs text-gray-400 capitalize">
                      {user?.role}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg group-hover:shadow-purple-500/50 transition-all duration-300">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 hidden sm:block ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* User Dropdown Menu */}
                {showUserMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 glass-card rounded-xl shadow-2xl border border-white/20 overflow-hidden z-50 animate-slide-up">
                      <div className="p-4 border-b border-white/10">
                        <p className="text-sm font-semibold text-white">
                          {user?.name || user?.username}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {user?.email}
                        </p>
                        <div className="mt-2 inline-flex items-center px-2 py-1 rounded-md bg-purple-500/20 border border-purple-500/30">
                          <span className="text-xs font-medium text-purple-300 capitalize">
                            {user?.role}
                          </span>
                        </div>
                      </div>
                      
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-red-500/10 transition-colors duration-200 group"
                      >
                        <LogOut className="w-4 h-4 text-red-400 group-hover:text-red-300" />
                        <span className="text-sm font-medium text-red-400 group-hover:text-red-300">
                          Logout
                        </span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors duration-200"
              >
                {showMobileMenu ? (
                  <X className="w-6 h-6 text-white" />
                ) : (
                  <Menu className="w-6 h-6 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {showMobileMenu && (
          <div className="lg:hidden border-t border-white/10 glass-dark animate-slide-up">
            <div className="px-4 py-4 space-y-2">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      router.push(item.path);
                      setShowMobileMenu(false);
                    }}
                    className={`
                      w-full flex items-center space-x-3 px-4 py-3 rounded-lg
                      transition-all duration-200 font-medium text-sm
                      ${active
                        ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border border-purple-500/30'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                      }
                    `}
                  >
                    <Icon className={`w-5 h-5 ${active ? 'text-purple-400' : ''}`} />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Spacer to prevent content from going under fixed nav */}
      <div className="h-16" />
    </>
  );
}
