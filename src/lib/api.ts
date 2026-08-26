import { Cart, Address, Order, RiderDelivery, RiderProfile, SellerVerification, CheckoutOrder, PayoutMethod, Payout, PayoutBalances, DeliverySettings } from '../types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api'

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

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_URL}${endpoint}`

  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    }
  }

  try {
    let response: Response | null = null
    let lastError: unknown
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        response = await fetch(url, config)
        if (response.status < 500 || attempt === 2) break
        await new Promise(resolve => setTimeout(resolve, 250))
      } catch (error) {
        lastError = error
        if (attempt === 2) throw error
        await new Promise(resolve => setTimeout(resolve, 250))
      }
    }
    if (!response) throw lastError || new Error('No response from API')
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      return {
        success: false,
        error: `API returned ${response.status} ${response.statusText}. Check that the backend is running.`,
      }
    }
    const data = await response.json()

    if (response.status === 401) {
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

    if (response.status === 429) {
      return {
        success: false,
        error: 'Too many requests. Please wait a moment and try again.',
      }
    }

    return response.ok ? data : { ...data, success: false }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body: any) =>
    request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  patch: <T>(endpoint: string, body: any) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  delete: <T>(endpoint: string) =>
    request<T>(endpoint, {
      method: 'DELETE',
    }),
  getCart: () => api.get<Cart>('/cart'),
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
          ) as Record<string, string>
        ).toString()
      : ''
    return api.get<{ services: any[] }>(`/services${query}`)
  },
  getShops: (params?: { page?: number; limit?: number; search?: string }) => {
    const query = params
      ? '?' + new URLSearchParams(
          Object.fromEntries(
            Object.entries(params).filter(([, v]) => v !== undefined)
          ) as Record<string, string>
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
