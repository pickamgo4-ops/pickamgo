'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { useRole } from '@/contexts/RoleContext'
import {
  Loader2,
  Menu,
} from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, authInitialized } = useRole()

  useEffect(() => {
    if (!authInitialized || loading) return
    if (!user?.isAdmin) {
      router.push('/')
    }
  }, [authInitialized, loading, user, router])

  if (loading || !authInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-warm-800/60">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  if (!user?.isAdmin) {
    return null
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-warm-200 md:hidden">
          <div className="flex items-center gap-3 px-4 h-14">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 rounded-xl hover:bg-warm-100 text-warm-800"
            >
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <span className="font-display font-bold text-sm text-primary">P</span>
              </div>
              <span className="font-display font-bold text-warm-900">Admin</span>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
