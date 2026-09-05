import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth'
import { successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'
import { sendEmailDirect, sendSellerAccountEmail, sendRiderAccountEmail } from '../services/email'
import { normalizeGhanaPhone } from '../services/otpService'

const router = Router()

const verificationSchema = z.object({
  fullName: z.string().min(2),
  phoneNumber: z.string().min(10),
  businessName: z.string().optional(),
  businessType: z.string().optional(),
  businessReg: z.string().optional(),
})

router.post('/verify', authMiddleware, requireRole(['SELLER']), validateBody(verificationSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id
    const normalizedPhone = normalizeGhanaPhone(req.body.phoneNumber)
    const data = { ...req.body, phoneNumber: normalizedPhone, idNumber: null, idType: null, idFrontUrl: null, idBackUrl: null, selfieUrl: null }
    if (!req.user!.email || !data.phoneNumber) return errorResponse(res, 'Email and phone verification are required', 400)

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true, phoneVerified: true } })
    if (!user?.phoneVerified || user.phone !== normalizedPhone) {
      return errorResponse(res, 'Verify this phone number before submitting seller verification', 400)
    }

    const existing = await prisma.sellerVerification.findFirst({ where: { userId, type: 'SELLER' } })
    if (existing && existing.status === 'PENDING') {
      return errorResponse(res, 'Verification already pending', 400)
    }
    if (existing && existing.status === 'APPROVED') {
      return errorResponse(res, 'Already verified', 400)
    }

    const verification = existing
      ? await prisma.sellerVerification.update({
        where: { id: existing.id },
        data: {
        ...data,
        status: 'PENDING',
        rejectionReason: null,
        reviewedAt: null,
        reviewedBy: null,
        },
      })
      : await prisma.sellerVerification.create({ data: { ...data, userId, type: 'SELLER' } })

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
      where: { userId: req.user!.id, type: 'SELLER' },
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
      where: { status: 'PENDING', type: 'SELLER' },
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

    if (status === 'APPROVED' && verification.type === 'RIDER') {
      await prisma.rider.updateMany({
        where: { userId: verification.userId },
        data: { isVerified: true },
      })
      await prisma.notification.create({
        data: {
          userId: verification.userId,
          type: 'RIDER_VERIFIED',
          title: 'Verification Approved',
          message: 'Your rider verification has been approved. You can now accept deliveries!',
          data: JSON.stringify({ verificationId: id }),
        },
      })
    } else if (status === 'APPROVED') {
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
          type: verification.type === 'RIDER' ? 'RIDER_VERIFIED' : 'SELLER_VERIFIED',
          title: 'Verification Approved',
          message: verification.type === 'RIDER' ? 'Your rider verification has been approved. You can now accept deliveries!' : 'Your seller verification has been approved. You can now start selling!',
          data: JSON.stringify({ verificationId: id }),
        },
      })

      const userEmail = updated.user?.email
      const userName = updated.user?.name || 'User'
      if (userEmail) {
        if (verification.type === 'RIDER') {
          sendRiderAccountEmail(userEmail, userName, 'APPROVED').catch((err: any) => console.error('Failed to send rider approval email:', err))
        } else {
          sendSellerAccountEmail(userEmail, userName, 'APPROVED').catch((err: any) => console.error('Failed to send seller approval email:', err))
        }
      }
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

      const userEmail = updated.user?.email
      const userName = updated.user?.name || 'User'
      if (userEmail) {
        if (verification.type === 'RIDER') {
          sendRiderAccountEmail(userEmail, userName, 'REJECTED', rejectionReason || undefined).catch((err: any) => console.error('Failed to send rider rejection email:', err))
        } else {
          sendSellerAccountEmail(userEmail, userName, 'REJECTED', rejectionReason || undefined).catch((err: any) => console.error('Failed to send seller rejection email:', err))
        }
      }
    }

    return successResponse(res, updated, undefined, `Verification ${status.toLowerCase()}`)
  } catch (error) {
    return errorResponse(res, 'Failed to update verification status', 500)
  }
})

export default router
