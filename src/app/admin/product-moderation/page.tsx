'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle, ChevronLeft, ChevronRight, ClipboardList, Loader2, XCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useRole } from '@/contexts/RoleContext'
import { useRouter } from 'next/navigation'

export default function ProductModerationPage() {
  const router = useRouter()
  const { user, loading, authInitialized } = useRole()
  const [products, setProducts] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [error, setError] = useState('')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoadingProducts(true)
    setError('')
    try {
      const response = await api.getPendingModerationProducts({ page, limit: 20 })
      if (response.success && response.data) {
        setProducts(response.data.products || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
      } else {
        setError(response.error || 'Failed to load pending products')
      }
    } catch {
      setError('Failed to load pending products. Please try again.')
    } finally {
      setLoadingProducts(false)
    }
  }, [page])

  useEffect(() => {
    if (!authInitialized) return
    if (!user?.isAdmin) {
      router.push('/')
      return
    }
    load()
  }, [authInitialized, user, router, load])

  const moderate = async (id: string, moderationStatus: 'APPROVED' | 'REJECTED') => {
    setSavingId(id)
    try {
      const response = await api.moderateProduct(id, { moderationStatus, moderationNotes: notes[id]?.trim() || undefined })
      if (response.success) {
        setProducts(current => current.filter(product => product.id !== id))
      } else {
        setError(response.error || 'Failed to update product moderation')
      }
    } catch {
      setError('Failed to update product moderation. Please try again.')
    } finally {
      setSavingId(null)
    }
  }

  if (loading || !authInitialized) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={36} /></div>

  return <div className="space-y-6">
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><ClipboardList size={22} /></div>
      <div><h1 className="font-display text-2xl font-bold text-warm-900">Product Moderation</h1><p className="text-sm text-warm-800/60">Review products before they appear in the marketplace.</p></div>
    </div>

    {error && <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</Card>}
    {loadingProducts ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={36} /></div> : products.length === 0 ? <Card className="p-12 text-center"><CheckCircle className="mx-auto mb-3 text-emerald-500" size={42} /><p className="font-medium text-warm-900">No products awaiting review</p><p className="mt-1 text-sm text-warm-800/60">The moderation queue is clear.</p></Card> : <div className="space-y-4">{products.map(product => <Card key={product.id} className="p-4 sm:p-5"><div className="flex flex-col gap-4 lg:flex-row"><div className="flex min-w-0 flex-1 gap-4"><img src={product.images?.[0]?.url || '/placeholder.png'} alt={product.name} className="h-24 w-24 shrink-0 rounded-xl bg-warm-100 object-cover" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-warm-900">{product.name}</h2><Badge variant="deal">Pending</Badge></div><p className="mt-1 text-sm text-warm-800/60">{product.shop?.name || 'Unknown shop'} · {product.seller?.name || product.seller?.email || 'Unknown seller'}</p><p className="mt-2 text-sm text-warm-800/80 line-clamp-3">{product.description}</p><p className="mt-2 text-sm font-semibold text-warm-900">GH₵{Number(product.price).toFixed(2)} · {product.category?.name || 'Uncategorized'} · Stock {product.stock}</p></div></div><div className="w-full lg:max-w-sm"><textarea value={notes[product.id] || ''} onChange={event => setNotes(current => ({ ...current, [product.id]: event.target.value }))} placeholder="Optional review note" rows={3} className="w-full rounded-xl border border-warm-200 bg-transparent p-3 text-sm text-warm-900" /><div className="mt-2 flex flex-wrap justify-end gap-2"><Button size="sm" variant="outline" disabled={savingId === product.id} onClick={() => moderate(product.id, 'REJECTED')} icon={<XCircle size={16} />}>Reject</Button><Button size="sm" disabled={savingId === product.id} onClick={() => moderate(product.id, 'APPROVED')} icon={<CheckCircle size={16} />}>Approve</Button></div></div></div></Card>)}</div>}

    {totalPages > 1 && <div className="flex items-center justify-center gap-3"><Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(current => current - 1)} icon={<ChevronLeft size={16} />}>Previous</Button><span className="text-sm text-warm-800/60">Page {page} of {totalPages}</span><Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(current => current + 1)} icon={<ChevronRight size={16} />}>Next</Button></div>}
  </div>
}
