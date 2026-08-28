'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronLeft, ChevronRight, MessageSquare, Eye, Loader2, XCircle, X, Send, Ban, Mail, Phone, User, ShoppingBag, Truck, CheckCircle2, XCircle as XCircleIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { api } from '@/lib/api'
import { useRole } from '@/contexts/RoleContext'

interface AdminConversation {
  id: string
  participant1: { id: string; name: string; email: string; avatar: string; isSeller?: boolean; isRider?: boolean; isAdmin?: boolean }
  participant2: { id: string; name: string; email: string; avatar: string; isSeller?: boolean; isRider?: boolean; isAdmin?: boolean }
  order?: { id: string; orderNumber: string; status: string }
  shopId?: string
  shop?: { id: string; name: string; logo?: string }
  createdAt: string
  updatedAt: string
  lastMessage: { id: string; content: string; sender: { name: string }; createdAt: string } | null
  totalMessages: number
  unreadCount: number
}

interface AdminMessage {
  id: string
  senderId: string
  sender: { id: string; name: string; email: string; avatar?: string }
  content: string
  isRead: boolean
  createdAt: string
}

interface ParticipantDetails {
  id: string
  name: string
  email: string
  phone?: string
  role: string
  isSeller: boolean
  isRider: boolean
  isAdmin: boolean
  isVerified: boolean
  createdAt: string
  addresses?: any[]
  orderCount?: number
}

function getRoleBadge(role: string) {
  const config: Record<string, { variant: any; label: string }> = {
    buyer: { variant: 'default', label: 'Buyer' },
    seller: { variant: 'deal', label: 'Seller' },
    rider: { variant: 'delivery', label: 'Rider' },
    admin: { variant: 'verified', label: 'Admin' },
  }
  const c = config[role] || config.buyer
  return <Badge variant={c.variant}>{c.label}</Badge>
}

function deriveRole(u: any): string {
  if (u.isAdmin) return 'admin'
  if (u.isRider) return 'rider'
  if (u.isSeller) return 'seller'
  return 'buyer'
}

export default function AdminMessagesPage() {
  const router = useRouter()
  const { user, loading, authInitialized } = useRole()
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState('')
  const [conversations, setConversations] = useState<AdminConversation[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConversation, setSelectedConversation] = useState<AdminConversation | null>(null)
  const [messages, setMessages] = useState<AdminMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [participantDetails, setParticipantDetails] = useState<ParticipantDetails | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const loadingRef = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadConversations = useCallback(async (pageNum: number, search: string) => {
    if (loadingRef.current) return
    loadingRef.current = true
    setDataLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('page', String(pageNum))
      params.set('limit', '20')
      if (search) params.set('search', search)

      const response = await api.get<any>(`/admin/conversations?${params.toString()}`)
      if (response.success && response.data) {
        setConversations(response.data.conversations || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotal(response.data.pagination?.total || 0)
      } else {
        setError(response.error || 'Failed to load conversations')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setDataLoading(false)
      loadingRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!authInitialized) return
    if (!user || !user.isAdmin) {
      router.push('/')
      return
    }
    loadConversations(page, searchQuery)
  }, [authInitialized, user, page, searchQuery, loadConversations, router])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1)
      loadConversations(1, searchQuery)
    }, 400)
    return () => clearTimeout(timeout)
  }, [searchQuery, loadConversations])

  const loadMessages = async (conversationId: string) => {
    setMessagesLoading(true)
    setMessages([])
    try {
      const response = await api.get<any>(`/admin/conversations/${conversationId}/messages`)
      if (response.success && response.data) {
        setMessages(response.data.messages || [])
      } else {
        setError(response.error || 'Failed to load messages')
      }
    } catch {
      console.error('Failed to load messages')
    } finally {
      setMessagesLoading(false)
    }
  }

  const loadParticipantDetails = async (participantId: string) => {
    setDetailsLoading(true)
    try {
      const response = await api.get<any>(`/admin/users/${participantId}`)
      if (response.success && response.data) {
        const u = response.data
        setParticipantDetails({
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone || '',
          role: deriveRole(u),
          isSeller: !!u.isSeller,
          isRider: !!u.isRider,
          isAdmin: !!u.isAdmin,
          isVerified: !!u.emailVerified || !!u.phoneVerified,
          createdAt: u.createdAt,
          addresses: u.addresses || [],
          orderCount: u._count?.customerOrders ?? u.orderCount ?? 0,
        })
      }
    } catch {
      console.error('Failed to load participant details')
    } finally {
      setDetailsLoading(false)
    }
  }

  const handleConversationClick = (conv: AdminConversation) => {
    setSelectedConversation(conv)
    loadMessages(conv.id)
    const otherParticipant = conv.participant1.id === user?.id ? conv.participant2 : conv.participant1
    loadParticipantDetails(otherParticipant.id)
  }

  const handleSendReply = async () => {
    if (!replyContent.trim() || !selectedConversation || !user) return
    setSendingReply(true)
    try {
      const otherParticipant = selectedConversation.participant1.id === user.id ? selectedConversation.participant2 : selectedConversation.participant1
      const response = await api.post<AdminMessage>(`/messages/conversations/${otherParticipant.id}/messages`, {
        content: replyContent,
        orderId: selectedConversation.order?.id,
      })
      if (response.success && response.data) {
        setMessages(prev => [...prev, response.data as AdminMessage])
        setReplyContent('')
      }
    } catch {
      console.error('Failed to send reply')
    } finally {
      setSendingReply(false)
    }
  }

  const getOtherParticipant = (conv: AdminConversation) => {
    if (!user) return null
    return conv.participant1.id === user.id ? conv.participant2 : conv.participant1
  }

  if (loading || !authInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <MessageSquare size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
            Messages
          </h1>
          <p className="text-warm-800/60 text-sm">Monitor platform conversations</p>
        </div>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-800/50" />
        <Input
          placeholder="Search conversations by name or email..."
          value={searchQuery}
          onValueChange={setSearchQuery}
          className="pl-9"
        />
      </div>

      {dataLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 size={40} className="animate-spin text-primary mx-auto mb-4" />
            <p className="text-warm-800/60">Loading conversations...</p>
          </div>
        </div>
      ) : error ? (
        <Card className="p-12 text-center">
          <XCircle size={44} className="mx-auto text-red-500 mb-3" />
          <p className="text-warm-900 font-medium">{error}</p>
          <Button onClick={() => loadConversations(page, searchQuery)} className="mt-4">Retry</Button>
        </Card>
      ) : conversations.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageSquare size={44} className="mx-auto text-warm-800/30 mb-3" />
          <p className="text-warm-800/60">No conversations found</p>
        </Card>
      ) : !selectedConversation ? (
        <div className="bg-white rounded-2xl shadow-sm border border-warm-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-warm-50 border-b border-warm-200">
                <tr>
                  <th className="px-4 py-3 font-semibold text-warm-800/70">Participants</th>
                  <th className="px-4 py-3 font-semibold text-warm-800/70 hidden md:table-cell">Order</th>
                  <th className="px-4 py-3 font-semibold text-warm-800/70 hidden sm:table-cell">Messages</th>
                  <th className="px-4 py-3 font-semibold text-warm-800/70 hidden lg:table-cell">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-200">
                {conversations.map((conv) => (
                  <tr
                    key={conv.id}
                    onClick={() => handleConversationClick(conv)}
                    className="hover:bg-warm-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-warm-900">
                          {conv.participant1.name} ↔ {conv.participant2.name}
                        </p>
                        <p className="text-xs text-warm-800/50">
                          {conv.participant1.email} ↔ {conv.participant2.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-warm-800/70">
                      {conv.order ? `#${conv.order.orderNumber}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-warm-800/70 hidden sm:table-cell">
                      {conv.totalMessages}
                    </td>
                    <td className="px-4 py-3 text-warm-800/60 hidden lg:table-cell">
                      {new Date(conv.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-warm-900">Conversation</h2>
                  <p className="text-sm text-warm-800/60">
                    {selectedConversation.participant1.name} ↔ {selectedConversation.participant2.name}
                  </p>
                  {selectedConversation.order && (
                    <p className="text-xs text-warm-800/50 mt-1">
                      Order: #{selectedConversation.order.orderNumber} ({selectedConversation.order.status})
                    </p>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => { setSelectedConversation(null); setMessages([]); setParticipantDetails(null) }}>
                  <ChevronLeft size={16} />
                  Back
                </Button>
              </div>

              {messagesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-primary" />
                </div>
              ) : messages.length === 0 ? (
                <p className="text-sm text-warm-800/60 text-center py-4">No messages yet</p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {messages.map((msg) => {
                    const isAdmin = msg.senderId === user?.id
                    return (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-xl text-sm ${
                          isAdmin ? 'bg-primary/10 ml-8' : 'bg-warm-100 mr-8'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-warm-900 text-xs">
                            {msg.sender.name || 'Unknown'}
                          </span>
                          {msg.senderId !== user?.id && (
                            <span className="text-[10px] text-warm-800/50">
                              {getOtherParticipant(selectedConversation)?.isSeller ? 'Seller' : getOtherParticipant(selectedConversation)?.isRider ? 'Rider' : 'Buyer'}
                            </span>
                          )}
                          <span className="text-[10px] text-warm-800/50">
                            {new Date(msg.createdAt).toLocaleString()}
                          </span>
                          {msg.isRead ? (
                            <CheckCircle2 size={12} className="text-green-600" />
                          ) : (
                            <XCircleIcon size={12} className="text-warm-800/30" />
                          )}
                        </div>
                        <p className="text-warm-800">{msg.content}</p>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <Input
                  placeholder="Type a reply..."
                  value={replyContent}
                  onValueChange={setReplyContent}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendReply()
                    }
                  }}
                  disabled={sendingReply}
                />
                <Button onClick={handleSendReply} disabled={sendingReply || !replyContent.trim()} icon={<Send size={16} />}>
                  Send
                </Button>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold text-warm-900 mb-3">Participant Details</h3>
              {detailsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 size={20} className="animate-spin text-primary" />
                </div>
              ) : participantDetails ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-warm-100 flex items-center justify-center">
                      <User size={16} className="text-warm-800" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-warm-900">{participantDetails.name}</p>
                      {getRoleBadge(participantDetails.role)}
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-warm-800/70">
                      <Mail size={14} />
                      <span className="truncate">{participantDetails.email}</span>
                    </div>
                    {participantDetails.phone && (
                      <div className="flex items-center gap-2 text-warm-800/70">
                        <Phone size={14} />
                        <span>{participantDetails.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-warm-800/70">
                      <User size={14} />
                      <span>Joined {new Date(participantDetails.createdAt).toLocaleDateString()}</span>
                    </div>
                    {participantDetails.isVerified && (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 size={14} />
                        <span>Verified</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-warm-800/60">Select a participant to view details</p>
              )}
            </Card>

            {selectedConversation.order && (
              <Card className="p-4">
                <h3 className="font-semibold text-warm-900 mb-3">Order Context</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-warm-800/70">
                    <ShoppingBag size={14} />
                    <span>#{selectedConversation.order.orderNumber}</span>
                  </div>
                  <div className="flex items-center gap-2 text-warm-800/70">
                    <Truck size={14} />
                    <span>{selectedConversation.order.status}</span>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {totalPages > 1 && !selectedConversation && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft size={16} />
          </Button>
          <span className="text-sm text-warm-800/60">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            <ChevronRight size={16} />
          </Button>
        </div>
      )}
    </div>
  )
}
