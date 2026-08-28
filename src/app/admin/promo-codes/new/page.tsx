'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Ticket, Percent, DollarSign, Users, Calendar, Target, Shield, Wallet } from 'lucide-react'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { api } from '@/lib/api'
import { useRole } from '@/contexts/RoleContext'

type DiscountType = 'PERCENTAGE' | 'FIXED'
type FundingType = 'SELLER' | 'PICKAMGO'
type Status = 'DRAFT' | 'ACTIVE' | 'PAUSED'
type CustomerEligibility = 'EVERYONE' | 'NEW_ONLY' | 'EXISTING_ONLY'
type DiscountAppliesTo = 'PRODUCTS' | 'PRODUCTS_AND_DELIVERY'
type AppliesToType = 'ALL' | 'SHOPS' | 'PRODUCTS' | 'CATEGORIES' | 'CAMPUSES'

export default function CreatePromoPage() {
  const router = useRouter()
  const { user } = useRole()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    code: '',
    campaignName: '',
    description: '',
    discountType: 'PERCENTAGE' as DiscountType,
    discountValue: '',
    maxDiscount: '',
    minimumOrderAmount: '0',
    fundingType: 'SELLER' as FundingType,
    usageLimit: '',
    usagePerCustomer: '1',
    startAt: '',
    endAt: '',
    status: 'DRAFT' as Status,
    appliesToType: 'ALL' as AppliesToType,
    appliesToValues: [] as string[],
    customerEligibility: 'EVERYONE' as CustomerEligibility,
    discountAppliesTo: 'PRODUCTS' as DiscountAppliesTo,
    campaignBudget: '',
  })

  const updateField = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const appliesToObj = { type: form.appliesToType, values: form.appliesToValues }
      const payload: any = {
        code: form.code,
        campaignName: form.campaignName || undefined,
        description: form.description || undefined,
        discountType: form.discountType,
        discountValue: parseFloat(form.discountValue),
        maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : null,
        minimumOrderAmount: parseFloat(form.minimumOrderAmount),
        fundingType: form.fundingType,
        usageLimit: form.usageLimit ? parseInt(form.usageLimit) : null,
        usagePerCustomer: form.usagePerCustomer === '0' ? null : parseInt(form.usagePerCustomer),
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        status: form.status,
        appliesTo: JSON.stringify(appliesToObj),
        customerEligibility: form.customerEligibility,
        discountAppliesTo: form.discountAppliesTo,
        campaignBudget: form.fundingType === 'PICKAMGO' && form.campaignBudget ? parseFloat(form.campaignBudget) : null,
      }

      const res = await api.createAdminPromo(payload)
      if (res.success) {
        setSuccess('Promo code created successfully!')
        setTimeout(() => router.push('/admin/promo-codes'), 1000)
      } else {
        setError(res.error || 'Failed to create promo code')
      }
    } catch (err) {
      setError('An error occurred while creating the promo code')
    } finally {
      setLoading(false)
    }
  }

  const isValid = form.code && form.discountValue && form.startAt && form.endAt && (form.fundingType !== 'PICKAMGO' || form.campaignBudget)

  return (
    <div className="min-h-screen">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="md:ml-64 min-w-0 max-w-full overflow-x-hidden pt-14 md:pt-0">
        <div className="max-w-4xl mx-auto min-w-0 p-4 md:p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-warm-100 transition-colors">
              <ArrowLeft size={20} className="text-warm-800" />
            </button>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">Create Promo Code</h1>
              <p className="text-warm-800/60 text-sm mt-1">Set up a new promotional campaign</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-200">
              <h3 className="font-semibold text-warm-900 mb-4 flex items-center gap-2">
                <Ticket size={20} className="text-primary" />
                Promo Code
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-warm-900 mb-1.5">Promo Code *</label>
                  <Input
                    placeholder="e.g., PICKAMGO10"
                    value={form.code}
                    onValueChange={(v) => updateField('code', v.toUpperCase().replace(/\s+/g, ''))}
                    className="font-mono uppercase"
                  />
                  <p className="text-xs text-warm-800/50 mt-1">Automatically converted to uppercase</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-warm-900 mb-1.5">Campaign Name</label>
                  <Input
                    placeholder="e.g., Freshers Campaign"
                    value={form.campaignName}
                    onValueChange={(v) => updateField('campaignName', v)}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-warm-900 mb-1.5">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="Optional description for internal reference"
                    className="w-full bg-warm-50 border border-warm-200 rounded-xl py-3 px-4 text-warm-900 placeholder:text-warm-800/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none h-20"
                  />
                </div>
              </div>
            </div>

            {/* Discount Settings */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-200">
              <h3 className="font-semibold text-warm-900 mb-4 flex items-center gap-2">
                <Percent size={20} className="text-primary" />
                Discount Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-warm-900 mb-1.5">Discount Type *</label>
                  <select
                    value={form.discountType}
                    onChange={(e) => updateField('discountType', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-warm-200 bg-warm-50 text-sm text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-warm-900 mb-1.5">
                    Discount Value * ({form.discountType === 'PERCENTAGE' ? '%' : 'GH₵'})
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={form.discountType === 'PERCENTAGE' ? '10' : '5.00'}
                    value={form.discountValue}
                    onValueChange={(v) => updateField('discountValue', v)}
                  />
                </div>
                {form.discountType === 'PERCENTAGE' && (
                  <div>
                    <label className="block text-sm font-medium text-warm-900 mb-1.5">Maximum Discount (GH₵)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g., 15.00"
                      value={form.maxDiscount}
                      onValueChange={(v) => updateField('maxDiscount', v)}
                    />
                    <p className="text-xs text-warm-800/50 mt-1">Leave empty for unlimited</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-warm-900 mb-1.5">Minimum Order Amount (GH₵)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.minimumOrderAmount}
                    onValueChange={(v) => updateField('minimumOrderAmount', v)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-warm-900 mb-1.5">Discount Applies To</label>
                  <select
                    value={form.discountAppliesTo}
                    onChange={(e) => updateField('discountAppliesTo', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-warm-200 bg-warm-50 text-sm text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="PRODUCTS">Products only</option>
                    <option value="PRODUCTS_AND_DELIVERY">Products + Delivery</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Usage Limits */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-200">
              <h3 className="font-semibold text-warm-900 mb-4 flex items-center gap-2">
                <Users size={20} className="text-primary" />
                Usage Limits
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-warm-900 mb-1.5">Total Usage Limit</label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={form.usageLimit}
                    onValueChange={(v) => updateField('usageLimit', v)}
                  />
                  <p className="text-xs text-warm-800/50 mt-1">Leave empty for unlimited</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-warm-900 mb-1.5">Uses Per Customer</label>
                  <select
                    value={form.usagePerCustomer}
                    onChange={(e) => updateField('usagePerCustomer', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-warm-200 bg-warm-50 text-sm text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="1">Once</option>
                    <option value="2">2 times</option>
                    <option value="3">3 times</option>
                    <option value="0">Unlimited</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-200">
              <h3 className="font-semibold text-warm-900 mb-4 flex items-center gap-2">
                <Calendar size={20} className="text-primary" />
                Promotion Dates
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-warm-900 mb-1.5">Start Date & Time *</label>
                  <Input
                    type="datetime-local"
                    value={form.startAt}
                    onValueChange={(v) => updateField('startAt', v)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-warm-900 mb-1.5">End Date & Time *</label>
                  <Input
                    type="datetime-local"
                    value={form.endAt}
                    onValueChange={(v) => updateField('endAt', v)}
                  />
                </div>
              </div>
            </div>

            {/* Targeting */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-200">
              <h3 className="font-semibold text-warm-900 mb-4 flex items-center gap-2">
                <Target size={20} className="text-primary" />
                Targeting
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-warm-900 mb-1.5">Apply To</label>
                  <select
                    value={form.appliesToType}
                    onChange={(e) => updateField('appliesToType', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-warm-200 bg-warm-50 text-sm text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="ALL">All shops</option>
                    <option value="SHOPS">Selected shops</option>
                    <option value="PRODUCTS">Selected products</option>
                    <option value="CATEGORIES">Selected categories</option>
                    <option value="CAMPUSES">Selected campuses</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-warm-900 mb-1.5">Customer Eligibility</label>
                  <select
                    value={form.customerEligibility}
                    onChange={(e) => updateField('customerEligibility', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-warm-200 bg-warm-50 text-sm text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="EVERYONE">Everyone</option>
                    <option value="NEW_ONLY">New customers only</option>
                    <option value="EXISTING_ONLY">Existing customers only</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Funding */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-200">
              <h3 className="font-semibold text-warm-900 mb-4 flex items-center gap-2">
                <Wallet size={20} className="text-primary" />
                Funding Type
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-warm-900 mb-1.5">Who funds the discount?</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => updateField('fundingType', 'SELLER')}
                      className={`flex-1 p-4 rounded-xl border-2 text-center transition-all ${form.fundingType === 'SELLER' ? 'border-primary bg-primary/5' : 'border-warm-200 hover:border-warm-300'}`}
                    >
                      <p className="font-medium text-sm text-warm-900">Seller-funded</p>
                      <p className="text-xs text-warm-800/60 mt-1">Seller absorbs the discount</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField('fundingType', 'PICKAMGO')}
                      className={`flex-1 p-4 rounded-xl border-2 text-center transition-all ${form.fundingType === 'PICKAMGO' ? 'border-primary bg-primary/5' : 'border-warm-200 hover:border-warm-300'}`}
                    >
                      <p className="font-medium text-sm text-warm-900">PickAmGo-funded</p>
                      <p className="text-xs text-warm-800/60 mt-1">Platform pays for discount</p>
                    </button>
                  </div>
                </div>
                {form.fundingType === 'PICKAMGO' && (
                  <div>
                    <label className="block text-sm font-medium text-warm-900 mb-1.5">Campaign Budget (GH₵) *</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g., 1000"
                      value={form.campaignBudget}
                      onValueChange={(v) => updateField('campaignBudget', v)}
                    />
                    <p className="text-xs text-warm-800/50 mt-1">Promo will stop when budget is exhausted</p>
                  </div>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-200">
              <h3 className="font-semibold text-warm-900 mb-4 flex items-center gap-2">
                <Shield size={20} className="text-primary" />
                Status
              </h3>
              <div className="flex gap-3">
                {(['DRAFT', 'ACTIVE', 'PAUSED'] as Status[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => updateField('status', status)}
                    className={`flex-1 p-3 rounded-xl border-2 text-center transition-all ${form.status === status ? 'border-primary bg-primary/5' : 'border-warm-200 hover:border-warm-300'}`}
                  >
                    <span className="font-medium text-sm text-warm-900">{status}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-3">
              <Button type="submit" fullWidth disabled={loading || !isValid}>
                {loading ? 'Creating...' : 'Create Promo Code'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
