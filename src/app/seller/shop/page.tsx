'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Store, MapPin, Phone, Mail, Users, Package, Tag, Star, Clock, Copy, ExternalLink } from 'lucide-react'
import { SellerSidebar } from '@/components/SellerSidebar'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { api } from '@/lib/api'

export default function SellerShopPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [shop, setShop] = useState<any>(null)

  useEffect(() => {
    loadShop()
  }, [])

  const loadShop = async () => {
    setLoading(true)
    try {
      const response = await api.get<any>('/seller/shop')
      if (response.success && response.data?.shop) {
        setShop(response.data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <SellerSidebar>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-warm-800/60">Loading shop...</p>
          </div>
        </div>
      </SellerSidebar>
    )
  }

  if (!shop?.shop) {
    return (
      <SellerSidebar>
        <div className="text-center py-20">
          <Store size={48} className="mx-auto text-warm-800/30 mb-4" />
          <h3 className="font-semibold text-warm-900 mb-2">No shop found</h3>
          <p className="text-sm text-warm-800/60 mb-4">Create your shop to get started</p>
          <Button onClick={() => router.push('/seller/shop/create')}>Create Shop</Button>
        </div>
      </SellerSidebar>
    )
  }

  const s = shop.shop
  const shopUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${s.slug}.${process.env.NEXT_PUBLIC_MARKETPLACE_DOMAIN || 'pickamgo.com'}`
    : `https://${s.slug}.pickamgo.com`

  const copyShopUrl = async () => {
    await navigator.clipboard.writeText(shopUrl)
  }

  return (
    <SellerSidebar>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">My Shop</h1>
          <p className="text-warm-800/60 mt-1">View your shop details</p>
        </div>

        <Card className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-warm-200 flex-shrink-0">
              {s.logo ? (
                <img src={s.logo} alt={s.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-warm-800/50">
                  {s.name?.[0] || 'S'}
                </div>
              )}
            </div>
            <div className="flex-1">
              <h2 className="font-display text-xl font-bold text-warm-900">{s.name}</h2>
              <p className="text-sm text-warm-800/60 mt-1 line-clamp-2">{s.description}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={s.status === 'ACTIVE' ? 'verified' : 'deal'}>
                  {s.status}
                </Badge>
                <Badge variant={s.isOpen ? 'verified' : 'deal'}>
                  {s.isOpen ? 'Open' : 'Closed'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-warm-50 rounded-xl text-center">
              <Package size={20} className="mx-auto text-primary mb-1" />
              <p className="text-xl font-bold text-warm-900">{shop.productCount || 0}</p>
              <p className="text-xs text-warm-800/60">Products</p>
            </div>
            <div className="p-4 bg-warm-50 rounded-xl text-center">
              <Tag size={20} className="mx-auto text-purple-500 mb-1" />
              <p className="text-xl font-bold text-warm-900">{shop.categoryCount || 0}</p>
              <p className="text-xs text-warm-800/60">Categories</p>
            </div>
            <div className="p-4 bg-warm-50 rounded-xl text-center">
              <Users size={20} className="mx-auto text-pink-500 mb-1" />
              <p className="text-xl font-bold text-warm-900">{shop.followersCount || 0}</p>
              <p className="text-xs text-warm-800/60">Followers</p>
            </div>
            <div className="p-4 bg-warm-50 rounded-xl text-center">
              <Star size={20} className="mx-auto text-yellow-500 mb-1" />
              <p className="text-xl font-bold text-warm-900">{(s.rating || 0).toFixed(1)}</p>
              <p className="text-xs text-warm-800/60">Rating</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <MapPin size={18} className="text-warm-800/50" />
              <span className="text-warm-800/70">{s.location}{s.area ? `, ${s.area}` : ''}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Clock size={18} className="text-warm-800/50" />
              <span className="text-warm-800/70">{s.openingHours}</span>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-warm-50 border border-warm-200 p-4">
            <p className="text-xs text-warm-800/60 mb-1">Your public shop URL</p>
            <p className="text-sm font-medium text-warm-900 break-all">{shopUrl}</p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={copyShopUrl} icon={<Copy size={15} />}>Copy URL</Button>
              <Button size="sm" variant="ghost" onClick={() => window.open(shopUrl, '_blank', 'noopener,noreferrer')} icon={<ExternalLink size={15} />}>Open</Button>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Button onClick={() => router.push('/seller/shop/customize')}>Customize Shop</Button>
            <Button variant="outline" onClick={() => router.push('/seller/settings')}>Edit Settings</Button>
          </div>
        </Card>
      </div>
    </SellerSidebar>
  )
}
