'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronLeft, ChevronRight, MessageSquare, Eye, Loader2, XCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { api } from '@/lib/api'
import { useRole } from '@/contexts/RoleContext'

interface AdminConversation {
  id: string
  participant1: { id: string; name: string; email: string; avatar: string }
  participant2: { id: string; name: string; email: string; avatar: string }
  order?: { id: string; orderNumber: string; status: string }
  createdAt: string
  updatedAt: string
  lastMessage: { id: string; content: string; sender: { name: string }; createdAt: string } | null
  totalMessages: number
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
  const [messages, setMessages] = useState<any[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const loadingRef = useRef(false)

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

  const loadMessages = async (conversationId: string) => {
    setMessagesLoading(true)
    setMessages([])
    try {
      const response = await api.get<any>(`/admin/conversations/${conversationId}/messages`)
      if (response.success && response.data) {
        setMessages(response.data.messages || [])
      }
    } catch {
      console.error('Failed to load messages')
    } finally {
      setMessagesLoading(false)
    }
  }

  const handleConversationClick = (conv: AdminConversation) => {
    setSelectedConversation(conv)
    loadMessages(conv.id)
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
          placeholder="Search conversations..."
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
      ) : (
        <>
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

          {totalPages > 1 && (
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
        </>
      )}

      {selectedConversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedConversation(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-warm-900">Conversation</h2>
                  <p className="text-sm text-warm-800/60">
                    {selectedConversation.participant1.name} ↔ {selectedConversation.participant2.name}
                  </p>
                </div>
                <button onClick={() => setSelectedConversation(null)} className="p-2 rounded-xl hover:bg-warm-100">
                  <X size={20} className="text-warm-800" />
                </button>
              </div>

              {messagesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {messages.length === 0 ? (
                    <p className="text-sm text-warm-800/60 text-center py-4">No messages</p>
                  ) : (
                    messages.map((msg: any) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-xl text-sm ${
                          msg.senderId === selectedConversation.participant1.id
                            ? 'bg-warm-100 ml-8'
                            : 'bg-primary/10 mr-8'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-warm-900 text-xs">
                            {msg.sender?.name || 'Unknown'}
                          </span>
                          <span className="text-[10px] text-warm-800/50">
                            {new Date(msg.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-warm-800">{msg.content}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
