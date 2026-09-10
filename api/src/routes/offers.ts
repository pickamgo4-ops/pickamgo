import { Router } from 'express'
import { z } from 'zod'
import prisma from '../utils/prisma'
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth'
import { enforceAuthenticatedRateLimit } from '../middleware/rate-limit'
import { errorResponse, successResponse, validateBody } from '../types/express'

const router = Router()
const offerSchema = z.object({ offerAmount: z.number().positive(), buyerMessage: z.string().trim().max(500).optional() })
const counterSchema = z.object({ amount: z.number().positive(), sellerMessage: z.string().trim().max(500).optional() })
const offerLifetimeMs = 48 * 60 * 60 * 1000

async function expireOffer(id: string) {
  return prisma.productOffer.updateMany({ where: { id, status: { in: ['PENDING', 'COUNTERED'] }, expiresAt: { lte: new Date() } }, data: { status: 'EXPIRED', respondedAt: new Date() } })
}

async function expireForUser(userId: string, role: 'buyerId' | 'sellerId') {
  await prisma.productOffer.updateMany({ where: { [role]: userId, status: { in: ['PENDING', 'COUNTERED'] }, expiresAt: { lte: new Date() } }, data: { status: 'EXPIRED', respondedAt: new Date() } })
}

router.post('/products/:productId', authMiddleware, requireRole(['USER']), validateBody(offerSchema), async (req: AuthenticatedRequest, res) => {
  if (!(await enforceAuthenticatedRateLimit(req, res, 'write'))) return
  try {
    const product = await prisma.product.findFirst({ where: { id: req.params.productId, status: 'ACTIVE' }, select: { id: true, name: true, price: true, stock: true, sellerId: true, allowOffers: true, minimumOfferAmount: true, shop: { select: { ownerId: true, status: true } } } })
    if (!product || product.shop.status !== 'ACTIVE' || product.stock < 1) return errorResponse(res, 'This product is not available for offers', 409)
    if (!product.allowOffers) return errorResponse(res, 'Offers are not enabled for this product', 403)
    if (product.sellerId === req.user!.id || product.shop.ownerId === req.user!.id) return errorResponse(res, 'You cannot make an offer on your own product', 403)
    if (product.minimumOfferAmount && req.body.offerAmount < Number(product.minimumOfferAmount)) return errorResponse(res, `Offers must be at least GH₵${Number(product.minimumOfferAmount).toFixed(2)}`, 400)
    const active = await prisma.productOffer.findFirst({ where: { productId: product.id, buyerId: req.user!.id, status: { in: ['PENDING', 'COUNTERED'] }, expiresAt: { gt: new Date() } } })
    if (active) return errorResponse(res, 'You already have an active offer for this product', 409)
    const now = new Date()
    const offer = await prisma.productOffer.create({ data: { threadId: 'pending', productId: product.id, buyerId: req.user!.id, sellerId: product.sellerId, referencePrice: product.price, offerAmount: req.body.offerAmount, buyerMessage: req.body.buyerMessage || null, expiresAt: new Date(now.getTime() + offerLifetimeMs) } })
    await prisma.productOffer.update({ where: { id: offer.id }, data: { threadId: offer.id } })
    await prisma.notification.create({ data: { userId: product.sellerId, type: 'OFFER_RECEIVED', title: 'New offer received', message: `A buyer made an offer on ${product.name}.`, data: JSON.stringify({ offerId: offer.id, productId: product.id }) } })
    return successResponse(res, { ...offer, threadId: offer.id }, 201, 'Offer submitted')
  } catch (error) { console.error('Failed to submit offer:', error); return errorResponse(res, 'Failed to submit offer', 500) }
})

router.get('/buyer', authMiddleware, requireRole(['USER']), async (req: AuthenticatedRequest, res) => {
  try {
    await expireForUser(req.user!.id, 'buyerId')
    const offers = await prisma.productOffer.findMany({ where: { buyerId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 100, include: { product: { select: { id: true, name: true, price: true, stock: true, images: { take: 1 } } } } })
    return successResponse(res, offers)
  } catch { return errorResponse(res, 'Failed to load offers', 500) }
})

router.get('/seller', authMiddleware, requireRole(['SELLER']), async (req: AuthenticatedRequest, res) => {
  try {
    await expireForUser(req.user!.id, 'sellerId')
    const offers = await prisma.productOffer.findMany({ where: { sellerId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 100, include: { product: { select: { id: true, name: true, price: true, allowCounteroffers: true, images: { take: 1 } } }, buyer: { select: { id: true, name: true, avatar: true } } } })
    return successResponse(res, offers)
  } catch { return errorResponse(res, 'Failed to load seller offers', 500) }
})

router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    await expireOffer(req.params.id)
    const offer = await prisma.productOffer.findFirst({ where: { id: req.params.id, OR: [{ buyerId: req.user!.id }, { sellerId: req.user!.id }] }, include: { product: { select: { id: true, name: true, price: true, stock: true } }, buyer: { select: { id: true, name: true } }, seller: { select: { id: true, name: true } } } })
    if (!offer) return errorResponse(res, 'Offer not found', 404)
    const history = await prisma.productOffer.findMany({ where: { threadId: offer.threadId }, orderBy: { createdAt: 'asc' }, select: { id: true, offerAmount: true, proposalBy: true, buyerMessage: true, sellerMessage: true, status: true, createdAt: true, expiresAt: true } })
    return successResponse(res, { offer, history })
  } catch { return errorResponse(res, 'Failed to load offer', 500) }
})

router.patch('/:id/respond', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    await expireOffer(req.params.id)
    const offer = await prisma.productOffer.findFirst({ where: { id: req.params.id, sellerId: req.user!.id }, include: { product: { select: { name: true, price: true, stock: true, allowCounteroffers: true } } } })
    if (!offer) return errorResponse(res, 'Offer not found', 404)
    if (offer.status !== 'PENDING' || offer.expiresAt <= new Date()) return errorResponse(res, 'This offer is no longer active', 409)
    const action = z.enum(['ACCEPTED', 'REJECTED', 'COUNTERED']).safeParse(req.body?.action)
    if (!action.success) return errorResponse(res, 'Invalid offer response', 400)
    if (action.data === 'COUNTERED') {
      const parsed = counterSchema.safeParse(req.body)
      if (!parsed.success || !offer.product.allowCounteroffers) return errorResponse(res, 'Counteroffers are not available for this product', 400)
      if (parsed.data.amount <= 0 || parsed.data.amount >= Number(offer.product.price) * 2) return errorResponse(res, 'Enter a valid counteroffer amount', 400)
      await prisma.$transaction([
        prisma.productOffer.update({ where: { id: offer.id }, data: { status: 'COUNTERED', counterOfferAmount: parsed.data.amount, sellerMessage: parsed.data.sellerMessage || null, respondedAt: new Date() } }),
        prisma.productOffer.create({ data: { threadId: offer.threadId, parentOfferId: offer.id, productId: offer.productId, buyerId: offer.buyerId, sellerId: offer.sellerId, referencePrice: offer.referencePrice, offerAmount: parsed.data.amount, proposalBy: 'SELLER', sellerMessage: parsed.data.sellerMessage || null, expiresAt: new Date(Date.now() + offerLifetimeMs), status: 'PENDING' } }),
      ])
      await prisma.notification.create({ data: { userId: offer.buyerId, type: 'OFFER_COUNTERED', title: 'Seller sent a counteroffer', message: `The seller countered your offer for ${offer.product.name}.`, data: JSON.stringify({ offerId: offer.id, threadId: offer.threadId }) } })
      return successResponse(res, null, 200, 'Counteroffer sent')
    }
    const updated = await prisma.productOffer.update({ where: { id: offer.id }, data: { status: action.data, respondedAt: new Date() } })
    await prisma.notification.create({ data: { userId: offer.buyerId, type: `OFFER_${action.data}`, title: `Offer ${action.data.toLowerCase()}`, message: `Your offer for ${offer.product.name} was ${action.data.toLowerCase()}.`, data: JSON.stringify({ offerId: offer.id }) } })
    return successResponse(res, updated, 200, `Offer ${action.data.toLowerCase()}`)
  } catch (error) { console.error('Failed to respond to offer:', error); return errorResponse(res, 'Failed to respond to offer', 500) }
})

router.post('/:id/buyer-response', authMiddleware, requireRole(['USER']), async (req: AuthenticatedRequest, res) => {
  try {
    const current = await prisma.productOffer.findFirst({ where: { id: req.params.id, buyerId: req.user!.id }, include: { product: { select: { name: true, price: true, stock: true } } } })
    if (!current || current.status !== 'PENDING' || current.proposalBy !== 'SELLER' || current.expiresAt <= new Date()) return errorResponse(res, 'This counteroffer is no longer active', 409)
    const action = z.enum(['ACCEPTED', 'REJECTED', 'COUNTERED']).safeParse(req.body?.action)
    if (!action.success) return errorResponse(res, 'Invalid offer response', 400)
    if (action.data === 'ACCEPTED' || action.data === 'REJECTED') {
      await prisma.productOffer.update({ where: { id: current.id }, data: { status: action.data, respondedAt: new Date() } })
      await prisma.notification.create({ data: { userId: current.sellerId, type: `OFFER_${action.data}`, title: `Buyer ${action.data.toLowerCase()} your offer`, message: `The buyer ${action.data.toLowerCase()} your offer for ${current.product.name}.`, data: JSON.stringify({ offerId: current.id }) } })
      return successResponse(res, null, 200, `Offer ${action.data.toLowerCase()}`)
    }
    const amount = Number(req.body?.amount)
    if (!Number.isFinite(amount) || amount <= 0 || amount >= Number(current.product.price) * 2) return errorResponse(res, 'Enter a valid offer amount', 400)
    await prisma.$transaction([
      prisma.productOffer.update({ where: { id: current.id }, data: { status: 'COUNTERED', respondedAt: new Date() } }),
      prisma.productOffer.create({ data: { threadId: current.threadId, parentOfferId: current.id, productId: current.productId, buyerId: current.buyerId, sellerId: current.sellerId, referencePrice: current.referencePrice, offerAmount: amount, proposalBy: 'BUYER', buyerMessage: z.string().trim().max(500).optional().parse(req.body?.buyerMessage), expiresAt: new Date(Date.now() + offerLifetimeMs) } }),
    ])
    await prisma.notification.create({ data: { userId: current.sellerId, type: 'OFFER_RECEIVED', title: 'Buyer responded to your offer', message: `A buyer sent a new offer for ${current.product.name}.`, data: JSON.stringify({ threadId: current.threadId }) } })
    return successResponse(res, null, 200, 'New offer submitted')
  } catch { return errorResponse(res, 'Failed to respond to offer', 500) }
})

router.post('/:id/add-to-cart', authMiddleware, requireRole(['USER']), async (req: AuthenticatedRequest, res) => {
  try {
    const offer = await prisma.productOffer.findFirst({ where: { id: req.params.id, buyerId: req.user!.id, status: 'ACCEPTED', expiresAt: { gt: new Date() }, product: { status: 'ACTIVE', stock: { gt: 0 } } } })
    if (!offer) return errorResponse(res, 'This accepted offer has expired or is unavailable', 409)
    return successResponse(res, { offerId: offer.id, productId: offer.productId }, 200, 'Accepted offer ready for checkout')
  } catch { return errorResponse(res, 'Failed to prepare checkout', 500) }
})

export default router
