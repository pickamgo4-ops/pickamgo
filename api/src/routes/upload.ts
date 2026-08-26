import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { authMiddleware } from '../middleware/auth'
import { AuthenticatedRequest, successResponse, errorResponse } from '../types/express'
import { getStorageProvider } from '../services/storage'

const router = Router()

const allowedTypes = /jpeg|jpg|png|webp|gif/
const maxFileSize = 5 * 1024 * 1024

const storage = getStorageProvider()

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
  const mimetype = allowedTypes.test(file.mimetype)

  if (extname && mimetype) {
    return cb(null, true)
  } else {
    cb(new Error('Only image files are allowed'))
  }
}

const upload = multer({
  storage,
  limits: { fileSize: maxFileSize },
  fileFilter,
})

router.post('/image', authMiddleware, upload.single('image'), (req: AuthenticatedRequest, res) => {
  if (!req.file) {
    return errorResponse(res, 'No image file provided', 400)
  }

  const url = (req.file as any).r2Url || `/uploads/${req.file.filename}`

  return successResponse(res, { url, filename: req.file.filename }, 201, 'Image uploaded successfully')
}, (err: any, req: any, res: Response, next: any) => {
  if (err) {
    console.error('Upload error:', err)
    return errorResponse(res, err.message || 'Image upload failed', 500)
  }
  next()
})

export default router
