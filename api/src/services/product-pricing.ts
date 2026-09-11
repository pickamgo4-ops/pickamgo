import prisma from '../utils/prisma'

type PromotionItem = {
  originalPrice: unknown
  finalPrice: unknown
}

type ProductPriceInput = {
  price: unknown
  originalPrice?: unknown
  variant?: {
    price?: unknown
    originalPrice?: unknown
  } | null
  promotion?: PromotionItem | null
}

export type ProductPrice = {
  finalPrice: number
  originalPrice?: number
  discountPercentage?: number
  promotionApplied: boolean
}

function money(value: number): number {
  return Math.round(value * 100) / 100
}

export function calculateProductPrice(input: ProductPriceInput): ProductPrice {
  const basePrice = Number(input.variant?.price ?? input.price)
  const listedOriginal = Number(input.variant?.originalPrice ?? input.originalPrice)
  const promotionOriginal = Number(input.promotion?.originalPrice)
  const promotionFinal = Number(input.promotion?.finalPrice)
  const hasPromotion = Number.isFinite(promotionOriginal) && Number.isFinite(promotionFinal) && promotionFinal > 0 && promotionFinal < promotionOriginal

  let finalPrice = basePrice
  let originalPrice = Number.isFinite(listedOriginal) && listedOriginal > basePrice ? listedOriginal : undefined
  let promotionApplied = false

  if (hasPromotion) {
    const promotionRate = promotionFinal / promotionOriginal
    const promotedPrice = money(basePrice * promotionRate)
    if (promotedPrice > 0 && promotedPrice < finalPrice) {
      finalPrice = promotedPrice
      originalPrice = originalPrice && originalPrice > finalPrice ? originalPrice : basePrice
      promotionApplied = true
    }
  }

  const discountPercentage = originalPrice && originalPrice > finalPrice
    ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100)
    : undefined

  return { finalPrice, originalPrice, discountPercentage, promotionApplied }
}

export async function getActiveProductPromotion(productId: string, client: typeof prisma | any = prisma): Promise<PromotionItem | null> {
  const promotion = await client.productPromotion.findFirst({
    where: { status: 'ACTIVE', startsAt: { lte: new Date() }, endsAt: { gte: new Date() }, products: { some: { productId } } },
    include: { products: { where: { productId }, take: 1, select: { originalPrice: true, finalPrice: true } } },
    orderBy: { endsAt: 'asc' },
  })
  return promotion?.products[0] || null
}

export async function resolveProductPrice(product: ProductPriceInput & { id: string }, variantId?: string, client: typeof prisma | any = prisma) {
  const variant = variantId
    ? await client.productVariant.findFirst({ where: { id: variantId, productId: product.id, isActive: true }, select: { price: true, originalPrice: true } })
    : null
  const promotion = await getActiveProductPromotion(product.id, client)
  return calculateProductPrice({ ...product, variant, promotion })
}