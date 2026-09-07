import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import { createAuditEntry } from './auditLog'
import prisma from './prisma'
import { validatePasswordOrThrow } from './password-validation'

interface BootstrapOptions {
  email?: string
  actorId?: string | null
  actorRole?: string
  allowCreate?: boolean
  password?: string
}

interface BootstrapResult {
  status: 'PROMOTED' | 'ALREADY_ADMIN' | 'INVITED'
  userId: string
  email: string
  createdAt: boolean
  inviteLink?: string
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

/**
 * Promotes the configured administrator email to the highest available
 * administrative role using the existing Role / UserRole architecture.
 *
 * - If the user already exists, they are promoted in place; their data and
 *   user id are preserved, and the change is written to the existing audit
 *   log.
 * - If the user does not exist yet, an unverified placeholder record is
 *   created so that the configured email can claim the account via the
 *   normal registration flow (no default password is ever written).
 *
 * This helper is intentionally not exposed via any HTTP route. It is invoked
 * either by the dedicated bootstrap CLI script or by an explicit,
 * token-protected admin endpoint.
 */
export async function bootstrapAdministrator(options: BootstrapOptions = {}): Promise<BootstrapResult> {
  const configured = options.email ?? process.env.ADMIN_EMAIL?.trim()
  if (!configured) {
    throw new Error('ADMIN_EMAIL is not configured. Set the server-side ADMIN_EMAIL environment variable.')
  }
  const email = normalizeEmail(configured)
  const password = options.password?.trim()
  if (password) validatePasswordOrThrow(password)

  await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN', description: 'Platform administrator' },
  })

  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } })
  if (!adminRole) {
    throw new Error('ADMIN role is missing from the database after upsert.')
  }

  let user = await prisma.user.findUnique({ where: { email } })
  let createdAt = false

  if (!user) {
    if (!options.allowCreate) {
      throw new Error(
        `No account exists for ${email}. Run the bootstrap script with --invite or call bootstrapAdministrator({ allowCreate: true }) to record the placeholder.`,
      )
    }

    user = await prisma.user.create({
      data: {
        email,
        name: 'PickAmGo Administrator',
        location: '',
        passwordHash: password ? await bcrypt.hash(password, 12) : '__PENDING_BOOTSTRAP__',
        emailVerified: Boolean(password),
        isAdmin: true,
      },
    })
    createdAt = true

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: adminRole.id } },
      update: {},
      create: { userId: user.id, roleId: adminRole.id },
    })

    await prisma.user.update({
      where: { id: user.id },
      data: { isAdmin: true },
    })

    await createAuditEntry({
      actorId: options.actorId ?? user.id,
      actorRole: options.actorRole ?? 'SYSTEM',
      action: 'ADMIN_BOOTSTRAP_INVITED',
      targetType: 'User',
      targetId: user.id,
      reason: 'Administrator placeholder account created via ADMIN_EMAIL bootstrap',
      metadata: JSON.stringify({ email, bootstrap: true }),
    })

    return { status: password ? 'PROMOTED' : 'INVITED', userId: user.id, email, createdAt: true }
  }

  const wasAdmin = user.isAdmin
  const existingAdminLink = await prisma.userRole.findUnique({
    where: { userId_roleId: { userId: user.id, roleId: adminRole.id } },
  })

  if (wasAdmin && existingAdminLink && !password) {
    return { status: 'ALREADY_ADMIN', userId: user.id, email, createdAt: false }
  }

  await prisma.$transaction(async tx => {
    await tx.user.update({
      where: { id: user!.id },
      data: {
        isAdmin: true,
        ...(password ? { passwordHash: await bcrypt.hash(password, 12), emailVerified: true, authVersion: { increment: 1 } } : {}),
      },
    })
    await tx.userRole.upsert({
      where: { userId_roleId: { userId: user!.id, roleId: adminRole.id } },
      update: {},
      create: { userId: user!.id, roleId: adminRole.id },
    })
    await tx.auditLog.create({
      data: {
        actorId: options.actorId ?? user!.id,
        actorRole: options.actorRole ?? 'SYSTEM',
        action: 'ADMIN_ROLE_GRANTED',
        targetType: 'User',
        targetId: user!.id,
        reason: 'Promoted to administrator via ADMIN_EMAIL bootstrap',
        metadata: JSON.stringify({ email, bootstrap: true, previousIsAdmin: wasAdmin }),
      },
    })
  })

  return {
    status: existingAdminLink ? 'ALREADY_ADMIN' : 'PROMOTED',
    userId: user.id,
    email,
    createdAt: false,
  }
}

export const __testing = {
  normalizeEmail,
  bootstrapAdministrator,
}