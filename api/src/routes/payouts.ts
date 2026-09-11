import { Router } from 'express'
import crypto from 'crypto'
import prisma from '../utils/prisma'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'
import { createTransferRecipient, initiateTransfer, handleWebhook } from '../services/paystack'
import { calculateSellerEarnings, calculateRiderEarnings, getMinimumPayout } from '../services/earnings'
import { sendWithdrawalRequestedEmail, sendWithdrawalProcessedEmail } from '../services/email'
import { createAuditEntry } from '../utils/auditLog'
import { normalizeGhanaPhone } from '../services/otpService'
import { getRequestIp } from '../middleware/rate-limit'
import { hashSensitiveIdentity, isCurrentPayoutDisclaimer, isPayoutBeneficiaryVerified, isPayoutChangeCooldownActive, maskPhoneNumber, PAYOUT_DISCLAIMER_VERSION } from '../utils/identitySecurity'

const router = Router()

const payoutMethodSchema = z.object({
  type: z.string().min(1),
  provider: z.string().min(1),
  phoneNumber: z.string().min(10),
  accountName: z.string().optional(),
  acceptDisclaimer: z.literal(true, { errorMap: () => ({ message: 'You must accept the payout information disclaimer' }) }),
})

router.get('/methods', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const methods = await prisma.payoutMethod.findMany({
      where: { userId: req.user!.id },
      select: {
        id: true,
        type: true,
        provider: true,
        phoneNumber: true,
        accountName: true,
        isDefault: true,
        isVerified: true,
        verificationStatus: true,
        beneficiaryNameVerified: true,
        beneficiaryPhoneVerified: true,
        disclaimerVersion: true,
        createdAt: true,
      },
      orderBy: { isDefault: 'desc' },
    })

    return successResponse(res, methods.map(method => ({
      ...method,
      phoneNumber: maskPhoneNumber(method.phoneNumber),
    })))
  } catch (error) {
    return errorResponse(res, 'Failed to fetch payout methods', 500)
  }
})

router.post('/methods', authMiddleware, validateBody(payoutMethodSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const { type, provider, phoneNumber } = req.body
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { name: true, phone: true, phoneVerified: true } })
    if (!user?.phoneVerified || !user.phone) return errorResponse(res, 'Verify your PickAmGo phone number before adding a payout method', 403)

    let normalizedPhone: string
    try { normalizedPhone = normalizeGhanaPhone(phoneNumber) } catch { return errorResponse(res, 'Invalid payout phone number', 400) }
    if (normalizedPhone !== user.phone) return errorResponse(res, 'Mobile Money payouts must use your verified PickAmGo phone number', 400)

    const recipient = await createTransferRecipient(req.user!.id, type, provider, normalizedPhone, user.name)
    const beneficiaryName = typeof recipient?.name === 'string' ? recipient.name.trim() : null
    const beneficiaryNameVerified = isPayoutBeneficiaryVerified({ userName: user.name, beneficiaryName, registeredPhone: user.phone, payoutPhone: normalizedPhone, phoneVerified: user.phoneVerified })
    if (beneficiaryName && !beneficiaryNameVerified) return errorResponse(res, 'The payout beneficiary name does not match your PickAmGo account name', 403, 'PAYOUT_BENEFICIARY_MISMATCH')
    const verificationStatus = beneficiaryNameVerified ? 'VERIFIED' : 'REQUIRES_REVIEW'
    const now = new Date()
    const ipAddress = getRequestIp(req)
    const userAgent = (req as any).get?.('user-agent') || null

    const method = await prisma.$transaction(async tx => {
      const created = await tx.payoutMethod.create({
        data: {
          userId: req.user!.id,
          type,
          provider,
          phoneNumber: normalizedPhone,
          accountName: beneficiaryName,
          beneficiaryName,
          beneficiaryNameVerified,
          beneficiaryPhoneVerified: true,
          verificationStatus,
          isVerified: beneficiaryNameVerified,
          disclaimerVersion: PAYOUT_DISCLAIMER_VERSION,
          disclaimerAcceptedAt: now,
          lastChangedByUserId: req.user!.id,
          lastChangedIp: ipAddress,
          lastChangedUserAgent: userAgent,
          changeReason: 'New payout method added',
          confirmedVia: 'account_security',
          lastConfirmedAt: now,
          isDefault: true,
        },
      })
      await tx.payoutMethod.updateMany({ where: { userId: req.user!.id, id: { not: created.id } }, data: { isDefault: false } })
      await tx.payoutDisclaimerAcceptance.create({ data: { userId: req.user!.id, payoutMethodId: created.id, version: PAYOUT_DISCLAIMER_VERSION, ipAddress, userAgent } })
      await tx.payoutMethodChange.create({ data: { userId: req.user!.id, payoutMethodId: created.id, changedByUserId: req.user!.id, changeReason: 'New payout method added', confirmedVia: 'account_security', isUnusual: true, newPhoneLast4: normalizedPhone.slice(-4), newNameHash: beneficiaryName ? hashSensitiveIdentity(beneficiaryName) : null, ipAddress, userAgent } })
      await tx.notification.create({ data: { userId: req.user!.id, type: 'SECURITY_ALERT', title: 'Payout details added', message: 'A payout method was added to your PickAmGo account. Withdrawals are temporarily restricted while the change is reviewed.', data: JSON.stringify({ payoutMethodId: created.id }) } })
      return created
    })

    await createAuditEntry({
      actorId: req.user!.id,
      actorRole: 'SELLER',
      action: 'PAYOUT_METHOD_ADDED',
      targetType: 'PayoutMethod',
      targetId: method.id,
      metadata: JSON.stringify({ type, provider }),
    })

    return successResponse(res, { ...method, phoneNumber: maskPhoneNumber(method.phoneNumber) }, 201, verificationStatus === 'VERIFIED' ? 'Payout method added and verified' : 'Payout method added and sent for review')
  } catch (error) {
    console.error('Failed to add payout method:', error)
    return errorResponse(res, 'Failed to add payout method', 500)
  }
})

router.delete('/methods/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const method = await prisma.payoutMethod.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    })

    if (!method) {
      return errorResponse(res, 'Payout method not found', 404)
    }

    await prisma.payoutMethod.delete({ where: { id: method.id } })

    await createAuditEntry({
      actorId: req.user!.id,
      actorRole: 'SELLER',
      action: 'PAYOUT_METHOD_REMOVED',
      targetType: 'PayoutMethod',
      targetId: method.id,
    })

    const remaining = await prisma.payoutMethod.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'asc' },
    })

    if (remaining.length > 0 && !remaining.some(m => m.isDefault)) {
      await prisma.payoutMethod.update({
        where: { id: remaining[0].id },
        data: { isDefault: true },
      })
    }

    return successResponse(res, null, 200, 'Payout method removed')
  } catch (error) {
    return errorResponse(res, 'Failed to remove payout method', 500)
  }
})

router.patch('/methods/:id', authMiddleware, validateBody(z.object({
  phoneNumber: z.string().min(10).optional(),
  accountName: z.string().optional(),
  acceptDisclaimer: z.literal(true, { errorMap: () => ({ message: 'You must accept the payout information disclaimer' }) }),
})), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params
    const { phoneNumber } = req.body

    const method = await prisma.payoutMethod.findFirst({
      where: { id, userId: req.user!.id },
    })

    if (!method) return errorResponse(res, 'Payout method not found', 404)

    const lastChange = await prisma.payoutMethodChange.findFirst({ where: { payoutMethodId: id }, orderBy: { changedAt: 'desc' } })
    if (isPayoutChangeCooldownActive(lastChange?.changedAt)) return errorResponse(res, 'Payout details were changed recently. Please wait before changing them again.', 429)

    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { name: true, phone: true, phoneVerified: true } })
    if (!user?.phoneVerified || !user.phone) return errorResponse(res, 'Verify your PickAmGo phone number before changing payout details', 403)
    const nextPhone = phoneNumber ? normalizeGhanaPhone(phoneNumber) : method.phoneNumber
    if (nextPhone !== user.phone) return errorResponse(res, 'Mobile Money payouts must use your verified PickAmGo phone number', 400)

    const recipient = await createTransferRecipient(req.user!.id, method.type, method.provider, nextPhone, user.name)
    const beneficiaryName = typeof recipient?.name === 'string' ? recipient.name.trim() : null
    const beneficiaryNameVerified = isPayoutBeneficiaryVerified({ userName: user.name, beneficiaryName, registeredPhone: user.phone, payoutPhone: nextPhone, phoneVerified: user.phoneVerified })
    if (beneficiaryName && !beneficiaryNameVerified) return errorResponse(res, 'The payout beneficiary name does not match your PickAmGo account name', 403, 'PAYOUT_BENEFICIARY_MISMATCH')

    const now = new Date()
    const ipAddress = getRequestIp(req)
    const userAgent = (req as any).get?.('user-agent') || null
    const isUnusual = method.phoneNumber !== nextPhone || method.beneficiaryName !== beneficiaryName
    const changeReason = method.phoneNumber !== nextPhone ? 'Phone number changed' : 'Payout beneficiary re-verified'
    const updated = await prisma.$transaction(async tx => {
      const next = await tx.payoutMethod.update({
        where: { id },
        data: {
          phoneNumber: nextPhone,
          accountName: beneficiaryName,
          beneficiaryName,
          beneficiaryNameVerified,
          beneficiaryPhoneVerified: true,
          verificationStatus: beneficiaryNameVerified ? 'VERIFIED' : 'REQUIRES_REVIEW',
          isVerified: beneficiaryNameVerified,
          disclaimerVersion: PAYOUT_DISCLAIMER_VERSION,
          disclaimerAcceptedAt: now,
          lastChangedByUserId: req.user!.id,
          lastChangedIp: ipAddress,
          lastChangedUserAgent: userAgent,
          changeReason,
          confirmedVia: 'account_security',
          lastConfirmedAt: now,
        },
      })
      await tx.payoutDisclaimerAcceptance.create({ data: { userId: req.user!.id, payoutMethodId: id, version: PAYOUT_DISCLAIMER_VERSION, ipAddress, userAgent } })
      await tx.payoutMethodChange.create({ data: { userId: req.user!.id, payoutMethodId: id, changedByUserId: req.user!.id, changeReason, confirmedVia: 'account_security', isUnusual, previousPhoneLast4: method.phoneNumber.slice(-4), newPhoneLast4: nextPhone.slice(-4), previousNameHash: method.accountName ? hashSensitiveIdentity(method.accountName) : null, newNameHash: beneficiaryName ? hashSensitiveIdentity(beneficiaryName) : null, ipAddress, userAgent } })
      await tx.notification.create({ data: { userId: req.user!.id, type: 'SECURITY_ALERT', title: 'Payout details changed', message: 'Your payout details changed. Withdrawals are temporarily restricted while the change is reviewed.', data: JSON.stringify({ payoutMethodId: id }) } })
      await tx.auditLog.create({ data: { actorId: req.user!.id, actorRole: req.user!.isSeller ? 'SELLER' : 'RIDER', action: 'PAYOUT_METHOD_CHANGED', targetType: 'PAYOUT_METHOD', targetId: id, metadata: JSON.stringify({ previousPhoneLast4: method.phoneNumber.slice(-4), newPhoneLast4: nextPhone.slice(-4), beneficiaryVerified: beneficiaryNameVerified }) } })
      return next
    })

    return successResponse(res, { ...updated, phoneNumber: maskPhoneNumber(updated.phoneNumber) }, undefined, beneficiaryNameVerified ? 'Payout method updated and verified' : 'Payout method updated and sent for review')
  } catch (error) {
    console.error('Failed to update payout method:', error)
    return errorResponse(res, 'Failed to update payout method', 500)
  }
})

router.get('/balances', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id
    const isSeller = req.user!.isSeller
    const isRider = req.user!.isRider

    let available = 0
    let pending = 0
    let totalEarnings = 0
    let totalWithdrawn = 0

    if (isSeller) {
      const earnings = await prisma.sellerEarnings.findMany({
        where: { sellerId: userId },
      })
      const collaborationAllocations = await prisma.collaborationAllocation.findMany({ where: { sellerId: userId } })

      available = earnings.filter(e => e.status === 'AVAILABLE').reduce((sum, e) => sum + Number(e.netAmount), 0) + collaborationAllocations.filter(e => ['AVAILABLE', 'PARTIALLY_REFUNDED'].includes(e.status)).reduce((sum, e) => sum + Number(e.remainingNetAmount), 0)
      pending = earnings.filter(e => e.status === 'PENDING').reduce((sum, e) => sum + Number(e.netAmount), 0) + collaborationAllocations.filter(e => e.status === 'PENDING').reduce((sum, e) => sum + Number(e.remainingNetAmount), 0)
      totalEarnings = earnings.reduce((sum, e) => sum + Number(e.netAmount), 0) + collaborationAllocations.reduce((sum, e) => sum + Number(e.netAmount), 0)
      totalWithdrawn = earnings.filter(e => e.status === 'WITHDRAWN').reduce((sum, e) => sum + Number(e.netAmount), 0) + collaborationAllocations.filter(e => e.status === 'WITHDRAWN').reduce((sum, e) => sum + Number(e.netAmount) - Number(e.remainingNetAmount), 0)
    } else if (isRider) {
      const earnings = await prisma.riderEarnings.findMany({
        where: { riderId: userId },
      })
      const collaborationEarnings = await prisma.collaborationRiderEarnings.findMany({ where: { riderId: userId } })

      available = earnings.filter(e => e.status === 'AVAILABLE').reduce((sum, e) => sum + Number(e.netAmount), 0) + collaborationEarnings.filter(e => e.status === 'AVAILABLE').reduce((sum, e) => sum + Number(e.netAmount), 0)
      pending = earnings.filter(e => e.status === 'PENDING').reduce((sum, e) => sum + Number(e.netAmount), 0) + collaborationEarnings.filter(e => e.status === 'PENDING').reduce((sum, e) => sum + Number(e.netAmount), 0)
      totalEarnings = earnings.reduce((sum, e) => sum + Number(e.netAmount), 0) + collaborationEarnings.reduce((sum, e) => sum + Number(e.netAmount), 0)
      totalWithdrawn = earnings.filter(e => e.status === 'WITHDRAWN').reduce((sum, e) => sum + Number(e.netAmount), 0) + collaborationEarnings.filter(e => e.status === 'WITHDRAWN').reduce((sum, e) => sum + Number(e.netAmount), 0)
    }

    return successResponse(res, {
      available: Math.round(available * 100) / 100,
      pending: Math.round(pending * 100) / 100,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      totalWithdrawn: Math.round(totalWithdrawn * 100) / 100,
    })
  } catch (error) {
    return errorResponse(res, 'Failed to fetch balances', 500)
  }
})

router.get('/history', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20

    const [payouts, total] = await Promise.all([
      prisma.payout.findMany({
        where: { userId: req.user!.id },
        include: {
          payoutMethod: {
            select: {
              provider: true,
              phoneNumber: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payout.count({
        where: { userId: req.user!.id },
      }),
    ])

    return successResponse(res, {
      payouts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return errorResponse(res, 'Failed to fetch payout history', 500)
  }
})

router.post('/withdraw', authMiddleware, validateBody(z.object({
  amount: z.number().positive(),
  payoutMethodId: z.string().min(1),
})), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id
    const isSeller = req.user!.isSeller
    const isRider = req.user!.isRider
    const { amount, payoutMethodId } = req.body

    const freeze = await prisma.sellerPayoutFreeze.findFirst({
      where: { userId, thawedAt: null },
    })
    if (freeze) {
      return errorResponse(res, `Payouts are frozen: ${freeze.reason || 'Contact support for assistance.'}`, 403, 'PAYOUT_FROZEN')
    }

    const openDisputeCount = await prisma.dispute.count({
      where: { order: { OR: [{ sellerId: userId }, { riderId: userId }] }, status: { in: ['OPEN', 'UNDER_REVIEW'] } },
    })
    if (openDisputeCount > 0) {
      await createAuditEntry({ actorId: userId, actorRole: isSeller ? 'SELLER' : 'RIDER', action: 'PAYOUT_BLOCKED_OPEN_DISPUTE', targetType: 'Payout', targetId: payoutMethodId })
      return errorResponse(res, 'Payouts are paused while a dispute is open. Please resolve the dispute before requesting a withdrawal.', 409, 'PAYOUT_HOLD_DISPUTE')
    }

    const minPayout = getMinimumPayout()
    if (amount < minPayout) {
      return errorResponse(res, `Minimum withdrawal amount is GHS ${minPayout}`, 400)
    }

    const payoutMethod = await prisma.payoutMethod.findFirst({
      where: { id: payoutMethodId, userId },
    })

    if (!payoutMethod) {
      return errorResponse(res, 'Payout method not found', 404)
    }

    if (!payoutMethod.isVerified || payoutMethod.verificationStatus !== 'VERIFIED' || !payoutMethod.beneficiaryNameVerified || !payoutMethod.beneficiaryPhoneVerified) {
      await createAuditEntry({ actorId: userId, actorRole: isSeller ? 'SELLER' : 'RIDER', action: 'PAYOUT_BLOCKED_UNVERIFIED_BENEFICIARY', targetType: 'PAYOUT_METHOD', targetId: payoutMethod.id })
      return errorResponse(res, 'This payout account requires identity verification before withdrawals are allowed.', 403, 'PAYOUT_METHOD_REQUIRES_REVIEW')
    }
    if (!isCurrentPayoutDisclaimer(payoutMethod.disclaimerVersion)) {
      return errorResponse(res, 'Accept the current payout information disclaimer before requesting a withdrawal.', 400, 'PAYOUT_DISCLAIMER_REQUIRED')
    }

    const recentMethodChange = await prisma.payoutMethodChange.findFirst({
      where: { userId, isUnusual: true },
      orderBy: { changedAt: 'desc' },
    })
    if (recentMethodChange && (Date.now() - recentMethodChange.changedAt.getTime()) < 24 * 60 * 60 * 1000) {
      await createAuditEntry({
        actorId: userId,
        actorRole: isSeller ? 'SELLER' : 'RIDER',
        action: 'PAYOUT_BLOCKED_UNUSUAL_METHOD_CHANGE',
        targetType: 'Payout',
        targetId: payoutMethodId,
        metadata: JSON.stringify({ changeId: recentMethodChange.id }),
      })
      return errorResponse(res, 'Withdrawal blocked: unusual payout method change detected. Contact support for verification.', 403, 'UNUSUAL_PAYOUT_METHOD_CHANGE')
    }

    const existingPayout = await prisma.payout.findFirst({
      where: {
        userId,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    })

    if (existingPayout) {
      return errorResponse(res, 'You have a pending withdrawal. Please wait for it to complete.', 400)
    }

    let availableBalance = 0

    if (isSeller) {
      const earnings = await prisma.sellerEarnings.findMany({
        where: { sellerId: userId, status: 'AVAILABLE' },
      })
      const collaborationAllocations = await prisma.collaborationAllocation.findMany({ where: { sellerId: userId, status: { in: ['AVAILABLE', 'PARTIALLY_REFUNDED'] }, payoutId: null } })
      availableBalance = earnings.reduce((sum, e) => sum + Number(e.netAmount), 0) + collaborationAllocations.reduce((sum, e) => sum + Number(e.remainingNetAmount), 0)
    } else if (isRider) {
      const earnings = await prisma.riderEarnings.findMany({
        where: { riderId: userId, status: 'AVAILABLE' },
      })
      const collaborationEarnings = await prisma.collaborationRiderEarnings.findMany({ where: { riderId: userId, status: 'AVAILABLE', payoutId: null } })
      availableBalance = earnings.reduce((sum, e) => sum + Number(e.netAmount), 0) + collaborationEarnings.reduce((sum, e) => sum + Number(e.netAmount), 0)
    }

    if (amount > availableBalance) {
      return errorResponse(res, 'Insufficient available balance', 400)
    }

    const reference = `PAYOUT-${Date.now()}-${crypto.randomUUID()}`

    const payout = await prisma.$transaction(async tx => {
      const activePayout = await tx.payout.findFirst({
        where: { userId, status: { in: ['PENDING', 'PROCESSING'] } },
        select: { id: true },
      })
      if (activePayout) throw new Error('PAYOUT_ALREADY_PENDING')

      const availableEarnings = isSeller
        ? await tx.sellerEarnings.findMany({ where: { sellerId: userId, status: 'AVAILABLE', payoutId: null }, orderBy: { availableAt: 'asc' } })
        : await tx.riderEarnings.findMany({ where: { riderId: userId, status: 'AVAILABLE', payoutId: null }, orderBy: { availableAt: 'asc' } })
      const availableAllocations = isSeller ? await tx.collaborationAllocation.findMany({ where: { sellerId: userId, status: { in: ['AVAILABLE', 'PARTIALLY_REFUNDED'] }, payoutId: null }, orderBy: { createdAt: 'asc' } }) : []
      const availableCollaborationRiderEarnings = isRider ? await tx.collaborationRiderEarnings.findMany({ where: { riderId: userId, status: 'AVAILABLE', payoutId: null }, orderBy: { availableAt: 'asc' } }) : []
      const availableBalance = availableEarnings.reduce((sum, earning) => sum + Number(earning.netAmount), 0) + availableAllocations.reduce((sum, earning) => sum + Number(earning.remainingNetAmount), 0) + availableCollaborationRiderEarnings.reduce((sum, earning) => sum + Number(earning.netAmount), 0)
      if (amount > availableBalance) throw new Error('INSUFFICIENT_BALANCE')

      const created = await tx.payout.create({
        data: { userId, payoutMethodId, amount, currency: 'GHS', status: 'PENDING', reference },
        include: { payoutMethod: true },
      })

      let remaining = amount
      for (const earning of availableEarnings) {
        if (remaining <= 0) break
        const nextRemaining = Math.round((remaining - Number(earning.netAmount)) * 100) / 100
        if (isSeller) {
          await tx.sellerEarnings.update({ where: { id: earning.id }, data: { status: 'WITHDRAWN', withdrawnAt: new Date(), payoutId: created.id } })
        } else {
          await tx.riderEarnings.update({ where: { id: earning.id }, data: { status: 'WITHDRAWN', withdrawnAt: new Date(), payoutId: created.id } })
        }
        remaining = nextRemaining
      }
      for (const allocation of availableAllocations) {
        if (remaining <= 0) break
        const nextRemaining = Math.round((remaining - Number(allocation.remainingNetAmount)) * 100) / 100
        await tx.collaborationAllocation.update({ where: { id: allocation.id }, data: { status: 'WITHDRAWN', payoutId: created.id } })
        remaining = nextRemaining
      }
      for (const earning of availableCollaborationRiderEarnings) {
        if (remaining <= 0) break
        const nextRemaining = Math.round((remaining - Number(earning.netAmount)) * 100) / 100
        await tx.collaborationRiderEarnings.update({ where: { id: earning.id }, data: { status: 'WITHDRAWN', payoutId: created.id, withdrawnAt: new Date() } })
        remaining = nextRemaining
      }

      await tx.financialLedger.create({
        data: {
          userId,
          payoutId: created.id,
          type: 'PAYOUT',
          amount: -amount,
          currency: 'GHS',
          status: 'PENDING',
          reference,
          description: `Withdrawal to ${payoutMethod.provider} ${payoutMethod.phoneNumber}`,
        },
      })

      await tx.auditLog.create({
        data: {
          actorId: userId,
          actorRole: isSeller ? 'SELLER' : 'RIDER',
          action: 'PAYOUT_RESERVED',
          targetType: 'PAYOUT',
          targetId: created.id,
          metadata: JSON.stringify({ amount, payoutMethodId }),
        },
      })

      return created
    }, { isolationLevel: 'Serializable' })

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    })

    if (user?.email) {
      sendWithdrawalRequestedEmail(user.email, {
        amount,
        method: payoutMethod.provider,
        reference: payout.reference,
      }).catch(err => console.error('Failed to send withdrawal requested email:', err))
    }

    try {
      const transfer = await initiateTransfer(userId, amount, 'GHS', payoutMethod.provider + '_' + payoutMethod.phoneNumber, reference)

      await prisma.payout.update({
        where: { id: payout.id },
        data: {
          status: 'PROCESSING',
          paystackTransferId: transfer.id,
        },
      })

      return successResponse(res, payout, 201, 'Withdrawal initiated successfully')
    } catch (transferError) {
      await prisma.$transaction(async tx => {
        await tx.payout.update({ where: { id: payout.id }, data: { status: 'FAILED', failureReason: transferError instanceof Error ? transferError.message : 'Transfer failed', processedAt: new Date() } })
        await tx.sellerEarnings.updateMany({ where: { payoutId: payout.id }, data: { status: 'AVAILABLE', payoutId: null, withdrawnAt: null } })
        await tx.collaborationAllocation.updateMany({ where: { payoutId: payout.id }, data: { status: 'AVAILABLE', payoutId: null } })
        await tx.collaborationRiderEarnings.updateMany({ where: { payoutId: payout.id }, data: { status: 'AVAILABLE', payoutId: null, withdrawnAt: null } })
        await tx.riderEarnings.updateMany({ where: { payoutId: payout.id }, data: { status: 'AVAILABLE', payoutId: null, withdrawnAt: null } })
        await tx.financialLedger.updateMany({ where: { payoutId: payout.id, type: 'PAYOUT' }, data: { status: 'FAILED' } })
        await tx.auditLog.create({ data: { actorId: userId, actorRole: isSeller ? 'SELLER' : 'RIDER', action: 'PAYOUT_FAILED', targetType: 'PAYOUT', targetId: payout.id, reason: transferError instanceof Error ? transferError.message : 'Transfer failed' } })
      })

      return errorResponse(res, 'Failed to initiate transfer. Please try again.', 500)
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'PAYOUT_ALREADY_PENDING') return errorResponse(res, 'You have a pending withdrawal. Please wait for it to complete.', 409)
    if (error instanceof Error && error.message === 'INSUFFICIENT_BALANCE') return errorResponse(res, 'Insufficient available balance', 400)
    console.error('Withdrawal error:', error)
    return errorResponse(res, 'Failed to process withdrawal', 500)
  }
})

router.post('/webhook', async (req: AuthenticatedRequest, res) => {
  try {
    const signature = (req as any).headers?.['x-paystack-signature'] as string | undefined
    const event = req.body

    let result
    try {
      result = await handleWebhook(event, signature)
    } catch (webhookError) {
      return errorResponse(res, 'Invalid webhook signature', 401)
    }

    if (result.status === 'SUCCESS' || result.status === 'FAILED' || result.status === 'REVERSED') {
      const reference = result.transfer?.reference
      if (reference) {
        const payout = await prisma.payout.findUnique({
          where: { reference },
        })

        if (payout && payout.status === 'PROCESSING') {
          const newStatus = result.status === 'SUCCESS' ? 'SUCCESS' : result.status === 'REVERSED' ? 'REVERSED' : 'FAILED'

          const claimed = await prisma.payout.updateMany({
            where: { id: payout.id, status: 'PROCESSING' },
            data: {
              status: newStatus,
              processedAt: new Date(),
              failureReason: newStatus === 'FAILED' ? (result.transfer?.failure_reason || 'Transfer failed') : null,
            },
          })
          if (claimed.count !== 1) return successResponse(res, { received: true, duplicate: true })

          const payoutUser = payout.userId ? await prisma.user.findUnique({
            where: { id: payout.userId },
            select: { email: true, name: true },
          }) : null

          if (payoutUser?.email) {
            sendWithdrawalProcessedEmail(payoutUser.email, {
              amount: Number(payout.amount),
              status: newStatus,
              reference: payout.reference,
              processedAt: new Date().toISOString(),
              failureReason: newStatus === 'FAILED' ? (result.transfer?.failure_reason || 'Transfer failed') : undefined,
            }).catch(err => console.error('Failed to send withdrawal processed email:', err))
          }

          if (newStatus === 'FAILED' || newStatus === 'REVERSED') {
            await prisma.sellerEarnings.updateMany({
              where: { payoutId: payout.id },
              data: { status: 'AVAILABLE', payoutId: null, withdrawnAt: null },
            })
            await prisma.riderEarnings.updateMany({
              where: { payoutId: payout.id },
              data: { status: 'AVAILABLE', payoutId: null, withdrawnAt: null },
            })

            await prisma.financialLedger.create({
              data: {
                userId: payout.userId,
                payoutId: payout.id,
                type: 'REVERSAL',
                amount: payout.amount,
                currency: payout.currency,
                status: 'SUCCESS',
                reference: `REVERSAL-${payout.reference}`,
                description: `Reversal for failed payout ${payout.reference}`,
              },
            })
            if (payout.userId) {
              await createAuditEntry({
                actorId: payout.userId,
                actorRole: 'SYSTEM',
                action: 'PAYOUT_REVERSED',
                targetType: 'PAYOUT',
                targetId: payout.id,
                reason: result.transfer?.failure_reason || newStatus,
              })
            }
          } else if (newStatus === 'SUCCESS') {
            await prisma.financialLedger.updateMany({
              where: { payoutId: payout.id, type: 'PAYOUT' },
              data: { status: 'SUCCESS' },
            })
            if (payout.userId) {
              await createAuditEntry({
                actorId: payout.userId,
                actorRole: 'SYSTEM',
                action: 'PAYOUT_COMPLETED',
                targetType: 'PAYOUT',
                targetId: payout.id,
              })
            }
          }
        }
      }
    }

    return successResponse(res, { received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return errorResponse(res, 'Webhook processing failed', 500)
  }
})

export default router
