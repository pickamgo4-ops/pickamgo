'use client'

import { useEffect, useState } from 'react'
import { Handshake, Shield } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { api } from '@/lib/api'

export default function AdminCollaborationsPage() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  useEffect(() => { api.getAdminCollaborations().then(response => { if (response.success) setData(response.data); else setError(response.error || 'Unable to load collaborations.') }) }, [])
  return <main className="min-h-screen bg-warm-50 px-4 py-8 sm:px-8"><div className="mx-auto max-w-6xl"><div className="mb-8 flex items-center gap-3"><Shield className="text-primary" /><div><h1 className="font-display text-3xl font-bold text-warm-900">Collaboration oversight</h1><p className="text-sm text-warm-800/60">Review participants, sales, and platform allocations.</p></div></div>{error && <Card className="border-red-200 bg-red-50 p-4 text-red-700">{error}</Card>}{data && <><div className="mb-6 grid gap-4 sm:grid-cols-3"><Card className="p-5"><p className="text-sm text-warm-800/60">Active collaborations</p><p className="mt-2 text-2xl font-bold">{data.summary.activeCount}</p></Card><Card className="p-5"><p className="text-sm text-warm-800/60">Collaboration orders</p><p className="mt-2 text-2xl font-bold">{data.summary.orderCount}</p></Card><Card className="p-5"><p className="text-sm text-warm-800/60">Platform commission</p><p className="mt-2 text-2xl font-bold">GH₵{Number(data.summary.platformCommission || 0).toFixed(2)}</p></Card></div><div className="space-y-3">{data.collaborations.map((item: any) => <Card key={item.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 font-semibold"><Handshake size={17} className="text-primary" />{item.name}</h2><p className="mt-1 text-sm text-warm-800/60">Owner: {item.ownerShop.name} · {item.status}</p></div><span className="text-sm text-warm-800/60">{item.products.length} products · {item.participants.length} shops</span></div><div className="mt-4 flex flex-wrap gap-2 text-sm">{item.participants.map((participant: any) => <span key={participant.id} className="rounded-full bg-warm-100 px-3 py-1">{participant.shop.name}</span>)}</div></Card>)}</div></>}</div></main>
}
