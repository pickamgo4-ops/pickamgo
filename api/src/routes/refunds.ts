import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'
import { refundTransaction } from '../services/paystack'
import { sendRefundEmail, sendAdminNotification } from '../services/email'

const router = Router()

const createRefundSchema = z.object({
  orderId: z.string().min(1),
  amount: z.number().positive(),
  reason: z.string().min(1).optional(),
})

const updateRefundSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'PROCESSED', 'FAILED']),
  adminNotes: z.string().optional(),
})

router.get('/order/:orderId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { orderId } = req.params

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true, customerId: true, sellerId: true, total: true },
    })
    if (!order) return errorResponse(res, 'Order not found', 404)

    const isCustomer = order.customerId === req.user!.id
    const isSeller = order.sellerId === req.user!.id
    const isAdmin = req.user!.isAdmin

    if (!isCustomer && !isSeller && !isAdmin) {
      return errorResponse(res, 'Not authorized', 403)
    }

    const refunds = await prisma.refund.findMany({
      where: { orderId },
      include: {
        order: { select: { orderNumber: true, total: true } },
        seller: { select: { id: true, name: true, avatar: true, email: true } },
        customer: { select: { id: true, name: true, avatar: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return successResponse(res, refunds)
  } catch (error) {
    console.error('Failed to fetch refunds:', error)
    return errorResponse(res, 'Failed to fetch refunds', 500)
  }
})

router.post('/', authMiddleware, validateBody(createRefundSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const { orderId, amount, reason } = req.body

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true, seller: true, customer: true },
    })
    if (!order) return errorResponse(res, 'Order not found', 404)

    const isCustomer = order.customerId === req.user!.id
    const isSeller = order.sellerId === req.user!.id

    if (!isCustomer && !isSeller && !req.user!.isAdmin) {
      return errorResponse(res, 'Not authorized to request a refund for this order', 403)
    }

    if (order.status !== 'PAID' && order.status !== 'DELIVERED') {
      return errorResponse(res, 'Refunds are only available for paid/delivered orders', 400)
    }

    if (order.isTestOrder) {
      return errorResponse(res, 'Cannot refund test orders', 400)
    }

    const existingRefund = await prisma.refund.findFirst({
      where: {
        orderId,
        status: { in: ['PENDING', 'APPROVED', 'PROCESSED'] },
      },
    })

    if (existingRefund) {
      return errorResponse(res, 'A refund is already in progress for this order', 409)
    }

    const numericTotal = Number(order.total)
    if (amount > numericTotal) {
      return errorResponse(res, 'Refund amount exceeds order total', 400)
    }

    const refund = await prisma.$transaction(async (tx) => {
      const created = await tx.refund.create({
        data: {
          orderId,
          sellerId: order.sellerId,
          customerId: order.customerId ?? null,
          amount,
          currency: 'GHS',
          reason,
          status: 'PENDING',
        },
      })

      await tx.order.update({
        where: { id: orderId },
        data: { refundId: created.id },
      })

      const notifiedUserId = isCustomer ? order.sellerId : order.customerId
      if (notifiedUserId) {
        await tx.notification.create({
          data: {
            userId: notifiedUserId,
            type: 'REFUND_REQUESTED',
            title: 'Refund Requested',
            message: `A refund has been requested for order ${order.orderNumber}`,
            data: JSON.stringify({ refundId: created.id, orderId }),
          },
        })
      }

      return created
    })

    await sendAdminNotification(
      `Refund Requested — Order ${order.orderNumber}`,
      `<p>A refund has been requested for order <strong>#${order.orderNumber}</strong>.</p>
       <p><strong>Amount:</strong> GH₵${Number(amount).toFixed(2)}</p>
       ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}`,
      `A refund has been requested for order #${order.orderNumber} for GH₵${Number(amount).toFixed(2)}.`,
    ).catch(err => console.error('Failed to send admin refund notification:', err))

    return successResponse(res, refund, 201, 'Refund requested successfully')
  } catch (error) {
    console.error('Failed to create refund:', error)
    return errorResponse(res, 'Failed to create refund', 500)
  }
})

router.get('/review', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user!.isAdmin) {
      return errorResponse(res, 'Not authorized', 403)
    }

    const status = req.query.status as string | undefined
    const where: any = {}
    if (status) where.status = status

    const refunds = await prisma.refund.findMany({
      where,
      include: {
        order: { select: { orderNumber: true, total: true, status: true } },
        seller: { select: { id: true, name: true, avatar: true, email: true } },
        customer: { select: { id: true, name: true, avatar: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return successResponse(res, refunds)
  } catch (error) {
    console.error('Failed to list refunds:', error)
    return errorResponse(res, 'Failed to list refunds', 500)
  }
})

router.patch('/:id/status', authMiddleware, validateBody(updateRefundSchema), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user!.isAdmin) {
      return errorResponse(res, 'Not authorized', 403)
    }

    const { id } = req.params
    const { status, adminNotes } = req.body

    const refund = await prisma.refund.findUnique({
      where: { id },
      include: {
        order: {
          include: { payment: true, seller: true, customer: true, sellerEarnings: true },
        },
      },
    })
    if (!refund) return errorResponse(res, 'Refund not found', 404)

    if (refund.status === 'PROCESSED') {
      return errorResponse(res, 'Refund has already been processed', 400)
    }

    const updateData: any = { status, updatedAt: new Date() }
    if (adminNotes) updateData.adminNotes = adminNotes

    if (status === 'PROCESSED') {
      const payment = refund.order.payment
      if (!payment || payment.provider !== 'PAYSTACK' || !payment.transactionRef) {
        return errorResponse(res, 'No valid Paystack payment reference for this order', 400)
      }

      const paystackRefund = await refundTransaction(Number(refund.amount), payment.transactionRef, refund.currency)

      updateData.processedBy = req.user!.id
      updateData.processedAt = new Date()

      await prisma.$transaction(async (tx) => {
        await tx.refund.update({
          where: { id },
          data: updateData,
        })

        const openDispute = await tx.dispute.findFirst({
          where: { orderId: refund.orderId, status: { in: ['OPEN', 'UNDER_REVIEW'] } },
        })
        if (openDispute) {
          await tx.dispute.update({
            where: { id: openDispute.id },
            data: { status: 'RESOLVED', resolution: 'Refund issued', amount: refund.amount },
          })
        }

        if (refund.order.sellerEarnings) {
          await tx.sellerEarnings.update({
            where: { id: refund.order.sellerEarnings.id },
            data: { status: 'REFUNDED' },
          })
        }

        await tx.financialLedger.create({
          data: {
            userId: refund.sellerId,
            orderId: refund.orderId,
            type: 'REFUND',
            amount: -Number(refund.amount),
            currency: refund.currency,
            status: 'SUCCESS',
            reference: `REFUND-${refund.id}`,
            description: `Refund issued for order ${refund.order.orderNumber}`,
          },
        })

        await tx.auditLog.create({
          data: {
            actorId: req.user!.id,
            actorRole: 'ADMIN',
            action: 'REFUND_PROCESSED',
            targetType: 'Refund',
            targetId: refund.id,
            metadata: JSON.stringify({
              orderId: refund.orderId,
              amount: Number(refund.amount),
              paystackRef: paystackRefund?.id,
            }),
          },
        })
      })

      const updatedRefund = await prisma.refund.findUnique({ where: { id } })

      const customer = refund.order.customer
      if (customer?.email) {
        sendRefundEmail(customer.email, {
          orderNumber: refund.order.orderNumber,
          amount: Number(refund.amount),
          reason: refund.reason || undefined,
        }).catch(err => console.error('Failed to send customer refund email:', err))
      }

      const seller = refund.order.seller
      if (seller?.email) {
        sendRefundEmail(seller.email, {
          orderNumber: refund.order.orderNumber,
          amount: Number(refund.amount),
          reason: refund.reason || undefined,
        }).catch(err => console.error('Failed to send seller refund email:', err))
      }

      return successResponse(res, updatedRefund, undefined, 'Refund processed and payout reversed')
    }

    const updated = await prisma.refund.update({
      where: { id },
      data: updateData,
    })

    const notifiedUserId = updated.customerId || updated.sellerId
    if (notifiedUserId) {
      await prisma.notification.create({
        data: {
          userId: notifiedUserId,
          type: 'REFUND_STATUS_UPDATE',
          title: 'Refund Status Updated',
          message: `Your refund for order ${refund.order.orderNumber} is now ${status}`,
          data: JSON.stringify({ refundId: updated.id, orderId: refund.orderId, status }),
        },
      })
    }

    return successResponse(res, updated, undefined, 'Refund status updated')
  } catch (error) {
    console.error('Failed to update refund status:', error)
    return errorResponse(res, 'Failed to update refund status', 500)
  }
})

export default router
