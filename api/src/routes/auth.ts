import { Router } from 'express'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { z } from 'zod'
import { OAuth2Client } from 'google-auth-library'
import prisma from '../utils/prisma'
import { authMiddleware, generateToken } from '../middleware/auth'
import { AuthenticatedRequest, successResponse, errorResponse, validateBody } from '../types/express'
import { sendWelcomeEmail, sendPasswordResetEmail } from '../services/email'

const router = Router()

const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['buyer', 'seller', 'rider']).default('buyer'),
})

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
})

const googleAuthSchema = z.object({
  idToken: z.string().min(1, 'Google ID token is required'),
})

const googleCompleteSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  avatar: z.string().optional(),
  role: z.enum(['buyer', 'seller', 'rider']).default('buyer'),
})

async function verifyGoogleToken(idToken: string) {
  if (!googleClient) {
    throw new Error('Google OAuth is not configured on the server')
  }
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  })
  const payload = ticket.getPayload()
  if (!payload || !payload.email) {
    throw new Error('Invalid Google token')
  }
  return {
    email: payload.email.toLowerCase(),
    name: payload.name || payload.email.split('@')[0],
    avatar: payload.picture || '',
  }
}

router.post('/google', validateBody(googleAuthSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const { idToken } = req.body
    const googleUser = await verifyGoogleToken(idToken)

    const existingUser = await prisma.user.findUnique({
      where: { email: googleUser.email },
      include: {
        roles: {
          include: { role: true },
        },
      },
    })

    if (existingUser) {
      const token = generateToken(existingUser)
      const { passwordHash: _, ...userWithoutPassword } = existingUser
      return successResponse(res, { user: userWithoutPassword, token }, 200, 'Signed in with Google')
    }

    return successResponse(res, {
      isNewUser: true,
      email: googleUser.email,
      name: googleUser.name,
      avatar: googleUser.avatar,
    }, 200, 'Please complete your registration')
  } catch (error: any) {
    console.error('Google auth error:', error)
    return errorResponse(res, error.message || 'Google authentication failed', 401)
  }
})

router.post('/google/complete', validateBody(googleCompleteSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const { email, name, phone, avatar, role } = req.body
    const normalizedEmail = email.trim().toLowerCase()

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existingUser) {
      const token = generateToken(existingUser)
      const { passwordHash: _, ...userWithoutPassword } = existingUser
      return successResponse(res, { user: userWithoutPassword, token }, 200, 'Signed in with Google')
    }

    const isSeller = role === 'seller'
    const isRider = role === 'rider'
    const userRole = await prisma.role.findUnique({ where: { name: role === 'buyer' ? 'USER' : role.toUpperCase() } })

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        phone,
        passwordHash: bcrypt.hashSync(crypto.randomBytes(32).toString('hex'), 10),
        location: '',
        avatar: avatar || '',
        isSeller,
        isRider,
        isAdmin: false,
        roles: {
          create: [
            { roleId: userRole!.id },
          ],
        },
        ...(isRider ? {
          riderProfile: {
            create: {
              isOnline: false,
              isAvailable: false,
            },
          },
        } : {}),
      },
      include: {
        roles: {
          include: { role: true },
        },
      },
    })

    const token = generateToken(user)
    const { passwordHash: _, ...userWithoutPassword } = user

    sendWelcomeEmail(user.email, user.name).catch(err => console.error('Failed to send welcome email:', err))

    return successResponse(res, { user: userWithoutPassword, token }, 201, 'Google registration successful')
  } catch (error) {
    console.error('Google complete error:', error)
    return errorResponse(res, 'Google registration failed', 500)
  }
})

router.post('/register', validateBody(registerSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const { name, phone, password, role } = req.body
    const email = req.body.email.trim().toLowerCase()

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return errorResponse(res, 'Email already registered', 409)
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const isSeller = role === 'seller'
    const isRider = role === 'rider'

    const userRole = await prisma.role.findUnique({ where: { name: role === 'buyer' ? 'USER' : role.toUpperCase() } })

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        location: '',
        isSeller,
        isRider,
        isAdmin: false,
        roles: {
          create: [
            { roleId: userRole!.id },
          ],
        },
        ...(isRider ? {
          riderProfile: {
            create: {
              isOnline: false,
              isAvailable: false,
            },
          },
        } : {}),
      },
      include: {
        roles: {
          include: { role: true },
        },
      },
    })

    const token = generateToken(user)

    const { passwordHash: _, ...userWithoutPassword } = user

    sendWelcomeEmail(user.email, user.name).catch(err => console.error('Failed to send welcome email:', err))

    return successResponse(res, { user: userWithoutPassword, token }, 201, 'Registration successful')
  } catch (error) {
    return errorResponse(res, 'Registration failed', 500)
  }
})

router.post('/login', validateBody(loginSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const email = req.body.email.trim().toLowerCase()
    const { password } = req.body

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: { role: true },
        },
      },
    })

    if (!user) {
      return errorResponse(res, 'Invalid email or password', 401)
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
    if (!isPasswordValid) {
      return errorResponse(res, 'Invalid email or password', 401)
    }

    const token = generateToken(user)

    const { passwordHash: _, ...userWithoutPassword } = user

    return successResponse(res, { user: userWithoutPassword, token })
  } catch (error) {
    return errorResponse(res, 'Login failed', 500)
  }
})

router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: { role: true },
        },
      },
    })

    if (!user) {
      return errorResponse(res, 'User not found', 404)
    }

    const { passwordHash: _, ...userWithoutPassword } = user

    return successResponse(res, userWithoutPassword)
  } catch (error) {
    return errorResponse(res, 'Failed to fetch profile', 500)
  }
})

router.post('/forgot-password', validateBody(forgotPasswordSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const { email } = req.body

    const user = await prisma.user.findUnique({ where: { email } })
    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex')
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: tokenHash,
          expiresAt,
        },
      })

      const emailResult = await sendPasswordResetEmail(user.email, rawToken)
      if (!emailResult.success) {
        console.error('Failed to send password reset email:', emailResult.error)
      }
    }

    return successResponse(res, null, 200, 'If an account exists with that email, a reset link has been sent')
  } catch (error) {
    console.error('Forgot password error:', error)
    return successResponse(res, null, 200, 'If an account exists with that email, a reset link has been sent')
  }
})

router.post('/reset-password', validateBody(resetPasswordSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const { token, newPassword } = req.body

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: tokenHash },
      include: { user: true },
    })

    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      return errorResponse(res, 'Invalid or expired reset token', 400)
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
    ])

    return successResponse(res, null, 200, 'Password reset successfully')
  } catch (error) {
    console.error('Reset password error:', error)
    return errorResponse(res, 'Invalid or expired reset token', 400)
  }
})

router.get('/google-config', async (_req: AuthenticatedRequest, res) => {
  try {
    const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''
    return successResponse(res, {
      clientId: googleClientId,
      configured: !!googleClientId,
    })
  } catch (error) {
    return successResponse(res, { clientId: '', configured: false })
  }
})

export default router
