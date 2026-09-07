'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { applyPlatformTheme, defaultPlatformTheme, PlatformTheme } from '@/lib/platform-theme'

export type ThemeMode = 'light' | 'dark'

const THEME_KEY = 'pickamgo-theme'

type ThemeContextValue = {
  theme: ThemeMode
  setTheme: (value: ThemeMode) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function getSystemTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('light')
  const [platformTheme, setPlatformTheme] = useState<PlatformTheme>(defaultPlatformTheme)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY) as ThemeMode | null
    const nextTheme = saved || getSystemTheme()
    setThemeState(nextTheme)
    document.documentElement.classList.toggle('dark', nextTheme === 'dark')
    applyPlatformTheme(defaultPlatformTheme, nextTheme)
    setMounted(true)
    fetch('/api/admin/settings/public')
      .then(response => response.ok ? response.json() : null)
      .then(payload => {
        const nextPlatformTheme = payload?.data?.theme
        if (nextPlatformTheme?.light && nextPlatformTheme?.dark) {
          setPlatformTheme({ light: { ...defaultPlatformTheme.light, ...nextPlatformTheme.light }, dark: { ...defaultPlatformTheme.dark, ...nextPlatformTheme.dark } })
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!mounted) return
    localStorage.setItem(THEME_KEY, theme)
    document.documentElement.classList.toggle('dark', theme === 'dark')
    applyPlatformTheme(platformTheme, theme)
  }, [theme, platformTheme, mounted])

  const setTheme = (value: ThemeMode) => setThemeState(value)
  const toggleTheme = () => setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'))

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (() => {
            try {
              const saved = localStorage.getItem('pickamgo-theme');
              const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              const theme = saved || (prefersDark ? 'dark' : 'light');
              document.documentElement.classList.toggle('dark', theme === 'dark');
            } catch (e) {}
          })();
        `,
      }}
    />
  )
}
