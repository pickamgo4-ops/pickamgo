import { Router } from 'express'
import crypto from 'crypto'
import prisma from '../utils/prisma'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'
import { createTransferRecipient, initiateTransfer, handleWebhook } from '../services/paystack'
import { calculateSellerEarnings, calculateRiderEarnings, getMinimumPayout } from '../services/earnings'
import { sendWithdrawalRequestedEmail, sendWithdrawalProcessedEmail } from '../services/email'

const router = Router()

const payoutMethodSchema = z.object({
  type: z.string().min(1),
  provider: z.string().min(1),
  phoneNumber: z.string().min(10),
  accountName: z.string().optional(),
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
        createdAt: true,
      },
      orderBy: { isDefault: 'desc' },
    })

    return successResponse(res, methods)
  } catch (error) {
    return errorResponse(res, 'Failed to fetch payout methods', 500)
  }
})

router.post('/methods', authMiddleware, validateBody(payoutMethodSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const { type, provider, phoneNumber, accountName } = req.body

    const recipient = await createTransferRecipient(req.user!.id, type, provider, phoneNumber, accountName)

    const method = await prisma.payoutMethod.create({
      data: {
        userId: req.user!.id,
        type,
        provider,
        phoneNumber,
        accountName: accountName || recipient.name,
        isDefault: true,
        isVerified: true,
      },
    })

    await prisma.payoutMethod.updateMany({
      where: { userId: req.user!.id, id: { not: method.id } },
      data: { isDefault: false },
    })

    return successResponse(res, method, 201, 'Payout method added')
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

      available = earnings.filter(e => e.status === 'AVAILABLE').reduce((sum, e) => sum + Number(e.netAmount), 0)
      pending = earnings.filter(e => e.status === 'PENDING').reduce((sum, e) => sum + Number(e.netAmount), 0)
      totalEarnings = earnings.reduce((sum, e) => sum + Number(e.netAmount), 0)
      totalWithdrawn = earnings.filter(e => e.status === 'WITHDRAWN').reduce((sum, e) => sum + Number(e.netAmount), 0)
    } else if (isRider) {
      const earnings = await prisma.riderEarnings.findMany({
        where: { riderId: userId },
      })

      available = earnings.filter(e => e.status === 'AVAILABLE').reduce((sum, e) => sum + Number(e.netAmount), 0)
      pending = earnings.filter(e => e.status === 'PENDING').reduce((sum, e) => sum + Number(e.netAmount), 0)
      totalEarnings = earnings.reduce((sum, e) => sum + Number(e.netAmount), 0)
      totalWithdrawn = earnings.filter(e => e.status === 'WITHDRAWN').reduce((sum, e) => sum + Number(e.netAmount), 0)
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
      availableBalance = earnings.reduce((sum, e) => sum + Number(e.netAmount), 0)
    } else if (isRider) {
      const earnings = await prisma.riderEarnings.findMany({
        where: { riderId: userId, status: 'AVAILABLE' },
      })
      availableBalance = earnings.reduce((sum, e) => sum + Number(e.netAmount), 0)
    }

    if (amount > availableBalance) {
      return errorResponse(res, 'Insufficient available balance', 400)
    }

    const reference = `PAYOUT-${Date.now()}-${crypto.randomUUID()}`

    const payout = await prisma.payout.create({
      data: {
        userId,
        payoutMethodId,
        amount,
        currency: 'GHS',
        status: 'PENDING',
        reference,
      },
      include: {
        payoutMethod: true,
      },
    })

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

      if (isSeller) {
        const earnings = await prisma.sellerEarnings.findMany({
          where: { sellerId: userId, status: 'AVAILABLE' },
          orderBy: { availableAt: 'asc' },
        })

        let remaining = amount
        for (const earning of earnings) {
          if (remaining <= 0) break
          const deduct = Math.min(remaining, Number(earning.netAmount))
          await prisma.sellerEarnings.update({
            where: { id: earning.id },
            data: { status: 'WITHDRAWN', withdrawnAt: new Date() },
          })
          remaining = Math.round((remaining - deduct) * 100) / 100
        }
      } else if (isRider) {
        const earnings = await prisma.riderEarnings.findMany({
          where: { riderId: userId, status: 'AVAILABLE' },
          orderBy: { availableAt: 'asc' },
        })

        let remaining = amount
        for (const earning of earnings) {
          if (remaining <= 0) break
          const deduct = Math.min(remaining, Number(earning.netAmount))
          await prisma.riderEarnings.update({
            where: { id: earning.id },
            data: { status: 'WITHDRAWN', withdrawnAt: new Date() },
          })
          remaining = Math.round((remaining - deduct) * 100) / 100
        }
      }

      await prisma.financialLedger.create({
        data: {
          userId,
          payoutId: payout.id,
          type: 'PAYOUT',
          amount: -amount,
          currency: 'GHS',
          status: 'PENDING',
          reference,
          description: `Withdrawal to ${payoutMethod.provider} ${payoutMethod.phoneNumber}`,
        },
      })

      return successResponse(res, payout, 201, 'Withdrawal initiated successfully')
    } catch (transferError) {
      await prisma.payout.update({
        where: { id: payout.id },
        data: {
          status: 'FAILED',
          failureReason: transferError instanceof Error ? transferError.message : 'Transfer failed',
        },
      })

      return errorResponse(res, 'Failed to initiate transfer. Please try again.', 500)
    }
  } catch (error) {
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

          await prisma.payout.update({
            where: { id: payout.id },
            data: {
              status: newStatus,
              processedAt: new Date(),
              failureReason: newStatus === 'FAILED' ? (result.transfer?.failure_reason || 'Transfer failed') : null,
            },
          })

          const payoutUser = await prisma.user.findUnique({
            where: { id: payout.userId },
            select: { email: true, name: true },
          })

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
            const userEarnings = await prisma.sellerEarnings.findMany({
              where: { sellerId: payout.userId, status: 'WITHDRAWN' },
              orderBy: { withdrawnAt: 'asc' },
            })

            let restore = Number(payout.amount)
            for (const earning of userEarnings) {
              if (restore <= 0) break
              await prisma.sellerEarnings.update({
                where: { id: earning.id },
                data: { status: 'AVAILABLE', withdrawnAt: null },
              })
              restore = Math.round((restore - Number(earning.netAmount)) * 100) / 100
            }

            if (restore > 0) {
              const riderEarnings = await prisma.riderEarnings.findMany({
                where: { riderId: payout.userId, status: 'WITHDRAWN' },
                orderBy: { withdrawnAt: 'asc' },
              })

              for (const earning of riderEarnings) {
                if (restore <= 0) break
                await prisma.riderEarnings.update({
                  where: { id: earning.id },
                  data: { status: 'AVAILABLE', withdrawnAt: null },
                })
                restore = Math.round((restore - Number(earning.netAmount)) * 100) / 100
              }
            }

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
          } else if (newStatus === 'SUCCESS') {
            await prisma.financialLedger.updateMany({
              where: { payoutId: payout.id, type: 'PAYOUT' },
              data: { status: 'SUCCESS' },
            })
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
