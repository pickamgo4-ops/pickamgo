'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronLeft, ChevronRight, Mail, Loader2, XCircle, X, Send, Eye, Users, UserCheck, UserX, CheckCircle2, XCircle as XCircleIcon, ChevronDown, FileText, Clock, BarChart3, Filter } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { api } from '@/lib/api'
import { useRole } from '@/contexts/RoleContext'

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
}

interface EmailCampaign {
  id: string
  subject: string
  audiences: string
  recipientCount: number
  successCount: number
  failedCount: number
  status: string
  sentBy: string
  sentAt?: string
  createdAt: string
}

type Tab = 'compose' | 'history' | 'templates'

export default function AdminEmailsPage() {
  const router = useRouter()
  const { user, loading, authInitialized } = useRole()
  const [activeTab, setActiveTab] = useState<Tab>('compose')
  const [sending, setSending] = useState(false)
  const [testSending, setTestSending] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Compose state
  const [audiences, setAudiences] = useState<string[]>([])
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<any[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<any[]>([])
  const [showUserSearch, setShowUserSearch] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; total: number } | null>(null)

  // History state
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([])
  const [campaignPage, setCampaignPage] = useState(1)
  const [totalCampaignPages, setTotalCampaignPages] = useState(1)

  // Templates
  const [templates] = useState<EmailTemplate[]>([
    { id: 'general', name: 'General Announcement', subject: 'Important Update from PickAmGo', body: '<p>Dear valued user,</p><p>We have an important update to share with you.</p><p>Thank you for being part of PickAmGo.</p>' },
    { id: 'promotion', name: 'Promotion', subject: 'Exclusive Offer Just for You!', body: '<p>Don\'t miss out on our latest promotions.</p><p>Shop now and enjoy amazing discounts.</p>' },
    { id: 'update', name: 'Important Update', subject: 'Important Changes to Your PickAmGo Account', body: '<p>We have made some important updates to improve your experience.</p><p>Please review the changes and let us know if you have any questions.</p>' },
    { id: 'maintenance', name: 'Maintenance Notice', subject: 'Scheduled Maintenance Notice', body: '<p>PickAmGo will be undergoing scheduled maintenance.</p><p>During this time, some features may be temporarily unavailable.</p>' },
    { id: 'seller', name: 'Seller Announcement', subject: 'Updates for Sellers on PickAmGo', body: '<p>Dear Seller,</p><p>We have new features and updates to help you grow your business.</p>' },
    { id: 'rider', name: 'Rider Announcement', subject: 'Updates for Riders on PickAmGo', body: '<p>Dear Rider,</p><p>We have new features and updates to help you deliver more efficiently.</p>' },
    { id: 'buyer', name: 'Buyer Announcement', subject: 'Exciting News for PickAmGo Buyers', body: '<p>Dear Buyer,</p><p>We have new features and updates to enhance your shopping experience.</p>' },
  ])

  const loadingRef = useRef(false)

  const loadCampaigns = useCallback(async (pageNum: number) => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoadingData(true)
    try {
      const response = await api.get<any>(`/admin/emails/history?page=${pageNum}&limit=20`)
      if (response.success && response.data) {
        setCampaigns(response.data.campaigns || [])
        setTotalCampaignPages(response.data.pagination?.totalPages || 1)
      } else {
        setError(response.error || 'Failed to load email history')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoadingData(false)
      loadingRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!authInitialized) return
    if (!user || !user.isAdmin) {
      router.push('/')
      return
    }
    if (activeTab === 'history') {
      loadCampaigns(campaignPage)
    }
  }, [authInitialized, user, activeTab, campaignPage, loadCampaigns, router])

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setUserSearchResults([])
      return
    }
    try {
      const response = await api.get<any>(`/admin/users?search=${encodeURIComponent(query)}&limit=20`)
      if (response.success && response.data) {
        setUserSearchResults(response.data.users || [])
      }
    } catch {
      console.error('Failed to search users')
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      searchUsers(userSearch)
    }, 300)
    return () => clearTimeout(timeout)
  }, [userSearch])

  const toggleAudience = (aud: string) => {
    setAudiences(prev => prev.includes(aud) ? prev.filter(a => a !== aud) : [...prev, aud])
  }

  const addUser = (u: any) => {
    if (!selectedUsers.find(su => su.id === u.id)) {
      setSelectedUsers(prev => [...prev, u])
    }
    setUserSearch('')
    setUserSearchResults([])
    setShowUserSearch(false)
  }

  const removeUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId))
  }

  const selectTemplate = (template: EmailTemplate) => {
    setSubject(template.subject)
    setMessage(template.body)
  }

  const generatePreview = () => {
    const preview = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #FF6B35 0%, #E85D2E 100%); padding: 28px 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; }
    .body { padding: 28px 24px; color: #1f2937; }
    .footer { background-color: #f9fafb; padding: 20px 24px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>PickAmGo</h1>
    </div>
    <div class="body">
      <h2>${subject}</h2>
      ${message}
    </div>
    <div class="footer">
      <p>PickAmGo. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
    setPreviewHtml(preview)
    setShowPreview(true)
  }

  const sendTestEmail = async () => {
    if (!subject.trim() || !message.trim()) return
    setTestSending(true)
    setError('')
    try {
      const response = await api.post<{ message?: string }>('/admin/emails/send', {
        audiences: [],
        subject,
        html: message,
        text: message.replace(/<[^>]*>/g, ''),
        testEmail: user?.email || 'test@example.com',
      })
      if (response.success) {
        setSuccess('Test email sent successfully!')
      } else {
        setError(response.error || 'Failed to send test email')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setTestSending(false)
    }
  }

  const handleSendCampaign = async () => {
    if (!subject.trim() || !message.trim() || audiences.length === 0) return
    const totalRecipients = audiences.includes('selected') ? selectedUsers.length : 5000
    setConfirmDialog({ open: true, total: totalRecipients })
  }

  const confirmSendCampaign = async () => {
    setConfirmDialog(null)
    setSending(true)
    setError('')
    try {
      const response = await api.post<{ totalRecipients?: number }>('/admin/emails/send', {
        audiences,
        subject,
        html: message,
        text: message.replace(/<[^>]*>/g, ''),
        selectedUserIds: selectedUsers.map(u => u.id),
      })
      if (response.success && response.data) {
        setSuccess(`Email campaign sent to ${(response.data as any).totalRecipients || 0} recipients!`)
        setSubject('')
        setMessage('')
        setAudiences([])
        setSelectedUsers([])
      } else {
        setError(response.error || 'Failed to send campaign')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSending(false)
    }
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
          <Mail size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
            Email Center
          </h1>
          <p className="text-warm-800/60 text-sm">Send emails to platform users</p>
        </div>
      </div>

      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      )}
      {success && (
        <Card className="p-4 bg-green-50 border-green-200">
          <p className="text-sm text-green-700">{success}</p>
        </Card>
      )}

      <div className="flex gap-2 border-b border-warm-200">
        {[
          { key: 'compose', label: 'Compose', icon: Mail },
          { key: 'templates', label: 'Templates', icon: FileText },
          { key: 'history', label: 'History', icon: Clock },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as Tab)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-warm-800/60 hover:text-warm-800'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'compose' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold text-warm-900 mb-4">Recipients</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { key: 'buyers', label: 'Buyers', icon: Users },
                { key: 'sellers', label: 'Sellers', icon: UserCheck },
                { key: 'riders', label: 'Riders', icon: UserX },
                { key: 'selected', label: 'Selected Users', icon: Filter },
              ].map((aud) => (
                <button
                  key={aud.key}
                  onClick={() => toggleAudience(aud.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border-2 transition-colors ${
                    audiences.includes(aud.key)
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-warm-200 hover:border-warm-300 text-warm-800'
                  }`}
                >
                  <aud.icon size={16} />
                  {aud.label}
                </button>
              ))}
            </div>

            {audiences.includes('selected') && (
              <div className="space-y-3">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-800/50" />
                  <Input
                    placeholder="Search users by name, email, or phone..."
                    value={userSearch}
                    onValueChange={setUserSearch}
                    onFocus={() => setShowUserSearch(true)}
                    className="pl-9"
                  />
                </div>

                {showUserSearch && userSearchResults.length > 0 && (
                  <Card className="p-2 max-h-60 overflow-y-auto">
                    {userSearchResults.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => addUser(u)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-warm-50 text-sm"
                      >
                        <p className="font-medium text-warm-900">{u.name}</p>
                        <p className="text-xs text-warm-800/50">{u.email}</p>
                      </button>
                    ))}
                  </Card>
                )}

                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map((u) => (
                      <Badge key={u.id} variant="deal" className="flex items-center gap-1">
                        {u.name}
                        <button onClick={() => removeUser(u.id)} className="ml-1">
                          <X size={12} />
                        </button>
                      </Badge>
                    ))}
                    <span className="text-xs text-warm-800/60 self-center">{selectedUsers.length} selected</span>
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-warm-900 mb-4">Email Content</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-warm-900 mb-1.5 block">Subject</label>
                <Input
                  placeholder="Email subject"
                  value={subject}
                  onValueChange={setSubject}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-warm-900 mb-1.5 block">Message</label>
                <textarea
                  placeholder="Write your email content here... (HTML supported)"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={8}
                  className="w-full rounded-xl border border-warm-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleSendCampaign}
              disabled={sending || !subject.trim() || !message.trim() || audiences.length === 0}
              icon={<Send size={16} />}
            >
              {sending ? 'Sending...' : 'Send Campaign'}
            </Button>
            <Button variant="outline" onClick={generatePreview} disabled={!subject.trim() || !message.trim()} icon={<Eye size={16} />}>
              Preview
            </Button>
            <Button variant="outline" onClick={sendTestEmail} disabled={testSending || !subject.trim() || !message.trim()} icon={<Mail size={16} />}>
              {testSending ? 'Sending Test...' : 'Send Test'}
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => { selectTemplate(template); setActiveTab('compose') }}>
              <div className="flex items-center gap-2 mb-2">
                <FileText size={18} className="text-primary" />
                <h4 className="font-medium text-warm-900">{template.name}</h4>
              </div>
              <p className="text-sm text-warm-800/60 mb-2">{template.subject}</p>
              <p className="text-xs text-warm-800/50 line-clamp-3">{template.body.replace(/<[^>]*>/g, '')}</p>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          {loadingData ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          ) : campaigns.length === 0 ? (
            <Card className="p-8 text-center">
              <Clock size={32} className="mx-auto text-warm-800/30 mb-2" />
              <p className="text-sm text-warm-800/60">No email campaigns yet</p>
            </Card>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-warm-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-warm-50 border-b border-warm-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-warm-800/70">Subject</th>
                      <th className="px-4 py-3 font-semibold text-warm-800/70">Audience</th>
                      <th className="px-4 py-3 font-semibold text-warm-800/70 hidden sm:table-cell">Recipients</th>
                      <th className="px-4 py-3 font-semibold text-warm-800/70 hidden md:table-cell">Success</th>
                      <th className="px-4 py-3 font-semibold text-warm-800/70 hidden md:table-cell">Failed</th>
                      <th className="px-4 py-3 font-semibold text-warm-800/70">Status</th>
                      <th className="px-4 py-3 font-semibold text-warm-800/70 hidden lg:table-cell">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-200">
                    {campaigns.map((campaign) => (
                      <tr key={campaign.id} className="hover:bg-warm-50">
                        <td className="px-4 py-3 font-medium text-warm-900">{campaign.subject}</td>
                        <td className="px-4 py-3 text-warm-800/70 capitalize">{campaign.audiences}</td>
                        <td className="px-4 py-3 text-warm-800/70 hidden sm:table-cell">{campaign.recipientCount}</td>
                        <td className="px-4 py-3 text-green-600 hidden md:table-cell">{campaign.successCount}</td>
                        <td className="px-4 py-3 text-red-600 hidden md:table-cell">{campaign.failedCount}</td>
                        <td className="px-4 py-3">
                          <Badge variant={campaign.status === 'SENT' ? 'verified' : 'default'}>
                            {campaign.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-warm-800/60 hidden lg:table-cell">
                          {campaign.sentAt ? new Date(campaign.sentAt).toLocaleString() : new Date(campaign.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {totalCampaignPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button variant="outline" size="sm" onClick={() => setCampaignPage(p => Math.max(1, p - 1))} disabled={campaignPage === 1}>
                <ChevronLeft size={16} />
              </Button>
              <span className="text-sm text-warm-800/60">Page {campaignPage} of {totalCampaignPages}</span>
              <Button variant="outline" size="sm" onClick={() => setCampaignPage(p => Math.min(totalCampaignPages, p + 1))} disabled={campaignPage === totalCampaignPages}>
                <ChevronRight size={16} />
              </Button>
            </div>
          )}
        </div>
      )}

      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowPreview(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-warm-900">Email Preview</h3>
                <button onClick={() => setShowPreview(false)} className="p-2 rounded-xl hover:bg-warm-100">
                  <X size={20} className="text-warm-800" />
                </button>
              </div>
              <div className="border border-warm-200 rounded-xl overflow-hidden">
                <iframe srcDoc={previewHtml} className="w-full h-[500px] border-0" title="Email Preview" />
              </div>
            </Card>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md">
            <Card className="p-6">
              <h3 className="font-display text-xl font-bold text-warm-900 mb-2">Confirm Send</h3>
              <p className="text-sm text-warm-800/60 mb-4">
                You are about to send this email to <strong>{confirmDialog.total.toLocaleString()}</strong> recipients. Continue?
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancel</Button>
                <Button onClick={confirmSendCampaign} disabled={sending}>
                  {sending ? 'Sending...' : 'Confirm Send'}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
