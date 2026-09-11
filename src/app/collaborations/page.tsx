'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, Handshake, Store } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'

export default function CollaborationsPage() {
  const router = useRouter()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { api.getPublicCollaborations().then(response => { if (response.success) setItems(response.data || []) }).finally(() => setLoading(false)) }, [])
  return <div className="min-h-screen bg-warm-50 pb-20 md:pb-0"><Header /><main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><div className="mb-8"><div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-primary"><Handshake size={16} /> Shop collaborations</div><h1 className="font-display text-3xl font-bold text-warm-900">Shared offers from PickAmGo shops</h1><p className="mt-2 text-sm text-warm-800/60">Bundles, collections, and campaigns with every product still owned by its shop.</p></div>{loading ? <p className="py-16 text-center text-warm-800/60">Loading collaborations...</p> : items.length === 0 ? <Card className="p-12 text-center"><p className="text-warm-800/60">No active shop collaborations right now.</p></Card> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map(item => <Card key={item.id} className="overflow-hidden p-0"><div className="h-40 bg-warm-100">{item.coverImage && <img src={item.coverImage} alt="" className="h-full w-full object-cover" />}</div><div className="p-5"><h2 className="font-display text-xl font-bold">{item.name}</h2><p className="mt-2 line-clamp-2 text-sm text-warm-800/65">{item.description || 'A shared shopping experience from PickAmGo shops.'}</p><div className="mt-4 flex items-center gap-2 text-sm text-warm-800/65"><Store size={16} /> {item.participants?.length || 0} participating shops · {item.products?.length || 0} products</div><div className="mt-5 flex items-center justify-between"><span className="font-semibold text-primary">{item.bundlePrice ? `From GH₵${Number(item.bundlePrice).toFixed(2)}` : 'Shop collection'}</span><Button size="sm" onClick={() => router.push(`/collaborations/${item.id}`)}>Explore <ArrowRight size={15} /></Button></div></div></Card>)}</div>}</main><BottomNav /></div>
}
