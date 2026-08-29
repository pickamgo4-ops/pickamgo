import prisma from '../src/utils/prisma'
import { claimPaymentWebhookEvent } from '../src/routes/checkout'

async function main() {
  const reference = `paystack-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const attempts = Array.from({ length: 12 }, (_, index) => index)

  const results = await Promise.allSettled(
    attempts.map(async () => {
      return prisma.$transaction(async (tx) => {
        const result = await claimPaymentWebhookEvent(
          tx,
          reference,
          'PAYSTACK_CHARGE_SUCCESS',
          'webhook',
          { amount: 2500, test: 'concurrency' },
        )

        return result
      })
    }),
  )

  const created = results.filter((r) => r.status === 'fulfilled' && r.value.created).length
  const duplicates = results.filter((r) => r.status === 'fulfilled' && !r.value.created).length
  const failures = results.filter((r) => r.status === 'rejected').length

  const rowCount = await prisma.paymentWebhookEvent.count({ where: { reference: `paystack:${reference}` } })
  console.log(JSON.stringify({
    reference,
    created,
    duplicates,
    failures,
    rowCount,
    results: results.map((r) => r.status === 'fulfilled' ? r.value : { rejected: String(r.reason) }),
  }, null, 2))

  await prisma.paymentWebhookEvent.deleteMany({ where: { reference: `paystack:${reference}` } })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
