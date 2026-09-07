import prisma from './prisma'

interface AuditEntryParams {
  actorId: string
  actorRole: string
  action: string
  targetType: string
  targetId: string
  reason?: string
  metadata?: string
}

export async function createAuditEntry(params: AuditEntryParams) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        actorRole: params.actorRole,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        reason: params.reason || null,
        metadata: params.metadata || null,
      },
    })
  } catch (error) {
    console.error('Failed to create audit log entry:', error)
  }
}
