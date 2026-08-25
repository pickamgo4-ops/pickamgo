'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface User {
  id: string
  name: string
  email: string
  role: 'buyer' | 'seller' | 'rider' | 'admin'
  isSeller: boolean
  isRider: boolean
  isAdmin: boolean
}

interface RoleContextType {
  user: User | null
  loading: boolean
  setUser: (user: User | null) => void
  refreshUser: () => Promise<void>
}

const RoleContext = createContext<RoleContextType>({
  user: null,
  loading: true,
  setUser: () => {},
  refreshUser: async () => {},
})

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }

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
            role,
            isSeller: u.isSeller || false,
            isRider: u.isRider || false,
            isAdmin: u.isAdmin || false,
          })
        } else {
          setUser(null)
        }
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshUser()
    const handleAuthChange = () => refreshUser()
    window.addEventListener('auth-changed', handleAuthChange)
    return () => window.removeEventListener('auth-changed', handleAuthChange)
  }, [])

  return (
    <RoleContext.Provider value={{ user, loading, setUser, refreshUser }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  const context = useContext(RoleContext)
  if (!context) throw new Error('useRole must be used within RoleProvider')
  return context
}
