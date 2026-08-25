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
  title: 'Find It Near Me - Discover Products, Beauty & Services Around You',
  description: 'Find products, beauty services, food, fashion and local businesses near you in Ghana. Your local marketplace for campus life, beauty, and more.',
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
