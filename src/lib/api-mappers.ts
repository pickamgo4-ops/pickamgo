import { Product, BeautyService, Shop, Category, Cart, CartItem, CartItemWithRelations, Address, Order, ShopCategory, ProductVariant, SellerVerification, RiderProfile, RiderDelivery } from '../types'

export function mapApiProductToFrontend(apiProduct: any): Product {
  return {
    id: apiProduct.id,
    name: apiProduct.name,
    price: apiProduct.price,
    originalPrice: apiProduct.originalPrice,
    discount: apiProduct.discount,
    image: apiProduct.images?.[0]?.url || apiProduct.image || '',
    images: apiProduct.images?.map((img: any) => img.url || img) || [],
    description: apiProduct.description,
    category: apiProduct.category?.name || apiProduct.category || '',
    subcategory: apiProduct.category?.emoji || '',
    seller: {
      id: apiProduct.seller?.id || apiProduct.shop?.owner?.id || '',
      name: apiProduct.seller?.name || apiProduct.shop?.owner?.name || '',
      avatar: apiProduct.seller?.avatar || apiProduct.shop?.owner?.avatar || apiProduct.shop?.logo || '',
      location: apiProduct.seller?.location || apiProduct.location || '',
      rating: apiProduct.seller?.rating || 0,
      isVerified: apiProduct.seller?.isVerified || false,
      responseTime: apiProduct.seller?.responseTime || '',
    },
    shop: apiProduct.shop ? {
      id: apiProduct.shop.id,
      name: apiProduct.shop.name,
      slug: apiProduct.shop.slug,
      logo: apiProduct.shop.logo,
    } : undefined,
    location: apiProduct.location || apiProduct.shop?.location || '',
    distance: apiProduct.area || apiProduct.distance || '',
    rating: apiProduct.rating || 0,
    reviews: apiProduct.reviewsCount || 0,
    deliveryTime: '2-3 days',
    isAvailable: apiProduct.status === 'ACTIVE' && apiProduct.stock > 0,
    isVerified: apiProduct.isVerified || false,
    isTrending: apiProduct.isTrending,
    isNew: apiProduct.isNew,
    isDeal: apiProduct.isDeal,
    isFavorite: apiProduct.isFavorite || false,
    createdAt: apiProduct.createdAt,
  }
}

export function mapApiServiceToFrontend(apiService: any): BeautyService {
  return {
    id: apiService.id,
    name: apiService.name,
    price: apiService.price,
    originalPrice: apiService.originalPrice,
    duration: apiService.duration || '1 hour',
    image: apiService.images?.[0]?.url || apiService.image || '',
    images: apiService.images?.map((img: any) => img.url || img) || [],
    description: apiService.description,
    category: apiService.category?.name || apiService.category || '',
    subcategory: apiService.category?.emoji || '',
    provider: {
      id: apiService.provider?.id || apiService.shop?.owner?.id || '',
      name: apiService.provider?.name || apiService.shop?.name || '',
      avatar: apiService.provider?.avatar || apiService.shop?.logo || '',
      location: apiService.provider?.location || apiService.location || '',
      rating: apiService.provider?.rating || 0,
      isVerified: apiService.provider?.isVerified || false,
      responseTime: apiService.provider?.responseTime || '',
    },
    location: apiService.location || apiService.shop?.location || '',
    distance: apiService.area || apiService.distance || '',
    rating: apiService.rating || 0,
    reviews: apiService.reviewsCount || 0,
    availability: apiService.availability?.map((a: any) => {
      if (typeof a === 'string') return a
      if (a.date && a.timeSlots) return `${a.date} ${Array.isArray(a.timeSlots) ? a.timeSlots.join(', ') : a.timeSlots}`
      return String(a)
    }) || [],
    isVerified: apiService.isVerified || false,
    isTrending: apiService.isTrending,
    isFavorite: apiService.isFavorite || false,
    createdAt: apiService.createdAt,
  }
}

export function mapApiShopToFrontend(apiShop: any): Shop {
  return {
    id: apiShop.id,
    name: apiShop.name,
    slug: apiShop.slug,
    logo: apiShop.logo,
    banner: apiShop.banner,
    description: apiShop.description,
    category: apiShop.shopCategories?.map((c: any) => c.name) || apiShop.categories?.map((c: any) => c.name || c) || apiShop.category?.map((c: any) => c.name || c) || [],
    owner: {
      id: apiShop.owner?.id || apiShop.user?.id || '',
      name: apiShop.owner?.name || apiShop.user?.name || '',
      avatar: apiShop.owner?.avatar || apiShop.user?.avatar || '',
      location: apiShop.owner?.location || apiShop.location || '',
      rating: apiShop.owner?.rating || 0,
      isVerified: apiShop.owner?.isVerified || false,
      responseTime: apiShop.owner?.responseTime || '',
    },
    location: apiShop.location || '',
    distance: apiShop.area || apiShop.distance || '',
    rating: apiShop.rating || 0,
    reviews: apiShop.reviewsCount || 0,
    followers: apiShop.followersCount || 0,
    isVerified: apiShop.isVerified,
    isOpen: apiShop.isOpen,
    openingHours: apiShop.openingHours || '',
    products: (apiShop.products || []).map(mapApiProductToFrontend),
    services: (apiShop.services || []).map(mapApiServiceToFrontend),
    customization: apiShop.customization || null,
    createdAt: apiShop.createdAt,
  }
}

export function mapApiCategoryToFrontend(apiCategory: any): Category {
  return {
    id: apiCategory.id,
    name: apiCategory.name,
    emoji: apiCategory.emoji || '📦',
    color: apiCategory.color || 'bg-warm-100 text-warm-800',
    count: apiCategory.productCount || apiCategory.count || 0,
  }
}

export function mapApiCartItemToFrontend(apiItem: any): CartItem {
  return {
    id: apiItem.id,
    cartId: apiItem.cartId,
    productId: apiItem.productId,
    serviceId: apiItem.serviceId,
    variantId: apiItem.variantId,
    quantity: apiItem.quantity,
    price: apiItem.price,
    product: apiItem.product ? mapApiProductToFrontend(apiItem.product) : undefined,
    service: apiItem.service ? mapApiServiceToFrontend(apiItem.service) : undefined,
    variant: apiItem.variant,
    createdAt: apiItem.createdAt,
    updatedAt: apiItem.updatedAt,
  }
}

export function mapApiCartToFrontend(apiCart: any): Cart {
  return {
    id: apiCart.id,
    userId: apiCart.userId,
    items: (apiCart.items || []).map(mapApiCartItemToFrontend),
    createdAt: apiCart.createdAt,
    updatedAt: apiCart.updatedAt,
  }
}

export function mapApiAddressToFrontend(apiAddress: any): Address {
  return {
    id: apiAddress.id,
    userId: apiAddress.userId,
    label: apiAddress.label,
    street: apiAddress.street,
    city: apiAddress.city,
    region: apiAddress.region,
    country: apiAddress.country,
    postalCode: apiAddress.postalCode,
    phone: apiAddress.phone,
    instructions: apiAddress.instructions,
    isDefault: apiAddress.isDefault,
    createdAt: apiAddress.createdAt,
    updatedAt: apiAddress.updatedAt,
  }
}

export function mapApiOrderToFrontend(apiOrder: any): Order {
  return {
    id: apiOrder.id,
    items: (apiOrder.items || []).map((item: any) => ({
      product: item.product ? mapApiProductToFrontend(item.product) : item.service ? mapApiServiceToFrontend(item.service) : undefined,
      quantity: item.quantity,
      price: item.price,
      productId: item.productId,
      serviceId: item.serviceId,
      variantId: item.variantId,
    })),
    total: apiOrder.total,
    status: apiOrder.status,
    deliveryAddress: apiOrder.deliveryAddress || '',
    createdAt: apiOrder.createdAt,
    estimatedDelivery: apiOrder.estimatedDelivery,
    shopId: apiOrder.shopId,
    shopName: apiOrder.shop?.name || apiOrder.shopName,
    riderId: apiOrder.riderId,
    riderName: apiOrder.rider?.name || apiOrder.riderName,
    fulfillmentMethod: apiOrder.fulfillmentMethod === 'CUSTOMER_PICKUP'
      ? 'PICKUP'
      : apiOrder.fulfillmentMethod === 'SELLER_OWN_DELIVERY'
        ? 'SELLER_DELIVERY'
        : 'PLATFORM_DELIVERY',
  }
}

export function mapApiShopCategoryToFrontend(apiCat: any): ShopCategory {
  return {
    id: apiCat.id,
    name: apiCat.name,
    emoji: apiCat.emoji || '📦',
    color: apiCat.color || 'bg-warm-100 text-warm-800',
    shopId: apiCat.shopId,
    productCount: apiCat.productCount || 0,
    isActive: apiCat.isActive !== false,
    createdAt: apiCat.createdAt,
    updatedAt: apiCat.updatedAt,
  }
}

export function mapApiProductVariantToFrontend(apiVariant: any): ProductVariant {
  return {
    id: apiVariant.id,
    productId: apiVariant.productId,
    name: apiVariant.name,
    sku: apiVariant.sku,
    price: apiVariant.price,
    originalPrice: apiVariant.originalPrice,
    stock: apiVariant.stock,
    image: apiVariant.image,
    attributes: apiVariant.attributes || {},
    isActive: apiVariant.isActive !== false,
    createdAt: apiVariant.createdAt,
    updatedAt: apiVariant.updatedAt,
  }
}

export function mapApiSellerVerificationToFrontend(apiVer: any): SellerVerification {
  return {
    id: apiVer.id,
    userId: apiVer.userId,
    shopId: apiVer.shopId,
    status: apiVer.status,
    idType: apiVer.idType,
    idNumber: apiVer.idNumber,
    idDocumentUrl: apiVer.idDocumentUrl,
    businessName: apiVer.businessName,
    businessType: apiVer.businessType,
    rejectionReason: apiVer.rejectionReason,
    reviewedBy: apiVer.reviewedBy,
    reviewedAt: apiVer.reviewedAt,
    createdAt: apiVer.createdAt,
    updatedAt: apiVer.updatedAt,
  }
}

export function mapApiRiderProfileToFrontend(apiProfile: any): RiderProfile {
  return {
    id: apiProfile.id,
    userId: apiProfile.userId,
    isOnline: apiProfile.isOnline,
    isAvailable: apiProfile.isAvailable,
    currentLocation: apiProfile.currentLocation,
    vehicleType: apiProfile.vehicleType,
    vehicleNumber: apiProfile.vehicleNumber,
    licenseNumber: apiProfile.licenseNumber,
    totalDeliveries: apiProfile.totalDeliveries || 0,
    rating: apiProfile.rating || 0,
    totalEarnings: apiProfile.totalEarnings || 0,
    isVerified: apiProfile.isVerified,
    createdAt: apiProfile.createdAt,
    updatedAt: apiProfile.updatedAt,
  }
}

export function mapApiRiderDeliveryToFrontend(apiDelivery: any): RiderDelivery {
  return {
    id: apiDelivery.id,
    orderId: apiDelivery.orderId,
    orderNumber: apiDelivery.orderNumber || apiDelivery.order?.orderNumber || '',
    riderId: apiDelivery.riderId,
    status: apiDelivery.status,
    pickupAddress: apiDelivery.pickupAddress,
    pickupLatitude: apiDelivery.pickupLatitude,
    pickupLongitude: apiDelivery.pickupLongitude,
    dropoffAddress: apiDelivery.dropoffAddress,
    dropoffLatitude: apiDelivery.dropoffLatitude,
    dropoffLongitude: apiDelivery.dropoffLongitude,
    earnings: apiDelivery.earnings || 0,
    distance: apiDelivery.distance || '',
    estimatedTime: apiDelivery.estimatedTime || '',
    acceptedAt: apiDelivery.acceptedAt,
    pickedUpAt: apiDelivery.pickedUpAt,
    deliveredAt: apiDelivery.deliveredAt,
    createdAt: apiDelivery.createdAt,
  }
}
