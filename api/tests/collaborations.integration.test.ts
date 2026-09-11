import test from 'node:test'
import assert from 'node:assert/strict'
import { PrismaClient } from '@prisma/client'

const databaseUrl = process.env.COLLABORATION_TEST_DATABASE_URL
const fixtureOrderId = process.env.COLLABORATION_FIXTURE_ORDER_ID

test('collaboration financial allocations conserve the fixture order total', { skip: !databaseUrl || !fixtureOrderId }, async () => {
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } })
  try {
    const order = await prisma.order.findUnique({ where: { id: fixtureOrderId }, include: { payment: true, collaborationAllocations: true } })
    assert.ok(order?.collaborationId, 'fixture must be a collaboration order')
    assert.equal(order.payment?.status, 'PAID')
    const gross = order.collaborationAllocations.reduce((sum, allocation) => sum + Number(allocation.grossAmount), 0)
    const commission = order.collaborationAllocations.reduce((sum, allocation) => sum + Number(allocation.platformFee), 0)
    const sellerPool = order.collaborationAllocations.reduce((sum, allocation) => sum + Number(allocation.netAmount), 0)
    assert.equal(Math.round((gross + Number(order.deliveryFee)) * 100), Math.round(Number(order.payment?.amount || order.total) * 100))
    assert.equal(Math.round((commission + sellerPool) * 100), Math.round(gross * 100))
  } finally {
    await prisma.$disconnect()
  }
})
