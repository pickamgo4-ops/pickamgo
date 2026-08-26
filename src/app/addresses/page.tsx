'use client'

import React, { useState, useEffect } from 'react'
import { MapPin, Plus, Edit2, Trash2, Check, X } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { BottomNav } from '../../components/layout/BottomNav'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Input } from '../../components/ui/Input'
import { api } from '../../lib/api'
import { Address } from '../../types'
import { mapApiAddressToFrontend } from '../../lib/api-mappers'

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    label: '',
    street: '',
    city: '',
    region: '',
    country: 'Ghana',
    phone: '',
    instructions: '',
    isDefault: false,
  })

  useEffect(() => {
    loadAddresses()
  }, [])

  const loadAddresses = async () => {
    setLoading(true)
    try {
      const response = await api.get<Address[]>('/addresses')
      if (response.success && Array.isArray(response.data)) {
        setAddresses(response.data.map(mapApiAddressToFrontend))
      }
    } catch (err) {
      console.error('Failed to load addresses:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const isEdit = editingId !== null
      const endpoint = isEdit ? `/addresses/${editingId}` : '/addresses'
      const method = isEdit ? api.patch : api.post

      const payload = {
        label: formData.label,
        address: formData.street,
        city: formData.city,
        area: formData.region || formData.city,
        region: formData.region,
        country: formData.country || 'Ghana',
        phone: formData.phone,
        instructions: formData.instructions || undefined,
        isDefault: addresses.length === 0 || formData.isDefault,
      }

      const response = await method<Address>(endpoint, payload)

      if (response.success && response.data) {
        const mapped = mapApiAddressToFrontend(response.data)
        if (isEdit) {
          setAddresses(prev => prev.map(a => a.id === editingId ? mapped : a))
        } else {
          setAddresses(prev => [...prev, mapped])
        }
        resetForm()
      } else {
        console.error('Address save failed:', response.error)
      }
    } catch (err) {
      console.error('Failed to save address:', err)
    }
  }

  const handleEdit = (addr: Address) => {
    setFormData({
      label: addr.label,
      street: addr.street,
      city: addr.city,
      region: addr.region,
      country: addr.country,
      phone: addr.phone,
      instructions: addr.instructions || '',
      isDefault: addr.isDefault,
    })
    setEditingId(addr.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return
    try {
      const response = await api.delete(`/addresses/${id}`)
      if (response.success) {
        setAddresses(prev => prev.filter(a => a.id !== id))
      }
    } catch (err) {
      console.error('Failed to delete address:', err)
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      const response = await api.patch(`/addresses/${id}`, { isDefault: true })
      if (response.success) {
        setAddresses(prev => prev.map(a => ({
          ...a,
          isDefault: a.id === id,
        })))
      }
    } catch (err) {
      console.error('Failed to set default:', err)
    }
  }

  const resetForm = () => {
    setFormData({
      label: '',
      street: '',
      city: '',
      region: '',
      country: 'Ghana',
      phone: '',
      instructions: '',
      isDefault: false,
    })
    setShowForm(false)
    setEditingId(null)
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <MapPin size={28} className="text-primary" />
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
                My Addresses
              </h1>
              <p className="text-warm-800/60">{addresses.length} saved addresses</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              resetForm()
              setShowForm(true)
            }}
            icon={<Plus size={18} />}
          >
            Add
          </Button>
        </div>

        {/* Address Form */}
        {showForm && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-200 mb-6 animate-slide-up">
            <h3 className="font-semibold text-warm-900 mb-4">
              {editingId ? 'Edit Address' : 'Add New Address'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                placeholder="Label (e.g., Home, Work)"
                value={formData.label}
                onValueChange={(v) => setFormData({ ...formData, label: v })}
                required
              />
              <Input
                placeholder="Street Address"
                value={formData.street}
                onValueChange={(v) => setFormData({ ...formData, street: v })}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="City"
                  value={formData.city}
                  onValueChange={(v) => setFormData({ ...formData, city: v })}
                  required
                />
                <Input
                  placeholder="Region"
                  value={formData.region}
                  onValueChange={(v) => setFormData({ ...formData, region: v })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Country"
                  value={formData.country}
                  onValueChange={(v) => setFormData({ ...formData, country: v })}
                />
                <Input
                  placeholder="Phone Number"
                  value={formData.phone}
                  onValueChange={(v) => setFormData({ ...formData, phone: v })}
                  required
                />
              </div>
              <Input
                placeholder="Delivery Instructions (optional)"
                value={formData.instructions}
                onValueChange={(v) => setFormData({ ...formData, instructions: v })}
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="rounded border-warm-200 text-primary focus:ring-primary"
                />
                <span className="text-sm text-warm-800/70">Set as default address</span>
              </label>
              <div className="flex gap-2 pt-2">
                <Button type="submit" size="sm">
                  {editingId ? 'Update Address' : 'Save Address'}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-warm-800/60">Loading addresses...</p>
            </div>
          </div>
        ) : addresses.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-warm-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin size={32} className="text-warm-800/30" />
            </div>
            <h2 className="font-display text-xl font-bold text-warm-900 mb-2">
              No addresses yet
            </h2>
            <p className="text-warm-800/60 mb-6 max-w-md mx-auto">
              Add your first address to make checkout faster.
            </p>
            <Button onClick={() => setShowForm(true)} icon={<Plus size={18} />}>
              Add Address
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="bg-white rounded-2xl p-4 shadow-sm border border-warm-200 animate-fade-in"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-warm-900">{addr.label}</span>
                      {addr.isDefault && (
                        <Badge variant="default" className="text-[10px]">Default</Badge>
                      )}
                    </div>
                    <p className="text-sm text-warm-800/70">
                      {addr.street}, {addr.city}, {addr.region}
                    </p>
                    <p className="text-sm text-warm-800/60">{addr.phone}</p>
                    {addr.instructions && (
                      <p className="text-xs text-warm-800/50 mt-1 italic">{addr.instructions}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {!addr.isDefault && (
                      <button
                        onClick={() => handleSetDefault(addr.id)}
                        className="p-2 text-warm-800/40 hover:text-primary transition-colors"
                        title="Set as default"
                      >
                        <Check size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(addr)}
                      className="p-2 text-warm-800/40 hover:text-primary transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(addr.id)}
                      className="p-2 text-warm-800/40 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
