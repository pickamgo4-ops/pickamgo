'use client'

import { useEffect, useState } from 'react'
import { BellRing, Loader2 } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Card } from '@/components/ui/Card'
import { api } from '@/lib/api'

export default function SellerPriceInterestPage() {
  const [interest, setInterest] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { api.getSellerPriceAlerts().then(response => { if (response.success) setInterest(response.data || []); else setError(response.error || 'Unable to load price-drop interest.') }).catch(() => setError('Something went wrong. Please try again.')).finally(() => setLoading(false)) }, [])
  return <SellerSidebar><div className="mx-auto max-w-4xl space-y-6"><div><h1 className="font-display text-3xl font-bold text-warm-900">Price-Drop Interest</h1><p className="mt-1 text-warm-800/60">Aggregate demand from buyers watching your prices.</p></div>{error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}{loading ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" size={32} /></div> : interest.length === 0 ? <Card className="p-12 text-center"><BellRing size={40} className="mx-auto mb-3 text-warm-800/30" /><p className="text-warm-800/60">No buyers are currently watching your prices.</p></Card> : <div className="grid gap-3 sm:grid-cols-2">{interest.map(item => <Card key={`${item.productId}-${item.variantId || 'product'}`} className="p-5"><p className="font-semibold text-warm-900">{item.productName}</p>{item.variantName && <p className="mt-1 text-sm text-warm-800/60">Variant: {item.variantName}</p>}<p className="mt-4 text-2xl font-bold text-primary">{item.watching}</p><p className="text-sm text-warm-800/60">buyers watching</p></Card>)}</div>}</div></SellerSidebar>
}
