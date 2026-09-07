import prisma from './prisma'

export async function recordRefundAbuseSignal(customerId: string, orderId: string, reason: string) {
  try {
    const openCount = await prisma.refundAbuseSignal.count({
      where: { customerId, status: 'OPEN' },
    })
    const totalCount = await prisma.refundAbuseSignal.count({ where: { customerId } })

    await prisma.refundAbuseSignal.create({
      data: { customerId, orderId, reason },
    })

    if (openCount + 1 >= 3 || totalCount + 1 >= 5) {
      await prisma.fraudAlert.create({
        data: {
          userId: customerId,
          orderId,
          riskLevel: openCount + 1 >= 3 ? 'HIGH' : 'MEDIUM',
          reason: `Repeated refund requests detected (${openCount + 1} open, ${totalCount + 1} total)`,
          status: 'OPEN',
          metadata: JSON.stringify({ signal: 'REFUND_ABUSE', openCount: openCount + 1, totalCount: totalCount + 1 }),
        },
      }).catch(error => console.error('Failed to record refund abuse alert:', error))
    }
  } catch (error) {
    console.error('Failed to record refund abuse signal:', error)
  }
}

export async function resolveRefundAbuseSignals(orderId: string, status: 'RESOLVED' | 'DISMISSED' = 'RESOLVED') {
  await prisma.refundAbuseSignal.updateMany({
    where: { orderId, status: 'OPEN' },
    data: { status },
  }).catch(() => {})
}