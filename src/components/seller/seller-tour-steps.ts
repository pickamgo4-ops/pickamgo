export interface SellerTourStep {
  id: string
  title: string
  description: string
  targetSelector: string
  group?: string
  groupTitle?: string
  optional?: boolean
  order: number
}

export interface TourGroup {
  id: string
  title: string
  description?: string
  icon?: string
}

export const tourGroups: TourGroup[] = [
  {
    id: 'navigation',
    title: 'Getting Started',
    description: 'Your main hub for managing your PickAmGo business.',
  },
  {
    id: 'shop',
    title: 'Your Shop',
    description: 'Tools to manage your storefront, delivery areas, and shop appearance.',
  },
  {
    id: 'products',
    title: 'Products & Inventory',
    description: 'Add and manage products, organize categories, and track stock.',
  },
  {
    id: 'sales',
    title: 'Sales & Bookings',
    description: 'Monitor orders, manage bookings, and handle fulfillment.',
  },
  {
    id: 'earnings',
    title: 'Earnings',
    description: 'Track and manage your payout information.',
  },
  {
    id: 'business',
    title: 'Business Growth',
    description: 'Analytics, promotions, and tools to grow your business.',
  },
  {
    id: 'communication',
    title: 'Communication',
    description: 'Connect with customers through messages and notifications.',
  },
  {
    id: 'settings',
    title: 'Settings & Support',
    description: 'Configure your shop and get help when needed.',
  },
]

export const sellerTourSteps: SellerTourStep[] = [
  {
    id: 'home',
    title: 'Home',
    description: 'Your starting point for managing your PickAmGo business. Get a quick overview of your shop activity and important updates.',
    targetSelector: '[data-tour-target="/"]',
    group: 'navigation',
    groupTitle: 'Getting Started',
    order: 1,
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'View important information about your shop and get a quick overview of your seller activity.',
    targetSelector: '[data-tour-target="/seller"]',
    group: 'navigation',
    groupTitle: 'Getting Started',
    order: 2,
  },
  {
    id: 'my-shop',
    title: 'My Shop',
    description: 'This is your public PickAmGo storefront. Customers can visit this page to see your shop, products, collections and available promotions.',
    targetSelector: '[data-tour-target="/seller/shop"]',
    group: 'shop',
    groupTitle: 'Your Shop',
    order: 3,
  },
  {
    id: 'shipping',
    title: 'Shipping & Delivery',
    description: 'Choose where your shop delivers, configure your delivery areas and set the delivery information customers should see. Make sure customers outside supported delivery areas are informed before completing an order.',
    targetSelector: '[data-tour-target="/seller/shipping"]',
    group: 'shop',
    groupTitle: 'Your Shop',
    order: 4,
  },
  {
    id: 'customize',
    title: 'Customize Shop',
    description: 'Customize the appearance and branding of your public shop so it represents your business.',
    targetSelector: '[data-tour-target="/seller/shop/customize"]',
    group: 'shop',
    groupTitle: 'Your Shop',
    order: 5,
  },
  {
    id: 'products',
    title: 'Products',
    description: 'Add, edit and manage the products you sell on PickAmGo.',
    targetSelector: '[data-tour-target="/seller/products"]',
    group: 'products',
    groupTitle: 'Products & Inventory',
    order: 6,
  },
  {
    id: 'categories',
    title: 'Categories',
    description: 'Organize your products using categories and make it easier for customers to find what you\'re selling.',
    targetSelector: '[data-tour-target="/seller/categories"]',
    group: 'products',
    groupTitle: 'Products & Inventory',
    order: 7,
  },
  {
    id: 'inventory',
    title: 'Inventory',
    description: 'Keep track of your product stock and manage quantities so customers see accurate availability.',
    targetSelector: '[data-tour-target="/seller/inventory"]',
    group: 'products',
    groupTitle: 'Products & Inventory',
    order: 8,
  },
  {
    id: 'collections',
    title: 'Collections',
    description: 'Group related products together into collections such as New Arrivals, Best Sellers, Trending, Black Friday and Clearance.',
    targetSelector: '[data-tour-target="/seller/collections"]',
    group: 'products',
    groupTitle: 'Products & Inventory',
    order: 9,
  },
  {
    id: 'orders',
    title: 'Orders',
    description: 'View orders placed by customers and monitor your sales activity.',
    targetSelector: '[data-tour-target="/seller/orders"]',
    group: 'sales',
    groupTitle: 'Sales & Bookings',
    order: 10,
  },
  {
    id: 'bookings',
    title: 'Bookings',
    description: 'If your shop offers bookable services, manage customer bookings and appointments from here.',
    targetSelector: '[data-tour-target="/seller/bookings"]',
    group: 'sales',
    groupTitle: 'Sales & Bookings',
    order: 11,
  },
  {
    id: 'booking-setup',
    title: 'Booking Setup',
    description: 'Configure the services, availability and booking rules customers use when making appointments. This section is optional if you do not offer bookings.',
    targetSelector: '[data-tour-target="/seller/booking-setup"]',
    group: 'sales',
    groupTitle: 'Sales & Bookings',
    order: 12,
    optional: true,
  },
  {
    id: 'manage-orders',
    title: 'Manage Orders',
    description: 'Process and manage your orders through their different stages, from receiving an order to completing fulfillment. This is different from the Orders page which focuses on viewing orders.',
    targetSelector: '[data-tour-target="/seller/manage-orders"]',
    group: 'sales',
    groupTitle: 'Sales & Bookings',
    order: 13,
  },
  {
    id: 'payouts',
    title: 'Payouts',
    description: 'Manage your payout information and view money earned from your PickAmGo sales. Make sure your payout details are accurate because incorrect information may result in funds being sent to the wrong account.',
    targetSelector: '[data-tour-target="/seller/payouts"]',
    group: 'earnings',
    groupTitle: 'Earnings',
    order: 14,
  },
  {
    id: 'analytics',
    title: 'Analytics',
    description: 'Understand how your shop is performing. Track sales, orders, products and other useful business information.',
    targetSelector: '[data-tour-target="/seller/analytics"]',
    group: 'business',
    groupTitle: 'Business Growth',
    order: 15,
  },
  {
    id: 'reviews',
    title: 'Reviews',
    description: 'See customer reviews and feedback about your shop and products.',
    targetSelector: '[data-tour-target="/seller/reviews"]',
    group: 'business',
    groupTitle: 'Business Growth',
    order: 16,
  },
  {
    id: 'promo-codes',
    title: 'Promo Codes',
    description: 'Create promotional codes that customers can use to receive discounts on eligible purchases.',
    targetSelector: '[data-tour-target="/seller/promo-codes"]',
    group: 'business',
    groupTitle: 'Business Growth',
    order: 17,
  },
  {
    id: 'promotions',
    title: 'Clearance & Promotions',
    description: 'Create special promotions such as Black Friday, flash sales and clearance discounts. This is especially useful for products that have remained in your shop for a long time.',
    targetSelector: '[data-tour-target="/seller/promotions"]',
    group: 'business',
    groupTitle: 'Business Growth',
    order: 18,
  },
  {
    id: 'qr-code',
    title: 'QR Code',
    description: 'Generate a QR code for your PickAmGo shop. Customers can scan it to quickly visit your store. You can use it on posters, flyers, packaging, business cards and social media.',
    targetSelector: '[data-tour-target="/seller/qr-code"]',
    group: 'business',
    groupTitle: 'Business Growth',
    order: 19,
  },
  {
    id: 'messages',
    title: 'Messages',
    description: 'Communicate with customers directly about products, orders and other shop-related questions.',
    targetSelector: '[data-tour-target="/seller/messages"]',
    group: 'communication',
    groupTitle: 'Communication',
    order: 20,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Stay updated about important shop activity, orders, messages, promotions and other events.',
    targetSelector: '[data-tour-target="/seller/notifications"]',
    group: 'communication',
    groupTitle: 'Communication',
    order: 21,
  },
  {
    id: 'shop-settings',
    title: 'Shop Settings',
    description: 'Manage important settings and information related to your shop.',
    targetSelector: '[data-tour-target="/seller/settings"]',
    group: 'settings',
    groupTitle: 'Settings & Support',
    order: 22,
  },
  {
    id: 'delivery-settings',
    title: 'Delivery Settings',
    description: 'Configure your delivery preferences and delivery-related settings. This is different from Shipping & Delivery which manages the areas and information customers see.',
    targetSelector: '[data-tour-target="/seller/delivery-settings"]',
    group: 'settings',
    groupTitle: 'Settings & Support',
    order: 23,
  },
  {
    id: 'verification',
    title: 'Verification',
    description: 'Manage your seller verification information and see whether your account or shop requires any verification actions.',
    targetSelector: '[data-tour-target="/seller/verification"]',
    group: 'settings',
    groupTitle: 'Settings & Support',
    order: 24,
  },
  {
    id: 'trust-center',
    title: 'Trust Center',
    description: 'Review important trust, safety and account information that helps keep your PickAmGo seller account secure.',
    targetSelector: '[data-tour-target="/seller/trust"]',
    group: 'settings',
    groupTitle: 'Settings & Support',
    order: 25,
  },
  {
    id: 'help',
    title: 'Help',
    description: 'Find help and useful information when you need assistance using PickAmGo. You can also restart the Seller Dashboard Tour from here anytime.',
    targetSelector: '[data-tour-target="/seller/help"]',
    group: 'settings',
    groupTitle: 'Settings & Support',
    order: 26,
  },
]

export const getGroupSteps = (groupId: string): SellerTourStep[] => {
  return sellerTourSteps.filter(step => step.group === groupId)
}

export const getFirstStepInGroup = (groupId: string): SellerTourStep | undefined => {
  return sellerTourSteps.find(step => step.group === groupId)
}

export const getLastStepInGroup = (groupId: string): SellerTourStep | undefined => {
  const groupSteps = getGroupSteps(groupId)
  return groupSteps[groupSteps.length - 1]
}
