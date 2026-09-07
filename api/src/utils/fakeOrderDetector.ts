import prisma from './prisma'

export async function detectFakeOrderSignals(orderId: string, customerId: string | null | undefined) {
  if (!customerId) return

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [recentOrderCount, failedPayments, cancellations, refunds, accountAge, totalOrders] = await Promise.all([
    prisma.order.count({ where: { customerId, createdAt: { gte: oneHourAgo } } }),
    prisma.order.count({ where: { customerId, payment: { status: 'FAILED' }, createdAt: { gte: twentyFourHoursAgo } } }),
    prisma.order.count({ where: { customerId, status: 'CANCELLED', createdAt: { gte: sevenDaysAgo } } }),
    prisma.refund.count({ where: { customerId, status: { in: ['APPROVED', 'PROCESSED'] }, createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.findUnique({ where: { id: customerId }, select: { createdAt: true } }),
    prisma.order.count({ where: { customerId } }),
  ])

  const reasons: Array<{ signal: string; riskLevel: string }> = []

  if (recentOrderCount >= 5) reasons.push({ signal: `Customer placed ${recentOrderCount} orders in the last hour`, riskLevel: 'HIGH' })
  if (failedPayments >= 3) reasons.push({ signal: `Customer had ${failedPayments} failed payments in 24 hours`, riskLevel: 'MEDIUM' })
  if (cancellations >= 3) reasons.push({ signal: `Customer cancelled ${cancellations} orders in 7 days`, riskLevel: 'MEDIUM' })
  if (refunds >= 3) reasons.push({ signal: `Customer requested ${refunds} refunds in 7 days`, riskLevel: 'MEDIUM' })
  if (accountAge && Date.now() - accountAge.createdAt.getTime() < 60 * 60 * 1000 && totalOrders >= 1) {
    reasons.push({ signal: 'Order placed from a brand-new account', riskLevel: 'HIGH' })
  }

  if (reasons.length === 0) return

  const topReason = reasons.reduce((max, r) => (r.riskLevel === 'HIGH' ? r : max), reasons[0])

  await prisma.fraudAlert.create({
    data: {
      userId: customerId,
      orderId,
      riskLevel: topReason.riskLevel,
      reason: `Suspicious ordering pattern: ${reasons.map(r => r.signal).join('; ')}`,
      status: 'OPEN',
      metadata: JSON.stringify({ signals: reasons, detectedAt: new Date().toISOString() }),
    },
  }).catch(error => console.error('Failed to record fake order alert:', error))
}