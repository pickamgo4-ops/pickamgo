import { Router } from 'express'
import { z } from 'zod'
import prisma from '../utils/prisma'
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth'
import { successResponse, errorResponse, validateBody } from '../types/express'
import { canAccessOrderEvidence, isSafeEvidenceUrl, normalizeEvidenceStatus } from '../utils/orderSecurity'

const router = Router()

const evidenceUploadSchema = z.object({
  stage: z.enum(['SHIPMENT', 'PICKUP', 'DELIVERY', 'POST_DELIVERY', 'DISPUTE']).default('DELIVERY'),
  type: z.enum(['PAYMENT_PROOF', 'SHIPMENT_PROOF', 'PICKUP_PROOF', 'DELIVERY_PROOF', 'PACKAGE_PHOTO', 'OTHER']).default('OTHER'),
  note: z.string().max(2000).optional(),
  fileUrl: z.string().url().optional().or(z.literal('')),
})

const evidenceReviewSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_MORE_INFO']).optional(),
  note: z.string().max(2000).optional(),
})

router.get('/orders/:orderId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
      select: { id: true, customerId: true, sellerId: true, riderId: true, orderNumber: true },
    })

    if (!order) return errorResponse(res, 'Order not found', 404)
    if (!canAccessOrderEvidence(order, req.user!.id, req.user!.isAdmin)) {
      return errorResponse(res, 'Not authorized to view evidence for this order', 403)
    }

    const evidence = await prisma.orderEvidence.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: 'desc' },
      include: { uploader: { select: { id: true, name: true, email: true, avatar: true } } },
    })

    return successResponse(res, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      evidence,
    })
  } catch (error) {
    return errorResponse(res, 'Failed to fetch order evidence', 500)
  }
})

router.post('/orders/:orderId', authMiddleware, validateBody(evidenceUploadSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
      select: { id: true, customerId: true, sellerId: true, riderId: true, isTestOrder: true },
    })

    if (!order) return errorResponse(res, 'Order not found', 404)
    if (!canAccessOrderEvidence(order, req.user!.id, req.user!.isAdmin)) {
      return errorResponse(res, 'Not authorized to upload evidence for this order', 403)
    }
    if (req.body.fileUrl && !isSafeEvidenceUrl(req.body.fileUrl)) {
      return errorResponse(res, 'Evidence files must be uploaded through PickAmGo storage', 400)
    }

    const existingEvidence = await prisma.orderEvidence.findFirst({
      where: { orderId: order.id, uploaderId: req.user!.id, type: req.body.type, stage: req.body.stage },
    })

    const evidence = await prisma.orderEvidence.create({
      data: {
        orderId: order.id,
        uploaderId: req.user!.id,
        stage: req.body.stage,
        type: req.body.type,
        fileUrl: req.body.fileUrl || null,
        note: req.body.note || null,
        status: 'PENDING',
      },
    })

    if (existingEvidence) {
      await prisma.evidenceRevision.create({
        data: {
          evidenceId: existingEvidence.id,
          orderId: order.id,
          uploaderId: req.user!.id,
          previousFileUrl: existingEvidence.fileUrl,
          newFileUrl: evidence.fileUrl,
          previousNote: existingEvidence.note,
          newNote: evidence.note,
          previousStatus: existingEvidence.status,
          newStatus: evidence.status,
          replacedBy: evidence.id,
          reason: 'Replacement evidence submitted',
        },
      })
    }

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        actorRole: req.user!.isAdmin ? 'ADMIN' : 'USER',
        action: 'ORDER_EVIDENCE_UPLOADED',
        targetType: 'ORDER_EVIDENCE',
        targetId: evidence.id,
        reason: req.body.type,
        metadata: JSON.stringify({ orderId: order.id, stage: req.body.stage, replacedEvidenceId: existingEvidence?.id || null }),
      },
    })

    return successResponse(res, evidence, 201, 'Evidence uploaded successfully')
  } catch (error) {
    return errorResponse(res, 'Failed to upload evidence', 500)
  }
})

router.patch('/:id/status', authMiddleware, requireRole(['ADMIN']), validateBody(evidenceReviewSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const evidence = await prisma.orderEvidence.findUnique({
      where: { id: req.params.id },
      include: { order: { select: { id: true, orderNumber: true, customerId: true, sellerId: true, riderId: true } } },
    })

    if (!evidence) return errorResponse(res, 'Evidence not found', 404)

    const status = normalizeEvidenceStatus(req.body.status || evidence.status)
    const updated = await prisma.$transaction(async (tx) => {
      const nextEvidence = await tx.orderEvidence.update({
        where: { id: evidence.id },
        data: {
          status,
          note: req.body.note ? `${evidence.note || ''}\n${req.body.note}`.trim() : evidence.note,
        },
      })

      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          actorRole: 'ADMIN',
          action: 'ORDER_EVIDENCE_REVIEWED',
          targetType: 'ORDER_EVIDENCE',
          targetId: evidence.id,
          reason: status,
          metadata: JSON.stringify({ note: req.body.note || null, orderId: evidence.orderId }),
        },
      })

      if (status === 'REJECTED' || status === 'NEEDS_MORE_INFO') {
        await tx.fraudAlert.create({
          data: {
            userId: evidence.uploaderId,
            orderId: evidence.orderId,
            riskLevel: status === 'REJECTED' ? 'HIGH' : 'MEDIUM',
            reason: status === 'REJECTED' ? 'Evidence rejected by admin review' : 'Evidence requires additional documentation',
            status: 'OPEN',
            metadata: JSON.stringify({ evidenceId: evidence.id, evidenceType: evidence.type, stage: evidence.stage }),
          },
        })
      }

      return nextEvidence
    })

    return successResponse(res, updated, undefined, 'Evidence review updated successfully')
  } catch (error) {
    return errorResponse(res, 'Failed to review evidence', 500)
  }
})

export default router