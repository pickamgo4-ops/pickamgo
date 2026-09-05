import { Router } from 'express'
import { z } from 'zod'
import prisma from '../utils/prisma'
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth'
import { errorResponse, successResponse, validateBody } from '../types/express'
import { generateOrderNumber } from '../utils/orderNumber'

const router = Router()

const createTestOrderSchema = z.object({
  customerId: z.string().min(1),
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(20).default(1),
  deliveryAddress: z.string().min(5),
  deliveryLatitude: z.number().min(-90).max(90).optional(),
  deliveryLongitude: z.number().min(-180).max(180).optional(),
  deliveryFee: z.number().min(0).max(1000).default(0),
  fulfillmentMethod: z.literal('FIND_IT_NEAR_ME_RIDER').default('FIND_IT_NEAR_ME_RIDER'),
})

router.use(authMiddleware, requireRole(['ADMIN']))

router.get('/options', async (_req: AuthenticatedRequest, res) => {
  const [customers, shops, products, riders] = await Promise.all([
    prisma.user.findMany({ where: { isAdmin: false, suspended: false, banned: false }, select: { id: true, name: true, email: true }, orderBy: { name: 'asc' }, take: 100 }),
    prisma.shop.findMany({ where: { status: 'ACTIVE' }, select: { id: true, name: true, ownerId: true }, orderBy: { name: 'asc' }, take: 100 }),
    prisma.product.findMany({ where: { status: 'ACTIVE', stock: { gt: 0 } }, select: { id: true, name: true, price: true, shopId: true, shop: { select: { name: true } } }, orderBy: { name: 'asc' }, take: 250 }),
    prisma.user.findMany({ where: { isRider: true, suspended: false, banned: false }, select: { id: true, name: true, email: true }, orderBy: { name: 'asc' }, take: 100 }),
  ])
  return successResponse(res, { customers, shops, products, riders })
})

router.get('/', async (_req: AuthenticatedRequest, res) => {
  const orders = await prisma.order.findMany({
    where: { isTestOrder: true },
    include: { shop: { select: { name: true } }, customer: { select: { name: true, email: true } }, rider: { select: { name: true } }, delivery: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return successResponse(res, orders)
})

router.post('/', validateBody(createTestOrderSchema), async (req: AuthenticatedRequest, res) => {
  const { customerId, productId, quantity, deliveryAddress, deliveryLatitude, deliveryLongitude, deliveryFee } = req.body
  const [customer, product] = await Promise.all([
    prisma.user.findUnique({ where: { id: customerId }, select: { id: true, name: true, email: true } }),
    prisma.product.findFirst({ where: { id: productId, status: 'ACTIVE' }, include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 }, shop: true } }),
  ])
  if (!customer) return errorResponse(res, 'Customer not found', 404)
  if (!product) return errorResponse(res, 'Active product not found', 404)

  const itemTotal = Number(product.price) * quantity
  const total = itemTotal + deliveryFee
  const order = await prisma.$transaction(async tx => {
    const created = await tx.order.create({
      data: {
        orderNumber: `TEST-${generateOrderNumber()}`,
        customerId: customer.id,
        shopId: product.shopId,
        sellerId: product.shop.ownerId,
        total,
        originalSubtotal: itemTotal,
        discountedSubtotal: itemTotal,
        deliveryAddress,
        deliveryLatitude,
        deliveryLongitude,
        deliveryFee,
        fulfillmentMethod: 'FIND_IT_NEAR_ME_RIDER',
        status: 'PAID',
        deliveryStatus: 'PENDING',
        isTestOrder: true,
      },
    })
    await tx.orderItem.create({ data: { orderId: created.id, productId: product.id, name: product.name, price: product.price, image: product.images[0]?.url || '', quantity } })
    await tx.payment.create({ data: { orderId: created.id, amount: total, method: 'TEST', provider: 'TEST', status: 'PAID', transactionRef: `TEST-${created.id}` } })
    return created
  })
  return successResponse(res, order, 201, 'Test order created')
})

router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id }, select: { id: true, isTestOrder: true } })
  if (!order) return errorResponse(res, 'Order not found', 404)
  if (!order.isTestOrder) return errorResponse(res, 'Only test orders can be reset', 403)
  await prisma.order.delete({ where: { id: order.id } })
  return successResponse(res, { deleted: true }, 200, 'Test order reset')
})

export default router
