'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Send, MoreVertical, CheckCheck, MessageCircle } from 'lucide-react'
import { Header } from '../../../components/layout/Header'
import { BottomNav } from '../../../components/layout/BottomNav'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Card } from '../../../components/ui/Card'
import { Avatar } from '../../../components/ui/Avatar'
import { api } from '../../../lib/api'
import { Message } from '../../../types'

export default function ConversationPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = params.userId as string
  const orderId = searchParams.get('orderId')
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')
  const [conversationUser, setConversationUser] = useState<{ name: string; avatar: string } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const getCurrentUserId = () => {
    if (typeof window === 'undefined') return currentUserId
    const storedUser = localStorage.getItem('user')
    if (!storedUser) return currentUserId
    try {
      const parsed = JSON.parse(storedUser)
      return parsed?.id || currentUserId
    } catch {
      return currentUserId
    }
  }

  const mapMessages = (items: any[]): Message[] => items.map((msg: any) => ({
    id: msg.id,
    senderId: msg.senderId,
    receiverId: msg.receiverId,
    content: msg.content,
    read: msg.isRead || msg.read || false,
    createdAt: msg.createdAt,
  }))

  const mergeServerMessages = (serverMessages: Message[]) => {
    setMessages(previous => {
      const serverIds = new Set(serverMessages.map(message => message.id))
      const pendingMessages = previous.filter(message => message.id.startsWith('temp-') && !serverIds.has(message.id))
      return [...serverMessages, ...pendingMessages]
    })
  }

  useEffect(() => {
    const storedUserId = getCurrentUserId()
    if (storedUserId) setCurrentUserId(storedUserId)
    if (userId) {
      loadConversation()
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    const interval = setInterval(() => {
      refreshConversation()
    }, 10000)
    return () => clearInterval(interval)
  }, [userId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadConversation = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get<any>(`/messages/conversations/${userId}${orderId ? `?orderId=${encodeURIComponent(orderId)}` : ''}`)
      if (response.success && response.data) {
        const msgs = response.data.messages || response.data || []
        setMessages(mapMessages(msgs))

        const conversation = response.data.conversation
        const participant = conversation?.participant1?.id === userId
          ? conversation.participant1
          : conversation?.participant2?.id === userId
            ? conversation.participant2
            : null
        if (participant) {
          setConversationUser({
            name: participant.name || 'User',
            avatar: participant.avatar || '',
          })
        }
        const nextUserId = getCurrentUserId()
        if (nextUserId) setCurrentUserId(nextUserId)
      }
    } catch (err) {
      console.error('Failed to load conversation:', err)
      setError('Failed to load messages. Please refresh and try again.')
    } finally {
      setLoading(false)
    }
  }

  const refreshConversation = async () => {
    try {
      const response = await api.get<any>(`/messages/conversations/${userId}${orderId ? `?orderId=${encodeURIComponent(orderId)}` : ''}`)
      if (response.success && response.data) {
        const msgs = response.data.messages || response.data || []
        mergeServerMessages(mapMessages(msgs))
      }
    } catch (err) {
      console.error('Failed to refresh conversation:', err)
    }
  }

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const cleanMessage = newMessage.trim()
    if (!cleanMessage || sending) return

    const currentUser = getCurrentUserId()
    if (currentUser) setCurrentUserId(currentUser)

    setSending(true)
    setError('')
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      senderId: currentUser || 'me',
      receiverId: userId,
      content: cleanMessage,
      read: false,
      createdAt: new Date().toISOString(),
      status: 'sending',
    }

    setMessages(prev => [...prev, tempMessage])
    setNewMessage('')

    try {
      const response = await api.post(`/messages/conversations/${userId}/messages`, {
        content: tempMessage.content,
        ...(orderId ? { orderId } : {}),
      })

      if (response.success && response.data) {
        const savedMessage = mapMessages([response.data])[0]
        setMessages(prev => prev.map(msg =>
          msg.id === tempMessage.id ? { ...savedMessage, read: false } : msg
        ))
      } else {
        setMessages(prev => prev.map(msg =>
          msg.id === tempMessage.id ? { ...msg, status: 'failed' } : msg
        ))
        setNewMessage(tempMessage.content)
        setError(response.error || "Message couldn't be sent. Please try again.")
      }
    } catch (err) {
      console.error('Failed to send message:', err)
      setMessages(prev => prev.map(msg =>
        msg.id === tempMessage.id ? { ...msg, status: 'failed' } : msg
      ))
      setNewMessage(tempMessage.content)
      setError("Message couldn't be sent. Please try again.")
    } finally {
      setSending(false)
    }
  }

  const formatTime = (dateString: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    return date.toLocaleDateString()
  }

  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.createdAt)
    if (!groups[date]) groups[date] = []
    groups[date].push(message)
    return groups
  }, {} as Record<string, Message[]>)

  return (
    <div className="min-h-screen pb-20 md:pb-0 flex flex-col">
      <Header />

      {/* Conversation Header */}
      <div className="sticky top-16 md:top-20 z-40 bg-warm-50/80 backdrop-blur-md border-b border-warm-200/50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 h-14">
            <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl hover:bg-warm-100 transition-colors">
              <ArrowLeft size={20} className="text-warm-800" />
            </button>
            <Avatar
              src={conversationUser?.avatar}
              alt={conversationUser?.name || 'User'}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-warm-900 text-sm truncate">
                {conversationUser?.name || 'Conversation'}
              </h2>
              <p className="text-xs text-green-600">Online</p>
            </div>
            <button className="p-2 rounded-xl hover:bg-warm-100 transition-colors">
              <MoreVertical size={20} className="text-warm-800" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-warm-800/60">Loading messages...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <Card className="p-12 text-center">
              <MessageCircle size={48} className="text-warm-800/20 mx-auto mb-3" />
              <h3 className="font-semibold text-warm-900 mb-1">No messages yet</h3>
              <p className="text-sm text-warm-800/60">Start the conversation by sending a message below.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedMessages).map(([date, msgs]) => (
                <div key={date}>
                  <div className="flex items-center justify-center mb-4">
                    <span className="text-xs text-warm-800/50 bg-warm-100 px-3 py-1 rounded-full">
                      {date}
                    </span>
                  </div>
                  {msgs.map((message) => {
                    const isMe = message.senderId === currentUserId || message.senderId === 'me'
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-2`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                            isMe
                              ? 'bg-primary text-white rounded-br-sm'
                              : 'bg-white border border-warm-200 text-warm-900 rounded-bl-sm'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <span className={`text-[10px] ${isMe ? 'text-white/70' : 'text-warm-800/50'}`}>
                              {formatTime(message.createdAt)}
                            </span>
                            {isMe && (
                              <CheckCheck size={12} className={message.read ? 'text-white/70' : 'text-white/50'} />
                            )}
                          </div>
                          {message.status === 'failed' && (
                            <p className="text-[10px] text-red-200 mt-1">Failed to send. Press Send to retry.</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* Message Input */}
      <div className="sticky bottom-0 bg-warm-50/80 backdrop-blur-md border-t border-warm-200/50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onValueChange={setNewMessage}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
              className="flex-1"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!newMessage.trim() || sending}
              icon={<Send size={18} />}
            >
              {sending ? 'Sending...' : 'Send'}
            </Button>
          </form>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
