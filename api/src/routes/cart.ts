import { Router } from 'express'
import prisma from '../utils/prisma'
import { optionalAuthMiddleware, authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { successResponse, errorResponse, validateBody } from '../types/express'
import { z } from 'zod'

const router = Router()

const createCartItemSchema = z.object({
  productId: z.string().optional(),
  serviceId: z.string().optional(),
  variantId: z.string().optional(),
  quantity: z.number().min(1).default(1),
})

const updateCartItemSchema = z.object({
  quantity: z.number().min(1),
})

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

function getSessionId(req: any): string {
  const headerSessionId = req.headers?.['x-session-id'] as string | undefined
  if (headerSessionId && headerSessionId.trim()) {
    return headerSessionId.trim()
  }
  return generateSessionId()
}

async function getCartForRequest(req: AuthenticatedRequest, res: any, createIfMissing = true) {
  const userId = req.user?.id
  const sessionId = req.user ? null : getSessionId(req)

  let cart = null

  if (userId) {
    cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { orderBy: { sortOrder: 'asc' }, take: 1 },
                shop: { select: { id: true, name: true, logo: true } },
              },
            },
            service: {
              include: {
                images: { orderBy: { sortOrder: 'asc' }, take: 1 },
                shop: { select: { id: true, name: true, logo: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!cart && createIfMissing) {
      cart = await prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: { orderBy: { sortOrder: 'asc' }, take: 1 },
                  shop: { select: { id: true, name: true, logo: true } },
                },
              },
              service: {
                include: {
                  images: { orderBy: { sortOrder: 'asc' }, take: 1 },
                  shop: { select: { id: true, name: true, logo: true } },
                },
              },
            },
          },
        },
      })
    }
  } else if (sessionId) {
    cart = await prisma.cart.findUnique({
      where: { sessionId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { orderBy: { sortOrder: 'asc' }, take: 1 },
                shop: { select: { id: true, name: true, logo: true } },
              },
            },
            service: {
              include: {
                images: { orderBy: { sortOrder: 'asc' }, take: 1 },
                shop: { select: { id: true, name: true, logo: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!cart && createIfMissing) {
      cart = await prisma.cart.create({
        data: { sessionId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: { orderBy: { sortOrder: 'asc' }, take: 1 },
                  shop: { select: { id: true, name: true, logo: true } },
                },
              },
              service: {
                include: {
                  images: { orderBy: { sortOrder: 'asc' }, take: 1 },
                  shop: { select: { id: true, name: true, logo: true } },
                },
              },
            },
          },
        },
      })
    }
  }

  return cart
}

router.get('/', optionalAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const cart = await getCartForRequest(req, res)
    if (!cart) {
      return successResponse(res, { id: '', userId: null, sessionId: null, items: [] })
    }
    return successResponse(res, cart)
  } catch (error) {
    return errorResponse(res, 'Failed to fetch cart', 500)
  }
})

router.post('/items', optionalAuthMiddleware, validateBody(createCartItemSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const { productId, serviceId, variantId, quantity } = req.body
    const userId = req.user?.id
    const sessionId = req.user ? undefined : getSessionId(req)

    if ((!productId && !serviceId) || (productId && serviceId)) {
      return errorResponse(res, 'Must specify exactly one of productId or serviceId', 400)
    }

    let itemPrice = 0
    let itemName = ''
    let itemImage = ''
    let shopId = ''

    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
          shop: { select: { id: true, name: true } },
        },
      })
      if (!product || product.status !== 'ACTIVE') {
        return errorResponse(res, 'Product not found or unavailable', 404)
      }

      if (variantId) {
        const variant = await prisma.productVariant.findUnique({ where: { id: variantId } })
        if (!variant || !variant.isActive) {
          return errorResponse(res, 'Variant not found or unavailable', 404)
        }
        itemPrice = Number(variant.price || product.price)
      } else {
        itemPrice = Number(product.price)
      }

      itemName = product.name
      itemImage = product.images[0]?.url || ''
      shopId = product.shopId
    }

    if (serviceId) {
      const service = await prisma.service.findUnique({
        where: { id: serviceId },
        include: {
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
          shop: { select: { id: true, name: true } },
        },
      })
      if (!service || service.status !== 'ACTIVE') {
        return errorResponse(res, 'Service not found or unavailable', 404)
      }

      itemPrice = Number(service.price)
      itemName = service.name
      itemImage = service.images[0]?.url || ''
      shopId = service.shopId
    }

    let cart = userId
      ? await prisma.cart.findUnique({ where: { userId } })
      : await prisma.cart.findUnique({ where: { sessionId } })

    if (!cart) {
      cart = await prisma.cart.create({
        data: userId ? { userId } : { sessionId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: { orderBy: { sortOrder: 'asc' }, take: 1 },
                  shop: { select: { id: true, name: true, logo: true } },
                },
              },
              service: {
                include: {
                  images: { orderBy: { sortOrder: 'asc' }, take: 1 },
                  shop: { select: { id: true, name: true, logo: true } },
                },
              },
            },
          },
        },
      })
    }

    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: productId || null,
        serviceId: serviceId || null,
        variantId: variantId || null,
      },
    })

    if (existingItem) {
      const updated = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
        include: {
          product: {
            include: {
              images: { orderBy: { sortOrder: 'asc' }, take: 1 },
              shop: { select: { id: true, name: true, logo: true } },
            },
          },
          service: {
            include: {
              images: { orderBy: { sortOrder: 'asc' }, take: 1 },
              shop: { select: { id: true, name: true, logo: true } },
            },
          },
        },
      })
      return successResponse(res, updated, 200, 'Cart item updated')
    }

    const newItem = await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: productId || null,
        serviceId: serviceId || null,
        variantId: variantId || null,
        quantity,
        price: itemPrice,
        name: itemName,
        image: itemImage,
        shopId,
      },
      include: {
        product: {
          include: {
            images: { orderBy: { sortOrder: 'asc' }, take: 1 },
            shop: { select: { id: true, name: true, logo: true } },
          },
        },
        service: {
          include: {
            images: { orderBy: { sortOrder: 'asc' }, take: 1 },
            shop: { select: { id: true, name: true, logo: true } },
          },
        },
      },
    })

    return successResponse(res, newItem, 201, 'Added to cart')
  } catch (error) {
    return errorResponse(res, 'Failed to add item to cart', 500)
  }
})

router.patch('/items/:id', optionalAuthMiddleware, validateBody(updateCartItemSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params
    const { quantity } = req.body
    const cart = await getCartForRequest(req, res, false)
    if (!cart) {
      return errorResponse(res, 'Cart not found', 404)
    }

    const item = await prisma.cartItem.findFirst({ where: { id, cartId: cart.id } })
    if (!item) return errorResponse(res, 'Cart item not found', 404)

    const updated = await prisma.cartItem.update({
      where: { id },
      data: { quantity },
      include: {
        product: {
          include: {
            images: { orderBy: { sortOrder: 'asc' }, take: 1 },
            shop: { select: { id: true, name: true, logo: true } },
          },
        },
        service: {
          include: {
            images: { orderBy: { sortOrder: 'asc' }, take: 1 },
            shop: { select: { id: true, name: true, logo: true } },
          },
        },
      },
    })

    return successResponse(res, updated, undefined, 'Cart item updated')
  } catch (error) {
    return errorResponse(res, 'Failed to update cart item', 500)
  }
})

router.delete('/items/:id', optionalAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params
    const cart = await getCartForRequest(req, res, false)
    if (!cart) {
      return errorResponse(res, 'Cart not found', 404)
    }

    const item = await prisma.cartItem.findFirst({ where: { id, cartId: cart.id } })
    if (!item) return errorResponse(res, 'Cart item not found', 404)

    await prisma.cartItem.delete({ where: { id } })

    return successResponse(res, null, 200, 'Removed from cart')
  } catch (error) {
    return errorResponse(res, 'Failed to remove cart item', 500)
  }
})

router.delete('/', optionalAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const cart = await getCartForRequest(req, res, false)
    if (!cart) {
      return successResponse(res, null, 200, 'Cart cleared')
    }

    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } })

    return successResponse(res, null, 200, 'Cart cleared')
  } catch (error) {
    return errorResponse(res, 'Failed to clear cart', 500)
  }
})

router.post('/merge', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id
    const { sessionId, items } = req.body

    if (!sessionId || !items || !Array.isArray(items)) {
      return errorResponse(res, 'Session ID and items required', 400)
    }

    const guestCart = await prisma.cart.findUnique({
      where: { sessionId },
      include: { items: true },
    })

    if (!guestCart || guestCart.items.length === 0) {
      return successResponse(res, null, 200, 'No guest cart to merge')
    }

    let userCart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    })

    if (!userCart) {
      userCart = await prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: { orderBy: { sortOrder: 'asc' }, take: 1 },
                  shop: { select: { id: true, name: true, logo: true } },
                },
              },
              service: {
                include: {
                  images: { orderBy: { sortOrder: 'asc' }, take: 1 },
                  shop: { select: { id: true, name: true, logo: true } },
                },
              },
            },
          },
        },
      })
    }

    for (const guestItem of guestCart.items) {
      const existing = await prisma.cartItem.findFirst({
        where: {
          cartId: userCart.id,
          productId: guestItem.productId,
          serviceId: guestItem.serviceId,
          variantId: guestItem.variantId,
        },
      })

      if (existing) {
        await prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + guestItem.quantity },
        })
      } else {
        await prisma.cartItem.create({
          data: {
            cartId: userCart.id,
            productId: guestItem.productId,
            serviceId: guestItem.serviceId,
            variantId: guestItem.variantId,
            quantity: guestItem.quantity,
            price: guestItem.price,
            name: guestItem.name,
            image: guestItem.image,
            shopId: guestItem.shopId,
          },
        })
      }
    }

    await prisma.cartItem.deleteMany({ where: { cartId: guestCart.id } })
    await prisma.cart.delete({ where: { id: guestCart.id } })

    const mergedCart = await prisma.cart.findUnique({
      where: { userId: userCart.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { orderBy: { sortOrder: 'asc' }, take: 1 },
                shop: { select: { id: true, name: true, logo: true } },
              },
            },
            service: {
              include: {
                images: { orderBy: { sortOrder: 'asc' }, take: 1 },
                shop: { select: { id: true, name: true, logo: true } },
              },
            },
          },
        },
      },
    })

    return successResponse(res, mergedCart, 200, 'Cart merged successfully')
  } catch (error) {
    return errorResponse(res, 'Failed to merge cart', 500)
  }
})

export default router
