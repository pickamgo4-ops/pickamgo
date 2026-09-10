'use client'

import { useEffect, useState } from 'react'
import { Bell, Loader2, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { api } from '@/lib/api'

export default function StockAlertsPage() {
  const router = useRouter()
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [removing, setRemoving] = useState<string | null>(null)

  useEffect(() => {
    api.getStockAlerts().then(response => {
      if (response.success) setAlerts(response.data || [])
      else if (response.code === 'UNAUTHORIZED') router.push('/auth/login')
      else setError(response.error || 'Unable to load restock alerts.')
    }).catch(() => setError('Something went wrong. Please try again.')).finally(() => setLoading(false))
  }, [router])

  const remove = async (id: string) => {
    setRemoving(id)
    const response = await api.removeStockAlert(id)
    if (response.success) setAlerts(current => current.map(alert => alert.id === id ? { ...alert, active: false, cancelledAt: new Date().toISOString() } : alert))
    else setError(response.error || 'Unable to remove alert.')
    setRemoving(null)
  }

  return <div className="min-h-screen bg-warm-50 pb-20 md:pb-0"><Header /><main className="mx-auto max-w-4xl px-4 py-8 sm:px-6"><div className="mb-8 flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10"><Bell className="text-primary" size={24} /></div><div><h1 className="font-display text-2xl font-bold text-warm-900">Restock Alerts</h1><p className="text-sm text-warm-800/60">Products you want to hear about when they are available again.</p></div></div>{error && <p className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}{loading ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" size={32} /></div> : alerts.length === 0 ? <Card className="p-12 text-center"><Bell size={40} className="mx-auto mb-3 text-warm-800/30" /><p className="text-warm-800/60">You have no restock alerts.</p><Button className="mt-5" onClick={() => router.push('/discover')}>Browse Products</Button></Card> : <div className="space-y-3">{alerts.map(alert => <Card key={alert.id} className="flex flex-wrap items-center gap-4 p-4"><div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-warm-100"><img src={alert.product?.images?.[0]?.url || ''} alt="" className="h-full w-full object-cover" /></div><div className="min-w-0 flex-1"><p className="font-semibold text-warm-900">{alert.product?.name || 'Product unavailable'}</p>{alert.variant && <p className="text-sm text-warm-800/60">Variant: {alert.variant.name}</p>}<p className="mt-1 text-xs text-warm-800/50">Subscribed {new Date(alert.createdAt).toLocaleDateString()}</p><p className={`mt-1 text-xs font-medium ${alert.active ? 'text-amber-700' : 'text-green-700'}`}>{alert.active ? (alert.product?.stock > 0 || alert.variant?.stock > 0 ? 'Available now' : 'Waiting for restock') : alert.notifiedAt ? 'Notification sent' : 'Alert removed'}</p></div><div className="flex items-center gap-2"><Button size="sm" variant="outline" onClick={() => alert.product?.id && router.push(`/product/${alert.product.id}`)}>View</Button>{alert.active && <button type="button" title="Remove alert" aria-label="Remove alert" disabled={removing === alert.id} onClick={() => void remove(alert.id)} className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 size={17} /></button>}</div></Card>)}</div>}</main><BottomNav /></div>
}
