'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Users, Clock, CheckCircle2, Settings, ArrowRight, AlertCircle, Sparkles, UserPlus, Scissors, BarChart3 } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { api } from '@/lib/api'

interface Summary {
  activeServices: number
  activeStaff: number
  availableSlots: number
  bookingEnabled: boolean
}

export default function BookingSetupDashboardPage() {
  const router = useRouter()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSummary()
  }, [])

  const loadSummary = async () => {
    try {
      const response = await api.get<Summary>('/booking-setup/summary')
      if (response.success && response.data) {
        setSummary(response.data)
      }
    } catch (err) {
      console.error('Failed to load summary:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <SellerSidebar>
        <div className="flex items-center justify-center py-20">
          <p className="text-warm-800/60">Loading booking setup...</p>
        </div>
      </SellerSidebar>
    )
  }

  const missing: string[] = []
  if (!summary || summary.activeServices === 0) missing.push('Add at least one bookable service')
  if (!summary || summary.activeStaff === 0) missing.push('Add at least one staff member or enable "no staff selection"')
  if (!summary || summary.availableSlots === 0) missing.push('Configure availability for at least one day')

  return (
    <SellerSidebar>
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={20} className="text-primary" />
              <h1 className="font-display text-2xl font-bold text-warm-900">Booking Setup</h1>
            </div>
            <p className="text-sm text-warm-800/60">Configure what customers can book, who they book, and when.</p>
          </div>
          <Badge variant={summary?.bookingEnabled ? 'default' : 'verified'}>
            {summary?.bookingEnabled ? 'Booking Enabled' : 'Booking Disabled'}
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Scissors size={20} className="text-primary" />
              </div>
              <p className="text-xs text-warm-800/60 uppercase tracking-wide">Active Services</p>
            </div>
            <p className="font-display text-3xl font-bold text-warm-900">{summary?.activeServices ?? 0}</p>
            <button
              type="button"
              onClick={() => router.push('/seller/booking-setup/services')}
              className="mt-3 text-xs text-primary font-medium hover:text-primary-dark inline-flex items-center gap-1"
            >
              Manage services <ArrowRight size={12} />
            </button>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Users size={20} className="text-blue-600" />
              </div>
              <p className="text-xs text-warm-800/60 uppercase tracking-wide">Staff Members</p>
            </div>
            <p className="font-display text-3xl font-bold text-warm-900">{summary?.activeStaff ?? 0}</p>
            <button
              type="button"
              onClick={() => router.push('/seller/booking-setup/staff')}
              className="mt-3 text-xs text-primary font-medium hover:text-primary-dark inline-flex items-center gap-1"
            >
              Manage staff <ArrowRight size={12} />
            </button>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                <Clock size={20} className="text-green-600" />
              </div>
              <p className="text-xs text-warm-800/60 uppercase tracking-wide">Available Slots</p>
            </div>
            <p className="font-display text-3xl font-bold text-warm-900">{summary?.availableSlots ?? 0}</p>
            <button
              type="button"
              onClick={() => router.push('/seller/booking-setup/availability')}
              className="mt-3 text-xs text-primary font-medium hover:text-primary-dark inline-flex items-center gap-1"
            >
              Manage availability <ArrowRight size={12} />
            </button>
          </Card>
        </div>

        {missing.length > 0 && (
          <Card className="p-5 border-yellow-200 bg-yellow-50/50">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-warm-900 mb-1">Customers can&apos;t book yet</p>
                <p className="text-sm text-warm-800/70 mb-2">Complete the following to enable bookings:</p>
                <ul className="space-y-1">
                  {missing.map((m, i) => (
                    <li key={i} className="text-sm text-warm-800/80 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" /> {m}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Scissors size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-warm-900">Services</h3>
                  <p className="text-xs text-warm-800/60">Add and manage bookable services</p>
                </div>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => router.push('/seller/booking-setup/services')}>
              Open
            </Button>
          </Card>

          <Card className="p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Users size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-warm-900">People / Staff</h3>
                  <p className="text-xs text-warm-800/60">Add staff and assign services</p>
                </div>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => router.push('/seller/booking-setup/staff')}>
              Open
            </Button>
          </Card>

          <Card className="p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                  <Calendar size={20} className="text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-warm-900">Availability</h3>
                  <p className="text-xs text-warm-800/60">Set working hours, breaks, and days off</p>
                </div>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => router.push('/seller/booking-setup/availability')}>
              Open
            </Button>
          </Card>

          <Card className="p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                  <Settings size={20} className="text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-warm-900">Booking Rules</h3>
                  <p className="text-xs text-warm-800/60">Notice periods, buffers, and confirmation rules</p>
                </div>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => router.push('/seller/booking-setup/rules')}>
              Open
            </Button>
          </Card>
        </div>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle2 size={20} className="text-green-600" />
            <h3 className="font-semibold text-warm-900">How customers experience this</h3>
          </div>
          <ol className="space-y-2 text-sm text-warm-800/80">
            <li><strong>1. Choose Service</strong> — The customer picks from your active services.</li>
            <li><strong>2. Choose Person</strong> — If you have staff, they pick who to book with. If not, the system auto-assigns.</li>
            <li><strong>3. Choose Date</strong> — Available dates are based on your staff availability rules.</li>
            <li><strong>4. Choose Time</strong> — Time slots are generated from your availability minus existing bookings.</li>
            <li><strong>5. Confirm Booking</strong> — Auto-confirmed or pending your approval, depending on your rules.</li>
          </ol>
        </Card>
      </div>
    </SellerSidebar>
  )
}
