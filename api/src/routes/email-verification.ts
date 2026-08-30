import { Router } from 'express'
import { z } from 'zod'
import prisma from '../utils/prisma'
import { authMiddleware, requireRole } from '../middleware/auth'
import { AuthenticatedRequest, successResponse, errorResponse, validateBody } from '../types/express'
import { sendEmail, buildBaseHtml } from '../services/email'
import { generateVerificationCode, hashCode, compareCode } from '../utils/email-verification'
import { getAppUrl } from '../utils/url'

const router = Router()

const sendVerificationCodeSchema = z.object({
  email: z.string().email('Invalid email address'),
})

const verifyCodeSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'Code must be exactly 6 digits'),
})

const resendCodeSchema = z.object({
  email: z.string().email('Invalid email address'),
})

router.post('/send-verification', async (req: AuthenticatedRequest, res) => {
  try {
    const { email } = sendVerificationCodeSchema.parse(req.body)
    const normalizedEmail = email.trim().toLowerCase()

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user) {
      return errorResponse(res, 'No account found with this email address', 404)
    }

    if (user.emailVerified) {
      return errorResponse(res, 'Email is already verified', 400)
    }

    const activeVerification = await prisma.emailVerification.findFirst({
      where: {
        userId: user.id,
        used: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (activeVerification) {
      const cooldownRemaining = 60 - Math.floor((Date.now() - activeVerification.createdAt.getTime()) / 1000)
      if (cooldownRemaining > 0) {
        return errorResponse(res, `Please wait ${cooldownRemaining} seconds before requesting a new code`, 429)
      }
    }

    const code = generateVerificationCode()
    const hashedCode = await hashCode(code)

    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        email: normalizedEmail,
        code,
        hashedCode,
      },
    })

    const appUrl = getAppUrl()
    const verifyUrl = `${appUrl}/auth/verify-email?email=${encodeURIComponent(normalizedEmail)}`

    const html = buildBaseHtml('Verify your PickAmGo email', `
      <div style="text-align: center; padding: 20px 0;">
        <div style="font-size: 48px; margin-bottom: 20px;">🔐</div>
        <h2 style="color: #FF6B35; margin-bottom: 10px;">Verify Your Email</h2>
        <p style="color: #6b7280; margin-bottom: 30px;">Enter this code to verify your email address:</p>
        <div style="background: #f9fafb; border: 2px dashed #e5e7eb; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937;">${code}</span>
        </div>
        <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">This code expires in 10 minutes.</p>
        <p style="color: #6b7280; font-size: 14px;">If you didn't request this, please ignore this email.</p>
      </div>
    `)

    const text = `Verify your PickAmGo email\n\nYour verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, please ignore this email.`

    const result = await sendEmail({
      to: normalizedEmail,
      subject: 'Verify your PickAmGo email address',
      html,
      text,
      purpose: 'email_verification',
    })

    if (!result.success) {
      return errorResponse(res, result.error || 'Failed to send verification email', 500)
    }

    return successResponse(res, { message: 'Verification code sent successfully', verifyUrl })
  } catch (error) {
    console.error('Failed to send verification code:', error)
    return errorResponse(res, 'Failed to send verification code', 500)
  }
})

router.post('/verify', async (req: AuthenticatedRequest, res) => {
  try {
    const { email, code } = verifyCodeSchema.parse(req.body)
    const normalizedEmail = email.trim().toLowerCase()

    const verification = await prisma.emailVerification.findFirst({
      where: {
        email: normalizedEmail,
        used: false,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!verification) {
      return errorResponse(res, 'No verification code found. Please request a new one.', 404)
    }

    if (verification.attempts >= verification.maxAttempts) {
      return errorResponse(res, 'Too many failed attempts. Please request a new verification code.', 429)
    }

    if (isCodeExpired(verification.expiresAt)) {
      return errorResponse(res, 'Verification code has expired. Please request a new one.', 400)
    }

    const isValid = await compareCode(code, verification.hashedCode)

    if (!isValid) {
      await prisma.emailVerification.update({
        where: { id: verification.id },
        data: { attempts: { increment: 1 } },
      })

      const remainingAttempts = verification.maxAttempts - verification.attempts - 1
      if (remainingAttempts <= 0) {
        return errorResponse(res, 'Too many failed attempts. Please request a new verification code.', 429)
      }

      return errorResponse(res, `Invalid verification code. ${remainingAttempts} attempts remaining.`, 400)
    }

    await prisma.user.update({
      where: { id: verification.userId },
      data: { emailVerified: true },
    })

    await prisma.emailVerification.update({
      where: { id: verification.id },
      data: { used: true },
    })

    const user = await prisma.user.findUnique({
      where: { id: verification.userId },
      select: { id: true, email: true, name: true, isSeller: true, isRider: true, isAdmin: true },
    })

    return successResponse(res, {
      message: 'Email verified successfully',
      user,
    })
  } catch (error) {
    console.error('Failed to verify code:', error)
    return errorResponse(res, 'Failed to verify code', 500)
  }
})

router.post('/resend', async (req: AuthenticatedRequest, res) => {
  try {
    const { email } = resendCodeSchema.parse(req.body)
    const normalizedEmail = email.trim().toLowerCase()

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user) {
      return errorResponse(res, 'No account found with this email address', 404)
    }

    if (user.emailVerified) {
      return errorResponse(res, 'Email is already verified', 400)
    }

    const activeVerification = await prisma.emailVerification.findFirst({
      where: {
        userId: user.id,
        used: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (activeVerification) {
      const cooldownRemaining = 60 - Math.floor((Date.now() - activeVerification.createdAt.getTime()) / 1000)
      if (cooldownRemaining > 0) {
        return errorResponse(res, `Please wait ${cooldownRemaining} seconds before requesting a new code`, 429)
      }
    }

    const code = generateVerificationCode()
    const hashedCode = await hashCode(code)

    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        email: normalizedEmail,
        code,
        hashedCode,
      },
    })

    const appUrl = getAppUrl()
    const verifyUrl = `${appUrl}/auth/verify-email?email=${encodeURIComponent(normalizedEmail)}`

    const html = buildBaseHtml('Verify your PickAmGo email', `
      <div style="text-align: center; padding: 20px 0;">
        <div style="font-size: 48px; margin-bottom: 20px;">🔐</div>
        <h2 style="color: #FF6B35; margin-bottom: 10px;">Verify Your Email</h2>
        <p style="color: #6b7280; margin-bottom: 30px;">Enter this code to verify your email address:</p>
        <div style="background: #f9fafb; border: 2px dashed #e5e7eb; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937;">${code}</span>
        </div>
        <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">This code expires in 10 minutes.</p>
        <p style="color: #6b7280; font-size: 14px;">If you didn't request this, please ignore this email.</p>
      </div>
    `)

    const text = `Verify your PickAmGo email\n\nYour verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, please ignore this email.`

    const result = await sendEmail({
      to: normalizedEmail,
      subject: 'Verify your PickAmGo email address',
      html,
      text,
      purpose: 'email_verification',
    })

    if (!result.success) {
      return errorResponse(res, result.error || 'Failed to send verification email', 500)
    }

    return successResponse(res, { message: 'Verification code sent successfully', verifyUrl })
  } catch (error) {
    console.error('Failed to resend verification code:', error)
    return errorResponse(res, 'Failed to resend verification code', 500)
  }
})

router.get('/status', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { emailVerified: true },
    })

    if (!user) {
      return errorResponse(res, 'User not found', 404)
    }

    return successResponse(res, { emailVerified: user.emailVerified })
  } catch (error) {
    console.error('Failed to get verification status:', error)
    return errorResponse(res, 'Failed to get verification status', 500)
  }
})

function isCodeExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt
}

export default router
