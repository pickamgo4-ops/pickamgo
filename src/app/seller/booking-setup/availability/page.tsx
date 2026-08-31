'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar } from 'lucide-react'
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

export default function AvailabilityPage() {
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([])
  const [staffCount, setStaffCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      const [servicesRes, staffRes] = await Promise.all([
        api.get<{ services: Service[] }>('/services?limit=100'),
        api.get<any[]>('/booking-setup/staff'),
      ])
      if (servicesRes.success && servicesRes.data) setServices(servicesRes.data.services || [])
      if (staffRes.success && staffRes.data) setStaffCount((staffRes.data as any[]).length)
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
              <h2 className="font-semibold text-warm-900 mb-3">How availability works</h2>
              <ul className="space-y-2 text-sm text-warm-800/80">
                <li>• Each staff member has their own weekly schedule.</li>
                <li>• Customers see only the times when at least one available staff member is free.</li>
                <li>• Breaks and days off are excluded from bookable slots.</li>
                <li>• Existing bookings are automatically excluded to prevent double-booking.</li>
              </ul>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-warm-800/70">
                Open each staff member&apos;s profile to set their working hours, breaks, and days off.
              </p>
              <button
                type="button"
                onClick={() => router.push('/seller/booking-setup/staff')}
                className="mt-3 text-primary font-medium hover:text-primary-dark"
              >
                Manage Staff →
              </button>
            </Card>
          </>
        )}
      </div>
    </SellerSidebar>
  )
}
