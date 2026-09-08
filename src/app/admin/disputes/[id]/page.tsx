'use client'

import React, { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle, Clock, MessageSquare, Send, Shield, UserRound, XCircle } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { api } from '@/lib/api'
import { useRole } from '@/contexts/RoleContext'

const transitions: Record<string, string[]> = {
  OPEN: ['UNDER_REVIEW', 'RESOLVED', 'REJECTED', 'CANCELLED'],
  UNDER_REVIEW: ['RESOLVED', 'REJECTED'],
  RESOLVED: [],
  REJECTED: [],
  CANCELLED: [],
}

function label(value: string) { return value.replace(/_/g, ' ') }
function variant(status: string): any { return status === 'RESOLVED' ? 'verified' : status === 'REJECTED' || status === 'CANCELLED' ? 'deal' : 'default' }

export default function AdminDisputeDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user, loading, authInitialized } = useRole()
  const [dispute, setDispute] = useState<any>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState('')
  const [nextStatus, setNextStatus] = useState('')
  const [resolution, setResolution] = useState('')
  const [updating, setUpdating] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const loadDispute = async () => {
    setDataLoading(true)
    setError('')
    const response = await api.get<any>(`/disputes/${params.id}`)
    if (response.success && response.data) {
      setDispute(response.data)
      setResolution(response.data.resolution || '')
    } else setError(response.error || 'Failed to fetch dispute')
    setDataLoading(false)
  }

  useEffect(() => {
    if (!authInitialized || !user?.isAdmin || !params.id) return
    loadDispute()
  }, [authInitialized, user, params.id])

  const updateStatus = async () => {
    if (!nextStatus) return
    setUpdating(true)
    setError('')
    const response = await api.patch(`/disputes/${params.id}/status`, { status: nextStatus, resolution: resolution.trim() || undefined })
    if (response.success) {
      await loadDispute()
      setNextStatus('')
    } else setError(response.error || 'Failed to update dispute')
    setUpdating(false)
  }

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!message.trim()) return
    setSending(true)
    const response = await api.post(`/disputes/${params.id}/messages`, { content: message.trim() })
    if (response.success) {
      setMessage('')
      await loadDispute()
    } else setError(response.error || 'Failed to send message')
    setSending(false)
  }

  if (loading || !authInitialized || dataLoading) return <div className="py-20 text-center text-warm-800/60">Loading dispute...</div>
  if (!user?.isAdmin) return null
  if (!dispute) return <Card className="p-8 text-center"><p className="text-red-700">{error || 'Dispute not found'}</p><Button className="mt-4" variant="outline" onClick={loadDispute}>Retry</Button></Card>

  const order = dispute.order || {}
  const actions = transitions[dispute.status] || []

  return (
    <div className="space-y-6">
      <button onClick={() => router.push('/admin/disputes')} className="flex items-center gap-1 text-sm text-primary hover:text-primary-dark"><ArrowLeft size={16} /> Back to disputes</button>
      {error && <Card className="p-4 border-red-200 bg-red-50"><p className="text-sm text-red-700">{error}</p></Card>}
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-xs text-warm-800/60">{dispute.id}</p><h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900 mt-1">Dispute for order #{order.orderNumber || dispute.orderId}</h1><p className="text-sm text-warm-800/60 mt-1">Created {new Date(dispute.createdAt).toLocaleString()} · Updated {new Date(dispute.updatedAt).toLocaleString()}</p></div><Badge variant={variant(dispute.status)}>{label(dispute.status)}</Badge></div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2"><h2 className="font-semibold text-warm-900 mb-4">Dispute summary</h2><div className="grid grid-cols-2 md:grid-cols-3 gap-4"><div><p className="text-xs text-warm-800/50 uppercase">Reason</p><p className="mt-1 font-medium text-warm-900">{label(dispute.type)}</p></div><div><p className="text-xs text-warm-800/50 uppercase">Order amount</p><p className="mt-1 font-medium text-warm-900">GH₵{Number(order.total || 0).toFixed(2)}</p></div><div><p className="text-xs text-warm-800/50 uppercase">Disputed amount</p><p className="mt-1 font-medium text-warm-900">{dispute.amount == null ? 'Not specified' : `GH₵${Number(dispute.amount).toFixed(2)}`}</p></div></div><div className="mt-5"><p className="text-xs text-warm-800/50 uppercase">Description</p><p className="mt-1 whitespace-pre-wrap text-sm text-warm-900">{dispute.description}</p></div>{dispute.resolution && <div className="mt-5 rounded-xl bg-warm-50 p-3"><p className="text-xs text-warm-800/50 uppercase">Resolution</p><p className="mt-1 whitespace-pre-wrap text-sm text-warm-900">{dispute.resolution}</p></div>}</Card>
        <Card className="p-5"><h2 className="font-semibold text-warm-900 mb-4">People</h2><div className="space-y-4"><div className="flex gap-3"><UserRound size={18} className="text-warm-800/50 mt-0.5" /><div><p className="text-xs text-warm-800/50 uppercase">Customer</p><p className="font-medium text-warm-900">{dispute.customer?.name || 'Unavailable'}</p><p className="text-xs text-warm-800/60">{dispute.customer?.email || dispute.customer?.phone || ''}</p></div></div><div className="flex gap-3"><Shield size={18} className="text-warm-800/50 mt-0.5" /><div><p className="text-xs text-warm-800/50 uppercase">Seller</p><p className="font-medium text-warm-900">{dispute.seller?.name || 'Unavailable'}</p><p className="text-xs text-warm-800/60">{dispute.seller?.email || dispute.seller?.phone || ''}</p></div></div><div><p className="text-xs text-warm-800/50 uppercase">Shop</p><p className="font-medium text-warm-900 mt-1">{order.shop?.name || 'Unavailable'}</p></div></div></Card>
      </div>

      <Card className="p-5"><h2 className="font-semibold text-warm-900 mb-4">Order items</h2><div className="space-y-2">{(order.items || []).map((item: any) => <div key={item.id} className="flex items-center justify-between gap-3 border-b border-warm-100 pb-2 text-sm"><span className="text-warm-900">{item.name} × {item.quantity}</span><span className="text-warm-800/70">GH₵{(Number(item.price) * item.quantity).toFixed(2)}</span></div>)}</div></Card>

      <Card className="p-5"><div className="flex items-center gap-2 mb-4"><Clock size={18} className="text-primary" /><h2 className="font-semibold text-warm-900">Admin action</h2></div>{actions.length ? <div className="flex flex-col md:flex-row gap-3"><select value={nextStatus} onChange={event => setNextStatus(event.target.value)} className="rounded-xl border border-warm-200 bg-white px-3 py-2.5 text-sm"><option value="">Select next status</option>{actions.map(action => <option key={action} value={action}>{label(action)}</option>)}</select><input value={resolution} onChange={event => setResolution(event.target.value)} placeholder="Resolution or admin note (optional)" className="min-w-0 flex-1 rounded-xl border border-warm-200 px-3 py-2.5 text-sm" /><Button disabled={!nextStatus || updating} onClick={updateStatus}>{updating ? 'Saving...' : 'Save action'}</Button></div> : <p className="text-sm text-warm-800/60">This dispute has no further status transitions.</p>}</Card>

      <Card className="p-5"><div className="flex items-center gap-2 mb-4"><MessageSquare size={18} className="text-primary" /><h2 className="font-semibold text-warm-900">Messages</h2></div><div className="space-y-3 mb-4">{(dispute.messages || []).length === 0 ? <p className="text-sm text-warm-800/50">No messages yet.</p> : dispute.messages.map((item: any) => <div key={item.id} className="rounded-xl bg-warm-50 p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-warm-900">{item.sender?.name || item.senderRole}</p><p className="text-xs text-warm-800/50">{new Date(item.createdAt).toLocaleString()}</p></div><p className="text-sm text-warm-800/80 mt-1 whitespace-pre-wrap">{item.content}</p></div>)}</div><form onSubmit={sendMessage} className="flex gap-2"><input value={message} onChange={event => setMessage(event.target.value)} placeholder="Respond to the parties" className="min-w-0 flex-1 rounded-xl border border-warm-200 px-3 py-2.5 text-sm" /><Button type="submit" disabled={!message.trim() || sending} icon={<Send size={16} />}>{sending ? 'Sending...' : 'Send'}</Button></form></Card>

      <Card className="p-5"><h2 className="font-semibold text-warm-900 mb-4">History</h2>{(dispute.history || []).length === 0 ? <p className="text-sm text-warm-800/50">No recorded admin actions.</p> : <div className="space-y-3">{dispute.history.map((item: any) => <div key={item.id} className="flex gap-3 text-sm"><CheckCircle size={16} className="text-primary mt-0.5" /><div><p className="text-warm-900">{item.action} {item.reason ? `(${item.reason})` : ''}</p><p className="text-xs text-warm-800/50">{item.actor?.name || 'Admin'} · {new Date(item.createdAt).toLocaleString()}</p></div></div>)}</div>}</Card>
    </div>
  )
}
