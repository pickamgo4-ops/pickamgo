'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, CreditCard, FileText, ShoppingBag, ArrowLeft, CheckCircle, User, Phone, Mail, Truck } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { BottomNav } from '../../components/layout/BottomNav'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Input } from '../../components/ui/Input'
import { api } from '../../lib/api'
import { Cart, Address, CheckoutOrder, DeliverySettings } from '../../types'
import { mapApiCartToFrontend, mapApiAddressToFrontend } from '../../lib/api-mappers'

type CheckoutMode = 'checking' | 'guest' | 'logged-in'
type FulfillmentMethod = 'PLATFORM_DELIVERY' | 'SELLER_DELIVERY' | 'PICKUP'

export default function CheckoutPage() {
  const router = useRouter()
  const [mode, setMode] = useState<CheckoutMode>('checking')
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState<Cart | null>(null)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string>('')
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [orderNotes, setOrderNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [orderConfirmation, setOrderConfirmation] = useState<CheckoutOrder | null>(null)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [newAddress, setNewAddress] = useState({
    label: '',
    street: '',
    city: '',
    region: '',
    country: 'Ghana',
    phone: '',
    instructions: '',
  })
  const [guestInfo, setGuestInfo] = useState({
    name: '',
    phone: '',
    email: '',
    deliveryAddress: '',
  })
  const [showSignup, setShowSignup] = useState(false)
  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPhone, setSignupPhone] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupLoading, setSignupLoading] = useState(false)
  const [signupError, setSignupError] = useState('')
  const [shopSettings, setShopSettings] = useState<Record<string, DeliverySettings>>({})

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) {
      setMode('guest')
      loadGuestData()
      return
    }
    setMode('logged-in')
    loadData()
  }

  const loadGuestData = async () => {
    setLoading(true)
    try {
      const cartRes = await api.get<Cart>('/cart')
      if (cartRes.success && cartRes.data) {
        const mappedCart = mapApiCartToFrontend(cartRes.data)
        setCart(mappedCart)
        if (mappedCart.items.length === 0) {
          router.push('/cart')
        } else {
          await loadShopSettings(mappedCart.items)
        }
      } else {
        router.push('/cart')
      }
    } catch (err) {
      console.error('Failed to load cart:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [cartRes, addressesRes] = await Promise.all([
        api.get<Cart>('/cart'),
        api.get<Address[]>('/addresses'),
      ])

      if (cartRes.success && cartRes.data) {
        const mappedCart = mapApiCartToFrontend(cartRes.data)
        setCart(mappedCart)
        if (mappedCart.items.length === 0) {
          router.push('/cart')
        } else {
          await loadShopSettings(mappedCart.items)
        }
      } else {
        router.push('/cart')
      }

      if (addressesRes.success && Array.isArray(addressesRes.data)) {
        const mappedAddresses = addressesRes.data.map(mapApiAddressToFrontend)
        setAddresses(mappedAddresses)
        const defaultAddr = mappedAddresses.find(a => a.isDefault)
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id)
        } else if (mappedAddresses.length > 0) {
          setSelectedAddressId(mappedAddresses[0].id)
        }
      }
    } catch (err) {
      console.error('Failed to load checkout data:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadShopSettings = async (items: any[]) => {
    const shopIds = Array.from(new Set(items.map(item => item.shopId || item.product?.shop?.id).filter(Boolean)))
    const settings: Record<string, DeliverySettings> = {}

    await Promise.all(
      shopIds.map(async (shopId) => {
        try {
          const res = await api.get<DeliverySettings>(`/shops/${shopId}/delivery-settings`)
          if (res.success && res.data) {
            settings[shopId] = res.data
          }
        } catch {
          // ignore
        }
      })
    )

    setShopSettings(settings)
  }

  const handleAddAddress = async () => {
    try {
      const response = await api.post<Address>('/addresses', {
        ...newAddress,
        isDefault: addresses.length === 0,
      })
      if (response.success && response.data) {
        const mapped = mapApiAddressToFrontend(response.data)
        setAddresses(prev => [...prev, mapped])
        setSelectedAddressId(mapped.id)
        setShowAddressForm(false)
        setNewAddress({
          label: '',
          street: '',
          city: '',
          region: '',
          country: 'Ghana',
          phone: '',
          instructions: '',
        })
      }
    } catch (err) {
      console.error('Failed to add address:', err)
    }
  }

  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cart || cart.items.length === 0) return

    setSubmitting(true)
    setError('')

    try {
      const items = cart.items.map(item => ({
        productId: item.productId,
        serviceId: item.serviceId,
        variantId: item.variantId,
        quantity: item.quantity,
      }))

      const fulfillmentMethod = getFulfillmentMethod()

      const response = await api.post<CheckoutOrder>('/checkout/guest', {
        items,
        ...guestInfo,
        deliveryType,
        paymentMethod,
        notes: orderNotes,
        fulfillmentMethod,
      })

      if (response.success && response.data) {
        setOrderConfirmation(response.data)
        await api.delete('/cart')
      } else {
        setError(response.error || response.message || 'Checkout failed')
      }
    } catch (err) {
      setError('An error occurred during checkout.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLoggedInSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cart || cart.items.length === 0) return

    setSubmitting(true)
    setError('')

    try {
      const items = cart.items.map(item => ({
        productId: item.productId,
        serviceId: item.serviceId,
        variantId: item.variantId,
        quantity: item.quantity,
      }))

      const fulfillmentMethod = getFulfillmentMethod()

      const response = await api.post<CheckoutOrder>('/checkout', {
        items,
        addressId: selectedAddressId,
        deliveryType,
        paymentMethod,
        notes: orderNotes,
        fulfillmentMethod,
      })

      if (response.success && response.data) {
        setOrderConfirmation(response.data)
        await api.delete('/cart')
      } else {
        setError(response.error || response.message || 'Checkout failed')
      }
    } catch (err) {
      setError('An error occurred during checkout.')
    } finally {
      setSubmitting(false)
    }
  }

  const getFulfillmentMethod = (): FulfillmentMethod => {
    if (deliveryType === 'pickup') return 'PICKUP'
    const firstItem = cart?.items[0]
    const shopId = firstItem?.shopId || firstItem?.product?.shop?.id
    const settings = shopId ? shopSettings[shopId] : null
    
    if (settings?.sellerDeliveryAvailable) {
      return 'SELLER_DELIVERY'
    }
    return 'PLATFORM_DELIVERY'
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setSignupLoading(true)
    setSignupError('')

    try {
      const response = await api.post<{ token: string; user: any }>('/auth/register', {
        name: signupName || guestInfo.name,
        email: signupEmail || guestInfo.email,
        phone: signupPhone || guestInfo.phone,
        password: signupPassword,
        role: 'buyer',
      })

      if (response.success && response.data) {
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        router.push('/')
      } else {
        setSignupError(response.error || response.message || 'Registration failed')
      }
    } catch (err) {
      setSignupError('An error occurred. Please try again.')
    } finally {
      setSignupLoading(false)
    }
  }

  if (mode === 'checking' || loading) {
    return (
      <div className="min-h-screen pb-20 md:pb-0">
        <Header />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-warm-800/60">Loading checkout...</p>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    )
  }

  if (orderConfirmation) {
    return (
      <div className="min-h-screen pb-20 md:pb-0">
        <Header />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={40} className="text-green-600" />
            </div>
            <h2 className="font-display text-2xl font-bold text-warm-900 mb-2">
              Order Confirmed!
            </h2>
            <p className="text-warm-800/60 mb-2">
              Your order has been placed successfully.
            </p>
            <p className="text-sm font-medium text-warm-900 mb-6">
              Order #{orderConfirmation.orderNumber}
            </p>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-200 mb-6 text-left">
              <h3 className="font-semibold text-warm-900 mb-3">Order Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-warm-800/60">Subtotal</span>
                  <span className="font-medium">GH₵{orderConfirmation.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-warm-800/60">Delivery</span>
                  <span className="font-medium">GH₵{orderConfirmation.deliveryFee.toFixed(2)}</span>
                </div>
                <div className="border-t border-warm-200 pt-2 flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-lg">GH₵{orderConfirmation.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {mode === 'guest' && (
              <div className="bg-primary/5 rounded-2xl p-6 shadow-sm border border-primary/20 mb-6 text-left">
                <h3 className="font-semibold text-warm-900 mb-2">Save your orders, follow shops, get updates</h3>
                <p className="text-sm text-warm-800/60 mb-4">
                  Create an account to track your orders, follow your favorite shops, and get notified about deals.
                </p>
                {!showSignup ? (
                  <Button fullWidth onClick={() => setShowSignup(true)}>
                    Create Account
                  </Button>
                ) : (
                  <form onSubmit={handleSignup} className="space-y-3">
                    {signupError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                        {signupError}
                      </div>
                    )}
                    <Input
                      placeholder="Full name"
                      value={signupName}
                      onValueChange={setSignupName}
                      icon={<User size={18} />}
                    />
                    <Input
                      type="email"
                      placeholder="Email"
                      value={signupEmail}
                      onValueChange={setSignupEmail}
                      icon={<Mail size={18} />}
                    />
                    <Input
                      type="tel"
                      placeholder="Phone"
                      value={signupPhone}
                      onValueChange={setSignupPhone}
                      icon={<Phone size={18} />}
                    />
                    <Input
                      type="password"
                      placeholder="Password"
                      value={signupPassword}
                      onValueChange={setSignupPassword}
                      required
                    />
                    <div className="flex gap-2">
                      <Button type="submit" fullWidth disabled={signupLoading}>
                        {signupLoading ? 'Creating...' : 'Create Account'}
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setShowSignup(false)}>
                        Skip
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}

            <Button fullWidth onClick={() => router.push('/orders')} icon={<ArrowLeft size={18} />}>
              View My Orders
            </Button>
          </div>
        </main>
        <BottomNav />
      </div>
    )
  }

  const subtotal = cart?.items.reduce((sum, item) => sum + (item.variant?.price || item.price) * item.quantity, 0) || 0
  const deliveryFee = deliveryType === 'delivery' ? (subtotal > 100 ? 0 : 15) : 0
  const total = subtotal + deliveryFee
  const selectedAddress = addresses.find(a => a.id === selectedAddressId)
  const fulfillmentMethod = getFulfillmentMethod()

  if (mode === 'guest') {
    return (
      <div className="min-h-screen pb-20 md:pb-0">
        <Header />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-warm-100 transition-colors">
              <ArrowLeft size={20} className="text-warm-800" />
            </button>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
                Guest Checkout
              </h1>
              <p className="text-warm-800/60">No account required</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleGuestSubmit} className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-200">
              <h3 className="font-semibold text-warm-900 mb-4 flex items-center gap-2">
                <User size={20} className="text-primary" />
                Your Details
              </h3>
              <div className="space-y-3">
                <Input
                  placeholder="Full Name"
                  value={guestInfo.name}
                  onValueChange={(v) => setGuestInfo({ ...guestInfo, name: v })}
                  required
                />
                <Input
                  type="tel"
                  placeholder="Phone Number"
                  value={guestInfo.phone}
                  onValueChange={(v) => setGuestInfo({ ...guestInfo, phone: v })}
                  required
                />
                <Input
                  type="email"
                  placeholder="Email (optional)"
                  value={guestInfo.email}
                  onValueChange={(v) => setGuestInfo({ ...guestInfo, email: v })}
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-200">
              <h3 className="font-semibold text-warm-900 mb-4 flex items-center gap-2">
                <MapPin size={20} className="text-primary" />
                Delivery Address
              </h3>
              <textarea
                value={guestInfo.deliveryAddress}
                onChange={(e) => setGuestInfo({ ...guestInfo, deliveryAddress: e.target.value })}
                placeholder="Enter your full delivery address"
                required
                className="w-full bg-warm-50 border border-warm-200 rounded-xl py-3 px-4 text-warm-900 placeholder:text-warm-800/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none h-24"
              />
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-200">
              <h3 className="font-semibold text-warm-900 mb-4 flex items-center gap-2">
                <Truck size={20} className="text-primary" />
                Delivery Method
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDeliveryType('delivery')}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    deliveryType === 'delivery'
                      ? 'border-primary bg-primary/5'
                      : 'border-warm-200 hover:border-warm-300'
                  }`}
                >
                  <Truck size={24} className={`mx-auto mb-2 ${deliveryType === 'delivery' ? 'text-primary' : 'text-warm-800/50'}`} />
                  <span className="font-medium text-sm text-warm-900">Delivery</span>
                  <p className="text-xs text-warm-800/60 mt-1">Deliver to address</p>
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryType('pickup')}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    deliveryType === 'pickup'
                      ? 'border-primary bg-primary/5'
                      : 'border-warm-200 hover:border-warm-300'
                  }`}
                >
                  <ShoppingBag size={24} className={`mx-auto mb-2 ${deliveryType === 'pickup' ? 'text-primary' : 'text-warm-800/50'}`} />
                  <span className="font-medium text-sm text-warm-900">Pickup</span>
                  <p className="text-xs text-warm-800/60 mt-1">Collect at shop</p>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-200">
              <h3 className="font-semibold text-warm-900 mb-4 flex items-center gap-2">
                <CreditCard size={20} className="text-primary" />
                Payment Method
              </h3>
              <div className="space-y-2">
                {[
                  { id: 'cash', label: 'Cash on Delivery', desc: 'Pay when you receive your order' },
                  { id: 'card', label: 'Card Payment', desc: 'Pay with credit/debit card' },
                  { id: 'mobile', label: 'Mobile Money', desc: 'Pay with M-Pesa or similar' },
                ].map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                      paymentMethod === method.id
                        ? 'border-primary bg-primary/5'
                        : 'border-warm-200 hover:border-warm-300'
                    }`}
                  >
                    <span className="font-medium text-sm text-warm-900">{method.label}</span>
                    <p className="text-xs text-warm-800/60 mt-0.5">{method.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-200">
              <h3 className="font-semibold text-warm-900 mb-4">Order Summary</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-warm-800/70">Subtotal ({cart?.items.length} items)</span>
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
                type="submit"
                disabled={submitting}
              >
                {submitting ? 'Processing...' : `Pay GH₵${total.toFixed(2)}`}
              </Button>
            </div>
          </form>
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
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-warm-100 transition-colors">
            <ArrowLeft size={20} className="text-warm-800" />
          </button>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
              Checkout
            </h1>
            <p className="text-warm-800/60">Complete your order</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLoggedInSubmit} className="space-y-6">
          {/* Delivery Type */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-200">
            <h3 className="font-semibold text-warm-900 mb-4 flex items-center gap-2">
              <MapPin size={20} className="text-primary" />
              Delivery Method
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDeliveryType('delivery')}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  deliveryType === 'delivery'
                    ? 'border-primary bg-primary/5'
                    : 'border-warm-200 hover:border-warm-300'
                }`}
              >
                <Truck size={24} className={`mx-auto mb-2 ${deliveryType === 'delivery' ? 'text-primary' : 'text-warm-800/50'}`} />
                <span className="font-medium text-sm text-warm-900">Delivery</span>
                <p className="text-xs text-warm-800/60 mt-1">Deliver to address</p>
              </button>
              <button
                type="button"
                onClick={() => setDeliveryType('pickup')}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  deliveryType === 'pickup'
                    ? 'border-primary bg-primary/5'
                    : 'border-warm-200 hover:border-warm-300'
                }`}
              >
                <ShoppingBag size={24} className={`mx-auto mb-2 ${deliveryType === 'pickup' ? 'text-primary' : 'text-warm-800/50'}`} />
                <span className="font-medium text-sm text-warm-900">Pickup</span>
                <p className="text-xs text-warm-800/60 mt-1">Collect at shop</p>
              </button>
            </div>
          </div>

          {/* Address Selection */}
          {deliveryType === 'delivery' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-warm-900 flex items-center gap-2">
                  <MapPin size={20} className="text-primary" />
                  Delivery Address
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddressForm(!showAddressForm)}
                  className="text-sm text-primary font-medium hover:text-primary-dark"
                >
                  + Add New
                </button>
              </div>

              {addresses.length === 0 && !showAddressForm ? (
                <p className="text-sm text-warm-800/60 mb-4">No addresses saved. Add one below.</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {addresses.map((addr) => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => setSelectedAddressId(addr.id)}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                        selectedAddressId === addr.id
                          ? 'border-primary bg-primary/5'
                          : 'border-warm-200 hover:border-warm-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-warm-900">{addr.label}</span>
                            {addr.isDefault && (
                              <Badge variant="default" className="text-[10px]">Default</Badge>
                            )}
                          </div>
                          <p className="text-xs text-warm-800/60 mt-0.5">
                            {addr.street}, {addr.city}, {addr.region}
                          </p>
                          <p className="text-xs text-warm-800/50">{addr.phone}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Add Address Form */}
              {showAddressForm && (
                <div className="border-t border-warm-200 pt-4 mt-4 animate-fade-in">
                  <h4 className="font-medium text-warm-900 mb-3">Add New Address</h4>
                  <div className="space-y-3">
                    <Input
                      placeholder="Label (e.g., Home, Work)"
                      value={newAddress.label}
                      onValueChange={(v) => setNewAddress({ ...newAddress, label: v })}
                    />
                    <Input
                      placeholder="Street Address"
                      value={newAddress.street}
                      onValueChange={(v) => setNewAddress({ ...newAddress, street: v })}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="City"
                        value={newAddress.city}
                        onValueChange={(v) => setNewAddress({ ...newAddress, city: v })}
                      />
                      <Input
                        placeholder="Region"
                        value={newAddress.region}
                        onValueChange={(v) => setNewAddress({ ...newAddress, region: v })}
                      />
                    </div>
                    <Input
                      placeholder="Phone Number"
                      value={newAddress.phone}
                      onValueChange={(v) => setNewAddress({ ...newAddress, phone: v })}
                    />
                    <Input
                      placeholder="Delivery Instructions (optional)"
                      value={newAddress.instructions}
                      onValueChange={(v) => setNewAddress({ ...newAddress, instructions: v })}
                    />
                    <div className="flex gap-2">
                      <Button type="button" size="sm" onClick={handleAddAddress}>
                        Save Address
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setShowAddressForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment Method */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-200">
            <h3 className="font-semibold text-warm-900 mb-4 flex items-center gap-2">
              <CreditCard size={20} className="text-primary" />
              Payment Method
            </h3>
            <div className="space-y-2">
              {[
                { id: 'cash', label: 'Cash on Delivery', desc: 'Pay when you receive your order' },
                { id: 'card', label: 'Card Payment', desc: 'Pay with credit/debit card' },
                { id: 'mobile', label: 'Mobile Money', desc: 'Pay with M-Pesa or similar' },
              ].map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPaymentMethod(method.id)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                    paymentMethod === method.id
                      ? 'border-primary bg-primary/5'
                      : 'border-warm-200 hover:border-warm-300'
                  }`}
                >
                  <span className="font-medium text-sm text-warm-900">{method.label}</span>
                  <p className="text-xs text-warm-800/60 mt-0.5">{method.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Order Notes */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-200">
            <h3 className="font-semibold text-warm-900 mb-4 flex items-center gap-2">
              <FileText size={20} className="text-primary" />
              Order Notes (Optional)
            </h3>
            <textarea
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="Any special instructions for your order..."
              className="w-full bg-warm-50 border border-warm-200 rounded-xl py-3 px-4 text-warm-900 placeholder:text-warm-800/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none h-24"
            />
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-200">
            <h3 className="font-semibold text-warm-900 mb-4">Order Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-warm-800/70">Subtotal ({cart?.items.length} items)</span>
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

            {selectedAddress && (
              <div className="mt-4 p-3 bg-warm-50 rounded-xl">
                <p className="text-xs text-warm-800/60 mb-1">Delivering to:</p>
                <p className="text-sm font-medium text-warm-900">
                  {selectedAddress.label}
                </p>
                <p className="text-xs text-warm-800/60">
                  {selectedAddress.street}, {selectedAddress.city}
                </p>
              </div>
            )}

            <Button
              fullWidth
              className="mt-6"
              type="submit"
              disabled={submitting || (deliveryType === 'delivery' && !selectedAddressId)}
            >
              {submitting ? 'Processing...' : `Pay GH₵${total.toFixed(2)}`}
            </Button>
          </div>
        </form>
      </main>

      <BottomNav />
    </div>
  )
}
