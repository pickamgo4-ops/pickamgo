import multer from 'multer'
import path from 'path'
import fs from 'fs/promises'

const USE_R2 = !!process.env.R2_ACCOUNT_ID && !!process.env.R2_ACCESS_KEY_ID && !!process.env.R2_SECRET_ACCESS_KEY && !!process.env.R2_BUCKET_NAME

let r2Client: any = null
let r2Bucket: any = null

if (USE_R2) {
  try {
    const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3')
    const { Upload } = require('@aws-sdk/lib-storage')

    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    })

    r2Bucket = {
      name: process.env.R2_BUCKET_NAME,
      client: r2Client,
      getPublicUrl: (key: string) => {
        if (process.env.R2_PUBLIC_URL) {
          return `${process.env.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`
        }
        return `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET_NAME}/${key}`
      },
      upload: async (key: string, body: Buffer, contentType: string) => {
        const command = new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: key,
          Body: body,
          ContentType: contentType,
        })
        await r2Client.send(command)
        return r2Bucket.getPublicUrl(key)
      },
    }
  } catch (error) {
    console.warn('Failed to initialize R2 client, falling back to local storage:', error)
  }
}

export function isR2Enabled(): boolean {
  return USE_R2 && r2Bucket !== null
}

export async function testR2Connection(): Promise<{ bucket: string; key: string }> {
  if (!isR2Enabled() || !r2Client || !r2Bucket) {
    throw new Error('R2 is not fully configured. Required account ID, access key, secret key, and bucket name are missing or invalid.')
  }

  const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')
  const bucket = process.env.R2_BUCKET_NAME as string
  const key = 'pickamgo-r2-test.txt'
  const content = 'PickAmGo R2 connection test'
  let uploaded = false

  try {
    await r2Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: Buffer.from(content, 'utf8'),
      ContentType: 'text/plain; charset=utf-8',
    }))
    uploaded = true

    const result = await r2Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
    const body = result.Body && typeof result.Body.transformToString === 'function'
      ? await result.Body.transformToString()
      : ''
    if (body !== content) throw new Error('R2 test object was uploaded but could not be read back correctly.')

    await r2Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
    uploaded = false
    return { bucket, key }
  } finally {
    if (uploaded) {
      try {
        await r2Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
      } catch (cleanupError) {
        console.error('Failed to clean up R2 test object:', cleanupError)
      }
    }
  }
}

export function getStorageProvider(): multer.StorageEngine {
  if (isR2Enabled()) {
    return {
      _handleFile: async (req: any, file: Express.Multer.File, callback: (error?: Error | null) => void) => {
        try {
          const key = `uploads/${file.filename}`
          const url = await r2Bucket.upload(key, file.buffer, file.mimetype)
          ;(file as any).r2Url = url
          ;(file as any).buffer = file.buffer
          callback(undefined)
        } catch (error: any) {
          console.error('R2 upload error:', error)
          callback(new Error(`R2 upload failed: ${error.message || 'Unknown error'}`))
        }
      },
      _removeFile: async (req: any, file: Express.Multer.File, callback: (error: Error | null) => void) => {
        try {
          const key = `uploads/${file.filename}`
          await r2Client.send(new (require('@aws-sdk/client-s3').DeleteObjectCommand)({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
          }))
          callback(null)
        } catch (error) {
          callback(error as Error)
        }
      },
    }
  }

  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/')
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      const extensions: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'image/gif': '.gif',
      }
      cb(null, uniqueSuffix + (extensions[file.mimetype] || '.bin'))
    },
  })
}

export async function getPublicUrl(filename: string): Promise<string> {
  if (isR2Enabled() && r2Bucket) {
    return r2Bucket.getPublicUrl(`uploads/${filename}`)
  }
  return `/uploads/${filename}`
}

export async function deleteFile(filename: string): Promise<void> {
  if (isR2Enabled() && r2Bucket) {
    const { DeleteObjectCommand } = require('@aws-sdk/client-s3')
    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: `uploads/${filename}`,
    })
    await r2Client.send(command)
    return
  }

  try {
    await fs.unlink(path.join('uploads', filename))
  } catch (error) {
    console.error('Failed to delete file:', error)
  }
}

export async function ensureUploadsDir(): Promise<void> {
  if (!isR2Enabled()) {
    try {
      await fs.access('uploads')
    } catch {
      await fs.mkdir('uploads', { recursive: true })
    }
  }
}
