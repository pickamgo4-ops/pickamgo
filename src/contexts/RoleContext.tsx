'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

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

  const cleanOldAuthKeys = useCallback(() => {
    if (typeof window === 'undefined') return
    const legacyKeys = [
      'pickamgo_auth',
      'pickamgo_user',
      'auth',
      'user',
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

  const refreshUser = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) {
      clearAuth()
      return
    }

    setIsValidating(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          const u = data.data
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
        } else {
          clearAuth()
        }
      } else {
        clearAuth()
      }
    } catch {
      clearAuth()
    } finally {
      setIsValidating(false)
      setAuthInitialized(true)
      setLoading(false)
    }
  }

  useEffect(() => {
    cleanOldAuthKeys()
    refreshUser()
    const handleAuthChange = () => refreshUser()
    window.addEventListener('auth-changed', handleAuthChange)
    return () => window.removeEventListener('auth-changed', handleAuthChange)
  }, [cleanOldAuthKeys])

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
