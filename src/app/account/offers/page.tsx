'use client'

import { useEffect, useState } from 'react'
import { Loader2, Tag } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/api'

export default function BuyerOffersPage() {
  const router = useRouter()
  const [offers, setOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { api.getBuyerOffers().then(response => { if (response.success) setOffers(response.data || []); else setError(response.error || 'Unable to load offers.') }).catch(() => setError('Something went wrong. Please try again.')).finally(() => setLoading(false)) }, [])
  const respond = async (offer: any, action: 'ACCEPTED' | 'REJECTED' | 'COUNTERED', amount?: number) => { const response = await api.respondToCounterOffer(offer.id, { action, amount }); if (response.success) { const refreshed = await api.getBuyerOffers(); if (refreshed.success) setOffers(refreshed.data || []) } else setError(response.error || 'Unable to respond to offer.') }
  return <main className="min-h-screen bg-warm-50 px-4 py-8 sm:px-6"><div className="mx-auto max-w-3xl space-y-6"><div><h1 className="font-display text-3xl font-bold text-warm-900">My Offers</h1><p className="mt-1 text-warm-800/60">Track your product negotiations.</p></div>{error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}{loading ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" size={32} /></div> : offers.length === 0 ? <Card className="p-12 text-center"><Tag size={40} className="mx-auto mb-3 text-warm-800/30" /><p className="text-warm-800/60">You have not made any offers yet.</p></Card> : <div className="space-y-4">{offers.map(offer => <Card key={offer.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-warm-900">{offer.product?.name}</h2><p className="text-sm text-warm-800/60">{new Date(offer.createdAt).toLocaleString()}</p></div><span className="rounded-full bg-warm-100 px-3 py-1 text-xs font-semibold">{offer.status}</span></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-warm-800/60">Current price</p><p className="font-bold">GH₵{Number(offer.referencePrice).toFixed(2)}</p></div><div><p className="text-warm-800/60">Your proposal</p><p className="font-bold text-primary">GH₵{Number(offer.offerAmount).toFixed(2)}</p></div></div>{offer.status === 'ACCEPTED' && <Button className="mt-4" onClick={async () => { const response = await api.addAcceptedOfferToCart(offer.id); if (response.success) { await api.addToCart({ productId: response.data.productId, quantity: 1, offerId: response.data.offerId }); router.push('/checkout') } else setError(response.error || 'This offer is no longer available.') }}>Continue to Checkout</Button>}{offer.status === 'PENDING' && offer.proposalBy === 'SELLER' && <div className="mt-4 flex flex-wrap gap-2"><Button size="sm" onClick={() => respond(offer, 'ACCEPTED')}>Accept counteroffer</Button><Button size="sm" variant="outline" onClick={() => respond(offer, 'REJECTED')}>Reject</Button><Input className="w-32" type="number" min="0.01" step="0.01" placeholder="New amount" id={`counter-${offer.id}`} /><Button size="sm" variant="outline" onClick={() => { const value = Number((document.getElementById(`counter-${offer.id}`) as HTMLInputElement)?.value); if (value > 0) void respond(offer, 'COUNTERED', value) }}>Counter</Button></div>}</Card>)}</div>}</div></main>
}
