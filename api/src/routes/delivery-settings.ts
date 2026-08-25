import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware, AuthenticatedRequest, requireRole } from '../middleware/auth'
import { successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'

const router = Router()

const deliverySettingsSchema = z.object({
  deliveryAvailable: z.boolean().default(true),
  pickupAvailable: z.boolean().default(true),
  sellerDeliveryAvailable: z.boolean().default(false),
  platformDeliveryFee: z.number().min(0).default(10),
  sellerDeliveryFee: z.number().min(0).default(0),
  pickupInstructions: z.string().optional(),
  deliveryZones: z.string().optional(),
})

router.get('/', authMiddleware, requireRole(['SELLER', 'ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const shop = await prisma.shop.findFirst({
      where: { ownerId: req.user!.id },
      select: {
        id: true,
        deliveryAvailable: true,
        pickupAvailable: true,
        sellerDeliveryAvailable: true,
        platformDeliveryFee: true,
        sellerDeliveryFee: true,
        pickupInstructions: true,
        deliveryZones: true,
      },
    })

    if (!shop) {
      return errorResponse(res, 'Shop not found', 404)
    }

    return successResponse(res, shop)
  } catch (error) {
    return errorResponse(res, 'Failed to fetch delivery settings', 500)
  }
})

router.patch('/', authMiddleware, requireRole(['SELLER', 'ADMIN']), validateBody(deliverySettingsSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const shop = await prisma.shop.findFirst({
      where: { ownerId: req.user!.id },
    })

    if (!shop) {
      return errorResponse(res, 'Shop not found', 404)
    }

    const updated = await prisma.shop.update({
      where: { id: shop.id },
      data: req.body,
    })

    return successResponse(res, updated, undefined, 'Delivery settings updated')
  } catch (error) {
    return errorResponse(res, 'Failed to update delivery settings', 500)
  }
})

export default router
