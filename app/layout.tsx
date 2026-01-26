import type { Metadata } from 'next'
import './globals.css'
import ToastProvider from '@/components/ui/Toast/ToastProvider'
import TopNavigation from '@/components/ui/TopNavigation'
import AuthProvider from '@/components/ui/AuthProvider'

export const metadata: Metadata = {
  title: 'Smart Cost Calculator',
  description: 'VPS-hosted Smart Cost Calculator for smart technology solutions',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <ToastProvider>
            <TopNavigation />
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
