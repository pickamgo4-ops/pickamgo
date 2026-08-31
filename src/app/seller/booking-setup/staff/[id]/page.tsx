'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Clock, Save } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { api } from '@/lib/api'

interface Availability {
  dayOfWeek: number
  startTime: string
  endTime: string
  breakStart?: string
  breakEnd?: string
  isAvailable: boolean
  isDayOff: boolean
}

interface Service {
  id: string
  name: string
  duration: string
  price: number
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function StaffDetailPage() {
  const params = useParams()
  const router = useRouter()
  const staffId = params.id as string
  const [staff, setStaff] = useState<any>(null)
  const [availability, setAvailability] = useState<Availability[]>(
    DAYS.map((_, i) => ({ dayOfWeek: i, startTime: '09:00', endTime: '17:00', isAvailable: i !== 0, isDayOff: i === 0 }))
  )
  const [services, setServices] = useState<Service[]>([])
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [staffId])

  const load = async () => {
    setLoading(true)
    try {
      const [staffRes, availRes, servicesData, currentServices] = await Promise.all([
        api.get<any[]>(`/booking-setup/staff`),
        api.get<Availability[]>(`/booking-setup/staff/${staffId}/availability`),
        api.get<{ services: Service[] }>(`/services?limit=100`),
        api.get<Service[]>(`/booking-setup/staff/${staffId}/services`),
      ])
      const list = (staffRes.data as any) || []
      const found = list.find((s: any) => s.id === staffId)
      setStaff(found)
      if (servicesData.success && servicesData.data) setServices(servicesData.data.services || [])
      if (currentServices.success && currentServices.data) {
        setSelectedServiceIds((currentServices.data as Service[]).map(s => s.id))
      }
      if (availRes.success && availRes.data) {
        const loaded = availRes.data as Availability[]
        const merged = DAYS.map((_, i) => {
          const found = loaded.find(a => a.dayOfWeek === i)
          return found || { dayOfWeek: i, startTime: '09:00', endTime: '17:00', isAvailable: i !== 0, isDayOff: i === 0 }
        })
        setAvailability(merged)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const updateDay = (index: number, updates: Partial<Availability>) => {
    setAvailability(prev => prev.map((a, i) => i === index ? { ...a, ...updates } : a))
  }

  const handleSaveAvailability = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await api.patch(`/booking-setup/staff/${staffId}/availability`, { availabilities: availability })
      if (res.success) {
        setError('')
      } else {
        setError(res.error || 'Failed to save')
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveServices = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await api.patch(`/booking-setup/staff/${staffId}/services`, { serviceIds: selectedServiceIds })
      if (!res.success) setError(res.error || 'Failed to save services')
    } catch (err: any) {
      setError(err?.message || 'Failed to save services')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <SellerSidebar><div className="py-20 text-center text-warm-800/60">Loading...</div></SellerSidebar>
  }

  return (
    <SellerSidebar>
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => router.push('/seller/booking-setup/staff')} className="p-2 rounded-xl hover:bg-warm-100">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold text-warm-900">{staff?.name || 'Staff'}</h1>
            <p className="text-sm text-warm-800/60">{staff?.role}</p>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-warm-800/70" />
            <h2 className="font-semibold text-warm-900">Weekly Schedule</h2>
          </div>
          <div className="space-y-3">
            {availability.map((day, i) => (
              <div key={day.dayOfWeek} className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-3 items-center border-b border-warm-100 pb-3 last:border-0">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!day.isDayOff}
                    onChange={e => updateDay(i, { isDayOff: !e.target.checked, isAvailable: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-warm-900">{DAYS[i]}</span>
                </div>
                {!day.isDayOff ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Input type="time" value={day.startTime} onChange={e => updateDay(i, { startTime: e.target.value })} className="w-32" />
                    <span className="text-sm text-warm-800/60">to</span>
                    <Input type="time" value={day.endTime} onChange={e => updateDay(i, { endTime: e.target.value })} className="w-32" />
                    <span className="text-sm text-warm-800/40 ml-2">Break:</span>
                    <Input type="time" value={day.breakStart || ''} onChange={e => updateDay(i, { breakStart: e.target.value })} className="w-32" placeholder="Start" />
                    <span className="text-sm text-warm-800/40">-</span>
                    <Input type="time" value={day.breakEnd || ''} onChange={e => updateDay(i, { breakEnd: e.target.value })} className="w-32" placeholder="End" />
                  </div>
                ) : (
                  <span className="text-sm text-warm-800/50 italic">Day off</span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSaveAvailability} disabled={saving}>
              <Save size={16} className="mr-2" /> {saving ? 'Saving...' : 'Save Schedule'}
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold text-warm-900 mb-4">Services this staff can perform</h2>
          {services.length === 0 ? (
            <p className="text-sm text-warm-800/60">No services available. Create services first.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {services.map(s => (
                <label key={s.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${selectedServiceIds.includes(s.id) ? 'border-primary bg-primary/5' : 'border-warm-200 hover:border-warm-300'}`}>
                  <input
                    type="checkbox"
                    checked={selectedServiceIds.includes(s.id)}
                    onChange={e => {
                      if (e.target.checked) setSelectedServiceIds([...selectedServiceIds, s.id])
                      else setSelectedServiceIds(selectedServiceIds.filter(id => id !== s.id))
                    }}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="font-medium text-warm-900">{s.name}</p>
                    <p className="text-xs text-warm-800/60">{s.duration} · GH₵{s.price}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSaveServices} disabled={saving}>
              <Save size={16} className="mr-2" /> {saving ? 'Saving...' : 'Save Service Assignments'}
            </Button>
          </div>
        </Card>
      </div>
    </SellerSidebar>
  )
}
