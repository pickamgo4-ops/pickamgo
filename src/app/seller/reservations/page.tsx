'use client'

import { useEffect, useState } from 'react'
import { Clock3, Loader2 } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Card } from '@/components/ui/Card'
import { api } from '@/lib/api'

export default function SellerReservationsPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { api.getSellerReservations().then(response => { if (response.success) setItems(response.data || []); else setError(response.error || 'Unable to load reservations.') }).catch(() => setError('Something went wrong. Please try again.')).finally(() => setLoading(false)) }, [])
  return <SellerSidebar><div className="mx-auto max-w-4xl space-y-6"><div><h1 className="font-display text-3xl font-bold text-warm-900">Reservations</h1><p className="mt-1 text-warm-800/60">Inventory currently held for buyers.</p></div>{error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}{loading ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" size={32} /></div> : items.length === 0 ? <Card className="p-12 text-center"><Clock3 size={40} className="mx-auto mb-3 text-warm-800/30" /><p className="text-warm-800/60">No inventory is currently reserved.</p></Card> : <div className="grid gap-3 sm:grid-cols-2">{items.map(item => <Card key={`${item.productId}-${item.variantId || 'product'}`} className="p-5"><p className="font-semibold text-warm-900">{item.productName}</p>{item.variantName && <p className="mt-1 text-sm text-warm-800/60">Variant: {item.variantName}</p>}<div className="mt-4 grid grid-cols-3 gap-2 text-sm"><div><p className="text-xs text-warm-800/60">Physical</p><p className="font-bold">{item.physicalStock}</p></div><div><p className="text-xs text-warm-800/60">Reserved</p><p className="font-bold text-amber-700">{item.reservedQuantity}</p></div><div><p className="text-xs text-warm-800/60">Available</p><p className="font-bold text-primary">{item.availableQuantity}</p></div></div><p className="mt-3 text-xs text-warm-800/50">Latest expiry: {new Date(item.latestExpiry).toLocaleString()}</p></Card>)}</div>}</div></SellerSidebar>
}
