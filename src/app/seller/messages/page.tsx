'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, Send } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { api } from '@/lib/api'

interface Conversation {
  id: string
  orderId?: string
  order?: { id: string; orderNumber: string; status: string }
  participant1: { id: string; name: string; avatar: string }
  participant2: { id: string; name: string; avatar: string }
  shop?: { id: string; name: string; logo: string }
  messages: { id: string; senderId: string; content: string; isRead: boolean; createdAt: string }[]
}

export default function SellerMessagesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    setCurrentUserId(user.id || '')
    loadConversations()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      loadConversations()
      if (selectedConversation) {
        const otherUserId = selectedConversation.participant1.id === currentUserId
          ? selectedConversation.participant2.id
          : selectedConversation.participant1.id
        loadConversation(otherUserId, selectedConversation.orderId || selectedConversation.order?.id)
      }
    }, 10000)
    return () => clearInterval(interval)
  }, [selectedConversation, currentUserId])

  const loadConversations = async () => {
    try {
      const response = await api.get<Conversation[]>('/messages/conversations')
      if (response.success && response.data) {
        setConversations(response.data.map((conversation: any) => ({
          ...conversation,
          orderId: conversation.orderId || conversation.order?.id,
          messages: conversation.messages || (conversation.lastMessage ? [conversation.lastMessage] : []),
        })))
      }
    } catch {
      setError('Failed to load conversations')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const loadConversation = async (userId: string, orderId?: string) => {
    try {
      const query = orderId ? `?orderId=${encodeURIComponent(orderId)}` : ''
      const response = await api.get<{ conversation: Conversation; messages: any[] }>(`/messages/conversations/${userId}${query}`)
      if (response.success && response.data) {
        setSelectedConversation({
          ...response.data.conversation,
          messages: response.data.messages || [],
        })
      }
    } catch {
      setError('Failed to load conversation')
    }
  }

  const handleSendMessage = async () => {
    const cleanMessage = message.trim()
    if (!cleanMessage || !selectedConversation || sending) return

    setSending(true)
    setError('')
    try {
      const otherUserId = selectedConversation.participant1.id === currentUserId
        ? selectedConversation.participant2.id
        : selectedConversation.participant1.id

      const response = await api.post(`/messages/conversations/${otherUserId}/messages`, {
        content: cleanMessage,
        ...(selectedConversation.orderId ? { orderId: selectedConversation.orderId } : {}),
      })
      if (response.success) {
        setMessage('')
        setRefreshing(true)
        await Promise.all([
          loadConversations(),
          loadConversation(otherUserId, selectedConversation.orderId || selectedConversation.order?.id),
        ])
      } else {
        setError(response.error || "Message couldn't be sent. Please try again.")
      }
    } catch {
      setError("Message couldn't be sent. Please try again.")
    } finally {
      setSending(false)
    }
  }

  const otherUser = selectedConversation 
    ? (selectedConversation.participant1.id === currentUserId ? selectedConversation.participant2 : selectedConversation.participant1)
    : null

  if (loading) {
    return (
      <SellerSidebar>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-warm-800/60">Loading messages...</p>
          </div>
        </div>
      </SellerSidebar>
    )
  }

  return (
    <SellerSidebar>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">Messages</h1>
          <p className="text-warm-800/60 mt-1">Communicate with customers</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Conversations List */}
          <div className="md:col-span-1 space-y-2">
            {conversations.length === 0 ? (
              <Card className="p-6 text-center">
                <MessageSquare size={32} className="mx-auto text-warm-800/30 mb-2" />
                <p className="text-sm text-warm-800/60">No conversations yet</p>
              </Card>
            ) : (
              conversations.map((conv) => {
                const other = conv.participant1.id === currentUserId ? conv.participant2 : conv.participant1
                const lastMessage = conv.messages?.[0]
                const unreadCount = conv.messages?.filter((m) => !m.isRead && m.senderId !== other.id).length || 0
                const displayName = conv.shop?.name || other.name
                const displayAvatar = conv.shop?.logo || other.avatar

                return (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setSelectedConversation(conv)
                      loadConversation(other.id, conv.orderId || conv.order?.id)
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                      selectedConversation?.id === conv.id ? 'bg-primary/10' : 'hover:bg-warm-100'
                    }`}
                  >
                    <Avatar src={displayAvatar} fallback={displayName?.[0]} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-warm-900 truncate">{displayName}</p>
                      <p className="text-xs text-warm-800/60 truncate">
                        {lastMessage?.content || 'No messages'}
                      </p>
                    </div>
                    {unreadCount > 0 && (
                      <span className="bg-primary text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>

          {/* Chat Area */}
          <div className="md:col-span-2">
            {!selectedConversation ? (
              <Card className="p-12 text-center h-96 flex items-center justify-center">
                <div>
                  <MessageSquare size={48} className="mx-auto text-warm-800/30 mb-4" />
                  <h3 className="font-semibold text-warm-900 mb-2">Select a conversation</h3>
                  <p className="text-sm text-warm-800/60">Choose a conversation from the list to view messages</p>
                </div>
              </Card>
            ) : (
              <Card className="p-6 h-96 flex flex-col">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-warm-200">
                  <Avatar src={selectedConversation.shop?.logo || otherUser?.avatar} fallback={(selectedConversation.shop?.name || otherUser?.name)?.[0]} size="md" />
                  <div>
                    <p className="font-medium text-warm-900">{selectedConversation.shop?.name || otherUser?.name}</p>
                    <p className="text-xs text-warm-800/60">Online</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                  {selectedConversation.messages?.length === 0 ? (
                    <p className="text-center text-warm-800/60 text-sm py-8">No messages yet. Start the conversation!</p>
                  ) : (
                    selectedConversation.messages?.map((msg) => {
                      const isMe = msg.senderId === currentUserId
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] p-3 rounded-xl ${
                            isMe ? 'bg-primary text-white' : 'bg-warm-100 text-warm-900'
                          }`}>
                            <p className="text-sm">{msg.content}</p>
                            <p className={`text-xs mt-1 ${isMe ? 'text-white/70' : 'text-warm-800/50'}`}>
                              {new Date(msg.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void handleSendMessage();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} disabled={sending || !message.trim()} icon={<Send size={18} />}>
                    {sending ? 'Sending...' : 'Send'}
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </SellerSidebar>
  )
}
