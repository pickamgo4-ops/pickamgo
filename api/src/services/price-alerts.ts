import prisma from '../utils/prisma'

export function isPriceDrop(previousPrice: number, nextPrice: number): boolean {
  return Number.isFinite(previousPrice) && Number.isFinite(nextPrice) && nextPrice < previousPrice
}

export async function notifyPriceDrop(client: typeof prisma | any, productId: string, previousPrice: number, nextPrice: number, variantId?: string): Promise<number> {
  if (!isPriceDrop(previousPrice, nextPrice)) return 0

  const alerts = await client.productPriceAlert.findMany({
    where: { productId, variantId: variantId || null, active: true },
    select: { id: true, userId: true, variantId: true, product: { select: { name: true } }, variant: { select: { name: true } } },
  })
  let notified = 0
  for (const alert of alerts) {
    const claimed = await client.productPriceAlert.updateMany({
      where: { id: alert.id, active: true, notifiedAt: null },
      data: { active: false, notifiedAt: new Date(), lastObservedPrice: nextPrice },
    })
    if (claimed.count !== 1) continue
    const variantLabel = alert.variant?.name ? ` - ${alert.variant.name}` : ''
    await client.notification.create({
      data: {
        userId: alert.userId,
        type: 'PRODUCT_PRICE_DROPPED',
        title: 'Price dropped',
        message: `${alert.product.name}${variantLabel} dropped from GH₵${previousPrice.toFixed(2)} to GH₵${nextPrice.toFixed(2)}.`,
        data: JSON.stringify({ productId, variantId: alert.variantId, path: `/product/${productId}${alert.variantId ? `?variant=${alert.variantId}` : ''}`, oldPrice: previousPrice, newPrice: nextPrice }),
      },
    })
    notified += 1
  }
  return notified
}

export async function deactivateProductPriceAlerts(client: typeof prisma | any, productId: string) {
  await client.productPriceAlert.updateMany({ where: { productId, active: true }, data: { active: false, cancelledAt: new Date() } })
}
