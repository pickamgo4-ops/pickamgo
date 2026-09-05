export type RiderDeliveryStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'GOING_TO_PICKUP'
  | 'ARRIVED_AT_PICKUP'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'IN_TRANSIT'
  | 'ARRIVED_AT_CUSTOMER'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED'

export type RiderStatus = 'offline' | 'online' | 'on_delivery'

export interface RiderProfile {
  id: string
  userId: string
  isOnline: boolean
  isAvailable: boolean
  vehicleType?: string | null
  vehicleNumber?: string | null
  licenseNumber?: string | null
  totalDeliveries: number
  rating: number
  totalEarnings: number
  isVerified: boolean
  user?: {
    id: string
    name: string
    email: string
    phone?: string
    avatar?: string
    location?: string
  }
  createdAt: string
  updatedAt?: string
}

export interface RiderDeliveryItem {
  id: string
  orderId: string
  orderNumber: string
  status: RiderDeliveryStatus
  pickupAddress: string
  dropoffAddress: string
  pickupLatitude?: number | null
  pickupLongitude?: number | null
  dropoffLatitude?: number | null
  dropoffLongitude?: number | null
  distance?: string | null
  estimatedTime?: string | null
  fee: number
  riderEarnings: number
  acceptedAt?: string | null
  pickedUpAt?: string | null
  deliveredAt?: string | null
  createdAt: string
  updatedAt?: string
  verificationCode?: string | null
  order?: {
    id: string
    orderNumber: string
    total: number
    status: string
    deliveryAddress: string
    deliveryLatitude?: number | null
    deliveryLongitude?: number | null
    fulfillmentMethod: string
    notes?: string | null
    items: Array<{
      id: string
      name: string
      quantity: number
      price: number
      image?: string
      productId?: string | null
      serviceId?: string | null
      variantAttributes?: string | null
      product?: {
        id: string
        name: string
        images?: Array<{ url: string }>
        price: number
      }
      service?: {
        id: string
        name: string
      }
    }>
    shop?: {
      id: string
      name: string
      logo?: string
      location: string
      latitude?: number | null
      longitude?: number | null
      owner?: {
        id: string
        name: string
        email: string
        avatar?: string
        location: string
      }
    }
    customer?: {
      id: string
      name: string
      email?: string
      phone?: string
      avatar?: string
      location?: string
    }
    payment?: {
      id: string
      method: string
      provider: string
      status: string
      amount: number
      transactionRef: string
      paidAt?: string | null
    }
    rider?: {
      id: string
      name: string
    }
  }
  riderEarningsRecord?: {
    id: string
    grossAmount: number
    platformFee: number
    netAmount: number
    status: string
    availableAt?: string | null
    withdrawnAt?: string | null
  }
}

export interface RiderDashboardData {
  rider: {
    id: string
    userId: string
    isOnline: boolean
    isAvailable: boolean
    vehicleType?: string | null
    vehicleNumber?: string | null
    isVerified: boolean
    rating: number
    totalDeliveries: number
    totalEarnings: number
    user: {
      id: string
      name: string
      email: string
      phone?: string
      avatar?: string
      location?: string
    }
  }
  availableDeliveries: number
  activeDelivery: RiderDeliveryItem | null
  todayEarnings: number
  weekEarnings: number
  totalEarnings: number
  pendingEarnings: number
  todayCompleted: number
}

export interface RiderEarningsRecord {
  id: string
  orderId: string
  deliveryId: string
  orderNumber: string
  grossAmount: number
  platformFee: number
  netAmount: number
  status: 'PENDING' | 'AVAILABLE' | 'WITHDRAWN'
  availableAt?: string | null
  withdrawnAt?: string | null
  createdAt: string
}

export interface RiderEarningsSummary {
  todayEarnings: number
  weekEarnings: number
  monthEarnings: number
  totalEarnings: number
  pendingEarnings: number
  availableBalance: number
  totalWithdrawn: number
  records: RiderEarningsRecord[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface RiderNotification {
  id: string
  type: string
  title: string
  message: string
  data?: string | null
  isRead: boolean
  createdAt: string
}

export interface RiderConversation {
  id: string
  otherParticipant: {
    id: string
    name: string
    avatar?: string
    lastActiveAt?: string | null
  }
  order?: {
    id: string
    orderNumber: string
    status: string
  }
  lastMessage: {
    id: string
    content: string
    createdAt: string
    senderId: string
    sender?: { id: string; name: string }
  } | null
  unreadCount: number
  updatedAt: string
}

export type VehicleType = 'BICYCLE' | 'MOTORCYCLE' | 'CAR' | 'OTHER'
export type PayoutStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REVERSED'
export type VerificationStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED'