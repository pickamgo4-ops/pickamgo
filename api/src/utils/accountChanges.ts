import prisma from './prisma'

export interface AccountChangeInput {
  userId: string
  changeType:
    | 'EMAIL_CHANGE'
    | 'PHONE_CHANGE'
    | 'PASSWORD_CHANGE'
    | 'NAME_CHANGE'
    | 'PAYOUT_METHOD_CHANGE'
    | 'SELLER_BUSINESS_INFO_CHANGE'
  oldValue?: string | null
  newValue?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  actorId?: string | null
  verifiedVia?: string | null
  metadata?: Record<string, unknown>
}

export async function recordAccountChange(input: AccountChangeInput) {
  try {
    return await prisma.accountChangeEvent.create({
      data: {
        userId: input.userId,
        changeType: input.changeType,
        oldValue: input.oldValue ?? null,
        newValue: input.newValue ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        actorId: input.actorId ?? null,
        verifiedVia: input.verifiedVia ?? null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    })
  } catch (error) {
    console.error('Failed to record account change event:', error)
    return null
  }
}