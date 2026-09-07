import { Router } from 'express'
import prisma from '../utils/prisma'
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth'
import { successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'
import { sendEmailDirect, sendSellerAccountEmail, sendAdminNotification } from '../services/email'
import { normalizeGhanaPhone } from '../services/otpService'
import { createAuditEntry } from '../utils/auditLog'

const router = Router()

const verificationSchema = z.object({
  fullName: z.string().min(2),
  phoneNumber: z.string().min(10),
  businessName: z.string().optional(),
  businessType: z.string().optional(),
  businessReg: z.string().optional(),
  sellerType: z.enum(['INDIVIDUAL', 'BUSINESS']).optional(),
  businessDescription: z.string().optional(),
  location: z.string().optional(),
  intendedSell: z.string().optional(),
  agreedToTerms: z.boolean().default(false),
  agreedAt: z.coerce.date().optional(),
})

const VALID_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']
const VALID_REVIEW_STATUSES = ['UNDER_REVIEW', 'NEEDS_REVIEW', 'AUTO_APPROVED']
const VALID_RISK_LEVELS = ['NORMAL', 'LOW', 'MEDIUM', 'HIGH'] as const

async function calculateTrustScore(data: any): Promise<number> {
  let score = 50
  if (data.businessName) score += 5
  if (data.businessDescription) score += 5
  if (data.sellerType === 'BUSINESS' && data.businessReg) score += 5
  if (data.location) score += 5
  if (data.intendedSell) score += 5
  if (data.businessDescription && data.businessDescription.length > 50) score += 5
  if (data.businessName && data.businessReg) score += 10
  return Math.max(0, Math.min(100, score))
}

async function createVerificationHistory(
  userId: string,
  verificationId: string,
  statusFrom: string | null | undefined,
  statusTo: string,
  reason?: string,
  changedBy?: string,
) {
  await prisma.sellerVerificationHistory.create({
    data: { userId, verificationId, statusFrom, statusTo, reason, changedBy },
  })
}

router.post('/verify', authMiddleware, requireRole(['SELLER']), validateBody(verificationSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id
    const normalizedPhone = normalizeGhanaPhone(req.body.phoneNumber)
    const data = { ...req.body, phoneNumber: normalizedPhone }
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

    const trustScore = await calculateTrustScore(data)
    const isAutoApproved = trustScore >= 80

    const verification = existing
      ? await prisma.sellerVerification.update({
          where: { id: existing.id },
          data: {
            ...data,
            status: isAutoApproved ? 'APPROVED' : 'PENDING',
            reviewStatus: isAutoApproved ? 'AUTO_APPROVED' : 'UNDER_REVIEW',
            rejectionReason: null,
            reviewedAt: isAutoApproved ? new Date() : null,
            reviewedBy: isAutoApproved ? 'system' : null,
            verificationMethod: 'MANUAL',
            agreedToTerms: data.agreedToTerms,
            agreedAt: data.agreedAt || new Date(),
          },
        })
      : await prisma.sellerVerification.create({
          data: {
            ...data,
            userId,
            type: 'SELLER',
            status: isAutoApproved ? 'APPROVED' : 'PENDING',
            reviewStatus: isAutoApproved ? 'AUTO_APPROVED' : 'UNDER_REVIEW',
            verificationMethod: 'MANUAL',
            agreedToTerms: data.agreedToTerms,
            agreedAt: data.agreedAt || new Date(),
            verificationDate: new Date(),
          },
        })

    await createVerificationHistory(
      userId,
      verification.id,
      existing?.status || null,
      verification.status,
      undefined,
      'self',
    )

    const trustScoreValue = isAutoApproved ? trustScore + 10 : trustScore
    await prisma.sellerRisk.upsert({
      where: { userId },
      update: {
        riskLevel: trustScoreValue >= 70 ? 'NORMAL' : trustScoreValue >= 40 ? 'MEDIUM' : 'HIGH',
        trustScore: trustScoreValue,
        flags: JSON.stringify({ submissionReason: 'Seller applied for verification' }),
        lastCheckedAt: new Date(),
      },
      create: {
        userId,
        riskLevel: trustScoreValue >= 70 ? 'NORMAL' : trustScoreValue >= 40 ? 'MEDIUM' : 'HIGH',
        trustScore: trustScoreValue,
        flags: JSON.stringify({ submissionReason: 'Seller applied for verification' }),
        lastCheckedAt: new Date(),
      },
    })

    if (!isAutoApproved) {
      await createAuditEntry({
        actorId: userId,
        actorRole: 'SELLER',
        action: 'VERIFICATION_SUBMITTED',
        targetType: 'SellerVerification',
        targetId: verification.id,
        metadata: JSON.stringify({ sellerType: data.sellerType, trustScore }),
      })
      await sendAdminNotification(
        'New Seller Verification',
        `<p>A new seller verification has been submitted by ${req.user!.name} (${req.user!.email}).</p><p>Trust score: ${trustScore}</p><a href="/admin/verifications" class="button">Review Verifications</a>`,
        `New seller verification from ${req.user!.email}`,
      ).catch((err: any) => console.error('Failed to send admin notification:', err))
    } else {
      await prisma.user.update({ where: { id: userId }, data: { isSeller: true } })
      await createAuditEntry({
        actorId: 'system',
        actorRole: 'ADMIN',
        action: 'VERIFICATION_AUTO_APPROVED',
        targetType: 'SellerVerification',
        targetId: verification.id,
        metadata: JSON.stringify({ trustScore }),
      })
      const trust = await prisma.sellerRisk.findUnique({ where: { userId } })
      await sendEmailDirect({
        to: req.user!.email,
        subject: 'Seller Account Approved',
        html: `<h2>Your seller account has been approved</h2><p>Due to your complete profile, your seller account was auto-approved. You can now start selling.</p>`,
        text: 'Your seller account has been approved.',
        purpose: 'seller_account',
      }).catch((err: any) => console.error('Failed to send approval email:', err))
    }

    return successResponse(res, verification, 201, 'Verification submitted successfully')
  } catch (error) {
    return errorResponse(res, 'Failed to submit verification', 500)
  }
})

router.get('/status', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id
    const verification = await prisma.sellerVerification.findFirst({
      where: { userId, type: 'SELLER' },
    })

    if (!verification) {
      return successResponse(res, { status: 'NOT_SUBMITTED' })
    }

    const risk = await prisma.sellerRisk.findUnique({
      where: { userId },
      select: { riskLevel: true, trustScore: true, lastCheckedAt: true },
    })

    return successResponse(res, { verification, risk })
  } catch (error) {
    return errorResponse(res, 'Failed to fetch verification status', 500)
  }
})

router.get('/history', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  try {
    const history = await prisma.sellerVerificationHistory.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return successResponse(res, history)
  } catch (error) {
    return errorResponse(res, 'Failed to fetch verification history', 500)
  }
})

router.get('/risk', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  try {
    const risk = await prisma.sellerRisk.findUnique({
      where: { userId: req.user!.id },
    })

    if (!risk) {
      return successResponse(res, { riskLevel: 'NORMAL', trustScore: 50, flags: null })
    }

    return successResponse(res, risk)
  } catch (error) {
    return errorResponse(res, 'Failed to fetch risk info', 500)
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
    const { status, rejectionReason, reviewStatus } = req.body

    if (!VALID_STATUSES.includes(status)) {
      return errorResponse(res, 'Invalid status', 400)
    }
    if (reviewStatus && !VALID_REVIEW_STATUSES.includes(reviewStatus)) {
      return errorResponse(res, 'Invalid review status', 400)
    }

    const verification = await prisma.sellerVerification.findUnique({ where: { id } })
    if (!verification) return errorResponse(res, 'Verification not found', 404)

    const updated = await prisma.sellerVerification.update({
      where: { id },
      data: {
        status,
        reviewStatus: reviewStatus || (status === 'APPROVED' ? 'NEEDS_REVIEW' : status === 'REJECTED' ? 'NEEDS_REVIEW' : verification.reviewStatus),
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

    await createVerificationHistory(
      verification.userId,
      id,
      verification.status,
      status,
      rejectionReason || undefined,
      req.user!.id,
    )

    await createAuditEntry({
      actorId: req.user!.id,
      actorRole: 'ADMIN',
      action: `VERIFICATION_${status}`,
      targetType: 'SellerVerification',
      targetId: id,
      metadata: JSON.stringify({ rejectionReason, reviewStatus }),
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

      const existingRisk = await prisma.sellerRisk.findUnique({ where: { userId: verification.userId } })
      if (!existingRisk) {
        await prisma.sellerRisk.create({
          data: {
            userId: verification.userId,
            riskLevel: 'NORMAL',
            trustScore: 75,
            flags: JSON.stringify({ reason: 'Manually approved by admin' }),
            lastCheckedAt: new Date(),
          },
        })
      }

      await prisma.notification.create({
        data: {
          userId: verification.userId,
          type: verification.type === 'RIDER' ? 'RIDER_VERIFIED' : 'SELLER_VERIFIED',
          title: 'Verification Approved',
          message:
            verification.type === 'RIDER'
              ? 'Your rider verification has been approved. You can now accept deliveries!'
              : 'Your seller verification has been approved. You can now start selling!',
          data: JSON.stringify({ verificationId: id }),
        },
      })

      const userEmail = updated.user?.email
      const userName = updated.user?.name || 'User'
      if (userEmail) {
        if (verification.type === 'RIDER') {
          sendSellerAccountEmail(userEmail, userName, 'APPROVED').catch((err: any) => console.error('Failed to send rider approval email:', err))
        } else {
          sendSellerAccountEmail(userEmail, userName, 'APPROVED').catch((err: any) => console.error('Failed to send seller approval email:', err))
        }
      }
    } else if (status === 'REJECTED') {
      await prisma.notification.create({
        data: {
          userId: verification.userId,
          type: verification.type === 'RIDER' ? 'RIDER_VERIFICATION_REJECTED' : 'SELLER_VERIFICATION_REJECTED',
          title: 'Verification Rejected',
          message: rejectionReason || 'Your seller verification was not approved.',
          data: JSON.stringify({ verificationId: id }),
        },
      })

      const userEmail = updated.user?.email
      const userName = updated.user?.name || 'User'
      if (userEmail) {
        sendSellerAccountEmail(userEmail, userName, 'REJECTED', rejectionReason || undefined).catch((err: any) =>
          console.error('Failed to send rejection email:', err),
        )
      }
    } else if (status === 'SUSPENDED') {
      await prisma.notification.create({
        data: {
          userId: verification.userId,
          type: 'SELLER_SUSPENDED',
          title: 'Account Suspended',
          message: rejectionReason || 'Your seller account has been suspended.',
          data: JSON.stringify({ verificationId: id }),
        },
      })
      await sendSellerAccountEmail(
        updated.user?.email || '',
        updated.user?.name || 'User',
        'SUSPENDED',
        rejectionReason || undefined,
      ).catch((err: any) => console.error('Failed to send suspension email:', err))
    }

    return successResponse(res, updated, undefined, `Verification ${status.toLowerCase()}`)
  } catch (error) {
    return errorResponse(res, 'Failed to update verification status', 500)
  }
})

export default router
