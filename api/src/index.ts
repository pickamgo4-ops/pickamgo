import path from 'path'
import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { errorHandler } from './middleware/errorHandler'
import { verifyToken } from './middleware/auth'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), 'api/.env') })
import authRoutes from './routes/auth'
import categoryRoutes from './routes/categories'
import productRoutes from './routes/products'
import serviceRoutes from './routes/services'
import shopRoutes from './routes/shops'
import orderRoutes from './routes/orders'
import bookingRoutes from './routes/bookings'
import favoriteRoutes from './routes/favorites'
import reviewRoutes from './routes/reviews'
import searchRoutes from './routes/search'
import riderRoutes from './routes/riders'
import notificationRoutes from './routes/notifications'
import uploadRoutes from './routes/upload'
import cartRoutes from './routes/cart'
import checkoutRoutes from './routes/checkout'
import addressRoutes from './routes/addresses'
import shopCategoryRoutes from './routes/shop-categories'
import variantRoutes from './routes/variants'
import verificationRoutes from './routes/verification'
import sellerRoutes from './routes/seller'
import guestCheckoutRoutes from './routes/guest-checkout'
import trackingRoutes from './routes/tracking'
import followRoutes from './routes/follows'
import messageRoutes from './routes/messages'
import reportRoutes from './routes/reports'
import disputeRoutes from './routes/disputes'
import recommendationRoutes from './routes/recommendations'
import payoutRoutes from './routes/payouts'
import deliverySettingsRoutes from './routes/delivery-settings'
import adminRoutes from './routes/admin'
import promoRoutes from './routes/promo'
import sellerPromoRoutes from './routes/seller-promo'
import emailTestRoutes from './routes/email-test'
import emailVerificationRoutes from './routes/email-verification'
import publicNoticeRoutes from './routes/public-notices'
import bookingSetupRoutes from './routes/booking-setup'
import prisma from './utils/prisma'

const app = express()

app.set('trust proxy', 1)
app.use(helmet())
import { getAppUrl } from './utils/url'

const marketplaceDomain = process.env.MARKETPLACE_DOMAIN || 'pickamgo.com'
const allowedOrigins = Array.from(new Set([
  ...(process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean),
  `https://${marketplaceDomain}`,
  `https://www.${marketplaceDomain}`,
  'https://pickamgo.pickamgo4.workers.dev',
]))

console.log('Allowed CORS origins:', allowedOrigins)

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.some(allowed => {
      const originNormalized = origin.toLowerCase()
      const allowedNormalized = allowed.toLowerCase()
      return originNormalized === allowedNormalized || 
             originNormalized === `${allowedNormalized}/` || 
             allowedNormalized === `${originNormalized}/`
    })) {
      return callback(null, true)
    }
    
    if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
      return callback(null, true)
    }

    try {
      const hostname = new URL(origin).hostname.toLowerCase()
      if (hostname.endsWith(`.${marketplaceDomain}`)) return callback(null, true)
    } catch {
      // Reject malformed origins below.
    }
    
    console.warn(`CORS rejection for origin: ${origin}`)
    return callback(new Error('Origin not allowed'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id'],
}))
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: false, limit: '100kb' }))

const CACHE_TTL_MS = 30_000
let maintenanceModeCache: { value: boolean; expiresAt: number } | null = null

app.use(async (req, res, next) => {
  const publicPaths = ['/api/health', '/api/auth/', '/api/admin/settings/public']
  const isPublicPath = publicPaths.some(prefix => req.path === prefix.replace('/api/', '/api/') || req.path.startsWith(prefix))

  if (req.method === 'OPTIONS' || isPublicPath || req.path.startsWith('/api/admin/')) {
    next()
    return
  }

  const now = Date.now()
  let isMaintenanceMode = false

  if (maintenanceModeCache && maintenanceModeCache.expiresAt > now) {
    isMaintenanceMode = maintenanceModeCache.value
  } else {
    try {
      const maintenanceSetting = await prisma.setting.findUnique({ where: { key: 'maintenanceMode' } })
      isMaintenanceMode = (maintenanceSetting?.value || 'false') === 'true'
      maintenanceModeCache = { value: isMaintenanceMode, expiresAt: now + CACHE_TTL_MS }
    } catch (error) {
      console.error('Failed to check maintenance mode:', error)
      maintenanceModeCache = null
    }
  }

  if (!isMaintenanceMode) {
    next()
    return
  }

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(503).json({ success: false, error: 'PickAmGo is currently undergoing maintenance. Please check back soon.' })
  }

  try {
    const token = authHeader.split(' ')[1]
    const payload = verifyToken(token)
    if (payload.isAdmin) {
      next()
      return
    }
  } catch {
    // fall through to deny non-admin access during maintenance
  }

  return res.status(503).json({ success: false, error: 'PickAmGo is currently undergoing maintenance. Please check back soon.' })
})

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, error: 'Too many requests, please try again later.' },
})
app.use('/api/', limiter)

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many authentication attempts, please try again later.' },
})
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many write requests, please slow down.' },
})
const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many report submissions, please try again later.' },
})
const messageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many messages sent, please try again later.' },
})

app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)
app.use('/api/auth/forgot-password', authLimiter)
app.use('/api/reviews', writeLimiter)
app.use('/api/reports', reportLimiter)
app.use('/api/messages', messageLimiter)
app.use('/api/checkout', writeLimiter)
app.use('/api/payouts', writeLimiter)

app.use('/api/auth', authRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/products', recommendationRoutes)
app.use('/api/products', productRoutes)
app.use('/api/services', serviceRoutes)
app.use('/api/shops', shopRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/favorites', favoriteRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/riders', riderRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/checkout', checkoutRoutes)
app.use('/api/addresses', addressRoutes)
app.use('/api/shop-categories', shopCategoryRoutes)
app.use('/api/variants', variantRoutes)
app.use('/api/seller/verification', verificationRoutes)
app.use('/api/seller', sellerRoutes)
app.use('/api/checkout', guestCheckoutRoutes)
app.use('/api/tracking', trackingRoutes)
app.use('/api/follows', followRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/disputes', disputeRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/promos', promoRoutes)
app.use('/api/seller/promos', sellerPromoRoutes)
app.use('/api/payouts', payoutRoutes)
app.use('/api/seller/delivery-settings', deliverySettingsRoutes)
app.use('/api/public-notices', publicNoticeRoutes)
app.use('/api/email-verification', emailVerificationRoutes)
app.use('/api/booking-setup', bookingSetupRoutes)

if (process.env.NODE_ENV !== 'production') {
  app.use('/api/dev', emailTestRoutes)
}

app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    let productCount = 0
    let shopCount = 0
    try {
      productCount = await prisma.product.count()
      shopCount = await prisma.shop.count()
    } catch (countError) {
      console.error('Health check product/shop count error:', countError)
    }
    res.json({ success: true, message: 'PickAmGo API is running', database: 'connected', productCount, shopCount })
  } catch (error) {
    console.error('Health check database error:', error)
    res.status(500).json({ success: false, message: 'PickAmGo API is running', database: 'disconnected', error: 'Database connection failed' })
  }
})

app.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok' })
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason)
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})

app.use(errorHandler)

const PORT = process.env.PORT || 4000

app.listen(PORT, async () => {
  console.log(`🚀 PickAmGo API running on port ${PORT}`)
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)

  try {
    await prisma.$queryRaw`SELECT 1`
    console.log('✅ Database connection verified')
  } catch (error) {
    console.error('❌ Database connection failed:', error)
  }

  console.log('📧 Email configuration:', {
    configured: !!process.env.RESEND_API_KEY,
    from: process.env.RESEND_FROM_EMAIL || process.env.RESEND_NOREPLY_EMAIL || 'noreply@pickamgo.com',
    appUrl: getAppUrl(),
  })
})
