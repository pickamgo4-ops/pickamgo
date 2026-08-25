import { Response, NextFunction } from 'express'
import { errorResponse } from '../types/express'

export function errorHandler(err: any, req: Express.Request, res: Response, next: NextFunction) {
  console.error('Error:', err)

  if (err.code === 'P2002') {
    return errorResponse(res, 'A record with this value already exists', 409)
  }

  if (err.code === 'P2025') {
    return errorResponse(res, 'Record not found', 404)
  }

  if (err.name === 'ZodError') {
    return errorResponse(res, err.errors.map((e: any) => e.message).join(', '), 400)
  }

  return errorResponse(res, 'Something went wrong. Please try again.', 500)
}
