import type { Metadata } from 'next'
import './globals.css'
import ToastProvider from '@/components/ui/Toast/ToastProvider'
import TopNavigation from '@/components/ui/TopNavigation'
import AuthProvider from '@/components/ui/AuthProvider'
import PWAInstaller from '@/components/ui/PWAInstaller'

export const metadata: Metadata = {
  title: 'Smart Cost Calculator',
  description: 'VPS-hosted Smart Cost Calculator for smart technology solutions',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Cost Calc',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#10b981',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon-192.svg" />
        <link rel="apple-touch-icon" href="/icon-192.svg" />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <ToastProvider>
            <PWAInstaller />
            <TopNavigation />
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
