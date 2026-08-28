import prisma from '../utils/prisma'
import { sendEmailDirect } from './email'

type SendEmailResult = {
  success: boolean
  error?: string
  messageId?: string
}

type EmailLogInput = {
  to: string
  subject: string
  type: string
  userId?: string
  relatedId?: string
}

export async function sendLoggedEmail(input: EmailLogInput, options: Parameters<typeof sendEmailDirect>[0]): Promise<SendEmailResult> {
  const log = await prisma.emailLog.create({
    data: {
      to: input.to,
      subject: input.subject,
      type: input.type,
      userId: input.userId,
      relatedId: input.relatedId,
      status: 'pending',
    },
  })

  const result = await sendEmailDirect(options)

  await prisma.emailLog.update({
    where: { id: log.id },
    data: {
      status: result.success ? 'sent' : 'failed',
      messageId: result.messageId,
      error: result.error,
      sentAt: result.success ? new Date() : null,
    },
  })

  return result
}

export async function hasRecentEmail(type: string, relatedId?: string, withinMinutes = 60): Promise<boolean> {
  const since = new Date(Date.now() - withinMinutes * 60 * 1000)

  const existing = await prisma.emailLog.findFirst({
    where: {
      type,
      relatedId: relatedId || undefined,
      status: 'sent',
      createdAt: { gte: since },
    },
  })

  return !!existing
}
