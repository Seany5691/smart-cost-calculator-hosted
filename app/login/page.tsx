'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-simple';
import { Loader2, Eye } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading, error, clearError } =
    useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    username?: string;
    password?: string;
  }>({});

  // Redirect if already authenticated - but only after hydration
  useEffect(() => {
    if (isAuthenticated && !isSubmitting) {
      router.push('/');
    }
  }, [isAuthenticated, isSubmitting, router]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const validateForm = (): boolean => {
    const errors: { username?: string; password?: string } = {};

    if (!username.trim()) {
      errors.username = 'Username is required';
    }

    if (!password) {
      errors.password = 'Password is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await login(username, password);
      // Success - redirect will happen via useEffect when isAuthenticated changes
      // Wait a moment to ensure state is updated
      setTimeout(() => {
        setIsSubmitting(false);
      }, 100);
    } catch (error) {
      // Error is already set in the store
      console.error('Login failed:', error);
      setIsSubmitting(false);
      // Explicitly prevent any navigation on error
      return;
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background with unique blue/indigo theme */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        {/* Animated gradient blobs */}
        <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-sky-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Glassmorphism Card matching leads/calculator style */}
          <div className="glass-card p-8 rounded-2xl">
            {/* Header with blue/indigo gradient text */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-2">
                <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-sky-400 bg-clip-text text-transparent">
                  Smart Cost Calculator
                </span>
              </h1>
              <p className="text-gray-300 text-lg">Sign in to your account</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg backdrop-blur-sm">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username Field */}
              <div>
                <label
                  htmlFor="username"
                  className="label"
                >
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setValidationErrors((prev) => ({ ...prev, username: undefined }));
                  }}
                  className={`input ${
                    validationErrors.username
                      ? 'border-red-500 focus:ring-red-500'
                      : ''
                  }`}
                  placeholder="Enter your username"
                  disabled={isLoading}
                />
                {validationErrors.username && (
                  <p className="mt-2 text-sm text-red-400">
                    {validationErrors.username}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor="password"
                  className="label"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setValidationErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    className={`input pr-12 ${
                      validationErrors.password
                        ? 'border-red-500 focus:ring-red-500'
                        : ''
                    }`}
                    placeholder="Enter your password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onMouseDown={() => setShowPassword(true)}
                    onMouseUp={() => setShowPassword(false)}
                    onMouseLeave={() => setShowPassword(false)}
                    onTouchStart={() => setShowPassword(true)}
                    onTouchEnd={() => setShowPassword(false)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                    title="Hold to show password"
                    disabled={isLoading}
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </div>
                {validationErrors.password && (
                  <p className="mt-2 text-sm text-red-400">
                    {validationErrors.password}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || isSubmitting}
                className="btn btn-primary w-full py-3 text-base font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all"
              >
                {isLoading || isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 text-center text-sm text-gray-400">
              <p>VPS-Hosted Smart Cost Calculator v1.0</p>
            </div>
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
