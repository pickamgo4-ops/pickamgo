import { Router } from 'express'
import { z } from 'zod'
import prisma from '../utils/prisma'
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth'
import { enforceAuthenticatedRateLimit } from '../middleware/rate-limit'
import { errorResponse, successResponse, validateBody } from '../types/express'

const router = Router()
const createAlertSchema = z.object({ variantId: z.string().optional() })

router.post('/products/:productId', authMiddleware, requireRole(['USER']), validateBody(createAlertSchema), async (req: AuthenticatedRequest, res) => {
  if (!(await enforceAuthenticatedRateLimit(req, res, 'write'))) return
  try {
    const product = await prisma.product.findFirst({
      where: { id: req.params.productId, status: { in: ['ACTIVE', 'OUT_OF_STOCK'] }, shop: { status: 'ACTIVE' } },
      select: { id: true, name: true, stock: true, variants: { select: { id: true, name: true, stock: true, isActive: true } } },
    })
    if (!product) return errorResponse(res, 'Product is no longer available', 404)

    let variant = null
    if (req.body.variantId) {
      variant = product.variants.find(item => item.id === req.body.variantId)
      if (!variant || !variant.isActive) return errorResponse(res, 'Variant not found or unavailable', 404)
      if (variant.stock > 0) return errorResponse(res, 'This variant is already available', 409)
    } else if (product.stock > 0) {
      return errorResponse(res, 'This product is already available', 409)
    }

    const existing = await prisma.productStockAlert.findFirst({ where: { productId: product.id, userId: req.user!.id, variantId: req.body.variantId || null, active: true } })
    if (existing) return successResponse(res, { subscribed: true, alert: existing }, 200, "You're already on the restock list.")

    const alert = await prisma.productStockAlert.create({ data: { productId: product.id, userId: req.user!.id, variantId: req.body.variantId || null } })
    return successResponse(res, { subscribed: true, alert }, 201, 'You will be notified when this is back in stock.')
  } catch (error: any) {
    if (error?.code === 'P2002') return successResponse(res, { subscribed: true }, 200, "You're already on the restock list.")
    console.error('Failed to create stock alert:', error)
    return errorResponse(res, 'Failed to create restock alert', 500)
  }
})

router.get('/', authMiddleware, requireRole(['USER']), async (req: AuthenticatedRequest, res) => {
  try {
    const alerts = await prisma.productStockAlert.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, active: true, createdAt: true, notifiedAt: true, cancelledAt: true, product: { select: { id: true, name: true, stock: true, status: true, images: { select: { url: true }, orderBy: { sortOrder: 'asc' }, take: 1 } } }, variant: { select: { id: true, name: true, stock: true, isActive: true } } },
    })
    return successResponse(res, alerts)
  } catch { return errorResponse(res, 'Failed to load restock alerts', 500) }
})

router.delete('/:id', authMiddleware, requireRole(['USER']), async (req: AuthenticatedRequest, res) => {
  try {
    const result = await prisma.productStockAlert.updateMany({ where: { id: req.params.id, userId: req.user!.id, active: true }, data: { active: false, cancelledAt: new Date() } })
    if (!result.count) return errorResponse(res, 'Restock alert not found', 404)
    return successResponse(res, null, 200, 'Restock alert removed.')
  } catch { return errorResponse(res, 'Failed to remove restock alert', 500) }
})

router.get('/seller', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  try {
    const alerts = await prisma.productStockAlert.findMany({ where: { active: true, product: { sellerId: req.user!.id } }, select: { productId: true, variantId: true, variant: { select: { id: true, name: true } }, product: { select: { id: true, name: true } } } })
    const grouped = new Map<string, any>()
    for (const alert of alerts) {
      const key = `${alert.productId}:${alert.variantId || 'product'}`
      const current = grouped.get(key) || { productId: alert.productId, productName: alert.product.name, variantId: alert.variantId, variantName: alert.variant?.name || null, waiting: 0 }
      current.waiting += 1
      grouped.set(key, current)
    }
    return successResponse(res, Array.from(grouped.values()).sort((a, b) => b.waiting - a.waiting))
  } catch { return errorResponse(res, 'Failed to load restock interest', 500) }
})

export default router
