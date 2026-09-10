'use client'

import { useEffect, useState } from 'react'
import { Clock3, Loader2, ShoppingCart, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { api } from '@/lib/api'

function remaining(expiresAt: string) { return Math.max(0, new Date(expiresAt).getTime() - Date.now()) }
function formatRemaining(value: number) { const totalSeconds = Math.floor(value / 1000); return `${Math.floor(totalSeconds / 60).toString().padStart(2, '0')}:${(totalSeconds % 60).toString().padStart(2, '0')}` }

export default function ReservationsPage() {
  const router = useRouter()
  const [reservations, setReservations] = useState<any[]>([])
  const [now, setNow] = useState(Date.now())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { api.getReservations().then(response => { if (response.success) setReservations(response.data || []); else setError(response.error || 'Unable to load reservations.') }).catch(() => setError('Something went wrong. Please try again.')).finally(() => setLoading(false)); const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer) }, [])
  const cancel = async (id: string) => { const response = await api.cancelReservation(id); if (response.success) setReservations(current => current.map(item => item.id === id ? { ...item, status: 'CANCELLED' } : item)); else setError(response.error || 'Unable to cancel reservation.') }
  const addToCart = async (id: string) => { const response = await api.addReservationToCart(id); if (response.success) router.push('/cart'); else setError(response.error || 'Reservation is no longer available.') }
  return <div className="min-h-screen bg-warm-50 pb-20 md:pb-0"><Header /><main className="mx-auto max-w-4xl px-4 py-8 sm:px-6"><div className="mb-8"><h1 className="font-display text-3xl font-bold text-warm-900">My Reservations</h1><p className="mt-1 text-warm-800/60">Items held for you before checkout.</p></div>{error && <p className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}{loading ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" size={32} /></div> : reservations.length === 0 ? <Card className="p-12 text-center"><Clock3 size={40} className="mx-auto mb-3 text-warm-800/30" /><p className="text-warm-800/60">You have no reservations.</p><Button className="mt-5" onClick={() => router.push('/discover')}>Browse Products</Button></Card> : <div className="space-y-3">{reservations.map(item => { const active = item.status === 'ACTIVE' && remaining(item.expiresAt) > 0; return <Card key={item.id} className="flex flex-wrap items-center gap-4 p-4"><div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-warm-100"><img src={item.product?.images?.[0]?.url || ''} alt="" className="h-full w-full object-cover" /></div><div className="min-w-0 flex-1"><p className="font-semibold text-warm-900">{item.product?.name || 'Product unavailable'}</p>{item.variant && <p className="text-sm text-warm-800/60">Variant: {item.variant.name}</p>}<p className="mt-1 text-sm text-warm-800/70">Quantity: {item.quantity} · GH₵{Number(item.variant?.price || item.product?.price || 0).toFixed(2)}</p><p className={`mt-1 text-xs font-medium ${active ? 'text-amber-700' : item.status === 'CONVERTED' ? 'text-green-700' : 'text-warm-800/50'}`}>{active ? `${formatRemaining(new Date(item.expiresAt).getTime() - now)} remaining` : item.status === 'CONVERTED' ? 'Converted to order' : item.status === 'CANCELLED' ? 'Cancelled' : 'Expired'}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => router.push(`/product/${item.product?.id}`)}>View</Button>{active && <><Button size="sm" onClick={() => void addToCart(item.id)}><ShoppingCart size={15} /> Use reservation</Button><button type="button" title="Cancel reservation" aria-label="Cancel reservation" onClick={() => void cancel(item.id)} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><XCircle size={18} /></button></>}</div></Card> })}</div>}</main><BottomNav /></div>
}
