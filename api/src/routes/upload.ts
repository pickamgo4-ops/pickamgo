import { Router, Response } from 'express'
import multer from 'multer'
import path from 'path'
import { readFile } from 'fs/promises'
import { authMiddleware } from '../middleware/auth'
import { AuthenticatedRequest, successResponse, errorResponse } from '../types/express'
import { deleteFile, ensureUploadsDir, getPublicUrl, getStorageProvider, hasValidImageSignature } from '../services/storage'

const router = Router()

const allowedExtensions = new Set(['.jpeg', '.jpg', '.png', '.webp', '.gif'])
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const maxFileSize = 5 * 1024 * 1024

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const extension = path.extname(file.originalname).toLowerCase()
  const extname = allowedExtensions.has(extension)
  const mimetype = allowedMimeTypes.has(file.mimetype)

  if (!extname || !mimetype) {
    return cb(new Error('Only JPEG, PNG, WEBP, and GIF images are allowed'))
  }

  const safeName = file.originalname.replace(/[\\/]+/g, '').replace(/[^a-zA-Z0-9._-]/g, '-')
  if (!safeName || safeName === '-' || safeName.includes('..') || file.originalname.includes('..')) {
    return cb(new Error('Invalid file name'))
  }

  return cb(null, true)
}

const buildUpload = () => multer({
  storage: getStorageProvider(),
  limits: { fileSize: maxFileSize },
  fileFilter,
})

router.post('/image', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensureUploadsDir()
    const upload = buildUpload()
    upload.single('image')(req as any, res as any, async (uploadError: any) => {
      if (uploadError) {
        console.error('Upload middleware error:', uploadError)
        return errorResponse(res, uploadError.message || 'Image upload failed', 400)
      }

      if (!req.file) {
        return errorResponse(res, 'No image file provided', 400)
      }

      const uploadedFile = req.file as any
      const buffer = uploadedFile.buffer || (uploadedFile.path ? await readFile(uploadedFile.path) : null)
      if (!buffer || !hasValidImageSignature(buffer, uploadedFile.mimetype)) {
        await deleteFile(uploadedFile.filename).catch(() => {})
        return errorResponse(res, 'Uploaded file does not match a valid image signature', 400)
      }

      const url = uploadedFile.r2Url || await getPublicUrl(uploadedFile.filename)
      return successResponse(res, { url, filename: uploadedFile.filename }, 201, 'Image uploaded successfully')
    })
  } catch (err: any) {
    console.error('Upload error:', err)
    return errorResponse(res, err.message || 'Image upload failed', 500)
  }
})

router.use((err: any, req: any, res: Response, next: any) => {
  if (err) {
    console.error('Upload error:', err)
    return errorResponse(res, err.message || 'Image upload failed', 500)
  }
  next()
})

export default router
