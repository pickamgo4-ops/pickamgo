'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { api, clearGuestSessionId, getGuestSessionId } from '@/lib/api'

interface User {
  id: string
  name: string
  email: string
  avatar?: string
  location?: string
  role: 'buyer' | 'seller' | 'rider' | 'admin'
  isSeller: boolean
  isRider: boolean
  isAdmin: boolean
}

interface RoleContextType {
  user: User | null
  loading: boolean
  isValidating: boolean
  authInitialized: boolean
  setUser: (user: User | null) => void
  refreshUser: () => Promise<void>
  clearAuth: () => void
}

const RoleContext = createContext<RoleContextType>({
  user: null,
  loading: true,
  isValidating: false,
  authInitialized: false,
  setUser: () => {},
  refreshUser: async () => {},
  clearAuth: () => {},
})

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isValidating, setIsValidating] = useState(false)
  const [authInitialized, setAuthInitialized] = useState(false)
  const refreshUserRef = useRef<Promise<void> | null>(null)

  const cleanOldAuthKeys = useCallback(() => {
    if (typeof window === 'undefined') return
    const legacyKeys = [
      'pickamgo_auth',
      'pickamgo_user',
      'auth',
      'isAuthenticated',
      'isLoggedIn',
      'loggedIn',
      'session',
      'currentUser',
    ]
    legacyKeys.forEach(key => {
      try {
        localStorage.removeItem(key)
      } catch {
        // ignore
      }
    })
  }, [])

  const mergeGuestCart = useCallback(async () => {
    if (typeof window === 'undefined') return
    const guestSessionId = getGuestSessionId()

    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await api.post('/cart/merge', { sessionId: guestSessionId, items: [] })
      if (response.success) {
        clearGuestSessionId()
        window.dispatchEvent(new Event('cart-updated'))
      }
    } catch {
      // ignore merge errors
    }
  }, [])

  const clearAuth = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      cleanOldAuthKeys()
    }
    setUser(null)
    setAuthInitialized(true)
    setLoading(false)
    setIsValidating(false)
  }, [cleanOldAuthKeys])

  const refreshUser = useCallback(async () => {
    if (refreshUserRef.current) {
      return refreshUserRef.current
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) {
      clearAuth()
      return
    }

    setIsValidating(true)
    refreshUserRef.current = (async () => {
      try {
        const response = await api.get<any>('/auth/me')

        if (response.success && response.data) {
          const u = response.data
          const role = u.isAdmin ? 'admin' : u.isRider ? 'rider' : u.isSeller ? 'seller' : 'buyer'
          setUser({
            id: u.id,
            name: u.name,
            email: u.email,
            avatar: u.avatar,
            location: u.location,
            role,
            isSeller: u.isSeller || false,
            isRider: u.isRider || false,
            isAdmin: u.isAdmin || false,
          })
          await mergeGuestCart()
        } else if (response.error === 'Session expired. Please log in again.') {
          clearAuth()
        } else {
          console.warn('Auth server returned an unexpected session response. Keeping current session.')
        }
      } catch {
        console.warn('Unable to reach auth server while validating session. Keeping current session.')
      } finally {
        setIsValidating(false)
        setAuthInitialized(true)
        setLoading(false)
        refreshUserRef.current = null
      }
    })()

    return refreshUserRef.current
  }, [clearAuth, mergeGuestCart])

  useEffect(() => {
    cleanOldAuthKeys()
    refreshUser()
    let authTimeout: ReturnType<typeof setTimeout>
    const handleAuthChange = () => {
      if (authTimeout) clearTimeout(authTimeout)
      authTimeout = setTimeout(() => {
        refreshUser()
      }, 250)
    }
    window.addEventListener('auth-changed', handleAuthChange)
    return () => {
      window.removeEventListener('auth-changed', handleAuthChange)
      if (authTimeout) clearTimeout(authTimeout)
    }
  }, [cleanOldAuthKeys, refreshUser])

  return (
    <RoleContext.Provider value={{ user, loading, isValidating, authInitialized, setUser, refreshUser, clearAuth }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  const context = useContext(RoleContext)
  if (!context) throw new Error('useRole must be used within RoleProvider')
  return context
}
