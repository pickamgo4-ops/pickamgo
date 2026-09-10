import { Router } from 'express'
import crypto from 'crypto'
import { z } from 'zod'
import prisma from '../utils/prisma'
import { notifyPriceDrop } from '../services/price-alerts'
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth'
import { errorResponse, successResponse, validateBody } from '../types/express'

const router = Router()

const zoneSchema = z.object({
  name: z.string().min(2).max(80), region: z.string().max(80).optional(), city: z.string().max(80).optional(), area: z.string().max(120).optional(), locations: z.array(z.string().max(120)).max(30).default([]), deliveryFee: z.number().min(0), freeDeliveryFrom: z.number().min(0).nullable().optional(), estimatedDelivery: z.string().min(2).max(60), isActive: z.boolean().default(true),
})
const collectionSchema = z.object({ name: z.string().min(2).max(80), description: z.string().max(500).optional(), imageUrl: z.string().url().optional().or(z.literal('')), productIds: z.array(z.string()).default([]), isVisible: z.boolean().default(true), isFeatured: z.boolean().default(false), sortOrder: z.number().int().min(0).default(0), startsAt: z.coerce.date().nullable().optional(), endsAt: z.coerce.date().nullable().optional() })
const promotionSchema = z.object({ name: z.string().min(2).max(100), type: z.enum(['CLEARANCE', 'FLASH_SALE', 'BLACK_FRIDAY', 'END_OF_STOCK', 'OLD_STOCK']).default('CLEARANCE'), discountType: z.enum(['PERCENTAGE', 'FIXED']), discountValue: z.number().positive(), productIds: z.array(z.string()).min(1), startsAt: z.coerce.date(), endsAt: z.coerce.date(), maxQuantity: z.number().int().positive().nullable().optional(), bannerUrl: z.string().url().optional().or(z.literal('')), status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED']).default('DRAFT') })

async function sellerShop(userId: string) { return prisma.shop.findFirst({ where: { ownerId: userId }, select: { id: true, slug: true, name: true, logo: true } }) }
function slugify(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || `collection-${Date.now()}` }
function activePromotionWhere(now = new Date()) { return { status: 'ACTIVE', startsAt: { lte: now }, endsAt: { gte: now } } }
function qrEndpointUrl(token: string) {
  const apiUrl = process.env.API_PUBLIC_URL?.split(',')[0]?.trim() || 'https://pickamgo-production.up.railway.app'
  return `${apiUrl.replace(/\/$/, '')}/api/seller/store/qr/${encodeURIComponent(token)}`
}
function shopPublicUrl(slug: string) {
  const domain = process.env.MARKETPLACE_DOMAIN || 'pickamgo.com'
  return `https://${encodeURIComponent(slug)}.${domain}`
}

router.get('/zones', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  const shop = await sellerShop(req.user!.id); if (!shop) return errorResponse(res, 'Shop not found', 404)
  return successResponse(res, await prisma.shippingZone.findMany({ where: { shopId: shop.id }, orderBy: { createdAt: 'asc' } }))
})
router.post('/zones', authMiddleware, requireRole(['SELLER']), validateBody(zoneSchema), async (req: AuthenticatedRequest, res) => {
  const shop = await sellerShop(req.user!.id); if (!shop) return errorResponse(res, 'Shop not found', 404)
  const zone = await prisma.shippingZone.create({ data: { ...req.body, locations: JSON.stringify(req.body.locations), shopId: shop.id } })
  return successResponse(res, zone, 201, 'Delivery zone created')
})
router.patch('/zones/:id', authMiddleware, requireRole(['SELLER']), validateBody(zoneSchema.partial()), async (req: AuthenticatedRequest, res) => {
  const shop = await sellerShop(req.user!.id); if (!shop) return errorResponse(res, 'Shop not found', 404)
  const zone = await prisma.shippingZone.findFirst({ where: { id: req.params.id, shopId: shop.id } }); if (!zone) return errorResponse(res, 'Delivery zone not found', 404)
  const data: any = { ...req.body }; if (Array.isArray(data.locations)) data.locations = JSON.stringify(data.locations)
  return successResponse(res, await prisma.shippingZone.update({ where: { id: zone.id }, data }), 200, 'Delivery zone updated')
})
router.delete('/zones/:id', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  const shop = await sellerShop(req.user!.id); if (!shop) return errorResponse(res, 'Shop not found', 404)
  const deleted = await prisma.shippingZone.deleteMany({ where: { id: req.params.id, shopId: shop.id } }); if (!deleted.count) return errorResponse(res, 'Delivery zone not found', 404)
  return successResponse(res, null, 200, 'Delivery zone deleted')
})

router.get('/collections', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  const shop = await sellerShop(req.user!.id); if (!shop) return errorResponse(res, 'Shop not found', 404)
  return successResponse(res, await prisma.productCollection.findMany({ where: { shopId: shop.id }, include: { products: { include: { product: true }, orderBy: { sortOrder: 'asc' } } }, orderBy: { sortOrder: 'asc' } }))
})
router.post('/collections', authMiddleware, requireRole(['SELLER']), validateBody(collectionSchema), async (req: AuthenticatedRequest, res) => {
  const shop = await sellerShop(req.user!.id); if (!shop) return errorResponse(res, 'Shop not found', 404)
  const owned = await prisma.product.count({ where: { id: { in: req.body.productIds }, shopId: shop.id } }); if (owned !== req.body.productIds.length) return errorResponse(res, 'Collections can only contain your shop products', 403)
  const collection = await prisma.productCollection.create({ data: { shopId: shop.id, name: req.body.name, slug: slugify(req.body.name), description: req.body.description || null, imageUrl: req.body.imageUrl || null, isVisible: req.body.isVisible, isFeatured: req.body.isFeatured, sortOrder: req.body.sortOrder, startsAt: req.body.startsAt || null, endsAt: req.body.endsAt || null, products: { create: req.body.productIds.map((productId: string, sortOrder: number) => ({ productId, sortOrder })) } }, include: { products: true } })
  return successResponse(res, collection, 201, 'Collection created')
})
router.patch('/collections/:id', authMiddleware, requireRole(['SELLER']), validateBody(collectionSchema.partial()), async (req: AuthenticatedRequest, res) => {
  const shop = await sellerShop(req.user!.id); if (!shop) return errorResponse(res, 'Shop not found', 404)
  const existing = await prisma.productCollection.findFirst({ where: { id: req.params.id, shopId: shop.id } }); if (!existing) return errorResponse(res, 'Collection not found', 404)
  if (req.body.productIds) { const owned = await prisma.product.count({ where: { id: { in: req.body.productIds }, shopId: shop.id } }); if (owned !== req.body.productIds.length) return errorResponse(res, 'Collections can only contain your shop products', 403); await prisma.collectionProduct.deleteMany({ where: { collectionId: existing.id } }) }
  const data: any = { ...req.body }; delete data.productIds; if (data.imageUrl === '') data.imageUrl = null
  const updated = await prisma.productCollection.update({ where: { id: existing.id }, data: { ...data, ...(req.body.productIds ? { products: { create: req.body.productIds.map((productId: string, sortOrder: number) => ({ productId, sortOrder })) } } : {}) }, include: { products: true } })
  return successResponse(res, updated, 200, 'Collection updated')
})
router.delete('/collections/:id', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  const shop = await sellerShop(req.user!.id); if (!shop) return errorResponse(res, 'Shop not found', 404)
  const deleted = await prisma.productCollection.deleteMany({ where: { id: req.params.id, shopId: shop.id } }); if (!deleted.count) return errorResponse(res, 'Collection not found', 404)
  return successResponse(res, null, 200, 'Collection deleted')
})

router.get('/promotions', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  const shop = await sellerShop(req.user!.id); if (!shop) return errorResponse(res, 'Shop not found', 404)
  return successResponse(res, await prisma.productPromotion.findMany({ where: { shopId: shop.id }, include: { products: { include: { product: true } } }, orderBy: { createdAt: 'desc' } }))
})
router.post('/promotions', authMiddleware, requireRole(['SELLER']), validateBody(promotionSchema), async (req: AuthenticatedRequest, res) => {
  const shop = await sellerShop(req.user!.id); if (!shop) return errorResponse(res, 'Shop not found', 404)
  if (req.body.endsAt <= req.body.startsAt) return errorResponse(res, 'End date must be after start date', 400)
  const products = await prisma.product.findMany({ where: { id: { in: req.body.productIds }, shopId: shop.id }, select: { id: true, price: true } }); if (products.length !== req.body.productIds.length) return errorResponse(res, 'Promotions can only contain your shop products', 403)
  const items = products.map(product => { const original = Number(product.price); const final = req.body.discountType === 'PERCENTAGE' ? original * (1 - req.body.discountValue / 100) : original - req.body.discountValue; if (req.body.discountType === 'PERCENTAGE' && req.body.discountValue >= 100) throw new Error('Discount percentage must be below 100'); if (final <= 0 || final >= original) throw new Error('Promotion must produce a positive price below the original price'); return { productId: product.id, originalPrice: original, finalPrice: Math.round(final * 100) / 100 } })
  const promotion = await prisma.productPromotion.create({ data: { shopId: shop.id, name: req.body.name, type: req.body.type, discountType: req.body.discountType, discountValue: req.body.discountValue, startsAt: req.body.startsAt, endsAt: req.body.endsAt, maxQuantity: req.body.maxQuantity || null, bannerUrl: req.body.bannerUrl || null, status: req.body.status, products: { create: items } }, include: { products: true } })
  if (req.body.status === 'ACTIVE' && req.body.startsAt <= new Date() && req.body.endsAt >= new Date()) {
    for (const item of promotion.products) await notifyPriceDrop(prisma, item.productId, Number(item.originalPrice), Number(item.finalPrice))
  }
  return successResponse(res, promotion, 201, 'Promotion created')
})
router.patch('/promotions/:id/status', authMiddleware, requireRole(['SELLER']), validateBody(z.object({ status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED']) })), async (req: AuthenticatedRequest, res) => {
  const shop = await sellerShop(req.user!.id); if (!shop) return errorResponse(res, 'Shop not found', 404)
  const promotion = await prisma.productPromotion.findFirst({ where: { id: req.params.id, shopId: shop.id }, include: { products: true } })
  if (!promotion) return errorResponse(res, 'Promotion not found', 404)
  const updated = await prisma.productPromotion.updateMany({ where: { id: req.params.id, shopId: shop.id }, data: { status: req.body.status } }); if (!updated.count) return errorResponse(res, 'Promotion not found', 404)
  const now = new Date()
  if (req.body.status === 'ACTIVE' && promotion.status !== 'ACTIVE' && promotion.startsAt <= now && promotion.endsAt >= now) {
    for (const item of promotion.products) await notifyPriceDrop(prisma, item.productId, Number(item.originalPrice), Number(item.finalPrice))
  }
  return successResponse(res, updated, 200, 'Promotion status updated')
})

router.post('/qr', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  const shop = await sellerShop(req.user!.id); if (!shop) return errorResponse(res, 'Shop not found', 404)
  const qr = await prisma.sellerQrCode.upsert({ where: { shopId: shop.id }, update: {}, create: { shopId: shop.id } })
  const url = shopPublicUrl(shop.slug)
  return successResponse(res, { ...qr, url, scanUrl: qrEndpointUrl(qr.publicToken) }, 201, 'Shop QR link generated')
})
router.get('/qr', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  const shop = await sellerShop(req.user!.id); if (!shop) return errorResponse(res, 'Shop not found', 404)
  const qr = await prisma.sellerQrCode.findUnique({ where: { shopId: shop.id } }); if (!qr) return successResponse(res, null)
  return successResponse(res, { ...qr, url: shopPublicUrl(shop.slug), scanUrl: qrEndpointUrl(qr.publicToken) })
})

router.get('/public/:slug', async (req, res) => {
  const shop = await prisma.shop.findFirst({ where: { slug: req.params.slug, status: 'ACTIVE' }, select: { id: true, name: true, shippingZones: { where: { isActive: true }, orderBy: { createdAt: 'asc' } }, collections: { where: { isVisible: true }, include: { products: { include: { product: { include: { images: true } } }, orderBy: { sortOrder: 'asc' } } }, orderBy: { sortOrder: 'asc' } }, promotions: { where: activePromotionWhere(), include: { products: { include: { product: true } } } } } })
  if (!shop) return errorResponse(res, 'Shop not found', 404)
  return successResponse(res, shop)
})

router.get('/qr/:token', async (req, res) => {
  const qr = await prisma.sellerQrCode.findUnique({ where: { publicToken: req.params.token }, include: { shop: { select: { slug: true } } } })
  if (!qr) return errorResponse(res, 'QR code not found', 404)
  await prisma.$transaction([prisma.sellerQrCode.update({ where: { id: qr.id }, data: { scanCount: { increment: 1 } } }), prisma.sellerQrScan.create({ data: { qrCodeId: qr.id, referrer: req.get('referer') || null } })])
  return res.redirect(shopPublicUrl(qr.shop.slug))
})

export function zoneMatchesAddress(zone: { name: string; region: string | null; city: string | null; area: string | null; locations: string | null }, address: string): boolean {
  const haystack = address.toLowerCase()
  const values = [zone.name, zone.region, zone.city, zone.area, ...(zone.locations ? JSON.parse(zone.locations) : [])].filter(Boolean).map(value => String(value).toLowerCase().trim()).filter(Boolean)
  return values.some(value => haystack.includes(value))
}

export async function findShippingZone(shopId: string, address: string) {
  const zones = await prisma.shippingZone.findMany({ where: { shopId, isActive: true } })
  return zones.find(zone => zoneMatchesAddress(zone, address)) || null
}

export async function getActiveProductPromotion(productId: string) {
  const promotion = await prisma.productPromotion.findFirst({ where: { ...activePromotionWhere(), products: { some: { productId } } }, include: { products: { where: { productId }, take: 1 } }, orderBy: { endsAt: 'asc' } })
  return promotion?.products[0] || null
}

export default router
