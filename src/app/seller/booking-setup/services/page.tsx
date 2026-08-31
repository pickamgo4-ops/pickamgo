'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Scissors, Plus, Settings } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { api } from '@/lib/api'

interface Service {
  id: string
  name: string
  description: string
  price: number
  duration: string
  status: string
  staffRequired: boolean
  requireApproval: boolean
}

export default function ServicesPage() {
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      const res = await api.get<{ services: Service[] }>('/services?limit=100')
      if (res.success && res.data) setServices(res.data.services || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SellerSidebar>
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => router.push('/seller/booking-setup')} className="p-2 rounded-xl hover:bg-warm-100">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-display text-2xl font-bold text-warm-900">Booking Services</h1>
              <p className="text-sm text-warm-800/60">These are the services customers can book.</p>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-warm-800/60">Loading...</p>
        ) : services.length === 0 ? (
          <Card className="p-10 text-center">
            <Scissors size={40} className="mx-auto text-warm-300 mb-2" />
            <p className="text-warm-800/60">No services yet. Create services to enable bookings.</p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {services.map(s => (
              <Card key={s.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-warm-900">{s.name}</h3>
                      {s.status !== 'ACTIVE' && <Badge variant="verified">{s.status}</Badge>}
                    </div>
                    <p className="text-sm text-warm-800/60 mb-1">{s.description}</p>
                    <p className="text-sm font-medium text-warm-900">GH₵{s.price} · {s.duration}</p>
                    <div className="flex gap-2 mt-2">
                      {s.staffRequired && <Badge variant="trending">Staff Required</Badge>}
                      {s.requireApproval && <Badge variant="new">Needs Approval</Badge>}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SellerSidebar>
  )
}
