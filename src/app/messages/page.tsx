'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, MoreVertical, Search, MessageCircle, Plus } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { BottomNav } from '../../components/layout/BottomNav'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card } from '../../components/ui/Card'
import { Avatar } from '../../components/ui/Avatar'
import { api } from '../../lib/api'
import { Conversation } from '../../types'

export default function MessagesPage() {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      refreshConversations()
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const loadConversations = async () => {
    setLoading(true)
    try {
      const response = await api.get<any>('/messages/conversations')
      if (response.success && response.data) {
        const mapped = (response.data.conversations || response.data || []).map((conv: any) => ({
          userId: conv.otherParticipant?.id || conv.userId,
          orderId: conv.orderId || conv.order?.id,
          userName: conv.shop?.name || conv.otherParticipant?.name || conv.userName || conv.name || 'Unknown User',
          userAvatar: conv.shop?.logo || conv.otherParticipant?.avatar || conv.userAvatar || conv.avatar || '',
          lastMessage: conv.lastMessage?.content || conv.lastMessageText || '',
          lastMessageAt: conv.lastMessageAt || conv.updatedAt || new Date().toISOString(),
          unreadCount: conv.unreadCount || 0,
        }))
        setConversations(mapped)
      }
    } catch (err) {
      console.error('Failed to load conversations:', err)
    } finally {
      setLoading(false)
    }
  }

  const refreshConversations = async () => {
    try {
      const response = await api.get<any>('/messages/conversations')
      if (response.success && response.data) {
        const mapped = (response.data.conversations || response.data || []).map((conv: any) => ({
          userId: conv.otherParticipant?.id || conv.userId,
          orderId: conv.orderId || conv.order?.id,
          userName: conv.shop?.name || conv.otherParticipant?.name || conv.userName || conv.name || 'Unknown User',
          userAvatar: conv.shop?.logo || conv.otherParticipant?.avatar || conv.userAvatar || conv.avatar || '',
          lastMessage: conv.lastMessage?.content || conv.lastMessageText || '',
          lastMessageAt: conv.lastMessageAt || conv.updatedAt || new Date().toISOString(),
          unreadCount: conv.unreadCount || 0,
        }))
        setConversations(mapped)
      }
    } catch (err) {
      console.error('Failed to refresh conversations:', err)
    }
  }

  const filteredConversations = conversations.filter(conv =>
    conv.userName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatTime = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
            Messages
          </h1>
          <Button size="sm" icon={<Plus size={18} />} onClick={() => router.push('/discover')}>
            New
          </Button>
        </div>

        <div className="mb-4">
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            icon={<Search size={20} />}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-warm-800/60">Loading messages...</p>
            </div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 bg-warm-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle size={32} className="text-warm-800/30" />
            </div>
            <h3 className="font-semibold text-warm-900 mb-2">No messages yet</h3>
            <p className="text-sm text-warm-800/60 mb-4">
              Start a conversation with a seller or service provider.
            </p>
            <Button onClick={() => router.push('/discover')}>Browse</Button>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.userId}
                onClick={() => router.push(`/messages/${conversation.userId}${conversation.orderId ? `?orderId=${encodeURIComponent(conversation.orderId)}` : ''}`)}
                className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-warm-100 transition-colors text-left"
              >
                <Avatar src={conversation.userAvatar} alt={conversation.userName} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-medium text-warm-900 text-sm truncate">
                      {conversation.userName}
                    </span>
                    <span className="text-xs text-warm-800/50 flex-shrink-0">
                      {formatTime(conversation.lastMessageAt)}
                    </span>
                  </div>
                  <p className="text-sm text-warm-800/60 truncate">
                    {conversation.lastMessage || 'No messages yet'}
                  </p>
                </div>
                {conversation.unreadCount > 0 && (
                  <span className="w-5 h-5 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                    {conversation.unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
