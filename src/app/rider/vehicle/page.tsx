'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bike, Edit2, Trash2, Plus, Save } from 'lucide-react'
import { RiderSidebar } from '@/components/RiderSidebar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { VEHICLE_TYPES } from '@/lib/rider-constants'
import { api } from '@/lib/api'
import { useRider } from '@/hooks/useRider'
import { RiderLoadingState } from '@/components/RiderAuthGuard'

export default function RiderVehiclePage() {
  const router = useRouter()
  const { rider, loading: riderLoading } = useRider()
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({
    vehicleType: rider?.vehicleType || 'MOTORCYCLE',
    vehicleNumber: rider?.vehicleNumber || '',
    licenseNumber: rider?.licenseNumber || '',
  })

  useEffect(() => {
    if (rider) {
      setForm({
        vehicleType: rider.vehicleType || 'MOTORCYCLE',
        vehicleNumber: rider.vehicleNumber || '',
        licenseNumber: rider.licenseNumber || '',
      })
    }
  }, [rider])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await api.updateRiderVehicle({
        vehicleType: form.vehicleType,
        vehicleNumber: form.vehicleNumber,
        licenseNumber: form.licenseNumber,
      })
      if (res.success) {
        setSuccess('Vehicle information updated successfully')
        setEditing(false)
      } else {
        setError(res.error || 'Failed to update vehicle information')
      }
    } catch {
      setError('Failed to update vehicle information')
    } finally {
      setSaving(false)
    }
  }

  if (riderLoading) {
    return (
      <RiderSidebar>
        <RiderLoadingState message="Loading vehicle information..." />
      </RiderSidebar>
    )
  }

  if (!rider) {
    return (
      <RiderSidebar>
        <div className="text-center py-20">
          <p className="text-warm-800/60">No rider profile found</p>
        </div>
      </RiderSidebar>
    )
  }

  return (
    <RiderSidebar>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">Vehicle Information</h1>
            <p className="text-warm-800/60 mt-1">Manage your vehicle details for deliveries</p>
          </div>
          {!editing && (
            <Button
              size="sm"
              icon={<Edit2 size={16} />}
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
            {success}
          </div>
        )}

        <Card className="p-6">
          {!editing ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-warm-800/60">Vehicle Type</span>
                <span className="font-medium text-warm-900">
                  {VEHICLE_TYPES.find(v => v.value === rider.vehicleType)?.label || rider.vehicleType || 'Not set'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-warm-800/60">Vehicle Number / Registration</span>
                <span className="font-medium text-warm-900">{rider.vehicleNumber || 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-warm-800/60">License Number</span>
                <span className="font-medium text-warm-900">{rider.licenseNumber || 'Not set'}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-warm-900 mb-2">Vehicle Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {VEHICLE_TYPES.map((type) => {
                    const Icon = type.icon
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setForm({ ...form, vehicleType: type.value })}
                        className={`flex flex-col items-center gap-2 p-3 border-2 rounded-xl transition-all ${
                          form.vehicleType === type.value
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-warm-200 hover:border-warm-300 text-warm-800'
                        }`}
                      >
                        <Icon size={20} />
                        <span className="text-xs font-medium">{type.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <Input
                label="Vehicle Number / Registration"
                placeholder="e.g. RAB 123-4"
                value={form.vehicleNumber}
                onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value.toUpperCase() })}
              />

              <Input
                label="License Number"
                placeholder="e.g. DL-123456"
                value={form.licenseNumber}
                onChange={(e) => setForm({ ...form, licenseNumber: e.target.value.toUpperCase() })}
              />

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => { setEditing(false); setError(''); setSuccess('') }}
                >
                  Cancel
                </Button>
                <Button
                  fullWidth
                  loading={saving}
                  icon={<Save size={16} />}
                  onClick={handleSave}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </RiderSidebar>
  )
}
