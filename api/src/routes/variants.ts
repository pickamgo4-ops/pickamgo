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

    if (req.body.sku) {
      const existingVariant = await prisma.productVariant.findFirst({
        where: { productId, sku: req.body.sku },
      })
      if (existingVariant) {
        return errorResponse(res, 'A variant with this SKU already exists for this product', 409)
      }
    }

    const isLowStock = req.body.stock > 0 && req.body.stock <= 5

    const variant = await prisma.productVariant.create({
      data: {
        ...req.body,
        productId,
        isLowStock,
      },
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

    if (req.body.sku) {
      const existingVariant = await prisma.productVariant.findFirst({
        where: { productId: variant.productId, sku: req.body.sku, id: { not: id } },
      })
      if (existingVariant) {
        return errorResponse(res, 'A variant with this SKU already exists for this product', 409)
      }
    }

    const isLowStock = req.body.stock !== undefined
      ? req.body.stock > 0 && req.body.stock <= 5
      : variant.isLowStock

    const updated = await prisma.productVariant.update({
      where: { id },
      data: {
        ...req.body,
        isLowStock,
      },
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
