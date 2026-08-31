'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Shield, Mail, Phone, Lock, Eye, EyeOff, CheckCircle, XCircle, Monitor, Globe } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { BottomNav } from '../../components/layout/BottomNav'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { api } from '../../lib/api'
import { useRole } from '../../contexts/RoleContext'

interface LoginHistoryEntry {
  id: string
  success: boolean
  failureReason?: string
  device?: string
  browser?: string
  os?: string
  location?: string
  createdAt: string
}

export default function SecurityPage() {
  const router = useRouter()
  const { user, loading, authInitialized } = useRole()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', currentPassword: '', newPassword: '', confirmPassword: '' })
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  useEffect(() => {
    if (!authInitialized) return
    if (!user) router.push('/auth/login')
    else {
      setForm(f => ({ ...f, name: user.name || '', email: user.email || '', phone: '' }))
      loadLoginHistory()
    }
  }, [user, authInitialized, router])

  const loadLoginHistory = async () => {
    setHistoryLoading(true)
    try {
      const response = await api.get<any>('/auth/login-history')
      if (response.success && response.data) {
        setLoginHistory(response.data.history || [])
      }
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false)
    }
  }

  const updateField = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const response = await api.patch('/auth/profile', { name: form.name, email: form.email, phone: form.phone })
      if (response.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully' })
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to update profile' })
      }
    } catch {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.newPassword !== form.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const response = await api.post('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword })
      if (response.success) {
        setMessage({ type: 'success', text: 'Password changed successfully' })
        setForm(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }))
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to change password' })
      }
    } catch {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading || !authInitialized || !user) {
    return (
      <div className="min-h-screen pb-20 md:pb-0">
        <Header />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-warm-800/60">Loading security settings...</p>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-warm-100 transition-colors">
            <ArrowLeft size={20} className="text-warm-800" />
          </button>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
              Account & Security
            </h1>
            <p className="text-warm-800/60">Manage your account security</p>
          </div>
        </div>

        {message && (
          <Card className={`mb-6 p-4 ${message.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <p className={`text-sm ${message.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>{message.text}</p>
          </Card>
        )}

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Mail size={18} className="text-primary" />
              <h3 className="font-semibold text-warm-900">Profile Information</h3>
            </div>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <Input label="Full Name" value={form.name} onChange={(e) => updateField('name', e.target.value)} required />
              <Input label="Email" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} required />
              <Input label="Phone" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="+233 50 123 4567" />
              <div className="flex items-center gap-2">
                {(user as any).emailVerified ? <Badge variant="verified"><CheckCircle size={14} /> Verified</Badge> : <Badge variant="deal"><XCircle size={14} /> Unverified</Badge>}
              </div>
              <Button type="submit" fullWidth disabled={saving}>{saving ? 'Saving...' : 'Save Profile'}</Button>
            </form>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lock size={18} className="text-primary" />
              <h3 className="font-semibold text-warm-900">Change Password</h3>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <Input label="Current Password" type={showPassword ? 'text' : 'password'} value={form.currentPassword} onChange={(e) => updateField('currentPassword', e.target.value)} required />
              <Input label="New Password" type={showPassword ? 'text' : 'password'} value={form.newPassword} onChange={(e) => updateField('newPassword', e.target.value)} required />
              <Input label="Confirm New Password" type={showPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={(e) => updateField('confirmPassword', e.target.value)} required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-sm text-warm-800/60 hover:text-warm-800 flex items-center gap-1">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />} {showPassword ? 'Hide passwords' : 'Show passwords'}
              </button>
              <Button type="submit" fullWidth disabled={saving}>{saving ? 'Updating...' : 'Change Password'}</Button>
            </form>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Monitor size={18} className="text-primary" />
              <h3 className="font-semibold text-warm-900">Login History</h3>
            </div>
            <p className="text-xs text-warm-800/60 mb-4">Review recent login activity on your PickAmGo account.</p>
            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : loginHistory.length === 0 ? (
              <p className="text-sm text-warm-800/60 text-center py-6">No login history available yet.</p>
            ) : (
              <div className="space-y-3">
                {loginHistory.slice(0, 20).map((entry) => (
                  <div key={entry.id} className="flex items-start justify-between gap-3 p-3 bg-warm-50 rounded-xl border border-warm-200">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${entry.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {entry.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-warm-900">
                          {entry.success ? 'Successful login' : 'Failed login'}
                        </p>
                        <p className="text-xs text-warm-800/60">
                          {[entry.browser, entry.os, entry.device].filter(Boolean).join(' • ') || 'Unknown device'}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-warm-800/60 mt-1">
                          <Globe size={12} />
                          <span>{entry.location || 'Unknown location'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-warm-800/60 whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleDateString('en-GH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-warm-800/60">
                        {new Date(entry.createdAt).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
