export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  promotionName?: string;
  promotionType?: string;
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
    customization?: import('../lib/shop-themes').ShopCustomization | null;
    allowGuestCheckout?: boolean;
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
  availableStock?: number | null;
  sku?: string;
  brand?: string;
  shortDescription?: string;
  allowOffers?: boolean;
  minimumOfferAmount?: number;
  allowCounteroffers?: boolean;
  allowReservations?: boolean;
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
  shop?: { id: string; name: string; slug: string; logo?: string; customization?: import('../lib/shop-themes').ShopCustomization | null; allowGuestCheckout?: boolean };
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
  shippingZones?: Array<{ id: string; name: string; city?: string | null; area?: string | null; locations?: string[] | string; deliveryFee: number; freeDeliveryFrom?: number | null; estimatedDelivery: string }>
  collections?: Array<{ id: string; name: string; description?: string | null; products?: Array<{ product: Product }> }>
  promotions?: Array<{ id: string; name: string; type: string; products?: Array<{ product: Product }> }>
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
  offerId?: string;
  reservationId?: string;
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
  offerId?: string;
  reservationId?: string;
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
  offerId?: string;
  reservationId?: string;
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
  availableStock?: number;
  image?: string;
  attributes: Record<string, string>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  allowGuestCheckout: boolean;
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

export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'NOT_SUBMITTED';

export type ReviewStatus = 'UNDER_REVIEW' | 'NEEDS_REVIEW' | 'AUTO_APPROVED';

export type SellerType = 'INDIVIDUAL' | 'BUSINESS';

export type RiskLevel = 'LOW' | 'NORMAL' | 'MEDIUM' | 'HIGH';

export type ModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface SellerVerification {
  id: string;
  userId: string;
  shopId?: string;
  fullName: string;
  phoneNumber: string;
  sellerType?: SellerType;
  businessName?: string | null;
  businessDescription?: string | null;
  businessType?: string | null;
  businessReg?: string | null;
  location?: string | null;
  intendedSell?: string | null;
  agreedToTerms: boolean;
  agreedAt?: string | null;
  idNumber?: string | null;
  idType?: string | null;
  idFrontUrl?: string | null;
  idBackUrl?: string | null;
  selfieUrl?: string | null;
  type: string;
  status: VerificationStatus;
  reviewStatus?: ReviewStatus | null;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  verificationMethod?: string | null;
  verificationProvider?: string | null;
  verificationReference?: string | null;
  verificationDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SellerRisk {
  id: string;
  userId: string;
  riskLevel: RiskLevel;
  trustScore: number;
  flags?: string | null;
  lastCheckedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SellerPayoutFreeze {
  id: string;
  userId: string;
  frozenBy: string;
  reason: string;
  frozenAt: string;
  thawedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutMethodChange {
  id: string;
  userId: string;
  payoutMethodId: string;
  changedByUserId: string;
  changeReason?: string | null;
  confirmedVia?: string | null;
  changedAt: string;
  isUnusual: boolean;
}

export interface SellerVerificationHistory {
  id: string;
  userId: string;
  verificationId: string;
  statusFrom?: string | null;
  statusTo: string;
  reason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface SellerTrustInfo {
  verificationStatus: VerificationStatus;
  verificationMethod?: string | null;
  verificationProvider?: string | null;
  verificationDate?: string | null;
  reviewStatus?: ReviewStatus | null;
  trustScore: number;
  riskLevel: RiskLevel;
  isPayoutFrozen: boolean;
  payoutFreezeReason?: string | null;
  canSell: boolean;
  restrictions: string[];
}

export interface ReviewResponse {
  id: string;
  reviewId: string;
  userId: string;
  userName: string;
  comment: string;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string; avatar?: string };
}

export interface ReviewImage {
  id: string;
  reviewId: string;
  url: string;
  sortOrder: number;
  createdAt: string;
}

export interface OrderStatusHistoryEntry {
  id: string;
  orderId: string;
  status: string;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
}

export interface DisputeMessage {
  id: string;
  disputeId: string;
  senderId: string;
  senderRole: string;
  content: string;
  attachmentUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  sender?: { id: string; name: string; avatar?: string };
}

export interface FlashSale {
  id: string;
  name: string;
  description?: string | null;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  maxQuantity?: number | null;
  soldCount: number;
  startsAt: string;
  endsAt: string;
  status: string;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  products?: Array<{
    productId: string;
    product: Product;
    sortOrder: number;
  }>;
}

export interface SellerWalletSummary {
  gross: number;
  commission: number;
  deliveryFee: number;
  net: number;
  promoDiscount: number;
  orderCount: number;
  availableBalance: number;
  withdrawnAmount: number;
  pendingPayout: number;
  products: number;
  orders: number;
  customers: number;
  views: number;
}

export interface SellerWalletTransaction {
  id: string;
  sellerId?: string;
  orderId?: string;
  payoutId?: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  description?: string | null;
  createdAt: string;
  order?: { orderNumber: string; createdAt: string };
}

export interface CancellationRequest {
  id: string;
  orderId: string;
  sellerId?: string;
  customerId?: string;
  amount: number;
  currency: string;
  reason?: string | null;
  status: string;
  adminNotes?: string | null;
  processedBy?: string | null;
  processedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  order?: { orderNumber: string; status: string };
  customer?: { id: string; name: string; avatar?: string };
  seller?: { id: string; name: string; avatar?: string };
}

export interface AbandonedCartInfo {
  id: string;
  cartId: string;
  userId?: string | null;
  sessionId?: string | null;
  itemsCount: number;
  subtotal: number;
  recovered: boolean;
  recoveryToken?: string | null;
  lastRemindedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
  cart?: {
    id: string;
    items: Array<{
      id: string;
      productId?: string | null;
      serviceId?: string | null;
      quantity: number;
      price: number;
      name: string;
      image: string;
      product?: Product;
      service?: BeautyService;
    }>;
  };
}
