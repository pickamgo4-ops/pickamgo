import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { errorHandler } from './middleware/errorHandler'
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

const app = express()

app.use(helmet())
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
    return callback(new Error('Origin not allowed'))
  },
  credentials: true,
}))
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: false, limit: '100kb' }))

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: 'Too many requests, please try again later.' },
})
app.use('/api/', limiter)

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many authentication attempts, please try again later.' },
})
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)
app.use('/api/auth/forgot-password', authLimiter)

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
app.use('/api/payouts', payoutRoutes)
app.use('/api/seller/delivery-settings', deliverySettingsRoutes)

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'PickAmGo API is running' })
})

app.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok' })
})

app.use(errorHandler)

const PORT = process.env.PORT || 4000

app.listen(PORT, () => {
  console.log(`🚀 PickAmGo API running on port ${PORT}`)
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)
})
