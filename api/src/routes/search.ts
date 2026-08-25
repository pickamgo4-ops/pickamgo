import { Router } from 'express'
import prisma from '../utils/prisma'
import { successResponse, errorResponse } from '../types/express'
import { z } from 'zod'

const router = Router()

const searchQuerySchema = z.object({
  q: z.string().min(1),
  type: z.enum(['all', 'products', 'services', 'shops']).default('all'),
  category: z.string().optional(),
  location: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
})

router.get('/', async (req, res) => {
  const query = searchQuerySchema.parse(req.query)
  const { q, type, category, location, minPrice, maxPrice, page, limit } = query

  const searchTerm = q.toLowerCase()
  const results: any = { products: [], services: [], shops: [] }

  if (type === 'all' || type === 'products') {
    const productWhere: any = {
      status: 'ACTIVE',
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ],
    }
    if (category) productWhere.category = { name: { contains: category, mode: 'insensitive' } }
    if (location) productWhere.location = { contains: location, mode: 'insensitive' }
    if (minPrice !== undefined) productWhere.price = { ...productWhere.price, gte: minPrice }
    if (maxPrice !== undefined) productWhere.price = { ...productWhere.price, lte: maxPrice }

    const [products, productTotal] = await Promise.all([
      prisma.product.findMany({
        where: productWhere,
        include: {
          seller: { select: { id: true, name: true, avatar: true } },
          category: true,
          images: { take: 1 },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where: productWhere }),
    ])

    results.products = { items: products, total: productTotal, page, limit, totalPages: Math.ceil(productTotal / limit) }
  }

  if (type === 'all' || type === 'services') {
    const serviceWhere: any = {
      status: 'ACTIVE',
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ],
    }
    if (category) serviceWhere.category = { name: { contains: category, mode: 'insensitive' } }
    if (location) serviceWhere.location = { contains: location, mode: 'insensitive' }
    if (minPrice !== undefined) serviceWhere.price = { ...serviceWhere.price, gte: minPrice }
    if (maxPrice !== undefined) serviceWhere.price = { ...serviceWhere.price, lte: maxPrice }

    const [services, serviceTotal] = await Promise.all([
      prisma.service.findMany({
        where: serviceWhere,
        include: {
          provider: { select: { id: true, name: true, avatar: true } },
          category: true,
          images: { take: 1 },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.service.count({ where: serviceWhere }),
    ])

    results.services = { items: services, total: serviceTotal, page, limit, totalPages: Math.ceil(serviceTotal / limit) }
  }

  if (type === 'all' || type === 'shops') {
    const shopWhere: any = {
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ],
    }
    if (location) shopWhere.location = { contains: location, mode: 'insensitive' }

    const [shops, shopTotal] = await Promise.all([
      prisma.shop.findMany({
        where: shopWhere,
        include: {
          owner: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { rating: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.shop.count({ where: shopWhere }),
    ])

    results.shops = { items: shops, total: shopTotal, page, limit, totalPages: Math.ceil(shopTotal / limit) }
  }

  return successResponse(res, results)
})

export default router
