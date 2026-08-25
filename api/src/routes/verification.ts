import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth'
import { successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'

const router = Router()

const verificationSchema = z.object({
  fullName: z.string().min(2),
  phoneNumber: z.string().min(10),
  idNumber: z.string().min(1),
  idType: z.string().min(1),
  idFrontUrl: z.string().url(),
  idBackUrl: z.string().url().optional(),
  selfieUrl: z.string().url().optional(),
  businessName: z.string().optional(),
  businessType: z.string().optional(),
  businessReg: z.string().optional(),
})

router.post('/verify', authMiddleware, requireRole(['SELLER']), validateBody(verificationSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id
    const data = req.body

    const existing = await prisma.sellerVerification.findUnique({ where: { userId } })
    if (existing && existing.status === 'PENDING') {
      return errorResponse(res, 'Verification already pending', 400)
    }
    if (existing && existing.status === 'APPROVED') {
      return errorResponse(res, 'Already verified', 400)
    }

    const verification = await prisma.sellerVerification.upsert({
      where: { userId },
      update: {
        ...data,
        status: 'PENDING',
        rejectionReason: null,
        reviewedAt: null,
        reviewedBy: null,
      },
      create: { ...data, userId },
    })

    await prisma.user.update({
      where: { id: userId },
      data: { isSeller: true },
    })

    return successResponse(res, verification, 201, 'Verification submitted successfully')
  } catch (error) {
    return errorResponse(res, 'Failed to submit verification', 500)
  }
})

router.get('/status', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  try {
    const verification = await prisma.sellerVerification.findUnique({
      where: { userId: req.user!.id },
    })

    if (!verification) {
      return successResponse(res, { status: 'NOT_SUBMITTED' })
    }

    return successResponse(res, verification)
  } catch (error) {
    return errorResponse(res, 'Failed to fetch verification status', 500)
  }
})

router.get('/pending', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const verifications = await prisma.sellerVerification.findMany({
      where: { status: 'PENDING' },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, avatar: true, location: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return successResponse(res, verifications)
  } catch (error) {
    return errorResponse(res, 'Failed to fetch pending verifications', 500)
  }
})

router.patch('/:id/status', authMiddleware, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params
    const { status, rejectionReason } = req.body

    if (!['APPROVED', 'REJECTED', 'SUSPENDED'].includes(status)) {
      return errorResponse(res, 'Invalid status', 400)
    }

    const verification = await prisma.sellerVerification.findUnique({ where: { id } })
    if (!verification) return errorResponse(res, 'Verification not found', 404)

    const updated = await prisma.sellerVerification.update({
      where: { id },
      data: {
        status,
        rejectionReason: rejectionReason || null,
        reviewedAt: new Date(),
        reviewedBy: req.user!.id,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (status === 'APPROVED') {
      await prisma.user.update({
        where: { id: verification.userId },
        data: { isSeller: true },
      })
      await prisma.shop.updateMany({
        where: { ownerId: verification.userId },
        data: { isVerified: true, verificationStatus: 'APPROVED' },
      })

      await prisma.notification.create({
        data: {
          userId: verification.userId,
          type: 'SELLER_VERIFIED',
          title: 'Verification Approved',
          message: 'Your seller verification has been approved. You can now start selling!',
          data: JSON.stringify({ verificationId: id }),
        },
      })
    } else if (status === 'REJECTED') {
      await prisma.notification.create({
        data: {
          userId: verification.userId,
          type: 'SELLER_VERIFICATION_REJECTED',
          title: 'Verification Rejected',
          message: rejectionReason || 'Your seller verification was not approved.',
          data: JSON.stringify({ verificationId: id }),
        },
      })
    }

    return successResponse(res, updated, undefined, `Verification ${status.toLowerCase()}`)
  } catch (error) {
    return errorResponse(res, 'Failed to update verification status', 500)
  }
})

export default router
