import { Router } from 'express'
import prisma from '../utils/prisma'
import { AuthenticatedRequest, successResponse, errorResponse } from '../types/express'

const router = Router()

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    let categories: any[] = []
    try {
      categories = await prisma.category.findMany({
        where: { isActive: true },
        include: {
          children: {
            where: { isActive: true },
            orderBy: { displayOrder: 'asc' },
          },
        },
        orderBy: { displayOrder: 'asc' },
      })
    } catch {
      categories = await prisma.category.findMany({
        orderBy: { name: 'asc' },
      })
    }

    const topLevel = categories.filter((c: any) => !c.parentId)
    const tree = topLevel.map((parent: any) => ({
      ...parent,
      children: categories
        .filter((c: any) => c.parentId === parent.id)
        .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0)),
    }))

    return successResponse(res, tree)
  } catch (error) {
    return errorResponse(res, 'Failed to fetch categories', 500)
  }
})

export default router
