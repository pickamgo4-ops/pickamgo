'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '../../components/layout/Header'
import { BottomNav } from '../../components/layout/BottomNav'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { api } from '../../lib/api'
import { useRole } from '../../contexts/RoleContext'
import { MessageSquare, Package, AlertTriangle, Clock, CheckCircle, XCircle, Send } from 'lucide-react'

interface Dispute {
  id: string
  orderId: string
  type: string
  description: string
  status: string
  createdAt: string
  order?: { orderNumber: string; status: string }
  customer?: { id: string; name: string; avatar?: string }
  seller?: { id: string; name: string; avatar?: string }
}

interface DisputeMessage {
  id: string
  disputeId: string
  senderId: string
  senderRole: string
  content: string
  attachmentUrl?: string | null
  createdAt: string
  sender?: { id: string; name: string; avatar?: string }
}

export default function DisputesPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useRole()
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null)
  const [messages, setMessages] = useState<DisputeMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/auth/login')
      return
    }
    loadDisputes()
  }, [user, authLoading])

  const loadDisputes = async () => {
    setLoading(true)
    try {
      const res = await api.get<any>('/disputes')
      if (res.success && res.data) {
        const disputes = (res.data.disputes || res.data || []) as Dispute[]
        setDisputes(disputes)
      }
    } catch (err) {
      console.error('Failed to load disputes:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (disputeId: string) => {
    try {
      const res = await api.get<any>(`/disputes/${disputeId}/messages`)
      if (res.success && res.data) {
        setMessages(res.data as DisputeMessage[])
      }
    } catch (err) {
      console.error('Failed to load messages:', err)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDispute || !newMessage.trim()) return
    setSending(true)
    try {
      const res = await api.post(`/disputes/${selectedDispute.id}/messages`, { content: newMessage.trim() })
      if (res.success && res.data) {
        setMessages(prev => [...prev, res.data as DisputeMessage])
        setNewMessage('')
      }
    } catch (err) {
      console.error('Failed to send message:', err)
    } finally {
      setSending(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-yellow-100 text-yellow-700'
      case 'UNDER_REVIEW': return 'bg-blue-100 text-blue-700'
      case 'RESOLVED': return 'bg-green-100 text-green-700'
      case 'REJECTED': return 'bg-red-100 text-red-700'
      case 'CANCELLED': return 'bg-gray-100 text-gray-700'
      default: return 'bg-warm-100 text-warm-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN': return <Clock size={16} />
      case 'UNDER_REVIEW': return <AlertTriangle size={16} />
      case 'RESOLVED': return <CheckCircle size={16} />
      case 'REJECTED': return <XCircle size={16} />
      case 'CANCELLED': return <XCircle size={16} />
      default: return <MessageSquare size={16} />
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen pb-20 md:pb-0">
        <Header />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-warm-800/60">Loading disputes...</p>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
            <AlertTriangle size={24} className="text-red-500" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">Disputes</h1>
            <p className="text-warm-800/60">Track and manage your disputes</p>
          </div>
        </div>

        {!selectedDispute ? (
          <div className="space-y-3">
            {disputes.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-warm-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare size={32} className="text-warm-800/30" />
                </div>
                <h2 className="font-display text-xl font-bold text-warm-900 mb-2">No disputes yet</h2>
                <p className="text-warm-800/60 mb-6 max-w-md mx-auto">
                  Disputes appear here when there is an issue with an order that needs resolution.
                </p>
              </div>
            ) : (
              disputes.map((dispute) => (
                <Card
                  key={dispute.id}
                  className="p-4 cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => {
                    setSelectedDispute(dispute)
                    loadMessages(dispute.id)
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Package size={18} className="text-warm-800/60" />
                      <span className="font-semibold text-warm-900">Order #{dispute.order?.orderNumber || dispute.orderId}</span>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor(dispute.status)}`}>
                      {getStatusIcon(dispute.status)}
                      {dispute.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-warm-800/70 line-clamp-2 mb-2">{dispute.description}</p>
                  <div className="flex items-center justify-between text-xs text-warm-800/50">
                    <span>{dispute.type.replace(/_/g, ' ')}</span>
                    <span>{new Date(dispute.createdAt).toLocaleDateString()}</span>
                  </div>
                </Card>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={() => {
                setSelectedDispute(null)
                setMessages([])
              }}
              className="text-sm text-primary hover:text-primary-dark flex items-center gap-1"
            >
              ← Back to disputes
            </button>

            <Card className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-warm-900">Order #{selectedDispute.order?.orderNumber || selectedDispute.orderId}</h3>
                  <p className="text-sm text-warm-800/60">{selectedDispute.type.replace(/_/g, ' ')}</p>
                </div>
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor(selectedDispute.status)}`}>
                  {getStatusIcon(selectedDispute.status)}
                  {selectedDispute.status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-sm text-warm-800/70">{selectedDispute.description}</p>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold text-warm-900 mb-4">Messages</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
                {messages.length === 0 ? (
                  <p className="text-sm text-warm-800/50 text-center py-4">No messages yet</p>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-xl px-3 py-2 ${msg.senderId === user.id ? 'bg-primary text-white' : 'bg-warm-100 text-warm-900'}`}>
                        <p className="text-sm">{msg.content}</p>
                        <span className="text-xs opacity-70 mt-1 block">{new Date(msg.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 bg-white border border-warm-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  disabled={sending}
                />
                <Button type="submit" disabled={sending || !newMessage.trim()} icon={<Send size={16} />}>
                  Send
                </Button>
              </form>
            </Card>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
