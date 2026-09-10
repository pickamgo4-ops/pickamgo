'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Check, GitCompareArrows, ShoppingCart, Store, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { api } from '@/lib/api'
import { addComparedProduct, clearComparedProducts, comparisonLimit, getComparedProductIds, removeComparedProduct } from '@/lib/comparison'

function formatPrice(value: unknown) {
  return `GH₵${Number(value || 0).toFixed(2)}`
}

function productSpecifications(product: any): Record<string, string> {
  const specifications: Record<string, string> = {}
  for (const variant of product.variants || []) {
    if (!variant.attributes) continue
    try {
      const attributes = typeof variant.attributes === 'string' ? JSON.parse(variant.attributes) : variant.attributes
      if (attributes && typeof attributes === 'object') {
        for (const [key, value] of Object.entries(attributes)) {
          if (value !== null && value !== undefined && String(value).trim()) specifications[key] = specifications[key] ? `${specifications[key]}, ${value}` : String(value)
        }
      }
    } catch {
      // Ignore malformed legacy variant attributes.
    }
  }
  if (product.variants?.length) specifications.Variants = product.variants.map((variant: any) => variant.name).join(', ')
  return specifications
}

export default function ComparePage() {
  const router = useRouter()
  const [ids, setIds] = useState<string[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cartMessage, setCartMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      const storedIds = getComparedProductIds()
      setIds(storedIds)
      if (!storedIds.length) { setLoading(false); return }
      const response = await api.getCompareProducts(storedIds)
      if (!response.success) { setError(response.error || 'Unable to load comparison.'); setLoading(false); return }
      const loaded = response.data || []
      const loadedIds = loaded.map(product => product.id)
      storedIds.filter(id => !loadedIds.includes(id)).forEach(removeComparedProduct)
      setIds(loadedIds)
      setProducts(loaded)
      setLoading(false)
    }
    void load()
  }, [])

  const remove = (id: string) => {
    removeComparedProduct(id)
    setIds(current => current.filter(item => item !== id))
    setProducts(current => current.filter(product => product.id !== id))
  }

  const addToCart = async (product: any) => {
    if (product.stock <= 0) return
    const response = await api.addToCart({ productId: product.id, quantity: 1 })
    setCartMessage(response.success ? `${product.name} added to cart.` : response.error || 'Unable to add this product to cart.')
    if (response.success) window.dispatchEvent(new Event('cart-updated'))
  }

  const specificationKeys = Array.from(new Set(products.flatMap(product => Object.keys(productSpecifications(product)))))
  const rows: Array<[string, (product: any) => string]> = [
    ['Price', product => formatPrice(product.price)],
    ['Original price', product => product.originalPrice ? formatPrice(product.originalPrice) : 'N/A'],
    ['Discount', product => product.discount ? `${product.discount}%` : 'N/A'],
    ['Rating', product => product.rating ? `${product.rating}/5 (${product.reviewsCount || 0} reviews)` : 'No ratings yet'],
    ['Seller', product => product.seller?.name || 'N/A'],
    ['Shop', product => product.shop?.name || 'N/A'],
    ['Availability', product => product.stock > 0 && product.status === 'ACTIVE' ? 'Available' : 'Currently unavailable'],
    ['Condition', product => product.condition || 'N/A'],
    ['Category', product => product.category?.name || 'N/A'],
    ['Delivery', product => product.shop?.deliveryAvailable ? 'Delivery available' : product.shop?.pickupAvailable ? 'Pickup available' : 'N/A'],
  ]

  return <div className="min-h-screen bg-warm-50 pb-20 md:pb-0"><Header /><main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><button type="button" onClick={() => router.back()} className="mb-3 inline-flex items-center gap-1 text-sm text-warm-800/60 hover:text-primary"><ArrowLeft size={16} /> Back</button><h1 className="font-display text-3xl font-bold text-warm-900">Compare Products</h1><p className="mt-1 text-warm-800/60">Compare up to {comparisonLimit} products side by side.</p></div>{ids.length > 0 && <Button variant="outline" onClick={() => { clearComparedProducts(); setIds([]); setProducts([]) }} icon={<Trash2 size={16} />}>Clear All</Button>}</div>{error && <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}{cartMessage && <p className="mt-6 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700" role="status">{cartMessage}</p>}{loading ? <div className="py-20 text-center text-warm-800/60">Loading comparison...</div> : products.length === 0 ? <Card className="mx-auto mt-10 max-w-lg p-12 text-center"><GitCompareArrows size={44} className="mx-auto mb-4 text-warm-800/30" /><h2 className="font-display text-xl font-bold text-warm-900">Nothing to compare yet</h2><p className="mt-2 text-sm text-warm-800/60">Add products while browsing to compare price, availability, sellers, variants, and more.</p><Button className="mt-6" onClick={() => router.push('/discover')}>Browse Products</Button></Card> : <><div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">{products.map(product => <Card key={product.id} className="relative overflow-hidden p-4"><button type="button" onClick={() => remove(product.id)} aria-label={`Remove ${product.name} from comparison`} className="absolute right-3 top-3 rounded-full bg-warm-100 p-2 text-warm-800/60 hover:bg-red-50 hover:text-red-600"><X size={16} /></button><img src={product.images?.[0]?.url || ''} alt={product.name} className="aspect-square w-full rounded-xl bg-warm-100 object-cover" /><h2 className="mt-4 min-h-12 pr-8 font-semibold text-warm-900">{product.name}</h2><p className="mt-2 text-xl font-bold text-primary">{formatPrice(product.price)}</p><div className="mt-4 flex flex-wrap gap-2"><Button size="sm" onClick={() => void addToCart(product)} disabled={product.stock <= 0}><ShoppingCart size={15} /> {product.stock > 0 ? 'Add to cart' : 'Unavailable'}</Button><Button size="sm" variant="outline" onClick={() => router.push(`/product/${product.id}`)}>View</Button></div>{product.allowOffers && product.stock > 0 && <button type="button" onClick={() => router.push(`/product/${product.id}`)} className="mt-3 text-sm font-medium text-primary hover:underline">Make an Offer</button>}</Card>)}</div><div className="mt-8 overflow-hidden rounded-2xl border border-warm-200 bg-white"><div className="hidden md:block">{rows.map(([label, value]) => <div key={label} className="grid border-b border-warm-100 last:border-0" style={{ gridTemplateColumns: `180px repeat(${products.length}, minmax(0, 1fr))` }}><div className="bg-warm-50 p-4 text-sm font-semibold text-warm-800">{label}</div>{products.map(product => <div key={product.id} className="p-4 text-sm text-warm-800">{value(product)}</div>)}</div>)}{specificationKeys.map(key => <div key={key} className="grid border-b border-warm-100 last:border-0" style={{ gridTemplateColumns: `180px repeat(${products.length}, minmax(0, 1fr))` }}><div className="bg-warm-50 p-4 text-sm font-semibold text-warm-800">{key}</div>{products.map(product => <div key={product.id} className="p-4 text-sm text-warm-800">{productSpecifications(product)[key] || 'N/A'}</div>)}</div>)}</div><div className="space-y-6 p-4 md:hidden">{products.map(product => <section key={product.id} className="border-b border-warm-200 pb-5 last:border-0"><h2 className="font-semibold text-warm-900">{product.name}</h2><div className="mt-3 space-y-2">{rows.map(([label, value]) => <div key={label} className="flex justify-between gap-4 text-sm"><span className="text-warm-800/60">{label}</span><span className="text-right font-medium text-warm-900">{value(product)}</span></div>)}{specificationKeys.map(key => <div key={key} className="flex justify-between gap-4 text-sm"><span className="text-warm-800/60">{key}</span><span className="text-right font-medium text-warm-900">{productSpecifications(product)[key] || 'N/A'}</span></div>)}</div></section>)}</div></div></>}</main><BottomNav /></div>
}
