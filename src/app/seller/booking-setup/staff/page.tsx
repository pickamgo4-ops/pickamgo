'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, UserPlus, Edit, Trash2, Users } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { api } from '@/lib/api'

interface Staff {
  id: string
  name: string
  role: string
  description?: string
  avatar?: string
  isActive: boolean
  services: Array<{ service: { id: string; name: string; duration: string; price: number } }>
}

interface Service {
  id: string
  name: string
  duration: string
  price: number
}

export default function StaffPage() {
  const router = useRouter()
  const [staff, setStaff] = useState<Staff[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', role: '', description: '', avatar: '', isActive: true })
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [staffRes, servicesRes] = await Promise.all([
        api.get<Staff[]>('/booking-setup/staff'),
        api.get<{ products: any[] }>('/products?limit=1'),
      ])
      if (staffRes.success && staffRes.data) setStaff(staffRes.data as any)
      const servicesData = await api.get<{ services: Service[] }>('/services?limit=100')
      if (servicesData.success && servicesData.data) setServices(servicesData.data.services || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const url = editingId ? `/booking-setup/staff/${editingId}` : '/booking-setup/staff'
      const method = editingId ? 'patch' : 'post'
      const response = await api[method]<Staff>(url, form)
      if (response.success) {
        setShowForm(false)
        setEditingId(null)
        setForm({ name: '', role: '', description: '', avatar: '', isActive: true })
        await load()
      } else {
        setError(response.error || 'Failed to save staff')
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save staff')
    }
  }

  const handleEdit = (s: Staff) => {
    setForm({ name: s.name, role: s.role, description: s.description || '', avatar: s.avatar || '', isActive: s.isActive })
    setEditingId(s.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this staff member?')) return
    try {
      await api.delete(`/booking-setup/staff/${id}`)
      await load()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <SellerSidebar>
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => router.push('/seller/booking-setup')} className="p-2 rounded-xl hover:bg-warm-100">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold text-warm-900">People / Staff</h1>
            <p className="text-sm text-warm-800/60">Manage who customers can book with.</p>
          </div>
        </div>

        {!showForm && (
          <div className="flex justify-end">
            <Button onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', role: '', description: '', avatar: '', isActive: true }) }}>
              <UserPlus size={16} className="mr-2" /> Add Staff
            </Button>
          </div>
        )}

        {showForm && (
          <Card className="p-5">
            <h2 className="font-semibold text-warm-900 mb-3">{editingId ? 'Edit Staff' : 'New Staff'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input placeholder="Name (e.g., Kwame)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              <Input placeholder="Role (e.g., Barber)" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} required />
              <Input placeholder="Description (optional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              <Input placeholder="Avatar URL (optional)" value={form.avatar} onChange={e => setForm({ ...form, avatar: e.target.value })} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4" />
                Active
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit">{editingId ? 'Save' : 'Create'}</Button>
                <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setEditingId(null) }}>Cancel</Button>
              </div>
            </form>
          </Card>
        )}

        {loading ? (
          <p className="text-warm-800/60">Loading...</p>
        ) : staff.length === 0 ? (
          <Card className="p-10 text-center">
            <Users size={40} className="mx-auto text-warm-300 mb-2" />
            <p className="text-warm-800/60 mb-1">No staff members yet</p>
            <p className="text-sm text-warm-800/50">Add people customers can book with.</p>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {staff.map(s => (
              <Card key={s.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-warm-900">{s.name}</h3>
                      {!s.isActive && <Badge variant="verified">Inactive</Badge>}
                    </div>
                    <p className="text-sm text-warm-800/60">{s.role}</p>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => handleEdit(s)} className="p-2 rounded-lg hover:bg-warm-100">
                      <Edit size={16} />
                    </button>
                    <button type="button" onClick={() => handleDelete(s.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {s.description && <p className="text-sm text-warm-800/70 mb-2">{s.description}</p>}
                {s.services.length > 0 && (
                  <div className="border-t border-warm-200 pt-2 mt-2">
                    <p className="text-xs text-warm-800/50 mb-1">Services:</p>
                    <div className="flex flex-wrap gap-1">
                      {s.services.map(ss => (
                        <Badge key={ss.service.id} variant="trending">{ss.service.name}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => router.push(`/seller/booking-setup/staff/${s.id}`)}
                  className="mt-3 text-xs text-primary font-medium hover:text-primary-dark"
                >
                  Configure availability & services →
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SellerSidebar>
  )
}
