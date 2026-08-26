import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'

const router = Router()

const addressSchema = z.object({
  label: z.string().min(1),
  address: z.string().min(5),
  city: z.string().min(1),
  area: z.string().optional(),
  campus: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  instructions: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isDefault: z.boolean().default(false),
})

const updateAddressSchema = addressSchema.partial()

router.get('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const addresses = await prisma.address.findMany({
      where: { userId: req.user!.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    })
    return successResponse(res, addresses)
  } catch (error) {
    return errorResponse(res, 'Failed to fetch addresses', 500)
  }
})

router.post('/', authMiddleware, validateBody(addressSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const data = req.body

    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user!.id },
        data: { isDefault: false },
      })
    }

    const address = await prisma.address.create({
      data: { ...data, userId: req.user!.id },
    })

    return successResponse(res, address, 201, 'Address added successfully')
  } catch (error) {
    return errorResponse(res, 'Failed to add address', 500)
  }
})

router.patch('/:id', authMiddleware, validateBody(updateAddressSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params
    const data = req.body

    const existing = await prisma.address.findFirst({
      where: { id, userId: req.user!.id },
    })
    if (!existing) return errorResponse(res, 'Address not found', 404)

    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user!.id, id: { not: id } },
        data: { isDefault: false },
      })
    }

    const updated = await prisma.address.update({
      where: { id },
      data,
    })

    return successResponse(res, updated, undefined, 'Address updated successfully')
  } catch (error) {
    return errorResponse(res, 'Failed to update address', 500)
  }
})

router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params

    const existing = await prisma.address.findFirst({
      where: { id, userId: req.user!.id },
    })
    if (!existing) return errorResponse(res, 'Address not found', 404)

    await prisma.address.delete({ where: { id } })

    return successResponse(res, null, 200, 'Address deleted successfully')
  } catch (error) {
    return errorResponse(res, 'Failed to delete address', 500)
  }
})

export default router
