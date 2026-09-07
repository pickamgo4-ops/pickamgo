'use client'

import { useEffect, useState } from 'react'
import { ChevronRight, PackageOpen } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { BottomNav } from '../../components/layout/BottomNav'
import { api } from '../../lib/api'
import { mapApiCategoryToFrontend } from '../../lib/api-mappers'
import { Category } from '../../types'
import { useRouter } from 'next/navigation'

export default function CategoriesPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<any[]>('/categories').then(response => {
      if (response.success && Array.isArray(response.data)) setCategories(response.data.map(mapApiCategoryToFrontend))
    }).finally(() => setLoading(false))
  }, [])

  return <div className="min-h-screen bg-warm-50 pb-20 md:pb-0"><Header /><main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><div className="mb-8"><h1 className="font-display text-3xl font-bold text-warm-900">All Categories</h1><p className="mt-2 text-warm-800/60">Explore products and services across PickAmGo.</p></div>{loading ? <div className="py-20 text-center text-warm-800/60">Loading categories...</div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{categories.map(category => <section key={category.id} className="rounded-2xl border border-warm-200 bg-white p-5 shadow-sm"><button type="button" onClick={() => router.push(`/discover?category=${encodeURIComponent(category.name)}`)} className="flex w-full items-center gap-3 text-left"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl">{category.icon && category.icon.length <= 4 ? category.icon : <PackageOpen size={22} className="text-primary" />}</span><span className="min-w-0 flex-1"><strong className="block text-lg text-warm-900">{category.name}</strong><span className="text-xs text-warm-800/60">{category.count || 0} listings</span></span><ChevronRight size={18} className="text-warm-800/40" /></button>{category.children && category.children.length > 0 && <div className="mt-4 grid grid-cols-2 gap-2 border-t border-warm-100 pt-4">{category.children.map(child => <button key={child.id} type="button" onClick={() => router.push(`/discover?category=${encodeURIComponent(child.name)}`)} className="truncate rounded-lg bg-warm-50 px-3 py-2 text-left text-sm text-warm-800 hover:bg-primary/10 hover:text-primary">{child.name}</button>)}</div>}</section>)}</div>}</main><BottomNav /></div>
}