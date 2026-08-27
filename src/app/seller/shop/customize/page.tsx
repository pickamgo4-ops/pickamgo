'use client'

import React, { useEffect, useState } from 'react'
import { Check, ExternalLink, Eye, Palette, RotateCcw, Save } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import { getShopUrl } from '@/lib/shop-url'
import { defaultShopCustomization, ShopCustomization, ShopLayout, themePresets } from '@/lib/shop-themes'

const layouts: Array<{ id: ShopLayout; name: string; description: string }> = [
  { id: 'CLASSIC', name: 'Classic', description: 'Banner, shop info, categories, products' },
  { id: 'GRID', name: 'Grid', description: 'Shop header followed by a large product grid' },
  { id: 'FEATURED', name: 'Featured', description: 'Put one real product in the spotlight' },
  { id: 'BEAUTY', name: 'Beauty', description: 'Services, products and reviews together' },
  { id: 'CAMPUS', name: 'Quick Picks', description: 'Quick categories, popular items and deals' },
]

export default function SellerCustomizeShopPage() {
  const [shop, setShop] = useState<any>(null)
  const [customization, setCustomization] = useState<ShopCustomization>(defaultShopCustomization)
  const [products, setProducts] = useState<any[]>([])
  const [status, setStatus] = useState('')

  useEffect(() => {
    const load = async () => {
      const shopResponse = await api.get<any>('/seller/shop')
      const currentShop = shopResponse.data?.shop
      if (!currentShop) return
      setShop(currentShop)
      const [customResponse, publicResponse] = await Promise.all([api.get<any>(`/shops/${currentShop.id}/customization`), api.get<any>(`/shops/${currentShop.slug}`)])
      if (customResponse.data?.draft) setCustomization({ ...defaultShopCustomization, ...customResponse.data.draft })
      setProducts(publicResponse.data?.products || [])
    }
    load()
  }, [])

  const update = (patch: Partial<ShopCustomization>) => setCustomization(current => ({ ...current, ...patch }))
  const save = async () => {
    if (!shop) return
    setStatus('Saving...')
    const response = await api.patch(`/shops/${shop.id}/customization`, customization)
    if (!response.success) { setStatus(response.error || 'Could not save'); return }
    const published = await api.post(`/shops/${shop.id}/customization/publish`, {})
    setStatus(published.success ? 'Shop updated' : published.error || 'Could not publish')
  }
  const reset = async () => {
    if (!shop || !window.confirm('Reset only your shop appearance to the default?')) return
    const response = await api.post<any>(`/shops/${shop.id}/customization/reset`, {})
    if (response.success) { setCustomization({ ...defaultShopCustomization }); setStatus('Reset to default') }
  }
  const upload = async (field: 'logo' | 'coverImage') => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/jpeg,image/png,image/webp,image/gif'
    input.onchange = async () => {
      const file = input.files?.[0]; if (!file) return
      setStatus('Uploading...')
      const form = new FormData(); form.append('image', file)
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 60000)
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/upload/image`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }, body: form, signal: controller.signal })
        clearTimeout(timeout)
        const contentType = response.headers.get('content-type') || ''
        if (!contentType.includes('application/json')) { setStatus('Upload failed. Please try again.'); return }
        const data = await response.json(); if (data.success) update({ [field]: data.data.url }); else setStatus(data.error || 'Upload failed')
      } catch (err) {
        console.error('Upload fetch error:', err)
        setStatus(err instanceof Error && err.name === 'AbortError' ? 'Upload timed out. Please try again.' : 'Upload failed. Please try again.')
      }
    }
    input.click()
  }

  if (!shop) return <SellerSidebar><Card className="p-8 text-center">Loading customization...</Card></SellerSidebar>

  return <SellerSidebar><div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-display text-3xl font-bold text-warm-900">Customize Shop</h1><p className="text-warm-800/60 mt-1">Build a storefront that feels like your business.</p></div><div className="flex gap-2"><Button variant="ghost" onClick={reset} icon={<RotateCcw size={16} />}>Reset</Button><Button variant="outline" onClick={() => window.open(getShopUrl(shop.slug), '_blank')} icon={<ExternalLink size={16} />}>Open live shop</Button><Button onClick={save} icon={<Save size={16} />}>Save</Button></div></div>
    {status && <p className="text-sm font-medium text-primary">{status}</p>}
    <div className="grid xl:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start"><div className="space-y-6">
      <Card className="p-5"><div className="flex items-center gap-2 mb-4"><Palette size={18} className="text-primary" /><h2 className="font-semibold text-warm-900">Theme</h2></div><div className="grid sm:grid-cols-2 gap-3">{themePresets.map(theme => <button key={theme.id} onClick={() => update({ theme: theme.id, primaryColor: theme.colors[0], secondaryColor: theme.colors[1], accentColor: theme.colors[2] })} className={`text-left p-4 rounded-xl border-2 ${customization.theme === theme.id ? 'border-primary bg-primary/5' : 'border-warm-200'}`}><div className="flex gap-2 mb-3">{theme.colors.map(color => <span key={color} className="w-7 h-7 rounded-full border border-black/10" style={{ backgroundColor: color }} />)}</div><p className="font-semibold text-warm-900">{theme.name}</p><p className="text-xs text-warm-800/60 mt-1">{theme.description}</p></button>)}</div></Card>
      <Card className="p-5"><h2 className="font-semibold text-warm-900 mb-4">Brand colors</h2><div className="grid grid-cols-3 gap-3">{(['primaryColor', 'secondaryColor', 'accentColor'] as const).map(field => <label key={field} className="text-xs font-medium text-warm-800/70 capitalize">{field.replace('Color', ' color')}<input type="color" value={customization[field]} onChange={e => update({ [field]: e.target.value })} className="mt-2 w-full h-11 rounded-lg cursor-pointer" /></label>)}</div></Card>
      <Card className="p-5"><h2 className="font-semibold text-warm-900 mb-4">Branding and announcement</h2><div className="grid sm:grid-cols-2 gap-3"><Button variant="outline" onClick={() => upload('logo')}>Upload logo</Button><Button variant="outline" onClick={() => upload('coverImage')}>Upload cover image</Button></div><textarea value={customization.description || ''} onChange={e => update({ description: e.target.value })} maxLength={500} placeholder="Shop description" className="mt-4 w-full rounded-xl border border-warm-200 p-3 text-sm min-h-24" /><input value={customization.announcement || ''} onChange={e => update({ announcement: e.target.value })} maxLength={160} placeholder="Optional announcement" className="mt-3 w-full rounded-xl border border-warm-200 p-3 text-sm" /></Card>
      <Card className="p-5"><h2 className="font-semibold text-warm-900 mb-4">Layout and content</h2><div className="grid sm:grid-cols-2 gap-3">{layouts.map(layout => <button key={layout.id} onClick={() => update({ layout: layout.id })} className={`text-left p-3 rounded-xl border-2 ${customization.layout === layout.id ? 'border-primary bg-primary/5' : 'border-warm-200'}`}><p className="font-semibold text-sm text-warm-900">{layout.name}</p><p className="text-xs text-warm-800/60 mt-1">{layout.description}</p></button>)}</div><label className="block mt-4 text-sm text-warm-800/70">Featured product<select value={customization.featuredProductId || ''} onChange={e => update({ featuredProductId: e.target.value || null })} className="mt-2 w-full rounded-xl border border-warm-200 p-3 bg-white"><option value="">No featured product</option>{products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><div className="grid sm:grid-cols-2 gap-3 mt-4">{[['showCategories','Categories'],['showFeatured','Featured product'],['showServices','Services']].map(([field, label]) => <label key={field} className="flex items-center gap-2 text-sm text-warm-800/70"><input type="checkbox" checked={customization[field as keyof ShopCustomization] as boolean} onChange={e => update({ [field]: e.target.checked })} />{label}</label>)}</div></Card>
    </div><Card className="p-3 sticky top-4"><div className="flex justify-between items-center px-2 py-2"><h2 className="font-semibold text-warm-900">Live preview</h2><Eye size={17} className="text-warm-800/50" /></div><div className="rounded-xl overflow-hidden border border-warm-200" style={{ background: customization.secondaryColor, color: customization.accentColor }}><div className="h-28 flex items-end p-4" style={{ background: customization.coverImage ? `url(${customization.coverImage}) center/cover` : customization.primaryColor }}><div className="w-14 h-14 rounded-xl bg-white p-1 shadow"><img src={customization.logo || shop.logo} alt="" className="w-full h-full object-cover rounded-lg" /></div></div><div className="p-4"><h3 className="font-display text-xl font-bold">{shop.name}</h3><p className="text-xs opacity-70 mt-1 line-clamp-2">{customization.description || shop.description}</p>{customization.announcement && <p className="mt-3 p-2 rounded-lg text-xs font-medium" style={{ background: customization.primaryColor, color: '#fff' }}>{customization.announcement}</p>}<div className="flex gap-2 mt-4 flex-wrap">{['New arrivals','Popular','Deals'].map(item => <span key={item} className="text-xs px-2 py-1 rounded-full bg-white/70">{item}</span>)}</div><div className="grid grid-cols-2 gap-2 mt-4">{products.slice(0, 4).map(product => <div key={product.id} className="bg-white rounded-lg p-2"><div className="h-16 bg-warm-100 rounded-md" /><p className="text-xs font-medium mt-2 truncate">{product.name}</p><p className="text-xs font-bold" style={{ color: customization.primaryColor }}>GHS {product.price}</p></div>)}</div></div></div><p className="text-xs text-warm-800/50 text-center mt-3">Preview uses your real shop data</p></Card></div>
  </div></SellerSidebar>
}
