import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import { RoleProvider } from '@/contexts/RoleContext'
import { RoleRedirector } from '@/components/RoleRedirector'
import { ThemeProvider, ThemeScript } from '@/components/theme/ThemeProvider'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(`https://${process.env.NEXT_PUBLIC_MARKETPLACE_DOMAIN || 'pickamgo.com'}`),
  title: {
    default: 'PickAmGo — Your Online Marketplace',
    template: '%s | PickAmGo',
  },
  description: 'Shop, sell, and discover products and services from businesses and sellers around you.',
  applicationName: 'PickAmGo',
  manifest: '/manifest.json',
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: [{ url: '/apple-touch-icon.png', type: 'image/png', sizes: '180x180' }],
  },
  openGraph: {
    type: 'website',
    siteName: 'PickAmGo',
    title: 'PickAmGo — Your Online Marketplace',
    description: 'Shop, sell, and discover products and services from businesses and sellers around you.',
    url: '/',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'PickAmGo - Your Online Marketplace' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PickAmGo — Your Online Marketplace',
    description: 'Shop, sell, and discover products and services from businesses and sellers around you.',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans bg-background text-foreground antialiased`}>
        <ThemeScript />
        <ThemeProvider>
          <RoleProvider>
            <RoleRedirector />
            {children}
          </RoleProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
