'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Ticket, Percent, Users, Calendar, Shield } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/api'
import { useRole } from '@/contexts/RoleContext'

type DiscountType = 'PERCENTAGE' | 'FIXED'
type Status = 'DRAFT' | 'ACTIVE' | 'PAUSED'
type CustomerEligibility = 'EVERYONE' | 'NEW_ONLY' | 'EXISTING_ONLY'
type DiscountAppliesTo = 'PRODUCTS' | 'PRODUCTS_AND_DELIVERY'

export default function CreateSellerPromoPage() {
  const router = useRouter()
  const { user } = useRole()
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
    usageLimit: '',
    usagePerCustomer: '1',
    startAt: '',
    endAt: '',
    status: 'DRAFT' as Status,
    customerEligibility: 'EVERYONE' as CustomerEligibility,
    discountAppliesTo: 'PRODUCTS' as DiscountAppliesTo,
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
      const payload: any = {
        code: form.code,
        campaignName: form.campaignName || undefined,
        description: form.description || undefined,
        discountType: form.discountType,
        discountValue: parseFloat(form.discountValue),
        maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : null,
        minimumOrderAmount: parseFloat(form.minimumOrderAmount),
        usageLimit: form.usageLimit ? parseInt(form.usageLimit) : null,
        usagePerCustomer: form.usagePerCustomer === '0' ? null : parseInt(form.usagePerCustomer),
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        status: form.status,
        customerEligibility: form.customerEligibility,
        discountAppliesTo: form.discountAppliesTo,
      }

      const res = await api.createSellerPromo(payload)
      if (res.success) {
        setSuccess('Promo code created successfully!')
        setTimeout(() => router.push('/seller/promo-codes'), 1000)
      } else {
        setError(res.error || 'Failed to create promo code')
      }
    } catch (err) {
      setError('An error occurred while creating the promo code')
    } finally {
      setLoading(false)
    }
  }

  const isValid = form.code && form.discountValue && form.startAt && form.endAt

  return (
    <SellerSidebar>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-warm-100 transition-colors">
            <ArrowLeft size={20} className="text-warm-800" />
          </button>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">Create Promo Code</h1>
            <p className="text-warm-800/60 text-sm mt-1">Set up a promotion for your shop</p>
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
                  placeholder="e.g., SAVE10"
                  value={form.code}
                  onValueChange={(v) => updateField('code', v.toUpperCase().replace(/\s+/g, ''))}
                  className="font-mono uppercase"
                />
                <p className="text-xs text-warm-800/50 mt-1">Automatically converted to uppercase</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-warm-900 mb-1.5">Campaign Name</label>
                <Input
                  placeholder="e.g., Summer Sale"
                  value={form.campaignName}
                  onValueChange={(v) => updateField('campaignName', v)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-warm-900 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Optional description"
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
                    value={form.maxDiscount}
                    onValueChange={(v) => updateField('maxDiscount', v)}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-warm-900 mb-1.5">Minimum Order Amount (GH₵)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
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
    </SellerSidebar>
  )
}
