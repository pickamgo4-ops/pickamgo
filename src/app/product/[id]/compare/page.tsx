'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, ExternalLink, GitCompareArrows, MapPin, ShoppingBag, Truck } from 'lucide-react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { api } from '@/lib/api'
import { getShopUrl } from '@/lib/shop-url'

function formatPrice(value: number) {
  return `GH₵${Number(value).toFixed(2)}`
}

export default function ComparePricesPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const productId = typeof params?.id === 'string' ? params.id : ''
  const variantId = searchParams.get('variantId') || undefined
  const [comparison, setComparison] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!productId) return
    setLoading(true)
    setError('')
    api.getProductPriceComparison(productId, variantId)
      .then(response => {
        if (response.success) setComparison(response.data)
        else setError(response.error || 'Unable to compare prices right now.')
      })
      .catch(() => setError('Unable to compare prices right now.'))
      .finally(() => setLoading(false))
  }, [productId, variantId])

  const offers = comparison?.offers || []
  const sourceOffer = offers.find((offer: any) => offer.productId === productId)
  const otherOffers = offers.filter((offer: any) => offer.productId !== productId)

  return <div className="min-h-screen bg-warm-50 pb-20 md:pb-0"><Header /><main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
    <button type="button" onClick={() => router.back()} className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-warm-800/65 hover:text-primary"><ArrowLeft size={17} /> Back to product</button>
    {loading ? <div className="py-24 text-center text-warm-800/60">Checking prices from available shops...</div> : error ? <Card className="mx-auto max-w-lg p-10 text-center"><p className="text-sm text-red-600" role="alert">{error}</p><Button className="mt-5" onClick={() => router.back()}>Return to product</Button></Card> : <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-primary"><GitCompareArrows size={16} /> Compare prices</div><h1 className="font-display text-3xl font-bold text-warm-900 sm:text-4xl">{comparison?.product?.name || 'Product prices'}</h1><p className="mt-2 text-sm text-warm-800/60">Real-time prices from active PickAmGo shops.</p></div>{comparison?.product?.brand && <span className="rounded-full bg-white px-3 py-2 text-sm text-warm-800/70 shadow-sm">{comparison.product.brand}</span>}</div>
      {offers.length === 0 ? <Card className="mx-auto max-w-xl p-10 text-center"><ShoppingBag size={42} className="mx-auto mb-4 text-warm-800/25" /><h2 className="font-display text-xl font-bold text-warm-900">No comparable shop listings</h2><p className="mt-2 text-sm text-warm-800/60">No other shops currently have this product with a reliable match.</p><Button className="mt-6" onClick={() => router.back()}>Return to product</Button></Card> : <>
        {otherOffers.length === 0 && <div className="mb-5 rounded-xl border border-warm-200 bg-white p-4 text-sm text-warm-800/70">No other shops currently have this product. This is the only active listing we could verify.</div>}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{offers.map((offer: any) => <Card key={`${offer.productId}-${offer.variantId || 'base'}`} className={`relative overflow-hidden p-0 ${offer.isBestPrice ? 'border-2 border-primary shadow-lg shadow-primary/10' : ''}`}>
          {offer.isBestPrice && <div className="flex items-center gap-2 bg-primary px-5 py-2 text-sm font-bold text-white"><CheckCircle2 size={16} /> Best Price</div>}
          <div className="p-5"><div className="mb-5 flex gap-4"><div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-warm-100">{offer.image ? <img src={offer.image} alt={offer.productName} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-warm-800/25"><ShoppingBag size={26} /></div>}</div><div className="min-w-0"><h2 className="truncate font-semibold text-warm-900">{offer.productName}</h2><div className="mt-2 flex items-center gap-2 text-sm text-warm-800/70"><div className="h-6 w-6 overflow-hidden rounded-full bg-warm-100">{offer.shop.logo && <img src={offer.shop.logo} alt="" className="h-full w-full object-cover" />}</div><span className="truncate">{offer.shop.name}</span></div></div></div>
            <div className="flex items-end justify-between gap-3"><div><p className="text-2xl font-bold text-warm-900">{formatPrice(offer.finalPrice)}</p>{offer.originalPrice && <p className="mt-1 text-sm text-warm-800/50 line-through">{formatPrice(offer.originalPrice)}</p>}</div>{offer.discountPercentage && <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">{offer.discountPercentage}% OFF</span>}</div>
            <div className="mt-5 space-y-2 border-t border-warm-100 pt-4 text-sm text-warm-800/65">{offer.variant && <p><span className="font-semibold text-warm-900">Variant:</span> {offer.variant.name}</p>}<p className={offer.inStock ? 'text-green-700' : 'text-red-600'}>{offer.inStock ? `In stock${offer.stock ? ` (${offer.stock} available)` : ''}` : 'Currently unavailable'}</p>{offer.delivery.available && <p className="flex items-center gap-2"><Truck size={15} /> Delivery from {formatPrice(offer.delivery.fee)}</p>}{offer.pickupAvailable && <p className="flex items-center gap-2"><ShoppingBag size={15} /> Pickup available</p>}{offer.distanceKm != null && <p className="flex items-center gap-2"><MapPin size={15} /> {Number(offer.distanceKm).toFixed(1)} km away</p>}</div>
            <div className="mt-5 grid grid-cols-2 gap-2"><Button size="sm" variant="outline" onClick={() => router.push(`/product/${offer.productId}${offer.variantId ? `?variantId=${encodeURIComponent(offer.variantId)}` : ''}`)}>View product</Button><a href={getShopUrl(offer.shop.slug)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary-600)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--color-primary-700)]">Shop <ExternalLink size={15} /></a></div>
          </div>
        </Card>)}</div>
      </>}
    </>}
  </main><BottomNav /></div>
}
