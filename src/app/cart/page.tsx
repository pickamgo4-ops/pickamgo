'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, MapPin } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { BottomNav } from '../../components/layout/BottomNav'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { api } from '../../lib/api'
import { Cart, CartItemWithRelations } from '../../types'
import { mapApiCartToFrontend } from '../../lib/api-mappers'

export default function CartPage() {
  const router = useRouter()
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadCart()
  }, [])

  const loadCart = async () => {
    setLoading(true)
    try {
      const response = await api.get<Cart>('/cart')
      if (response.success && response.data) {
        setCart(mapApiCartToFrontend(response.data))
      }
    } catch (err) {
      console.error('Failed to load cart:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return
    setUpdating(itemId)
    try {
      const response = await api.patch<CartItemWithRelations>(`/cart/items/${itemId}`, {
        quantity: newQuantity,
      })
      if (response.success && response.data) {
        setCart(prev => {
          if (!prev) return prev
          return {
            ...prev,
            items: prev.items.map(item =>
              item.id === itemId ? { ...item, quantity: newQuantity } : item
            ),
          }
        })
      }
    } catch (err) {
      console.error('Failed to update quantity:', err)
    } finally {
      setUpdating(null)
    }
  }

  const removeItem = async (itemId: string) => {
    setUpdating(itemId)
    try {
      const response = await api.delete(`/cart/items/${itemId}`)
      if (response.success) {
        setCart(prev => {
          if (!prev) return prev
          return {
            ...prev,
            items: prev.items.filter(item => item.id !== itemId),
          }
        })
      }
    } catch (err) {
      console.error('Failed to remove item:', err)
    } finally {
      setUpdating(null)
    }
  }

  const getItemName = (item: CartItemWithRelations) => {
    return item.product?.name || item.service?.name || 'Unknown Item'
  }

  const getItemImage = (item: CartItemWithRelations) => {
    return item.product?.image || item.service?.image || ''
  }

  const getItemPrice = (item: CartItemWithRelations) => {
    return item.variant?.price || item.price
  }

  const subtotal = cart?.items.reduce((sum, item) => sum + getItemPrice(item) * item.quantity, 0) || 0
  const deliveryFee = subtotal > 0 ? (subtotal > 100 ? 0 : 15) : 0
  const total = subtotal + deliveryFee

  if (loading) {
    return (
      <div className="min-h-screen pb-20 md:pb-0">
        <Header />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-warm-800/60">Loading cart...</p>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <ShoppingBag size={28} className="text-primary" />
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
              My Cart
            </h1>
            <p className="text-warm-800/60">
              {cart?.items.length || 0} {cart?.items.length === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {!cart || cart.items.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-warm-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag size={32} className="text-warm-800/30" />
            </div>
            <h2 className="font-display text-xl font-bold text-warm-900 mb-2">
              Your cart is empty
            </h2>
            <p className="text-warm-800/60 mb-6 max-w-md mx-auto">
              Looks like you haven&apos;t added anything to your cart yet. Start shopping to find great deals!
            </p>
            <Button onClick={() => router.push('/discover')} icon={<ArrowRight size={18} />}>
              Start Shopping
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Cart Items */}
            <div className="space-y-3">
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-warm-200 animate-fade-in"
                >
                  <div className="flex gap-4">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-warm-100 flex-shrink-0">
                      <img
                        src={getItemImage(item)}
                        alt={getItemName(item)}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-warm-900 line-clamp-2">
                            {getItemName(item)}
                          </h3>
                          {item.variant && (
                            <p className="text-xs text-warm-800/60 mt-0.5">
                              {item.variant.name}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          disabled={updating === item.id}
                          className="p-1.5 text-warm-800/40 hover:text-red-500 transition-colors flex-shrink-0"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={updating === item.id || item.quantity <= 1}
                            className="w-8 h-8 rounded-lg bg-warm-100 flex items-center justify-center hover:bg-warm-200 transition-colors disabled:opacity-50"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="w-8 text-center font-semibold text-warm-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={updating === item.id}
                            className="w-8 h-8 rounded-lg bg-warm-100 flex items-center justify-center hover:bg-warm-200 transition-colors disabled:opacity-50"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                        <span className="font-bold text-warm-900">
                          GH₵{getItemPrice(item) * item.quantity}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Delivery Estimate */}
            <div className="bg-warm-50 rounded-2xl p-4 border border-warm-200">
              <div className="flex items-center gap-2 text-sm text-warm-800/70">
                <MapPin size={18} className="text-primary" />
                <span>Delivery to your address</span>
              </div>
              <p className="text-xs text-warm-800/50 mt-1 ml-6">
                Free delivery on orders over GH₵100
              </p>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-200">
              <h3 className="font-semibold text-lg text-warm-900 mb-4">Order Summary</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-warm-800/70">Subtotal</span>
                  <span className="font-medium text-warm-900">GH₵{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-warm-800/70">Delivery Fee</span>
                  <span className="font-medium text-warm-900">
                    {deliveryFee === 0 ? (
                      <Badge variant="deal">Free</Badge>
                    ) : (
                      `GH₵${deliveryFee.toFixed(2)}`
                    )}
                  </span>
                </div>
                <div className="border-t border-warm-200 pt-3 flex items-center justify-between">
                  <span className="font-semibold text-warm-900">Total</span>
                  <span className="font-bold text-xl text-warm-900">GH₵{total.toFixed(2)}</span>
                </div>
              </div>

              <Button
                fullWidth
                className="mt-6"
                onClick={() => router.push('/checkout')}
                icon={<ArrowRight size={18} />}
              >
                Proceed to Checkout
              </Button>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
