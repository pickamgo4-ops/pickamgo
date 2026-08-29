import multer from 'multer'
import path from 'path'
import fs from 'fs/promises'

function getR2Env() {
  return {
    accountId: process.env.R2_ACCOUNT_ID?.trim(),
    accessKeyId: process.env.R2_ACCESS_KEY_ID?.trim(),
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY?.trim(),
    bucketName: process.env.R2_BUCKET_NAME?.trim(),
    publicUrl: process.env.R2_PUBLIC_URL?.trim(),
  }
}

function getR2ConfigError(): string | null {
  const env = getR2Env()
  const missing: string[] = []

  if (!env.accountId) missing.push('R2_ACCOUNT_ID')
  if (!env.accessKeyId) missing.push('R2_ACCESS_KEY_ID')
  if (!env.secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY')
  if (!env.bucketName) missing.push('R2_BUCKET_NAME')

  if (missing.length > 0) {
    return `R2 is not fully configured. Missing env vars: ${missing.join(', ')}.`
  }

  return null
}

let r2Client: any = null
let r2Bucket: any = null

function initializeR2Client() {
  const configError = getR2ConfigError()
  if (configError) {
    r2Client = null
    r2Bucket = null
    return
  }

  try {
    const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3')

    const env = getR2Env()
    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${env.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.accessKeyId,
        secretAccessKey: env.secretAccessKey,
      },
    })

    r2Bucket = {
      name: env.bucketName,
      client: r2Client,
      getPublicUrl: (key: string) => {
        const normalizedKey = key.replace(/^\/+/, '').replace(/^uploads\//i, '')
        const uploadKey = `uploads/${normalizedKey}`
        if (env.publicUrl) {
          const normalizedBase = env.publicUrl.replace(/\/+$/, '').replace(/\/uploads$/i, '')
          return `${normalizedBase}/uploads/${normalizedKey}`
        }
        return `https://${env.accountId}.r2.cloudflarestorage.com/${env.bucketName}/${uploadKey}`
      },
      upload: async (key: string, body: Buffer, contentType: string) => {
        const command = new PutObjectCommand({
          Bucket: env.bucketName,
          Key: key,
          Body: body,
          ContentType: contentType,
        })
        await r2Client.send(command)
        return r2Bucket.getPublicUrl(key)
      },
    }
  } catch (error) {
    console.warn('Failed to initialize Cloudflare R2 client. Falling back to local storage:', error)
    r2Client = null
    r2Bucket = null
  }
}

initializeR2Client()

export function isR2Enabled(): boolean {
  return !getR2ConfigError() && !!r2Client && !!r2Bucket
}

export async function testR2Connection(): Promise<{ bucket: string; key: string }> {
  const configError = getR2ConfigError()
  if (configError) {
    throw new Error(configError)
  }

  if (!isR2Enabled() || !r2Client || !r2Bucket) {
    throw new Error('Cloudflare R2 client failed to initialize. Check that the Railway env vars are loaded and the bucket permissions allow PutObject/GetObject/DeleteObject.')
  }

  const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')
  const bucket = getR2Env().bucketName as string
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
    if (body !== content) {
      throw new Error('R2 test object was uploaded but could not be read back correctly.')
    }

    await r2Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
    uploaded = false
    return { bucket, key }
  } catch (error: any) {
    const message = error?.message || 'Cloudflare R2 operation failed.'
    throw new Error(`R2 test failed during ${uploaded ? 'read/delete' : 'upload'}: ${message}. Verify the bucket permissions and the Railway R2 env vars.`)
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
  initializeR2Client()

  if (isR2Enabled()) {
    return {
      _handleFile: async (req: any, file: Express.Multer.File, callback: (error?: Error | null) => void) => {
        try {
          const chunks: Buffer[] = []
          for await (const chunk of file.stream) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
          }
          const fileBuffer = Buffer.concat(chunks)
          const extension = path.extname(file.originalname).toLowerCase() || '.bin'
          const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`
          const key = `uploads/${filename}`
          const url = await r2Bucket.upload(key, fileBuffer, file.mimetype)
          ;(file as any).r2Url = url
          ;(file as any).filename = filename
          ;(file as any).buffer = fileBuffer
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
