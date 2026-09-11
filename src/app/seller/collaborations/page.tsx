'use client'

import { useEffect, useState } from 'react'
import { Handshake, Loader2, Send, Check, X } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/api'

export default function SellerCollaborationsPage() {
  const [data, setData] = useState<{ collaborations: any[]; invitations: any[] }>({ collaborations: [], invitations: [] })
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [financials, setFinancials] = useState<Record<string, any>>({})
  const [form, setForm] = useState({ name: '', description: '', type: 'BUNDLE', bundlePrice: '', productId: '', inviteShopId: '' })

  const load = async () => {
    setLoading(true)
    const [collaborations, productsResponse] = await Promise.all([api.getSellerCollaborations(), api.get<any>('/seller/products?limit=100')])
    if (collaborations.success && collaborations.data) setData(collaborations.data)
    else setError(collaborations.error || 'Unable to load collaborations.')
    if (productsResponse.success) setProducts(productsResponse.data?.products || [])
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  const create = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('')
    const response = await api.createCollaboration({ name: form.name, description: form.description, type: form.type, bundlePrice: form.bundlePrice ? Number(form.bundlePrice) : undefined })
    if (!response.success || !response.data) { setError(response.error || 'Unable to create collaboration.'); setSaving(false); return }
    if (form.productId) await api.addCollaborationProduct(response.data.id, { productId: form.productId })
    if (form.inviteShopId) await api.inviteToCollaboration(response.data.id, { shopId: form.inviteShopId })
    setForm({ name: '', description: '', type: 'BUNDLE', bundlePrice: '', productId: '', inviteShopId: '' }); await load(); setSaving(false)
  }

  const respond = async (id: string, action: 'ACCEPT' | 'DECLINE') => { await api.respondToCollaborationInvitation(id, action); await load() }
  const activate = async (id: string) => { const response = await api.activateCollaboration(id); if (!response.success) setError(response.error || 'Unable to activate collaboration.'); await load() }
  const changeStatus = async (id: string, status: 'PAUSED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED') => { const response = await api.updateCollaborationStatus(id, status); if (!response.success) setError(response.error || 'Unable to update collaboration.'); await load() }
  const loadFinancials = async (id: string) => { const response = await api.getCollaborationFinancials(id); if (response.success) setFinancials(current => ({ ...current, [id]: response.data })) }

  if (loading) return <SellerSidebar><div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div></SellerSidebar>
  return <SellerSidebar><div className="space-y-6"><div><h1 className="font-display text-2xl font-bold text-warm-900">Collaborations</h1><p className="text-sm text-warm-800/60">Build shared bundles and campaigns while each shop keeps ownership of its products.</p></div>{error && <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</Card>}<div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]"><Card className="p-5"><div className="mb-4 flex items-center gap-2"><Handshake className="text-primary" size={20} /><h2 className="font-semibold">Start a collaboration</h2></div><form onSubmit={create} className="space-y-3"><Input label="Name" value={form.name} onValueChange={value => setForm({ ...form, name: value })} required /><label className="block text-sm font-medium">Description<textarea value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} className="mt-1 w-full rounded-xl border border-warm-200 p-3" rows={3} /></label><label className="block text-sm font-medium">Type<select value={form.type} onChange={event => setForm({ ...form, type: event.target.value })} className="mt-1 w-full rounded-xl border border-warm-200 bg-white p-3"><option value="BUNDLE">Product bundle</option><option value="COLLECTION">Collaborative collection</option><option value="CAMPAIGN">Collaborative campaign</option></select></label>{form.type === 'BUNDLE' && <Input label="Bundle price (GH₵)" type="number" min="0.01" step="0.01" value={form.bundlePrice} onValueChange={value => setForm({ ...form, bundlePrice: value })} required />}<label className="block text-sm font-medium">Your product<select value={form.productId} onChange={event => setForm({ ...form, productId: event.target.value })} className="mt-1 w-full rounded-xl border border-warm-200 bg-white p-3"><option value="">Select later</option>{products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><Input label="Invitee shop ID" value={form.inviteShopId} onValueChange={value => setForm({ ...form, inviteShopId: value })} placeholder="Paste a shop ID" /><Button type="submit" disabled={saving} icon={<Send size={16} />}>{saving ? 'Creating...' : 'Create collaboration'}</Button></form></Card><div className="space-y-4">{data.invitations.length > 0 && <Card className="p-5"><h2 className="mb-3 font-semibold">Invitations</h2><div className="space-y-3">{data.invitations.map(invitation => <div key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warm-100 p-3"><div><p className="font-medium">{invitation.collaboration.name}</p><p className="text-sm text-warm-800/60">From {invitation.inviterShop.name}</p></div><div className="flex gap-2"><Button size="sm" onClick={() => respond(invitation.id, 'ACCEPT')} icon={<Check size={14} />}>Accept</Button><Button size="sm" variant="outline" onClick={() => respond(invitation.id, 'DECLINE')} icon={<X size={14} />}>Decline</Button></div></div>)}</div></Card>}<div className="grid gap-4 md:grid-cols-2">{data.collaborations.map(collaboration => <Card key={collaboration.id} className="p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-warm-900">{collaboration.name}</h2><p className="mt-1 text-sm text-warm-800/60">{collaboration.type} · {collaboration.status}</p></div><span className="rounded-full bg-warm-100 px-2 py-1 text-xs">{collaboration.participants?.length || 0} shops</span></div><p className="mt-3 text-sm text-warm-800/70">{collaboration.products?.length || 0} contributed products</p>{collaboration.status !== 'ACTIVE' && collaboration.status !== 'CANCELLED' && <Button className="mt-4" size="sm" onClick={() => activate(collaboration.id)}>Activate</Button>}{['ACTIVE', 'PAUSED'].includes(collaboration.status) && <Button className="ml-2 mt-4" size="sm" variant="outline" onClick={() => changeStatus(collaboration.id, collaboration.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE')}>{collaboration.status === 'ACTIVE' ? 'Pause' : 'Resume'}</Button>}<Button className="ml-2 mt-4" size="sm" variant="ghost" onClick={() => loadFinancials(collaboration.id)}>View earnings</Button>{financials[collaboration.id] && <div className="mt-3 rounded-xl bg-warm-50 p-3 text-xs text-warm-800/70">Normal total GH₵{Number(financials[collaboration.id].normalTotal || 0).toFixed(2)} · Bundle GH₵{Number(financials[collaboration.id].customerSubtotal || 0).toFixed(2)} · Seller pool GH₵{Number(financials[collaboration.id].sellerPool || 0).toFixed(2)}</div>}</Card>)}</div></div></div></div></SellerSidebar>
}
