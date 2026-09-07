export interface SellerTourStep {
  id: string
  title: string
  description: string
  targetSelector: string
  group?: string
}

export const sellerTourSteps: SellerTourStep[] = [
  {
    id: 'home',
    title: 'Home',
    description: 'Your seller home gives you an overview of your business and important activity. Use it as your starting point whenever you log into your Seller Dashboard.',
    targetSelector: '[data-tour-target="/seller"]',
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'View important information about your shop and get a quick overview of your seller activity.',
    targetSelector: '[data-tour-target="/seller"]',
    group: 'shop',
  },
  {
    id: 'my-shop',
    title: 'My Shop',
    description: 'This is your public PickAmGo storefront. Customers can visit this page to see your shop, products, collections and available promotions.',
    targetSelector: '[data-tour-target="/seller/shop"]',
    group: 'shop',
  },
  {
    id: 'shipping',
    title: 'Shipping & Delivery',
    description: 'Choose where your shop delivers, configure your delivery areas and set the delivery information customers should see. Make sure customers outside supported delivery areas are informed before completing an order.',
    targetSelector: '[data-tour-target="/seller/shipping"]',
    group: 'shop',
  },
  {
    id: 'customize',
    title: 'Customize Shop',
    description: 'Customize the appearance and branding of your public shop so it represents your business.',
    targetSelector: '[data-tour-target="/seller/shop/customize"]',
    group: 'shop',
  },
  {
    id: 'products',
    title: 'Products',
    description: 'Add, edit and manage the products you sell on PickAmGo.',
    targetSelector: '[data-tour-target="/seller/products"]',
  },
  {
    id: 'categories',
    title: 'Categories',
    description: 'Organize your products using categories and make it easier for customers to find what you\'re selling.',
    targetSelector: '[data-tour-target="/seller/categories"]',
  },
  {
    id: 'inventory',
    title: 'Inventory',
    description: 'Keep track of your product stock and manage quantities so customers see accurate availability.',
    targetSelector: '[data-tour-target="/seller/inventory"]',
  },
  {
    id: 'collections',
    title: 'Collections',
    description: 'Group related products together into collections such as New Arrivals, Best Sellers, Trending, Black Friday and Clearance.',
    targetSelector: '[data-tour-target="/seller/collections"]',
  },
  {
    id: 'orders',
    title: 'Orders',
    description: 'View orders placed by customers and monitor your sales activity.',
    targetSelector: '[data-tour-target="/seller/orders"]',
  },
  {
    id: 'bookings',
    title: 'Bookings',
    description: 'If your shop offers bookable services, manage customer bookings and appointments from here.',
    targetSelector: '[data-tour-target="/seller/bookings"]',
  },
  {
    id: 'booking-setup',
    title: 'Booking Setup',
    description: 'Configure the services, availability and booking rules customers use when making appointments. This section is optional if you do not offer bookings.',
    targetSelector: '[data-tour-target="/seller/booking-setup"]',
  },
  {
    id: 'manage-orders',
    title: 'Manage Orders',
    description: 'Process and manage your orders through their different stages, from receiving an order to completing fulfillment. This is different from the Orders page because it focuses on order processing and fulfillment workflow.',
    targetSelector: '[data-tour-target="/seller/manage-orders"]',
  },
  {
    id: 'payouts',
    title: 'Payouts',
    description: 'Manage your payout information and view money earned from your PickAmGo sales. Make sure your payout details are accurate because incorrect information may result in funds being sent to the wrong account.',
    targetSelector: '[data-tour-target="/seller/payouts"]',
  },
  {
    id: 'analytics',
    title: 'Analytics',
    description: 'Understand how your shop is performing. Track sales, orders, products and other useful business information.',
    targetSelector: '[data-tour-target="/seller/analytics"]',
  },
  {
    id: 'reviews',
    title: 'Reviews',
    description: 'See customer reviews and feedback about your shop and products.',
    targetSelector: '[data-tour-target="/seller/reviews"]',
  },
  {
    id: 'promo-codes',
    title: 'Promo Codes',
    description: 'Create promotional codes that customers can use to receive discounts on eligible purchases.',
    targetSelector: '[data-tour-target="/seller/promo-codes"]',
  },
  {
    id: 'promotions',
    title: 'Clearance & Promotions',
    description: 'Create special promotions such as Black Friday, flash sales and clearance discounts. This is especially useful for products that have remained in your shop for a long time.',
    targetSelector: '[data-tour-target="/seller/promotions"]',
  },
  {
    id: 'qr-code',
    title: 'QR Code',
    description: 'Generate a QR code for your PickAmGo shop. Customers can scan it to quickly visit your store. You can use it on posters, flyers, packaging, business cards and social media.',
    targetSelector: '[data-tour-target="/seller/qr-code"]',
  },
  {
    id: 'messages',
    title: 'Messages',
    description: 'Communicate with customers directly about products, orders and other shop-related questions.',
    targetSelector: '[data-tour-target="/seller/messages"]',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Stay updated about important shop activity, orders, messages, promotions and other events.',
    targetSelector: '[data-tour-target="/seller/notifications"]',
  },
  {
    id: 'shop-settings',
    title: 'Shop Settings',
    description: 'Manage important settings and information related to your shop.',
    targetSelector: '[data-tour-target="/seller/settings"]',
  },
  {
    id: 'delivery-settings',
    title: 'Delivery Settings',
    description: 'Configure your delivery preferences and delivery-related settings. This is different from Shipping & Delivery: here you configure platform delivery settings, while Shipping & Delivery manages the areas and information customers see.',
    targetSelector: '[data-tour-target="/seller/delivery-settings"]',
  },
  {
    id: 'verification',
    title: 'Verification',
    description: 'Manage your seller verification information and see whether your account or shop requires any verification actions.',
    targetSelector: '[data-tour-target="/seller/verification"]',
  },
  {
    id: 'trust-center',
    title: 'Trust Center',
    description: 'Review important trust, safety and account information that helps keep your PickAmGo seller account secure.',
    targetSelector: '[data-tour-target="/seller/trust"]',
  },
  {
    id: 'help',
    title: 'Help',
    description: 'Find help and useful information when you need assistance using PickAmGo. You can also restart the Seller Dashboard Tour from here anytime.',
    targetSelector: '[data-tour-target="/seller/help"]',
  },
]
