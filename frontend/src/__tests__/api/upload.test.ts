import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Create mock for S3Client as a class
const mockSend = vi.fn().mockResolvedValue({})

vi.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: class MockS3Client {
      send = mockSend
    },
    PutObjectCommand: class MockPutObjectCommand {
      constructor(public input: any) {}
    },
  }
})

// Set environment variables for tests
const originalEnv = process.env

describe('Upload API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset modules to ensure fresh imports
    vi.resetModules()
    // Set test environment variables
    process.env = {
      ...originalEnv,
      DO_SPACES_KEY: 'test-key',
      DO_SPACES_SECRET: 'test-secret',
      DO_SPACES_BUCKET: 'test-bucket',
      DO_SPACES_ENDPOINT: 'nyc3.digitaloceanspaces.com',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('POST /api/upload', () => {
    it('should return 503 if storage is not configured', async () => {
      process.env.DO_SPACES_KEY = ''
      process.env.DO_SPACES_SECRET = ''
      process.env.DO_SPACES_BUCKET = ''

      const { POST } = await import('@/app/api/upload/route')

      const formData = new FormData()
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      formData.append('file', file)

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.error).toBe('Storage not configured')
    })

    it('should return 400 if no file is provided', async () => {
      const { POST } = await import('@/app/api/upload/route')

      const formData = new FormData()

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No file provided')
    })

    it('should return 400 for invalid file type (PDF)', async () => {
      const { POST } = await import('@/app/api/upload/route')

      const formData = new FormData()
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      formData.append('file', file)

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.')
    })

    it('should return 400 for invalid file type (text)', async () => {
      const { POST } = await import('@/app/api/upload/route')

      const formData = new FormData()
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
      formData.append('file', file)

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid file type')
    })

    it('should return 400 for file exceeding 5MB', async () => {
      const { POST } = await import('@/app/api/upload/route')

      // Create a file larger than 5MB (5 * 1024 * 1024 bytes)
      const largeContent = new Uint8Array(5 * 1024 * 1024 + 1)
      const formData = new FormData()
      const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' })
      formData.append('file', file)

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('File too large. Maximum size is 5MB.')
    })

    it('should accept JPEG files', async () => {
      const { POST } = await import('@/app/api/upload/route')

      const formData = new FormData()
      const file = new File(['fake image data'], 'test.jpg', { type: 'image/jpeg' })
      formData.append('file', file)

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.url).toContain('test-bucket')
      expect(data.url).toContain('roadguard')
      // Filename extension may vary in test environment
      expect(data.filename).toMatch(/roadguard\/\d+-[a-z0-9]+\.\w+/)
    })

    it('should accept PNG files', async () => {
      const { POST } = await import('@/app/api/upload/route')

      const formData = new FormData()
      const file = new File(['fake png data'], 'test.png', { type: 'image/png' })
      formData.append('file', file)

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.filename).toMatch(/roadguard\/\d+-[a-z0-9]+\.\w+/)
    })

    it('should accept WebP files', async () => {
      const { POST } = await import('@/app/api/upload/route')

      const formData = new FormData()
      const file = new File(['fake webp data'], 'test.webp', { type: 'image/webp' })
      formData.append('file', file)

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.filename).toMatch(/roadguard\/\d+-[a-z0-9]+\.\w+/)
    })

    it('should accept GIF files', async () => {
      const { POST } = await import('@/app/api/upload/route')

      const formData = new FormData()
      const file = new File(['fake gif data'], 'test.gif', { type: 'image/gif' })
      formData.append('file', file)

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.filename).toMatch(/roadguard\/\d+-[a-z0-9]+\.\w+/)
    })

    it('should generate unique filenames', async () => {
      const { POST } = await import('@/app/api/upload/route')

      const formData1 = new FormData()
      const file1 = new File(['data 1'], 'same.jpg', { type: 'image/jpeg' })
      formData1.append('file', file1)

      const formData2 = new FormData()
      const file2 = new File(['data 2'], 'same.jpg', { type: 'image/jpeg' })
      formData2.append('file', file2)

      const request1 = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData1,
      })

      const request2 = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData2,
      })

      const response1 = await POST(request1)
      const data1 = await response1.json()

      const response2 = await POST(request2)
      const data2 = await response2.json()

      expect(data1.filename).not.toBe(data2.filename)
    })

    it('should return proper URL structure', async () => {
      const { POST } = await import('@/app/api/upload/route')

      const formData = new FormData()
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      formData.append('file', file)

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.url).toMatch(/^https:\/\/test-bucket\.nyc3\.digitaloceanspaces\.com\/roadguard\//)
    })

    it('should accept files at exactly 5MB limit', async () => {
      const { POST } = await import('@/app/api/upload/route')

      // Create a file exactly at 5MB (should pass)
      const exactContent = new Uint8Array(5 * 1024 * 1024)
      const formData = new FormData()
      const file = new File([exactContent], 'exact.jpg', { type: 'image/jpeg' })
      formData.append('file', file)

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })
})
