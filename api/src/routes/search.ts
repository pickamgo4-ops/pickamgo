import { Router } from 'express'
import prisma from '../utils/prisma'
import { successResponse, errorResponse } from '../types/express'
import { z } from 'zod'
import { distanceInKm } from '../utils/geo'

const router = Router()

const searchQuerySchema = z.object({
  q: z.string().default(''),
  type: z.enum(['all', 'products', 'services', 'shops']).default('all'),
  category: z.string().optional(),
  location: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().positive().max(100).default(25),
})

router.get('/', async (req, res) => {
  const query = searchQuerySchema.parse(req.query)
  const { q, type, category, location, minPrice, maxPrice, page, limit, latitude, longitude, radius } = query

  const searchTerm = q.toLowerCase()
  const results: any = { products: [], services: [], shops: [] }

  if (type === 'all' || type === 'products') {
    const productWhere: any = {
      status: 'ACTIVE',
      stock: { gt: 0 },
      shop: { status: 'ACTIVE' },
    }
    if (searchTerm) productWhere.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { description: { contains: searchTerm, mode: 'insensitive' } },
      { shop: { name: { contains: searchTerm, mode: 'insensitive' } } },
      { category: { name: { contains: searchTerm, mode: 'insensitive' } } },
    ]
    if (category) productWhere.category = { name: { contains: category, mode: 'insensitive' } }
    if (location) productWhere.location = { contains: location, mode: 'insensitive' }
    if (minPrice !== undefined) productWhere.price = { ...productWhere.price, gte: minPrice }
    if (maxPrice !== undefined) productWhere.price = { ...productWhere.price, lte: maxPrice }

    const [products, productTotal] = await Promise.all([
      prisma.product.findMany({
        where: productWhere,
        include: {
          seller: { select: { id: true, name: true, avatar: true } },
          shop: { select: { id: true, name: true, slug: true, location: true, latitude: true, longitude: true } },
          category: true,
          images: { take: 1 },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where: productWhere }),
    ])

    const nearbyProducts = latitude !== undefined && longitude !== undefined
      ? products
        .map(product => ({
          ...product,
          distanceKm: product.shop.latitude != null && product.shop.longitude != null
            ? distanceInKm({ latitude, longitude }, { latitude: product.shop.latitude, longitude: product.shop.longitude })
            : null,
        }))
        .filter(product => product.distanceKm === null || product.distanceKm <= radius)
        .sort((a, b) => (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY))
      : products
    results.products = { items: nearbyProducts, total: productTotal, page, limit, totalPages: Math.ceil(productTotal / limit) }
  }

  if (type === 'all' || type === 'services') {
    const serviceWhere: any = {
      status: 'ACTIVE',
      shop: { status: 'ACTIVE' },
    }
    if (searchTerm) serviceWhere.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { description: { contains: searchTerm, mode: 'insensitive' } },
      { shop: { name: { contains: searchTerm, mode: 'insensitive' } } },
      { category: { name: { contains: searchTerm, mode: 'insensitive' } } },
    ]
    if (category) serviceWhere.category = { name: { contains: category, mode: 'insensitive' } }
    if (location) serviceWhere.location = { contains: location, mode: 'insensitive' }
    if (minPrice !== undefined) serviceWhere.price = { ...serviceWhere.price, gte: minPrice }
    if (maxPrice !== undefined) serviceWhere.price = { ...serviceWhere.price, lte: maxPrice }

    const [services, serviceTotal] = await Promise.all([
      prisma.service.findMany({
        where: serviceWhere,
        include: {
          provider: { select: { id: true, name: true, avatar: true } },
          shop: { select: { id: true, name: true, location: true, latitude: true, longitude: true } },
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
      status: 'ACTIVE',
    }
    if (searchTerm) shopWhere.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { description: { contains: searchTerm, mode: 'insensitive' } },
    ]
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
