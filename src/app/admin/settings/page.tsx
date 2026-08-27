'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, Mail, Percent, DollarSign, Globe, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Header } from '../../../components/layout/Header'
import { BottomNav } from '../../../components/layout/BottomNav'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { Badge } from '../../../components/ui/Badge'
import { api } from '../../../lib/api'
import { useRole } from '../../../contexts/RoleContext'

interface PlatformSettings {
  platformName: string
  commissionRate: number
  currency: string
  minimumPayout: number
  supportEmail: string
}

interface FeatureFlags {
  googleAuth: boolean
  paystack: boolean
  r2: boolean
  email: boolean
}

interface EnvironmentStatus {
  apiUrl: string
  nodeEnv: string
  database: 'connected' | 'disconnected' | 'unknown'
  redis: 'connected' | 'disconnected' | 'unknown'
}

export default function AdminSettingsPage() {
  const router = useRouter()
  const { user, loading, authInitialized } = useRole()
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState('')
  const [settings, setSettings] = useState<PlatformSettings | null>(null)
  const [features, setFeatures] = useState<FeatureFlags | null>(null)
  const [envStatus, setEnvStatus] = useState<EnvironmentStatus | null>(null)

  useEffect(() => {
    if (!authInitialized) return
    if (!user || !user.isAdmin) {
      router.push('/')
      return
    }
    loadSettings()
  }, [authInitialized, user])

  const loadSettings = async () => {
    setDataLoading(true)
    setError('')
    try {
      const [settingsRes, featuresRes, envRes] = await Promise.all([
        api.get<any>('/admin/settings'),
        api.get<any>('/admin/features'),
        api.get<any>('/admin/environment'),
      ])

      if (settingsRes.success && settingsRes.data) {
        setSettings(settingsRes.data)
      }
      if (featuresRes.success && featuresRes.data) {
        setFeatures(featuresRes.data)
      }
      if (envRes.success && envRes.data) {
        setEnvStatus(envRes.data)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setDataLoading(false)
    }
  }

  const getStatusIcon = (status: 'connected' | 'disconnected' | 'unknown' | boolean) => {
    if (status === 'connected' || status === true) {
      return <CheckCircle size={18} className="text-green-600" />
    }
    return <XCircle size={18} className="text-red-500" />
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
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Settings size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
              Settings
            </h1>
            <p className="text-warm-800/60 text-sm">Platform configuration and status</p>
          </div>
        </div>

        {dataLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 size={40} className="animate-spin text-primary mx-auto mb-4" />
              <p className="text-warm-800/60">Loading settings...</p>
            </div>
          </div>
        ) : error ? (
          <Card className="p-12 text-center">
            <XCircle size={44} className="mx-auto text-red-500 mb-3" />
            <p className="text-warm-900 font-medium">{error}</p>
            <Button onClick={loadSettings} className="mt-4">Retry</Button>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold text-warm-900 mb-4 flex items-center gap-2">
                <Globe size={18} className="text-primary" />
                Platform Settings
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-warm-800/50 uppercase">Platform Name</label>
                  <p className="text-sm font-medium text-warm-900 mt-1">{settings?.platformName || 'PickAmGo'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-warm-800/50 uppercase">Commission Rate</label>
                  <p className="text-sm font-medium text-warm-900 mt-1 flex items-center gap-1">
                    <Percent size={14} className="text-warm-800/50" />
                    {settings?.commissionRate || 0}%
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-warm-800/50 uppercase">Currency</label>
                  <p className="text-sm font-medium text-warm-900 mt-1">{settings?.currency || 'GHS'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-warm-800/50 uppercase">Minimum Payout</label>
                  <p className="text-sm font-medium text-warm-900 mt-1 flex items-center gap-1">
                    <DollarSign size={14} className="text-warm-800/50" />
                    GH₵{settings?.minimumPayout?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-warm-800/50 uppercase">Support Email</label>
                  <p className="text-sm font-medium text-warm-900 mt-1 flex items-center gap-1">
                    <Mail size={14} className="text-warm-800/50" />
                    {settings?.supportEmail || '-'}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-warm-900 mb-4">Feature Flags</h3>
              <div className="grid grid-cols-2 gap-4">
                {features && Object.entries(features).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-warm-50 rounded-xl">
                    <span className="text-sm font-medium text-warm-900 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                    {getStatusIcon(value as boolean)}
                  </div>
                ))}
              </div>
            </Card>

            {envStatus && (
              <Card className="p-6">
                <h3 className="font-semibold text-warm-900 mb-4">Environment Status</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">API URL</label>
                    <p className="text-sm font-medium text-warm-900 mt-1">{envStatus.apiUrl}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Environment</label>
                    <p className="text-sm font-medium text-warm-900 mt-1">
                      <Badge variant={envStatus.nodeEnv === 'production' ? 'verified' : 'default'}>
                        {envStatus.nodeEnv}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Database</label>
                    <div className="mt-1">{getStatusIcon(envStatus.database)}</div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Redis</label>
                    <div className="mt-1">{getStatusIcon(envStatus.redis)}</div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
