import prisma from './prisma'

interface SecurityNotificationInput {
  userId: string
  type: string
  title: string
  message: string
  data?: Record<string, unknown>
}

export async function sendSecurityNotification(input: SecurityNotificationInput) {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        data: input.data ? JSON.stringify(input.data) : null,
      },
    })
  } catch (error) {
    console.error('Failed to send security notification:', error)
  }
}