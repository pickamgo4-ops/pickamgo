import { Cart, CartItemWithRelations, Address, Order, RiderDelivery, RiderProfile, SellerVerification, CheckoutOrder, PayoutMethod, Payout, PayoutBalances, DeliverySettings, PlatformPromoStats } from '../types'

const CONFIGURED_API_URL = process.env.NEXT_PUBLIC_API_URL
const FALLBACK_API_URL = '/api'
const PRODUCTION_API_URL = 'https://pickamgo-production.up.railway.app/api'

function resolveApiUrl(): string {
  if (CONFIGURED_API_URL) return CONFIGURED_API_URL

  if (typeof window === 'undefined') {
    return process.env.NODE_ENV === 'production'
      ? PRODUCTION_API_URL
      : FALLBACK_API_URL
  }

  const hostname = window.location.hostname
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1'
  if (isLocalhost) return FALLBACK_API_URL

  return PRODUCTION_API_URL
}

const API_URL = resolveApiUrl()

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function getGuestSessionId(): string {
  if (typeof window === 'undefined') return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  const key = 'pickamgo-guest-session-id'
  const cookie = document.cookie.split('; ').find(value => value.startsWith(`${key}=`))
  let sessionId = cookie ? decodeURIComponent(cookie.slice(key.length + 1)) : localStorage.getItem(key)
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    const rootDomain = process.env.NEXT_PUBLIC_MARKETPLACE_DOMAIN || 'pickamgo.com'
    const isPickAmGoHost = window.location.hostname === rootDomain || window.location.hostname.endsWith(`.${rootDomain}`)
    document.cookie = `${key}=${encodeURIComponent(sessionId)}; Max-Age=2592000; Path=/${isPickAmGoHost ? `; Domain=.${rootDomain}` : ''}; SameSite=Lax`
    localStorage.setItem(key, sessionId)
  } else if (!cookie) {
    localStorage.setItem(key, sessionId)
  }
  return sessionId
}

export function clearGuestSessionId(): void {
  if (typeof window === 'undefined') return
  const key = 'pickamgo-guest-session-id'
  const rootDomain = process.env.NEXT_PUBLIC_MARKETPLACE_DOMAIN || 'pickamgo.com'
  document.cookie = `${key}=; Max-Age=0; Path=/; Domain=.${rootDomain}`
  document.cookie = `${key}=; Max-Age=0; Path=/`
  localStorage.removeItem(key)
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const primaryUrl = `${API_URL}${endpoint}`
  const fallbackUrl = `${FALLBACK_API_URL}${endpoint}`
  const productionFallbackUrl = `${PRODUCTION_API_URL}${endpoint}`
  const isFormDataRequest = typeof FormData !== 'undefined' && options.body instanceof FormData

  const buildConfig = (url: string, signal?: AbortSignal): RequestInit => ({
    ...options,
    signal,
    headers: {
      ...(isFormDataRequest ? {} : { 'Content-Type': 'application/json' }),
      ...requestHeaders,
    },
  })

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const requestHeaders: Record<string, string> = { ...(options.headers as Record<string, string> || {}) }

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`
  }

  if (!token && (endpoint.startsWith('/cart') || endpoint.startsWith('/checkout/guest') || endpoint.startsWith('/public-notices'))) {
    const guestSessionId = getGuestSessionId()
    requestHeaders['x-session-id'] = guestSessionId
  }

  const requestOptions: RequestInit = {
    ...options,
    headers: requestHeaders,
  }

  try {
    let response: Response | null = null
    let lastError: unknown
    const urlsToTry = [primaryUrl]
    const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    const method = (options.method || 'GET').toUpperCase()
    const isIdempotentRequest = method === 'GET' || method === 'HEAD' || method === 'OPTIONS'

    if (primaryUrl !== fallbackUrl && isIdempotentRequest) {
      urlsToTry.push(fallbackUrl)
    }

    if (primaryUrl !== productionFallbackUrl && isIdempotentRequest) {
      urlsToTry.push(productionFallbackUrl)
    }

    if (isProduction && isIdempotentRequest && API_URL !== FALLBACK_API_URL && API_URL !== PRODUCTION_API_URL) {
      if (!urlsToTry.includes(fallbackUrl)) {
        urlsToTry.push(fallbackUrl)
      }
    }

    for (const url of urlsToTry) {
      const attempts = isIdempotentRequest ? 2 : 1
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000)

        try {
          response = await fetch(url, buildConfig(url, controller.signal))
          if (response.status < 500) break
          await new Promise(resolve => setTimeout(resolve, 200))
        } catch (error) {
          lastError = error
          if (error instanceof DOMException && error.name === 'AbortError') {
            lastError = new Error('Request timed out')
          }
          await new Promise(resolve => setTimeout(resolve, 200))
        } finally {
          clearTimeout(timeoutId)
        }
      }
      if (response && response.status < 500) break
    }

    if (!response) {
      if (lastError instanceof Error && lastError.message === 'Request timed out') {
        return {
          success: false,
          error: 'The server is taking too long to respond. Please try again.',
        }
      }
      throw lastError || new Error('No response from API')
    }
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      console.error('API returned non-JSON response:', response.status, response.statusText, 'from', response.url)
      return {
        success: false,
        error: 'Something went wrong. Please try again later.',
      }
    }
    const data = await response.json()

    if (response.status === 401 && token) {
      if (typeof window !== 'undefined') {
        const hasToken = localStorage.getItem('token')
        if (hasToken) {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          window.dispatchEvent(new Event('auth-changed'))
        }
      }
      return {
        success: false,
        error: 'Session expired. Please log in again.',
      }
    }

    if (response.status === 401) {
      return { ...data, success: false }
    }

    if (response.status === 403) {
      return { ...data, success: false }
    }

    if (response.status === 429) {
      return {
        success: false,
        error: 'Too many requests. Please wait a moment and try again.',
      }
    }

    return response.ok ? data : { ...data, success: false }
  } catch (error) {
    console.error('API request failed:', error)
    return {
      success: false,
      error: 'Something went wrong. Please try again later.',
    }
  }
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body: any) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  patch: <T>(endpoint: string, body: any) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  uploadFile: <T>(endpoint: string, body: FormData) =>
    request<T>(endpoint, {
      method: 'POST',
      body,
    }),
  delete: <T>(endpoint: string) =>
    request<T>(endpoint, {
      method: 'DELETE',
    }),
  getCart: () => api.get<Cart>('/cart'),
  addToCart: (item: { productId?: string; serviceId?: string; variantId?: string; quantity?: number }) =>
    api.post<CartItemWithRelations>('/cart/items', item),
  updateCartItem: (itemId: string, quantity: number) =>
    api.patch<CartItemWithRelations>(`/cart/items/${itemId}`, { quantity }),
  removeCartItem: (itemId: string) => api.delete(`/cart/items/${itemId}`),
  clearCart: () => api.delete('/cart'),
  mergeGuestCart: (sessionId: string, items: any[]) =>
    api.post<Cart>('/cart/merge', { sessionId, items }),
  getAddresses: () => api.get<Address[]>('/addresses'),
  getOrders: (params?: { status?: string; page?: number; limit?: number }) => {
    const query = params
      ? '?' + new URLSearchParams(
          Object.fromEntries(
            Object.entries(params).filter(([, v]) => v !== undefined)
          ) as unknown as Record<string, string>
        ).toString()
      : ''
    return api.get<{ orders: Order[] }>(`/orders${query}`)
  },
  getProducts: (params?: { page?: number; limit?: number; category?: string; search?: string }) => {
    const query = params
      ? '?' + new URLSearchParams(
          Object.fromEntries(
            Object.entries(params).filter(([, v]) => v !== undefined)
          ) as unknown as Record<string, string>
        ).toString()
      : ''
    return api.get<{ products: any[] }>(`/products${query}`)
  },
  getServices: (params?: { page?: number; limit?: number; category?: string }) => {
    const query = params
      ? '?' + new URLSearchParams(
          Object.fromEntries(
            Object.entries(params).filter(([, v]) => v !== undefined)
          ) as unknown as Record<string, string>
        ).toString()
      : ''
    return api.get<{ services: any[] }>(`/services${query}`)
  },
  getShops: (params?: { page?: number; limit?: number; search?: string }) => {
    const query = params
      ? '?' + new URLSearchParams(
          Object.fromEntries(
            Object.entries(params).filter(([, v]) => v !== undefined)
          ) as unknown as Record<string, string>
        ).toString()
      : ''
    return api.get<{ shops: any[] }>(`/shops${query}`)
  },
  getCategories: () => api.get<any[]>('/categories'),
  getAdminDashboard: () => api.get<any>('/admin/dashboard'),
   getRiderDeliveries: () => api.get<any>('/riders/deliveries'),
  getRiderProfile: () => api.get<RiderProfile>('/riders/me'),
  getRiderDashboard: () => api.get<any>('/riders/dashboard'),
  getRiderEarnings: () => api.get<any>('/riders/earnings'),
  getRiderEarningsHistory: (params?: { page?: number; limit?: number; period?: string; status?: string }) => {
    const query = params
      ? '?' + new URLSearchParams(
          Object.fromEntries(
            Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
          ) as Record<string, string>
        ).toString()
      : ''
    return api.get<any>(`/riders/earnings/history${query}`)
  },
  getRiderHistory: (params?: { page?: number; limit?: number; status?: string }) => {
    const query = params
      ? '?' + new URLSearchParams(
          Object.fromEntries(
            Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
          ) as Record<string, string>
        ).toString()
      : ''
    return api.get<any>(`/riders/deliveries/history${query}`)
  },
  getRiderDeliveryDetail: (id: string) => api.get<any>(`/riders/deliveries/${id}`),
  acceptDelivery: (orderId: string) => api.post(`/riders/deliveries/${orderId}/accept`, {}),
  updateDeliveryStatus: (deliveryId: string, status: string) =>
    api.patch(`/riders/deliveries/${deliveryId}/status`, { status }),
  verifyDelivery: (deliveryId: string, verificationCode: string) =>
    api.post(`/riders/deliveries/${deliveryId}/verify`, { verificationCode }),
  reportDeliveryProblem: (deliveryId: string, data: { reason: string; description?: string }) =>
    api.post(`/riders/deliveries/${deliveryId}/report`, data),
  updateRiderStatus: (isOnline: boolean, isAvailable: boolean) =>
    api.patch('/riders/me/status', { isOnline, isAvailable }),
  updateRiderLocation: (latitude: number, longitude: number) =>
    api.patch('/riders/me/location', { latitude, longitude }),
  updateRiderVehicle: (data: { vehicleType?: string; vehicleNumber?: string; licenseNumber?: string }) =>
    api.patch('/riders/me/vehicle', data),
  guestCheckout: (data: any) => api.post<CheckoutOrder>('/checkout/guest', data),
  uploadImage: (file: File) => {
    const formData = new FormData()
    formData.append('image', file)
    return api.uploadFile<{ url: string; filename: string }>('/upload/image', formData)
  },
  trackOrder: (orderNumber: string) => api.get<any>(`/tracking/${orderNumber}`),
  followShop: (shopId: string) => api.post(`/follows/shops/${shopId}/follow`, {}),
  getFollowStatus: (shopId: string) => api.get<{ isFollowing: boolean }>(`/follows/shops/${shopId}/follow-status`),
  getFollowingShops: () => api.get<any>('/follows/user/following'),
  sendMessage: (userId: string, body: any) => api.post(`/messages/conversations/${userId}/messages`, body),
  getConversations: () => api.get<any>('/messages/conversations'),
  getConversation: (userId: string) => api.get<any>(`/messages/conversations/${userId}`),
  submitReport: (data: any) => api.post('/reports', data),
  createDispute: (data: any) => api.post('/disputes', data),
  getDisputes: (orderId: string) => api.get<any>(`/disputes/order/${orderId}`),
  getOrderRefunds: (orderId: string) => api.get<any>(`/refunds/order/${orderId}`),
  requestRefund: (data: { orderId: string; amount: number; reason?: string }) => api.post('/refunds', data),
  getSellerAnalytics: () => api.get<any>('/seller/analytics'),
  getSellerReviews: () => api.get<any>('/seller/reviews'),
  getSellerInventory: () => api.get<any>('/seller/inventory'),
  getPayoutMethods: () => api.get<PayoutMethod[]>('/payouts/methods'),
  createPayoutMethod: (data: any) => api.post<PayoutMethod>('/payouts/methods', data),
  deletePayoutMethod: (id: string) => api.delete(`/payouts/methods/${id}`),
  getPayoutBalances: () => api.get<PayoutBalances>('/payouts/balances'),
  getPayoutHistory: (params?: { page?: number; limit?: number }) => {
    const query = params
      ? '?' + new URLSearchParams(
          Object.fromEntries(
            Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
          ) as Record<string, string>
        ).toString()
      : ''
    return api.get<{ payouts: Payout[] }>(`/payouts/history${query}`)
  },
  requestWithdrawal: (data: { amount: number; payoutMethodId: string }) => api.post('/payouts/withdraw', data),
  getDeliverySettings: () => api.get<DeliverySettings>('/seller/delivery-settings'),
  updateDeliverySettings: (data: Partial<DeliverySettings>) => api.patch<DeliverySettings>('/seller/delivery-settings', data),
  validatePromoCode: (code: string, subtotal: number, deliveryFee: number, shopId?: string, productIds?: string[], categoryIds?: string[], campus?: string) =>
    api.post<{ valid: boolean; code?: string; campaignName?: string; discountType?: string; discountValue?: number; maxDiscount?: number | null; discountAmount: number; deliveryDiscount: number; discountedSubtotal: number }>('/promos/validate', { code, subtotal, deliveryFee, shopId, productIds, categoryIds, campus }),
  getAdminPromos: (params?: { page?: number; limit?: number; status?: string; search?: string; fundingType?: string }) => {
    const query = params
      ? '?' + new URLSearchParams(
          Object.fromEntries(
            Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
          ) as Record<string, string>
        ).toString()
      : ''
    return api.get<{ promos: any[]; pagination: any }>(`/promos${query}`)
  },
  getAdminPromo: (id: string) => api.get<any>(`/promos/${id}`),
  createAdminPromo: (data: any) => api.post<any>('/promos', data),
  updateAdminPromo: (id: string, data: any) => api.patch<any>(`/promos/${id}`, data),
  deleteAdminPromo: (id: string) => api.delete(`/promos/${id}`),
  getPlatformPromoStats: () => api.get<PlatformPromoStats>('/promos/stats/overview'),
  getSellerPromos: (params?: { page?: number; limit?: number; status?: string; search?: string }) => {
    const query = params
      ? '?' + new URLSearchParams(
          Object.fromEntries(
            Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
          ) as Record<string, string>
        ).toString()
      : ''
    return api.get<{ promos: any[]; pagination: any }>(`/seller/promos${query}`)
  },
  getSellerPromo: (id: string) => api.get<any>(`/seller/promos/${id}`),
  createSellerPromo: (data: any) => api.post<any>('/seller/promos', data),
  updateSellerPromo: (id: string, data: any) => api.patch<any>(`/seller/promos/${id}`, data),
  deleteSellerPromo: (id: string) => api.delete(`/seller/promos/${id}`),
  getFavorites: (params?: { page?: number; limit?: number; type?: string }) => {
    const query = params
      ? '?' + new URLSearchParams(
          Object.fromEntries(
            Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
          ) as Record<string, string>
        ).toString()
      : ''
    return api.get<{ favorites: any[]; pagination: any }>(`/favorites${query}`)
  },
  addFavorite: (targetType: 'PRODUCT' | 'SERVICE' | 'SHOP', targetId: string) =>
    api.post<any>('/favorites', { targetType, targetId }),
  removeFavorite: (targetType: 'PRODUCT' | 'SERVICE' | 'SHOP', targetId: string) =>
    api.delete(`/favorites/${targetType}/${targetId}`),
}
