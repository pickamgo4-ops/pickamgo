'use client'

import { useEffect, useState } from 'react'
import { Calendar, Percent, Sparkles, Loader2 } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/api'

export default function SellerPromotionsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [promotions, setPromotions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    type: 'CLEARANCE',
    discountType: 'PERCENTAGE',
    discountValue: 20,
    productIds: [] as string[],
    startsAt: new Date().toISOString().slice(0, 16),
    endsAt: '',
    status: 'DRAFT',
  })

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [productsResponse, promotionsResponse] = await Promise.all([
        api.get<any>('/seller/products?limit=100'),
        api.getSellerProductPromotions(),
      ])
      if (productsResponse.success) {
        setProducts(productsResponse.data?.products || [])
      }
      if (promotionsResponse.success) {
        setPromotions(promotionsResponse.data || [])
      } else {
        setError(promotionsResponse.error || 'Failed to load promotions')
      }
    } catch {
      setError('Failed to load promotions. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const create = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const response = await api.createSellerProductPromotion({
        ...form,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      })
      if (response.success) {
        setForm({
          ...form,
          name: '',
          productIds: [],
          discountValue: 20,
        })
        await load()
      } else {
        setError(response.error || 'Could not create promotion')
      }
    } catch {
      setError('Failed to create promotion. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <SellerSidebar>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="animate-spin text-primary mx-auto mb-4" size={36} />
            <p className="text-warm-800/60">Loading promotions...</p>
          </div>
        </div>
      </SellerSidebar>
    )
  }

  return (
    <SellerSidebar>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-warm-900">Clearance &amp; Promotions</h1>
          <p className="text-sm text-warm-800/60">Discount slow-moving stock without changing the original price history.</p>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50 p-4 flex items-center justify-between gap-3">
            <p className="text-sm text-red-700">{error}</p>
            <Button variant="outline" size="sm" onClick={load}>Retry</Button>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="text-primary" size={20} />
              <h2 className="font-semibold text-warm-900">New promotion</h2>
            </div>
            <form onSubmit={create} className="space-y-3">
              <Input
                label="Promotion name"
                value={form.name}
                onValueChange={value => setForm({ ...form, name: value })}
                placeholder="Clearance Sale"
                required
              />
              <label className="block text-sm font-medium text-warm-800">
                Type
                <select
                  value={form.type}
                  onChange={event => setForm({ ...form, type: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-warm-200 bg-transparent p-3"
                >
                  <option>CLEARANCE</option>
                  <option>FLASH_SALE</option>
                  <option>BLACK_FRIDAY</option>
                  <option>END_OF_STOCK</option>
                  <option>OLD_STOCK</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-warm-800">
                Products
                <select
                  multiple
                  value={form.productIds}
                  onChange={event => setForm({ ...form, productIds: Array.from(event.target.selectedOptions, option => option.value) })}
                  className="mt-1 h-32 w-full rounded-xl border border-warm-200 bg-transparent p-2"
                >
                  {products.map(product => (
                    <option key={product.id} value={product.id}>{product.name} · GH₵{Number(product.price).toFixed(2)}</option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-sm font-medium text-warm-800">
                  Discount
                  <select
                    value={form.discountType}
                    onChange={event => setForm({ ...form, discountType: event.target.value })}
                    className="mt-1 w-full rounded-xl border border-warm-200 bg-transparent p-3"
                  >
                    <option value="PERCENTAGE">%</option>
                    <option value="FIXED">GHS</option>
                  </select>
                </label>
                <Input
                  label="Amount"
                  type="number"
                  min="0.01"
                  value={String(form.discountValue)}
                  onValueChange={value => setForm({ ...form, discountValue: Number(value) })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-sm font-medium text-warm-800">
                  Start
                  <Input
                    type="datetime-local"
                    value={form.startsAt}
                    onValueChange={value => setForm({ ...form, startsAt: value })}
                    required
                  />
                </label>
                <label className="text-sm font-medium text-warm-800">
                  End
                  <Input
                    type="datetime-local"
                    value={form.endsAt}
                    onValueChange={value => setForm({ ...form, endsAt: value })}
                    required
                  />
                </label>
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? 'Creating...' : 'Create promotion'}
              </Button>
            </form>
          </Card>

          <div className="space-y-3">
            {promotions.length === 0 ? (
              <Card className="p-12 text-center">
                <Percent size={42} className="mx-auto text-warm-800/25 mb-3" />
                <h2 className="font-semibold text-warm-900">No promotions yet</h2>
                <p className="text-sm text-warm-800/60 mt-1">Create a promotion to boost sales.</p>
              </Card>
            ) : (
              promotions.map((promo: any) => (
                <Card key={promo.id} className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold text-warm-900">{promo.name}</h2>
                      <p className="text-sm text-warm-800/60">{promo.type} · {promo.discountType === 'PERCENTAGE' ? `${promo.discountValue}%` : `GH₵${Number(promo.discountValue).toFixed(2)}`}</p>
                      <p className="text-xs text-warm-800/50 mt-1">{new Date(promo.startsAt).toLocaleString()} — {new Date(promo.endsAt).toLocaleString()}</p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${promo.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-warm-100 text-warm-800/70'}`}>{promo.status}</span>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </SellerSidebar>
  )
}
