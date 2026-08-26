'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useRole } from '@/contexts/RoleContext'
import { useEffect } from 'react'

const customerPaths = ['/', '/discover', '/cart', '/favorites', '/orders', '/notifications', '/profile', '/product', '/service', '/shop', '/checkout', '/addresses', '/track', '/messages', '/report']

export function RoleRedirector() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, authInitialized, isValidating } = useRole()

  useEffect(() => {
    if (loading || !authInitialized) return

    const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('token')
    const isCustomerPath = customerPaths.some(p => p === '/' ? pathname === '/' : pathname.startsWith(p + '/') || pathname === p)
    const isAuthPath = pathname.startsWith('/auth/')

    if (!user) {
      if (!isAuthPath && !isCustomerPath && !hasToken) {
        router.push('/auth/login')
      }
      return
    }

    const role = user.role

    if (role === 'seller') {
      if (isAuthPath) return
      if (pathname.startsWith('/seller')) return
      if (isCustomerPath) return
      router.push('/')
    } else if (role === 'rider') {
      if (isAuthPath) return
      if (pathname.startsWith('/rider')) return
      if (isCustomerPath) return
      router.push('/')
    } else if (role === 'admin') {
      if (isAuthPath) return
      if (!pathname.startsWith('/admin')) {
        router.push('/admin')
      }
    } else {
      if (pathname.startsWith('/seller') || pathname.startsWith('/rider') || pathname.startsWith('/admin')) {
        router.push('/')
      }
    }
  }, [user, loading, authInitialized, pathname, router])

  return null
}
