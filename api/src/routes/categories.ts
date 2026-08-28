import { Router } from 'express'
import prisma from '../utils/prisma'
import { AuthenticatedRequest, successResponse, errorResponse } from '../types/express'

const router = Router()

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    })

    const topLevel = categories.filter(c => !c.parentId)
    const tree = topLevel.map(parent => ({
      ...parent,
      children: categories.filter(c => c.parentId === parent.id).sort((a, b) => a.displayOrder - b.displayOrder),
    }))

    return successResponse(res, tree)
  } catch (error) {
    return errorResponse(res, 'Failed to fetch categories', 500)
  }
})

export default router
