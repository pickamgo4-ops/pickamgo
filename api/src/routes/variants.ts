import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth'
import { successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'

const router = Router()

const variantSchema = z.object({
  name: z.string().min(1, 'Variant name is required'),
  sku: z.string().optional(),
  price: z.number().positive().optional(),
  stock: z.number().int().min(0).default(0),
  image: z.string().url().optional(),
  attributes: z.string().optional(),
  sortOrder: z.number().min(0).default(0),
  isActive: z.boolean().default(true),
})

const updateVariantSchema = variantSchema.partial()

router.get('/products/:productId', async (req: AuthenticatedRequest, res) => {
  try {
    const { productId } = req.params

    const variants = await prisma.productVariant.findMany({
      where: { productId },
      orderBy: { sortOrder: 'asc' },
    })

    return successResponse(res, variants)
  } catch (error) {
    return errorResponse(res, 'Failed to fetch variants', 500)
  }
})

router.post('/products/:productId', authMiddleware, requireRole(['SELLER']), validateBody(variantSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const { productId } = req.params
    const userId = req.user!.id

    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) return errorResponse(res, 'Product not found', 404)
    if (product.sellerId !== userId) return errorResponse(res, 'Not authorized', 403)

    const variant = await prisma.productVariant.create({
      data: { ...req.body, productId },
    })

    return successResponse(res, variant, 201, 'Variant created successfully')
  } catch (error) {
    return errorResponse(res, 'Failed to create variant', 500)
  }
})

router.patch('/:id', authMiddleware, requireRole(['SELLER']), validateBody(updateVariantSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    const variant = await prisma.productVariant.findUnique({ where: { id }, include: { product: true } })
    if (!variant) return errorResponse(res, 'Variant not found', 404)
    if (variant.product.sellerId !== userId) return errorResponse(res, 'Not authorized', 403)

    const updated = await prisma.productVariant.update({
      where: { id },
      data: req.body,
    })

    return successResponse(res, updated, undefined, 'Variant updated successfully')
  } catch (error) {
    return errorResponse(res, 'Failed to update variant', 500)
  }
})

router.delete('/:id', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    const variant = await prisma.productVariant.findUnique({ where: { id }, include: { product: true } })
    if (!variant) return errorResponse(res, 'Variant not found', 404)
    if (variant.product.sellerId !== userId) return errorResponse(res, 'Not authorized', 403)

    await prisma.productVariant.delete({ where: { id } })

    return successResponse(res, null, 200, 'Variant deleted successfully')
  } catch (error) {
    return errorResponse(res, 'Failed to delete variant', 500)
  }
})

export default router
