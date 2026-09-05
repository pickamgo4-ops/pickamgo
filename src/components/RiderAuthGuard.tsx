'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRole } from '@/contexts/RoleContext'
import { Loader2, Package } from 'lucide-react'

export function RiderAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, loading, authInitialized } = useRole()

  useEffect(() => {
    if (loading || !authInitialized) return

    if (!user) {
      router.replace('/auth/login')
      return
    }

    if (user.role !== 'rider') {
      router.replace(user.role === 'admin' ? '/admin' : user.role === 'seller' ? '/seller' : '/')
      return
    }
  }, [user, loading, authInitialized, router])

  if (loading || !authInitialized || !user || user.role !== 'rider') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-warm-800/60">Loading rider session...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export function RiderLoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <Loader2 size={40} className="animate-spin text-primary mx-auto mb-4" />
        <p className="text-warm-800/60">{message}</p>
      </div>
    </div>
  )
}

export function RiderEmptyState({
  title = 'No items yet',
  description = 'Items will appear here when available',
  icon: Icon = Package,
  actionLabel,
  onAction,
}: {
  title?: string
  description?: string
  icon?: any
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 bg-warm-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon size={32} className="text-warm-800/40" />
      </div>
      <h3 className="font-display text-lg font-semibold text-warm-900 mb-2">{title}</h3>
      <p className="text-sm text-warm-800/60 mb-4">{description}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="text-primary hover:text-primary-dark font-semibold text-sm">
          {actionLabel}
        </button>
      )}
    </div>
  )
}
