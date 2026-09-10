'use client'

import { useEffect, useState } from 'react'
import { Loader2, Tag } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/api'

export default function SellerOffersPage() {
  const [offers, setOffers] = useState<any[]>([])
  const [counter, setCounter] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    const response = await api.getSellerOffers()
    if (response.success) setOffers(response.data || [])
    else setError(response.error || 'Unable to load offers.')
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  const respond = async (id: string, action: 'ACCEPTED' | 'REJECTED' | 'COUNTERED') => {
    const response = await api.respondToOffer(id, { action, amount: Number(counter[id]), sellerMessage: message[id] })
    if (response.success) { setCounter(current => ({ ...current, [id]: '' })); await load() }
    else setError(response.error || 'Unable to update offer.')
  }

  const visible = filter === 'ALL' ? offers : offers.filter(offer => offer.status === filter)
  return <SellerSidebar><div className="mx-auto max-w-4xl space-y-6"><div><h1 className="font-display text-3xl font-bold text-warm-900">Offers</h1><p className="mt-1 text-warm-800/60">Review and respond to buyer offers.</p></div>{error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}<div className="flex flex-wrap gap-2">{['ALL', 'PENDING', 'ACCEPTED', 'REJECTED', 'COUNTERED', 'EXPIRED'].map(status => <Button key={status} size="sm" variant={filter === status ? 'primary' : 'outline'} onClick={() => setFilter(status)}>{status === 'ALL' ? 'All' : status[0] + status.slice(1).toLowerCase()}</Button>)}</div>{loading ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" size={32} /></div> : visible.length === 0 ? <Card className="p-12 text-center"><Tag size={40} className="mx-auto mb-3 text-warm-800/30" /><p className="text-warm-800/60">No offers in this category.</p></Card> : <div className="space-y-4">{visible.map(offer => <Card key={offer.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-warm-900">{offer.product?.name}</p><p className="text-sm text-warm-800/60">From {offer.buyer?.name} · {new Date(offer.createdAt).toLocaleString()}</p></div><span className="rounded-full bg-warm-100 px-3 py-1 text-xs font-semibold text-warm-800">{offer.status}</span></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3"><div><p className="text-warm-800/60">Original price</p><p className="font-bold">GH₵{Number(offer.referencePrice).toFixed(2)}</p></div><div><p className="text-warm-800/60">Offer</p><p className="font-bold text-primary">GH₵{Number(offer.offerAmount).toFixed(2)}</p></div><div><p className="text-warm-800/60">Expires</p><p className="font-medium">{new Date(offer.expiresAt).toLocaleDateString()}</p></div></div>{offer.status === 'PENDING' && offer.proposalBy === 'BUYER' && <div className="mt-4 flex flex-wrap gap-2"><Button size="sm" onClick={() => respond(offer.id, 'ACCEPTED')}>Accept</Button><Button size="sm" variant="outline" onClick={() => respond(offer.id, 'REJECTED')}>Reject</Button>{offer.product?.allowCounteroffers !== false && <><Input className="w-32" type="number" min="0.01" step="0.01" placeholder="Counter amount" value={counter[offer.id] || ''} onChange={event => setCounter(current => ({ ...current, [offer.id]: event.target.value }))} /><Button size="sm" variant="outline" onClick={() => respond(offer.id, 'COUNTERED')} disabled={!counter[offer.id]}>Counter</Button></>}</div>}</Card>)}</div>}</div></SellerSidebar>
}
