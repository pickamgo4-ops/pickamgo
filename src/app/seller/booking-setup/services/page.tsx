'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Scissors, Plus, X } from 'lucide-react'
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

interface Category { id: string; name: string; children?: Category[] }

export default function ServicesPage() {
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [shop, setShop] = useState<any>(null)
  const [form, setForm] = useState({ name: '', description: '', price: '', duration: '60', categoryId: '', staffRequired: false })

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      const [res, shopRes, categoriesRes] = await Promise.all([
        api.get<{ services: Service[] }>('/booking-setup/services'),
        api.get<{ shop: any }>('/seller/shop'),
        api.get<Category[]>('/categories'),
      ])
      if (res.success && res.data) setServices(res.data.services || [])
      if (shopRes.success && shopRes.data) setShop(shopRes.data.shop)
      if (categoriesRes.success && categoriesRes.data) {
        const flattened = categoriesRes.data.flatMap(category => [category, ...(category.children || [])])
        setCategories(flattened)
        setForm(current => ({ ...current, categoryId: current.categoryId || flattened[0]?.id || '' }))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const saveService = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    const response = await api.post('/services', {
      name: form.name,
      description: form.description,
      price: Number(form.price),
      duration: form.duration,
      categoryId: form.categoryId,
      shopId: shop?.id,
      location: shop?.location || 'Store location',
      images: [],
    })
    if (response.success) {
      const createdService = response.data as { id?: string } | undefined
      if (createdService?.id) {
        await api.patch(`/booking-setup/services/${createdService.id}`, {
          minNoticeHours: 0,
          maxAdvanceDays: 30,
          bufferMinutes: 0,
          allowStaffSelection: true,
          requireApproval: false,
          staffRequired: form.staffRequired,
        })
      }
      setShowEditor(false)
      setForm(current => ({ ...current, name: '', description: '', price: '', duration: '60' }))
      await load()
    } else {
      setError(response.error || 'Could not create service.')
    }
    setSaving(false)
  }

  return (
    <SellerSidebar>
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => router.push('/seller/booking-setup')} className="p-2 rounded-xl hover:bg-warm-100">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-display text-2xl font-bold text-warm-900">Booking Services</h1>
              <p className="text-sm text-warm-800/60">These are the services customers can book.</p>
            </div>
          </div>
          <Button size="sm" onClick={() => { setError(''); setShowEditor(true) }} icon={<Plus size={16} />}>Add Service</Button>
        </div>

        {showEditor && <Card className="p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="font-display text-xl font-bold text-warm-900">Add a bookable service</h2><p className="mt-1 text-sm text-warm-800/60">This service will be added to your store for customers to book.</p></div><button type="button" onClick={() => setShowEditor(false)} className="rounded-lg p-2 hover:bg-warm-100" aria-label="Close service editor"><X size={18} /></button></div><form onSubmit={saveService} className="mt-5 grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><span className="text-sm font-medium text-warm-800">Service name</span><input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} className="mt-1 w-full rounded-xl border border-warm-200 px-4 py-3" placeholder="e.g. Haircut" /></label><label className="sm:col-span-2"><span className="text-sm font-medium text-warm-800">Description</span><textarea required value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} className="mt-1 min-h-24 w-full rounded-xl border border-warm-200 px-4 py-3" placeholder="Describe what customers will receive" /></label><label><span className="text-sm font-medium text-warm-800">Price (GHS)</span><input required min="0.01" step="0.01" type="number" value={form.price} onChange={event => setForm({ ...form, price: event.target.value })} className="mt-1 w-full rounded-xl border border-warm-200 px-4 py-3" placeholder="50" /></label><label><span className="text-sm font-medium text-warm-800">Duration (minutes)</span><input required min="1" type="number" value={form.duration} onChange={event => setForm({ ...form, duration: event.target.value })} className="mt-1 w-full rounded-xl border border-warm-200 px-4 py-3" /></label><label className="sm:col-span-2"><span className="text-sm font-medium text-warm-800">Category</span><select required value={form.categoryId} onChange={event => setForm({ ...form, categoryId: event.target.value })} className="mt-1 w-full rounded-xl border border-warm-200 bg-white px-4 py-3"><option value="">Choose a category</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="sm:col-span-2 flex items-start gap-3 rounded-xl border border-warm-200 p-3"><input type="checkbox" checked={form.staffRequired} onChange={event => setForm({ ...form, staffRequired: event.target.checked })} className="mt-1 h-4 w-4" /><span><span className="block text-sm font-medium text-warm-900">Staff required</span><span className="block text-sm text-warm-800/60">Require a qualified staff member before customers can book this service.</span></span></label>{error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}<div className="sm:col-span-2 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setShowEditor(false)}>Cancel</Button><Button type="submit" loading={saving} disabled={!shop?.id || !form.categoryId}>Save Service</Button></div></form></Card>}

        {loading ? (
          <p className="text-warm-800/60">Loading...</p>
        ) : services.length === 0 ? (
          <Card className="p-10 text-center">
            <Scissors size={40} className="mx-auto text-warm-300 mb-2" />
            <p className="text-warm-800/60">You haven't added any bookable services yet.</p>
            <p className="mt-1 text-sm text-warm-800/50">Add your first service to start accepting bookings.</p>
            <Button className="mt-4" onClick={() => { setError(''); setShowEditor(true) }} icon={<Plus size={16} />}>Add Your First Service</Button>
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
