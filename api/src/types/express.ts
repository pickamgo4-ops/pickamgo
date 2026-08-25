import { Response } from 'express'
import { z } from 'zod'
import type { NextFunction } from 'express'

export interface AuthenticatedRequest extends Express.Request {
  user?: {
    id: string
    email: string
    name: string
    isSeller: boolean
    isRider: boolean
    isAdmin: boolean
  }
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function successResponse<T>(res: Response, data: T, statusCode = 200, message?: string) {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(message && { message }),
  } as ApiResponse<T>)
}

export function errorResponse(res: Response, message: string, statusCode = 400) {
  return res.status(statusCode).json({
    success: false,
    error: message,
  } as ApiResponse)
}

export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body)
      next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        return errorResponse(res, error.errors.map(e => e.message).join(', '), 400)
      }
      return errorResponse(res, 'Invalid request body', 400)
    }
  }
}

export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as any
      next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        return errorResponse(res, error.errors.map(e => e.message).join(', '), 400)
      }
      return errorResponse(res, 'Invalid query parameters', 400)
    }
  }
}

declare global {
  namespace Express {
    export interface Request {
      body: any
      query: any
      params: any
      user?: {
        id: string
        email: string
        name: string
        isSeller: boolean
        isRider: boolean
        isAdmin: boolean
      }
    }
  }
}
