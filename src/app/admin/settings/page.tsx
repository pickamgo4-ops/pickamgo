'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, Mail, Percent, DollarSign, Globe, CheckCircle, XCircle, Loader2, Save, Shield, Truck, Bell, Store, Users, GraduationCap, Tag, Gavel } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/api'
import { useRole } from '@/contexts/RoleContext'

type SettingsTab = 'general' | 'marketplace' | 'commission' | 'payment' | 'delivery' | 'security' | 'notifications' | 'email'

interface SettingsData {
  general: Record<string, any>
  marketplace: Record<string, any>
  commission: Record<string, any>
  payment: Record<string, any>
  delivery: Record<string, any>
  security: Record<string, any>
  notifications: Record<string, any>
  email: Record<string, any>
}

export default function AdminSettingsPage() {
  const router = useRouter()
  const { user, loading, authInitialized } = useRole()
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')

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
    setSuccess('')
    try {
      const response = await api.get<any>('/admin/settings')
      if (response.success && response.data) {
        setSettings(response.data)
      } else {
        setError(response.error || 'Failed to load settings')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setDataLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!settings) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const allSettings: Record<string, string> = {}
      for (const category of Object.values(settings)) {
        for (const [key, value] of Object.entries(category)) {
          allSettings[key] = typeof value === 'boolean' ? String(value) : String(value)
        }
      }

      const response = await api.patch('/admin/settings', allSettings)
      if (response.success) {
        setSuccess('Settings saved successfully')
      } else {
        setError(response.error || 'Failed to save settings')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (category: keyof SettingsData, key: string, value: any) => {
    if (!settings) return
    setSettings({
      ...settings,
      [category]: {
        ...settings[category],
        [key]: value,
      },
    })
  }

  if (loading || !authInitialized) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        </div>
      </div>
    )
  }

  const tabs: { id: SettingsTab; label: string; icon: any }[] = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'marketplace', label: 'Marketplace', icon: Store },
    { id: 'commission', label: 'Commission', icon: Percent },
    { id: 'payment', label: 'Payment', icon: DollarSign },
    { id: 'delivery', label: 'Delivery', icon: Truck },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'email', label: 'Email', icon: Mail },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Settings size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
              Settings
            </h1>
            <p className="text-warm-800/60 text-sm">Platform configuration</p>
          </div>
        </div>
        <Button onClick={saveSettings} disabled={saving || !settings}>
          <Save size={16} />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      )}

      {success && (
        <Card className="p-4 border-green-200 bg-green-50">
          <p className="text-sm text-green-600">{success}</p>
        </Card>
      )}

      {dataLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 size={40} className="animate-spin text-primary mx-auto mb-4" />
            <p className="text-warm-800/60">Loading settings...</p>
          </div>
        </div>
      ) : settings ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-1">
            <Card className="p-2">
              <nav className="space-y-1">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-warm-800 hover:bg-warm-100'
                    }`}
                  >
                    <tab.icon size={18} />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </Card>
          </div>

          <div className="lg:col-span-4">
            {activeTab === 'general' && (
              <Card className="p-6 space-y-4">
                <h3 className="font-semibold text-warm-900 mb-4">General Settings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Platform Name</label>
                    <Input
                      value={settings.general.platformName || ''}
                      onChange={(e) => updateSetting('general', 'platformName', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Support Email</label>
                    <Input
                      type="email"
                      value={settings.general.supportEmail || ''}
                      onChange={(e) => updateSetting('general', 'supportEmail', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Support Phone</label>
                    <Input
                      value={settings.general.supportPhone || ''}
                      onChange={(e) => updateSetting('general', 'supportPhone', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Default Currency</label>
                    <Input
                      value={settings.general.defaultCurrency || ''}
                      onChange={(e) => updateSetting('general', 'defaultCurrency', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Default Country</label>
                    <Input
                      value={settings.general.defaultCountry || ''}
                      onChange={(e) => updateSetting('general', 'defaultCountry', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Timezone</label>
                    <Input
                      value={settings.general.timezone || ''}
                      onChange={(e) => updateSetting('general', 'timezone', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-warm-900">Maintenance Mode</label>
                      <p className="text-xs text-warm-800/60">Temporarily disable the platform</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.general.maintenanceMode || false}
                      onChange={(e) => updateSetting('general', 'maintenanceMode', e.target.checked)}
                      className="h-5 w-5 rounded border-warm-300 text-primary focus:ring-primary"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-warm-900">Enable Registrations</label>
                      <p className="text-xs text-warm-800/60">Allow new user signups</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.general.enableRegistrations !== false}
                      onChange={(e) => updateSetting('general', 'enableRegistrations', e.target.checked)}
                      className="h-5 w-5 rounded border-warm-300 text-primary focus:ring-primary"
                    />
                  </div>
                </div>
              </Card>
            )}

            {activeTab === 'marketplace' && (
              <Card className="p-6 space-y-4">
                <h3 className="font-semibold text-warm-900 mb-4">Marketplace Settings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: 'enableSellers', label: 'Enable Sellers', desc: 'Allow seller registration and shop creation' },
                    { key: 'enableRiders', label: 'Enable Riders', desc: 'Allow rider registration and delivery' },
                    { key: 'enableGuestCheckout', label: 'Guest Checkout', desc: 'Allow checkout without account' },
                    { key: 'enableShopCreation', label: 'Shop Creation', desc: 'Allow new shop creation' },
                    { key: 'enableMessaging', label: 'Messaging', desc: 'Enable user-to-user messaging' },
                    { key: 'enableReviews', label: 'Reviews', desc: 'Enable product/shop reviews' },
                    { key: 'enableWishlist', label: 'Wishlist', desc: 'Enable wishlist functionality' },
                    { key: 'enableFollowing', label: 'Following', desc: 'Enable shop following' },
                    { key: 'enableBookings', label: 'Bookings', desc: 'Enable service bookings' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-warm-900">{item.label}</label>
                        <p className="text-xs text-warm-800/60">{item.desc}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.marketplace[item.key] !== false}
                        onChange={(e) => updateSetting('marketplace', item.key, e.target.checked)}
                        className="h-5 w-5 rounded border-warm-300 text-primary focus:ring-primary"
                      />
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {activeTab === 'commission' && (
              <Card className="p-6 space-y-4">
                <h3 className="font-semibold text-warm-900 mb-4">Commission Settings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Seller Commission (%)</label>
                    <Input
                      type="number"
                      value={settings.commission.sellerCommission || 0}
                      onChange={(e) => updateSetting('commission', 'sellerCommission', parseFloat(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Rider Commission (%)</label>
                    <Input
                      type="number"
                      value={settings.commission.riderCommission || 0}
                      onChange={(e) => updateSetting('commission', 'riderCommission', parseFloat(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Minimum Withdrawal (GHS)</label>
                    <Input
                      type="number"
                      value={settings.commission.minimumWithdrawal || 0}
                      onChange={(e) => updateSetting('commission', 'minimumWithdrawal', parseFloat(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </Card>
            )}

            {activeTab === 'payment' && (
              <Card className="p-6 space-y-4">
                <h3 className="font-semibold text-warm-900 mb-4">Payment Settings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-warm-900">Paystack Configured</label>
                      <p className="text-xs text-warm-800/60">Payment provider status</p>
                    </div>
                    <Badge variant={settings.payment.paystackConfigured ? 'verified' : 'default'}>
                      {settings.payment.paystackConfigured ? 'Connected' : 'Not Configured'}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Payment Currency</label>
                    <Input
                      value={settings.payment.paymentCurrency || ''}
                      onChange={(e) => updateSetting('payment', 'paymentCurrency', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Minimum Payout (GHS)</label>
                    <Input
                      type="number"
                      value={settings.payment.minimumPayout || 0}
                      onChange={(e) => updateSetting('payment', 'minimumPayout', parseFloat(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </Card>
            )}

            {activeTab === 'delivery' && (
              <Card className="p-6 space-y-4">
                <h3 className="font-semibold text-warm-900 mb-4">Delivery Settings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-warm-900">Enable Delivery</label>
                      <p className="text-xs text-warm-800/60">Allow delivery orders</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.delivery.deliveryEnabled !== false}
                      onChange={(e) => updateSetting('delivery', 'deliveryEnabled', e.target.checked)}
                      className="h-5 w-5 rounded border-warm-300 text-primary focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Minimum Delivery Fee (GHS)</label>
                    <Input
                      type="number"
                      value={settings.delivery.minimumDeliveryFee || 0}
                      onChange={(e) => updateSetting('delivery', 'minimumDeliveryFee', parseFloat(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Maximum Delivery Fee (GHS)</label>
                    <Input
                      type="number"
                      value={settings.delivery.maximumDeliveryFee || 0}
                      onChange={(e) => updateSetting('delivery', 'maximumDeliveryFee', parseFloat(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-warm-900">Rider Approval Required</label>
                      <p className="text-xs text-warm-800/60">Admins must approve riders</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.delivery.riderApprovalRequired !== false}
                      onChange={(e) => updateSetting('delivery', 'riderApprovalRequired', e.target.checked)}
                      className="h-5 w-5 rounded border-warm-300 text-primary focus:ring-primary"
                    />
                  </div>
                </div>
              </Card>
            )}

            {activeTab === 'security' && (
              <Card className="p-6 space-y-4">
                <h3 className="font-semibold text-warm-900 mb-4">Security Settings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-warm-900">Email/Password Login</label>
                      <p className="text-xs text-warm-800/60">Allow traditional login</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.security.emailLoginEnabled !== false}
                      onChange={(e) => updateSetting('security', 'emailLoginEnabled', e.target.checked)}
                      className="h-5 w-5 rounded border-warm-300 text-primary focus:ring-primary"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-warm-900">Google Sign-In</label>
                      <p className="text-xs text-warm-800/60">Allow OAuth login</p>
                    </div>
                    <Badge variant={settings.security.googleLoginEnabled ? 'verified' : 'default'}>
                      {settings.security.googleLoginEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-warm-900">Phone Verification</label>
                      <p className="text-xs text-warm-800/60">Require phone verification</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.security.phoneVerificationEnabled === true}
                      onChange={(e) => updateSetting('security', 'phoneVerificationEnabled', e.target.checked)}
                      className="h-5 w-5 rounded border-warm-300 text-primary focus:ring-primary"
                    />
                  </div>
                </div>
              </Card>
            )}

            {activeTab === 'notifications' && (
              <Card className="p-6 space-y-4">
                <h3 className="font-semibold text-warm-900 mb-4">Notification Settings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: 'emailNotifications', label: 'Email Notifications', desc: 'Send email notifications' },
                    { key: 'orderNotifications', label: 'Order Notifications', desc: 'Notify on new orders' },
                    { key: 'newSellerNotifications', label: 'New Seller Alerts', desc: 'Notify when seller registers' },
                    { key: 'newRiderNotifications', label: 'New Rider Alerts', desc: 'Notify when rider registers' },
                    { key: 'paymentNotifications', label: 'Payment Alerts', desc: 'Notify on payments' },
                    { key: 'withdrawalNotifications', label: 'Withdrawal Alerts', desc: 'Notify on withdrawals' },
                    { key: 'deliveryNotifications', label: 'Delivery Alerts', desc: 'Notify on delivery updates' },
                    { key: 'supportNotifications', label: 'Support Alerts', desc: 'Notify on support tickets' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-warm-900">{item.label}</label>
                        <p className="text-xs text-warm-800/60">{item.desc}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.notifications[item.key] !== false}
                        onChange={(e) => updateSetting('notifications', item.key, e.target.checked)}
                        className="h-5 w-5 rounded border-warm-300 text-primary focus:ring-primary"
                      />
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {activeTab === 'email' && (
              <Card className="p-6 space-y-4">
                <h3 className="font-semibold text-warm-900 mb-4">Email Settings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-warm-900">Email Provider</label>
                      <p className="text-xs text-warm-800/60">Email service status</p>
                    </div>
                    <Badge variant={settings.email.providerConfigured ? 'verified' : 'default'}>
                      {settings.email.providerConfigured ? 'Configured' : 'Not Configured'}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Sender Email</label>
                    <Input
                      value={settings.email.senderEmail || ''}
                      onChange={(e) => updateSetting('email', 'senderEmail', e.target.value)}
                      className="mt-1"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-warm-800/50 uppercase">Sender Name</label>
                    <Input
                      value={settings.email.senderName || ''}
                      onChange={(e) => updateSetting('email', 'senderName', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <p className="text-xs text-warm-800/60 mt-2">Email secrets are never exposed in the browser. Configure email settings via backend environment variables.</p>
              </Card>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
