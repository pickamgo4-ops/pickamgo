'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, Send, Search, User, Package } from 'lucide-react'
import { RiderSidebar } from '@/components/RiderSidebar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { api } from '@/lib/api'
import { useRiderConversations } from '@/hooks/useRider'
import { RiderLoadingState, RiderEmptyState } from '@/components/RiderAuthGuard'

interface ConversationMessage {
  id: string
  content: string
  createdAt: string
  senderId: string
  sender?: { id: string; name: string }
}

interface ConversationDetail {
  conversation: {
    id: string
    otherParticipant: {
      id: string
      name: string
      avatar?: string
      lastActiveAt?: string | null
    }
    order?: {
      id: string
      orderNumber: string
      status: string
    }
  }
  messages: ConversationMessage[]
}

export default function RiderMessagesPage() {
  const router = useRouter()
  const { conversations, loading: conversationsLoading } = useRiderConversations()
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [conversationDetail, setConversationDetail] = useState<ConversationDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selectedUserId) {
      loadConversation(selectedUserId)
    }
  }, [selectedUserId])

  const loadConversation = async (userId: string) => {
    setLoadingDetail(true)
    setConversationDetail(null)
    try {
      const res = await api.getConversation(userId)
      if (res.success && res.data) {
        setConversationDetail(res.data)
      }
    } catch {
      // ignore
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleSendMessage = async () => {
    if (!selectedUserId || !newMessage.trim() || sending) return
    setSending(true)
    try {
      const res = await api.sendMessage(selectedUserId, { content: newMessage })
      if (res.success) {
        setNewMessage('')
        loadConversation(selectedUserId)
      }
    } catch {
      // ignore
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (!selectedUserId) {
    return (
      <RiderSidebar>
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">Messages</h1>
            <p className="text-warm-800/60 mt-1">Communicate with customers and support</p>
          </div>

          {conversationsLoading ? (
            <RiderLoadingState message="Loading conversations..." />
          ) : conversations.length === 0 ? (
            <div className="text-center py-16">
              <RiderEmptyState
                title="No conversations yet"
                description="Start a delivery to communicate with customers"
              />
            </div>
          ) : (
            <div className="space-y-3">
              {conversations.map((conv) => {
                const other = conv.otherParticipant
                return (
                  <Card
                    key={conv.id}
                    className="p-4 hover:border-primary/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedUserId(other.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar src={other.avatar} alt={other.name} fallback={other.name?.charAt(0) || 'U'} className="w-10 h-10" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-warm-900 truncate">{other.name || 'User'}</h4>
                          {conv.unreadCount > 0 && (
                            <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                          )}
                        </div>
                        {conv.lastMessage && (
                          <>
                            <p className="text-sm text-warm-800/70 truncate">
                              {conv.lastMessage.senderId === other.id ? '' : 'You: '}
                              {conv.lastMessage.content}
                            </p>
                            <p className="text-xs text-warm-800/50 mt-0.5">
                              {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </RiderSidebar>
    )
  }

  return (
    <RiderSidebar>
      <div className="flex flex-col h-[calc(100vh-100px)] max-w-lg mx-auto w-full min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Button variant="outline" size="sm" onClick={() => setSelectedUserId(null)}>
            Back
          </Button>
          {conversationDetail && (
            <>
                <Avatar
                src={conversationDetail.conversation.otherParticipant.avatar}
                alt={conversationDetail.conversation.otherParticipant.name}
                fallback={conversationDetail.conversation.otherParticipant.name?.charAt(0) || 'U'}
                className="w-10 h-10"
              />
              <div>
                <h3 className="font-medium text-warm-900">
                  {conversationDetail.conversation.otherParticipant.name || 'User'}
                </h3>
                {conversationDetail.conversation.order && (
                  <p className="text-xs text-warm-800/60">
                    Order #{conversationDetail.conversation.order.orderNumber}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-4">
          {loadingDetail ? (
            <RiderLoadingState message="Loading messages..." />
          ) : conversationDetail?.messages.length === 0 ? (
            <div className="text-center py-10">
              <MessageCircle size={32} className="mx-auto text-warm-800/30 mb-2" />
              <p className="text-warm-800/60">No messages yet</p>
            </div>
          ) : (
            conversationDetail?.messages.map((msg) => {
              const isOwn = msg.senderId === msg.sender?.id || msg.senderId === 'me'
              return (
                <div
                  key={msg.id}
                  className={`max-w-[80%] p-3 rounded-xl text-sm ${
                    isOwn
                      ? 'bg-primary/10 text-warm-900 ml-auto'
                      : 'bg-warm-100 text-warm-900'
                  }`}
                >
                  <p>{msg.content}</p>
                  <p className="text-xs text-warm-800/40 mt-1 text-right">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={2}
            className="flex-1 bg-white border border-warm-200 rounded-xl py-3 px-4 text-warm-900 placeholder:text-warm-800/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
          />
          <Button
            size="sm"
            icon={<Send size={16} />}
            disabled={!newMessage.trim() || sending}
            onClick={handleSendMessage}
          >
            Send
          </Button>
        </div>
      </div>
    </RiderSidebar>
  )
}
