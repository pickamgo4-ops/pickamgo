import { Cart, CartItemWithRelations, Address, Order, RiderDelivery, RiderProfile, SellerVerification, CheckoutOrder, PayoutMethod, Payout, PayoutBalances, DeliverySettings } from '../types'

const PRIMARY_API_URL = process.env.NEXT_PUBLIC_API_URL || '/api'
const FALLBACK_API_URL = '/api'

function resolveApiUrl(): string {
  if (typeof window === 'undefined') return PRIMARY_API_URL
  const hostname = window.location.hostname
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1'
  if (isLocalhost) return PRIMARY_API_URL
  return PRIMARY_API_URL
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
  const isFormDataRequest = typeof FormData !== 'undefined' && options.body instanceof FormData

  const buildConfig = (url: string): RequestInit => ({
    ...options,
    headers: {
      ...(isFormDataRequest ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
  })

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  if (token) {
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    }
  }

  if (!token && (endpoint.startsWith('/cart') || endpoint.startsWith('/checkout/guest'))) {
    const guestSessionId = getGuestSessionId()
    options.headers = {
      ...options.headers,
      'x-session-id': guestSessionId,
    }
  }

  try {
    let response: Response | null = null
    let lastError: unknown
    const urlsToTry = [primaryUrl]
    const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    if (isProduction && API_URL !== FALLBACK_API_URL) {
      urlsToTry.push(fallbackUrl)
    }

    for (const url of urlsToTry) {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          response = await fetch(url, buildConfig(url))
          if (response.status < 500) break
          await new Promise(resolve => setTimeout(resolve, 200))
        } catch (error) {
          lastError = error
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }
      if (response && response.status < 500) break
    }

    if (!response) throw lastError || new Error('No response from API')
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
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.dispatchEvent(new Event('auth-changed'))
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
  getRiderEarnings: () => api.get<any>('/riders/earnings'),
  getRiderHistory: () => api.get<any>('/riders/deliveries/history'),
  acceptDelivery: (orderId: string) => api.post(`/riders/deliveries/${orderId}/accept`, {}),
  updateDeliveryStatus: (deliveryId: string, status: string) =>
    api.patch(`/riders/deliveries/${deliveryId}/status`, { status }),
  updateRiderStatus: (isOnline: boolean, isAvailable: boolean) =>
    api.patch('/riders/me/status', { isOnline, isAvailable }),
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
}
