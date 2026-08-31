export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  image: string;
  images?: string[];
  description: string;
  category: string;
  subcategory?: string;
  seller: Seller;
  shop?: {
    id: string;
    name: string;
    slug: string;
    logo?: string;
    campus?: string;
  };
  location: string;
  distance: string;
  rating: number;
  reviews: number;
  deliveryTime: string;
  isAvailable: boolean;
  isVerified: boolean;
  isTrending?: boolean;
  isNew?: boolean;
  isDeal?: boolean;
  isFavorite?: boolean;
  stock: number;
  sku?: string;
  brand?: string;
  shortDescription?: string;
  variants?: ProductVariant[];
  createdAt: string;
}

export interface BeautyService {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  duration: string;
  image: string;
  images?: string[];
  description: string;
  category: string;
  subcategory: string;
  provider: Seller;
  location: string;
  distance: string;
  rating: number;
  reviews: number;
  availability: string[];
  isVerified: boolean;
  isTrending?: boolean;
  isFavorite?: boolean;
  createdAt: string;
}

export interface Shop {
  id: string;
  name: string;
  slug: string;
  logo: string;
  banner?: string;
  description: string;
  category: string[];
  owner: Seller;
  location: string;
  distance: string;
  rating: number;
  reviews: number;
  followers: number;
  isVerified: boolean;
  isOpen: boolean;
  openingHours: string;
  deliveryAvailable?: boolean;
  pickupAvailable?: boolean;
  sellerDeliveryAvailable?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  platformDeliveryFee?: number;
  sellerDeliveryFee?: number;
  pickupInstructions?: string;
  products: Product[];
  services: BeautyService[];
  customization?: import('../lib/shop-themes').ShopCustomization | null;
  createdAt: string;
}

export interface Seller {
  id: string;
  name: string;
  avatar: string;
  location: string;
  rating: number;
  isVerified: boolean;
  responseTime: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  icon: string;
  color: string;
  count: number;
  isActive: boolean;
  displayOrder: number;
  parentId?: string;
  parent?: { id: string; name: string };
  children?: Category[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  location: string;
  isSeller: boolean;
  isRider: boolean;
  favorites: string[];
  orders: Order[];
  createdAt: string;
  role?: 'buyer' | 'seller' | 'rider' | 'admin';
}

export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'picked_up' | 'delivered' | 'cancelled';
  deliveryAddress: string;
  createdAt: string;
  estimatedDelivery: string;
  shopId?: string;
  shopName?: string;
  riderId?: string;
  riderName?: string;
  fulfillmentMethod?: 'PLATFORM_DELIVERY' | 'SELLER_DELIVERY' | 'PICKUP';
  promoDiscount?: number;
  originalSubtotal?: number;
  discountedSubtotal?: number;
  promoCode?: {
    id: string;
    code: string;
    discountType: string;
    discountValue: number;
    fundingType: string;
  };
  redemption?: {
    id: string;
    fundingSource: string;
    sellerPayout: number;
    pickamgoCommission: number;
    pickamgoPromoExpense: number;
    sellerFundedDiscount: number;
  };
}

export interface OrderItem {
  product: Product | BeautyService;
  quantity: number;
  price: number;
  productId?: string;
  serviceId?: string;
  variantId?: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  id: string;
  cartId: string;
  productId?: string;
  serviceId?: string;
  variantId?: string;
  shopId?: string;
  quantity: number;
  price: number;
  product?: Product;
  service?: BeautyService;
  variant?: ProductVariant;
  createdAt: string;
  updatedAt: string;
}

export interface CartItemWithRelations extends CartItem {
  product?: Product;
  service?: BeautyService;
  variant?: ProductVariant;
}

export interface CheckoutItem {
  productId?: string;
  serviceId?: string;
  variantId?: string;
  quantity: number;
}

export interface Address {
  id: string;
  userId: string;
  label: string;
  street: string;
  city: string;
  region: string;
  country: string;
  postalCode?: string;
  phone: string;
  instructions?: string;
  isDefault: boolean;
  latitude?: number | null;
  longitude?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CheckoutOrder {
  id: string;
  orderNumber: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: string;
  deliveryAddress: string;
  paymentMethod: string;
  createdAt: string;
}

export interface ShopCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  shopId: string;
  productCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku?: string;
  price: number;
  originalPrice?: number;
  stock: number;
  image?: string;
  attributes: Record<string, string>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SellerVerification {
  id: string
  userId: string
  fullName?: string
  phoneNumber?: string
  shopId?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'
  type?: string
  idType?: string
  idNumber?: string
  idFrontUrl?: string
  idBackUrl?: string
  selfieUrl?: string
  businessName?: string
  businessType?: string
  businessReg?: string
  rejectionReason?: string
  reviewedBy?: string
  reviewedAt?: string
  createdAt: string
  updatedAt?: string
}

export interface RiderProfile {
  id: string;
  userId: string;
  isOnline: boolean;
  isAvailable: boolean;
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
  vehicleType: string;
  vehicleNumber?: string;
  licenseNumber?: string;
  totalDeliveries: number;
  rating: number;
  totalEarnings: number;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RiderDelivery {
  id: string;
  orderId: string;
  orderNumber: string;
  riderId: string;
  status: 'pending' | 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffAddress: string;
  dropoffLatitude: number;
  dropoffLongitude: number;
  earnings: number;
  distance: string;
  estimatedTime: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  createdAt: string;
  status?: 'sending' | 'failed';
}

export interface Conversation {
  userId: string;
  orderId?: string;
  userName: string;
  userAvatar: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface Report {
  id: string;
  type: 'product' | 'shop' | 'seller' | 'review' | 'message' | 'user';
  targetId?: string;
  reason: string;
  description?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface Dispute {
  id: string;
  orderId: string;
  orderNumber: string;
  userId: string;
  reason: string;
  description?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface NotificationPreferences {
  orderUpdates: boolean;
  shopUpdates: boolean;
  dealsAndPromotions: boolean;
  deliveryUpdates: boolean;
  beautyServices: boolean;
}

export interface TrackingOrder {
  orderNumber: string;
  status: string;
  items: any[];
  total: number;
  shopName: string;
  deliveryAddress: string;
  createdAt: string;
  estimatedDelivery: string;
  fulfillmentMethod: string;
  timeline: Array<{
    status: string;
    label: string;
    completed: boolean;
    active: boolean;
    icon?: any;
  }>;
}

export interface PayoutMethod {
  id: string;
  type: string;
  provider: string;
  phoneNumber: string;
  accountName?: string;
  isDefault: boolean;
  isVerified: boolean;
  createdAt: string;
}

export interface Payout {
  id: string;
  amount: number;
  currency: string;
  status: string;
  reference: string;
  processedAt?: string;
  failureReason?: string;
  payoutMethod: PayoutMethod;
  createdAt: string;
}

export interface PayoutBalances {
  available: number;
  pending: number;
  totalEarnings: number;
  totalWithdrawn: number;
}

export interface DeliverySettings {
  id: string;
  name?: string;
  deliveryAvailable: boolean;
  pickupAvailable: boolean;
  sellerDeliveryAvailable: boolean;
  platformDeliveryFee: number;
  sellerDeliveryFee: number;
  pickupInstructions?: string;
  deliveryZones?: string;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface SellerEarnings {
  id: string;
  orderId: string;
  grossAmount: number;
  platformFee: number;
  deliveryFee: number;
  netAmount: number;
  status: string;
  availableAt?: string;
  withdrawnAt?: string;
  createdAt: string;
}

export interface RiderEarnings {
  id: string;
  deliveryId: string;
  orderId: string;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  status: string;
  availableAt?: string;
  withdrawnAt?: string;
  createdAt: string;
}

export interface PromoCode {
  id: string;
  code: string;
  campaignName?: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  maxDiscount?: number;
  minimumOrderAmount: number;
  fundingType: 'SELLER' | 'PICKAMGO';
  usageLimit?: number;
  usageCount: number;
  usagePerCustomer?: number;
  startAt: string;
  endAt: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'EXHAUSTED';
  appliesTo?: string;
  shopIds?: string[];
  productIds?: string[];
  categoryIds?: string[];
  campuses?: string[];
  customerEligibility: 'EVERYONE' | 'NEW_ONLY' | 'EXISTING_ONLY';
  discountAppliesTo: 'PRODUCTS' | 'PRODUCTS_AND_DELIVERY';
  campaignBudget?: number;
  campaignSpent: number;
  createdBy: string;
  sellerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromoRedemption {
  id: string;
  promoCodeId: string;
  orderId: string;
  customerId?: string;
  guestIdentifier?: string;
  originalSubtotal: number;
  discountAmount: number;
  discountedSubtotal: number;
  deliveryDiscount: number;
  fundingSource: 'SELLER' | 'PICKAMGO';
  sellerPayout: number;
  pickamgoCommission: number;
  pickamgoPromoExpense: number;
  sellerFundedDiscount: number;
  createdAt: string;
}

export interface PromoStats {
  totalUses: number;
  totalDiscount: number;
  totalEligibleSales: number;
  totalPickamgoExpense: number;
  totalSellerFunded: number;
  totalCommission: number;
  uniqueCustomers: number;
  campaignBudget?: number;
  campaignSpent: number;
  fundingType?: string;
}

export interface PlatformPromoStats {
  activePromos: number;
  totalUses: number;
  totalDiscount: number;
  pickamgoCost: number;
  revenueFromPromoOrders: number;
}
