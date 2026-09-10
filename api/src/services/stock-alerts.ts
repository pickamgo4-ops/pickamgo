import prisma from '../utils/prisma'

type DatabaseClient = typeof prisma

export function isRestockTransition(previousStock: number, nextStock: number): boolean {
  return previousStock <= 0 && nextStock > 0
}

export async function notifyRestockTransition(
  client: DatabaseClient | any,
  productId: string,
  previousStock: number,
  nextStock: number,
  variantId?: string,
): Promise<number> {
  if (!isRestockTransition(previousStock, nextStock)) return 0

  const alerts = await client.productStockAlert.findMany({
    where: {
      productId,
      active: true,
      ...(variantId ? { variantId } : { variantId: null }),
    },
    select: {
      id: true,
      userId: true,
      variantId: true,
      product: { select: { name: true } },
      variant: { select: { name: true } },
    },
  })

  let notified = 0
  for (const alert of alerts) {
    const claimed = await client.productStockAlert.updateMany({
      where: { id: alert.id, active: true, notifiedAt: null },
      data: { active: false, notifiedAt: new Date() },
    })
    if (claimed.count !== 1) continue

    const variantLabel = alert.variant?.name ? ` - ${alert.variant.name}` : ''
    await client.notification.create({
      data: {
        userId: alert.userId,
        type: 'PRODUCT_BACK_IN_STOCK',
        title: 'Back in stock',
        message: `${alert.product.name}${variantLabel} is back in stock. You can now purchase it.`,
        data: JSON.stringify({ productId, variantId: alert.variantId, path: `/product/${productId}${alert.variantId ? `?variant=${alert.variantId}` : ''}` }),
      },
    })
    notified += 1
  }

  return notified
}

export async function deactivateProductStockAlerts(client: DatabaseClient | any, productId: string) {
  await client.productStockAlert.updateMany({
    where: { productId, active: true },
    data: { active: false, cancelledAt: new Date() },
  })
}
