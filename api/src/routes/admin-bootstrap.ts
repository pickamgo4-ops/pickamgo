import { Router } from 'express'
import { z } from 'zod'
import prisma from '../utils/prisma'
import { errorResponse, successResponse, validateBody } from '../types/express'
import { bootstrapAdministrator } from '../utils/bootstrap-admin'

const router = Router()

const bootstrapSchema = z.object({
  email: z.string().email().optional(),
})

/**
 * Token-protected administrator bootstrap endpoint.
 *
 * This route is only mounted when both ADMIN_BOOTSTRAP_TOKEN and
 * ADMIN_EMAIL are configured on the server. The token must be supplied via
 * the `x-admin-bootstrap-token` header on every request. The endpoint never
 * trusts the body or query string for role assignment: it always reads the
 * target email from the server-side ADMIN_EMAIL environment variable (or
 * the optional `email` field, which must exactly match it).
 *
 * The endpoint is disabled in production when the token is not configured,
 * and always returns 404 in that case so it cannot be probed.
 */
router.post('/bootstrap', validateBody(bootstrapSchema), async (req, res) => {
  const expectedToken = process.env.ADMIN_BOOTSTRAP_TOKEN?.trim()
  const expectedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()

  if (!expectedToken || !expectedEmail) {
    return errorResponse(res, 'Administrator bootstrap is not configured on this server.', 404)
  }

  const providedToken = req.headers['x-admin-bootstrap-token']
  if (typeof providedToken !== 'string' || providedToken !== expectedToken) {
    return errorResponse(res, 'Invalid bootstrap credentials.', 401)
  }

  const requestedEmail = req.body?.email?.toString().trim().toLowerCase()
  if (requestedEmail && requestedEmail !== expectedEmail) {
    return errorResponse(res, 'Bootstrap email does not match the server configuration.', 400)
  }

  try {
    const result = await bootstrapAdministrator({ email: expectedEmail, allowCreate: true })
    await prisma.auditLog.create({
      data: {
        actorId: result.userId,
        actorRole: 'SYSTEM',
        action: 'ADMIN_BOOTSTRAP_ENDPOINT',
        targetType: 'User',
        targetId: result.userId,
        reason: 'Bootstrap invoked via token-protected endpoint',
        metadata: JSON.stringify({ result: result.status }),
      },
    })
    return successResponse(res, { status: result.status, userId: result.userId, email: result.email }, 200)
  } catch (error) {
    return errorResponse(res, error instanceof Error ? error.message : 'Bootstrap failed', 500)
  }
})

export default router