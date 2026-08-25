import { Router } from 'express'
import prisma from '../utils/prisma'
import { AuthenticatedRequest, successResponse, errorResponse } from '../types/express'

const router = Router()

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })

    return successResponse(res, categories)
  } catch (error) {
    return errorResponse(res, 'Failed to fetch categories', 500)
  }
})

export default router
