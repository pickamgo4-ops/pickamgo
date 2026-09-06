'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, ChevronRight, Clock3, Users } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Card } from '@/components/ui/Card'
import { api } from '@/lib/api'

interface Service {
  id: string
  name: string
  description: string
  price: number
  duration: string
  status: string
  minNoticeHours: number
  maxAdvanceDays: number
  bufferMinutes: number
  allowStaffSelection: boolean
  requireApproval: boolean
  staffRequired: boolean
}

interface Staff {
  id: string
  name: string
  role: string
  isActive: boolean
  services: Array<{ service: { id: string; name: string } }>
}

export default function AvailabilityPage() {
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([])
  const [staffCount, setStaffCount] = useState(0)
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      const [servicesRes, staffRes] = await Promise.all([
        api.get<{ services: Service[] }>('/booking-setup/services'),
        api.get<Staff[]>('/booking-setup/staff'),
      ])
      if (servicesRes.success && servicesRes.data) setServices(servicesRes.data.services || [])
      if (staffRes.success && staffRes.data) {
        setStaff(staffRes.data)
        setStaffCount(staffRes.data.length)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <SellerSidebar><div className="py-20 text-center text-warm-800/60">Loading...</div></SellerSidebar>
  }

  return (
    <SellerSidebar>
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => router.push('/seller/booking-setup')} className="p-2 rounded-xl hover:bg-warm-100">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold text-warm-900">Availability</h1>
            <p className="text-sm text-warm-800/60">Manage working hours, breaks, and days off for staff.</p>
          </div>
        </div>

        {staffCount === 0 ? (
          <Card className="p-8 text-center">
            <Calendar size={40} className="mx-auto text-warm-300 mb-2" />
            <p className="text-warm-800/60 mb-3">Add staff members first to configure their availability.</p>
            <button
              type="button"
              onClick={() => router.push('/seller/booking-setup/staff')}
              className="text-primary font-medium hover:text-primary-dark"
            >
              Go to Staff →
            </button>
          </Card>
        ) : (
          <>
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4"><Calendar size={18} className="text-primary" /><h2 className="font-semibold text-warm-900">Staff schedules</h2></div>
              <div className="space-y-3">{staff.map(member => <div key={member.id} className="flex flex-col gap-3 rounded-xl border border-warm-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Users size={18} /></div><div><p className="font-medium text-warm-900">{member.name}{!member.isActive && <span className="ml-2 text-xs text-warm-800/50">Inactive</span>}</p><p className="text-sm text-warm-800/60">{member.role}</p><div className="mt-2 flex flex-wrap gap-1">{member.services.length > 0 ? member.services.map(item => <span key={item.service.id} className="rounded-full bg-warm-100 px-2 py-0.5 text-xs text-warm-800">{item.service.name}</span>) : <span className="text-xs text-warm-800/50">No services assigned</span>}</div></div></div><button type="button" onClick={() => router.push(`/seller/booking-setup/staff/${member.id}`)} className="inline-flex items-center gap-1 self-start text-sm font-medium text-primary sm:self-auto">Set schedule & services <ChevronRight size={15} /></button></div>)}</div>
              <div className="mt-5 flex items-start gap-2 rounded-xl bg-warm-50 p-3 text-sm text-warm-800/65"><Clock3 size={16} className="mt-0.5 shrink-0" />Customers see only times that fit the assigned service duration, working hours, breaks, days off, buffers, and existing bookings.</div>
            </Card>
          </>
        )}
      </div>
    </SellerSidebar>
  )
}
