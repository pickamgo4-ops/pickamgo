import { Router } from 'express'
import { z } from 'zod'
import prisma from '../utils/prisma'
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth'
import { enforceAuthenticatedRateLimit } from '../middleware/rate-limit'
import { errorResponse, successResponse, validateBody } from '../types/express'
import { getActiveProductPromotion } from './seller-store'

const router = Router()
const createAlertSchema = z.object({ variantId: z.string().optional() })

async function currentProductPrice(productId: string, variantId?: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, status: 'ACTIVE', shop: { status: 'ACTIVE' } },
    select: { id: true, name: true, price: true, variants: { where: { id: variantId, isActive: true }, select: { id: true, name: true, price: true, originalPrice: true } } },
  })
  if (!product) return null
  if (variantId) {
    const variant = product.variants[0]
    if (!variant) return null
    return { product, variant, price: Number(variant.price || product.price) }
  }
  const promotion = await getActiveProductPromotion(productId)
  return { product, variant: null, price: promotion ? Number(promotion.finalPrice) : Number(product.price) }
}

router.post('/products/:productId', authMiddleware, requireRole(['USER']), validateBody(createAlertSchema), async (req: AuthenticatedRequest, res) => {
  if (!(await enforceAuthenticatedRateLimit(req, res, 'write'))) return
  try {
    const current = await currentProductPrice(req.params.productId, req.body.variantId)
    if (!current) return errorResponse(res, 'Product or variant is no longer available', 404)
    const existing = await prisma.productPriceAlert.findFirst({ where: { productId: current.product.id, userId: req.user!.id, variantId: req.body.variantId || null, active: true } })
    if (existing) return successResponse(res, { subscribed: true, alert: existing }, 200, "You're already watching this price.")
    const alert = await prisma.productPriceAlert.create({ data: { productId: current.product.id, userId: req.user!.id, variantId: req.body.variantId || null, watchedPrice: current.price, lastObservedPrice: current.price } })
    return successResponse(res, { subscribed: true, alert, price: current.price }, 201, 'You will be notified when the price drops.')
  } catch (error: any) {
    if (error?.code === 'P2002') return successResponse(res, { subscribed: true }, 200, "You're already watching this price.")
    console.error('Failed to create price alert:', error)
    return errorResponse(res, 'Failed to create price alert', 500)
  }
})

router.get('/', authMiddleware, requireRole(['USER']), async (req: AuthenticatedRequest, res) => {
  try {
    const alerts = await prisma.productPriceAlert.findMany({
      where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 100,
      select: { id: true, active: true, watchedPrice: true, lastObservedPrice: true, createdAt: true, notifiedAt: true, cancelledAt: true, product: { select: { id: true, name: true, price: true, status: true, images: { select: { url: true }, orderBy: { sortOrder: 'asc' }, take: 1 } } }, variant: { select: { id: true, name: true, price: true, isActive: true } } },
    })
    const enriched = await Promise.all(alerts.map(async alert => {
      const promotion = alert.variant ? null : await getActiveProductPromotion(alert.product.id)
      const current = alert.variant ? Number(alert.variant.price || alert.product.price) : (promotion ? Number(promotion.finalPrice) : Number(alert.product.price))
      return { ...alert, currentPrice: current }
    }))
    return successResponse(res, enriched)
  } catch { return errorResponse(res, 'Failed to load price alerts', 500) }
})

router.delete('/:id', authMiddleware, requireRole(['USER']), async (req: AuthenticatedRequest, res) => {
  try {
    const result = await prisma.productPriceAlert.updateMany({ where: { id: req.params.id, userId: req.user!.id, active: true }, data: { active: false, cancelledAt: new Date() } })
    if (!result.count) return errorResponse(res, 'Price alert not found', 404)
    return successResponse(res, null, 200, 'Price alert removed.')
  } catch { return errorResponse(res, 'Failed to remove price alert', 500) }
})

router.get('/seller', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  try {
    const alerts = await prisma.productPriceAlert.findMany({ where: { active: true, product: { sellerId: req.user!.id } }, select: { productId: true, variantId: true, product: { select: { name: true } }, variant: { select: { name: true } } } })
    const grouped = new Map<string, any>()
    for (const alert of alerts) {
      const key = `${alert.productId}:${alert.variantId || 'product'}`
      const current = grouped.get(key) || { productId: alert.productId, productName: alert.product.name, variantId: alert.variantId, variantName: alert.variant?.name || null, watching: 0 }
      current.watching += 1
      grouped.set(key, current)
    }
    return successResponse(res, Array.from(grouped.values()).sort((a, b) => b.watching - a.watching))
  } catch { return errorResponse(res, 'Failed to load price-drop interest', 500) }
})

export default router
