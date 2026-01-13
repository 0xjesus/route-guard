import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PATCH } from '@/app/api/comments/route'

describe('Comments API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/comments', () => {
    it('should return 400 if reportId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/comments')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('reportId is required')
    })

    it('should return empty comments array for new reportId', async () => {
      const request = new NextRequest('http://localhost:3000/api/comments?reportId=999')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.comments).toEqual([])
      expect(data.total).toBe(0)
    })

    it('should return comments sorted by timestamp (newest first)', async () => {
      const reportId = 'test-sort-' + Date.now()

      // Add first comment
      await POST(new NextRequest('http://localhost:3000/api/comments', {
        method: 'POST',
        body: JSON.stringify({ reportId, author: 'user1', text: 'First comment' }),
      }))

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10))

      // Add second comment
      await POST(new NextRequest('http://localhost:3000/api/comments', {
        method: 'POST',
        body: JSON.stringify({ reportId, author: 'user2', text: 'Second comment' }),
      }))

      const getRequest = new NextRequest(`http://localhost:3000/api/comments?reportId=${reportId}`)
      const response = await GET(getRequest)
      const data = await response.json()

      expect(data.comments.length).toBe(2)
      expect(data.comments[0].text).toBe('Second comment') // Newest first
      expect(data.comments[1].text).toBe('First comment')
    })
  })

  describe('POST /api/comments', () => {
    it('should return 400 if reportId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/comments', {
        method: 'POST',
        body: JSON.stringify({ text: 'Test comment' }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('reportId and text are required')
    })

    it('should return 400 if text is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/comments', {
        method: 'POST',
        body: JSON.stringify({ reportId: 1 }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('reportId and text are required')
    })

    it('should return 400 if text exceeds 500 characters', async () => {
      const longText = 'a'.repeat(501)
      const request = new NextRequest('http://localhost:3000/api/comments', {
        method: 'POST',
        body: JSON.stringify({ reportId: 1, text: longText }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Comment too long (max 500 characters)')
    })

    it('should create comment with default Anonymous author', async () => {
      const reportId = 'test-anon-' + Date.now()
      const request = new NextRequest('http://localhost:3000/api/comments', {
        method: 'POST',
        body: JSON.stringify({ reportId, text: 'Anonymous comment' }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.comment.author).toBe('Anonymous')
      expect(data.comment.text).toBe('Anonymous comment')
    })

    it('should create comment with provided author', async () => {
      const reportId = 'test-author-' + Date.now()
      const author = '0x1234567890123456789012345678901234567890'
      const request = new NextRequest('http://localhost:3000/api/comments', {
        method: 'POST',
        body: JSON.stringify({ reportId, author, text: 'Authored comment' }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.comment.author).toBe(author)
    })

    it('should initialize reactions to zero', async () => {
      const reportId = 'test-reactions-init-' + Date.now()
      const request = new NextRequest('http://localhost:3000/api/comments', {
        method: 'POST',
        body: JSON.stringify({ reportId, text: 'Test reactions' }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(data.comment.reactions.helpful).toBe(0)
      expect(data.comment.reactions.thankyou).toBe(0)
    })

    it('should trim whitespace from text', async () => {
      const reportId = 'test-trim-' + Date.now()
      const request = new NextRequest('http://localhost:3000/api/comments', {
        method: 'POST',
        body: JSON.stringify({ reportId, text: '  Trimmed text  ' }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(data.comment.text).toBe('Trimmed text')
    })

    it('should generate unique comment ID', async () => {
      const reportId = 'test-unique-' + Date.now()

      const request1 = new NextRequest('http://localhost:3000/api/comments', {
        method: 'POST',
        body: JSON.stringify({ reportId, text: 'Comment 1' }),
      })
      const response1 = await POST(request1)
      const data1 = await response1.json()

      const request2 = new NextRequest('http://localhost:3000/api/comments', {
        method: 'POST',
        body: JSON.stringify({ reportId, text: 'Comment 2' }),
      })
      const response2 = await POST(request2)
      const data2 = await response2.json()

      expect(data1.comment.id).not.toBe(data2.comment.id)
    })
  })

  describe('PATCH /api/comments', () => {
    it('should return 400 if reportId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/comments', {
        method: 'PATCH',
        body: JSON.stringify({ commentId: 'abc', reaction: 'helpful' }),
      })
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('reportId, commentId, and reaction are required')
    })

    it('should return 400 if commentId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/comments', {
        method: 'PATCH',
        body: JSON.stringify({ reportId: 1, reaction: 'helpful' }),
      })
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('should return 400 if reaction is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/comments', {
        method: 'PATCH',
        body: JSON.stringify({ reportId: 1, commentId: 'abc' }),
      })
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('should return 400 for invalid reaction type', async () => {
      const request = new NextRequest('http://localhost:3000/api/comments', {
        method: 'PATCH',
        body: JSON.stringify({ reportId: 1, commentId: 'abc', reaction: 'invalid' }),
      })
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid reaction type')
    })

    it('should return 404 if comment not found', async () => {
      const request = new NextRequest('http://localhost:3000/api/comments', {
        method: 'PATCH',
        body: JSON.stringify({ reportId: 'nonexistent', commentId: 'abc', reaction: 'helpful' }),
      })
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Comment not found')
    })

    it('should increment helpful reaction', async () => {
      const reportId = 'test-helpful-' + Date.now()

      // Create a comment first
      const postRequest = new NextRequest('http://localhost:3000/api/comments', {
        method: 'POST',
        body: JSON.stringify({ reportId, text: 'Test helpful' }),
      })
      const postResponse = await POST(postRequest)
      const postData = await postResponse.json()
      const commentId = postData.comment.id

      // Add helpful reaction
      const patchRequest = new NextRequest('http://localhost:3000/api/comments', {
        method: 'PATCH',
        body: JSON.stringify({ reportId, commentId, reaction: 'helpful' }),
      })
      const patchResponse = await PATCH(patchRequest)
      const patchData = await patchResponse.json()

      expect(patchResponse.status).toBe(200)
      expect(patchData.success).toBe(true)
      expect(patchData.comment.reactions.helpful).toBe(1)
      expect(patchData.comment.reactions.thankyou).toBe(0)
    })

    it('should increment thankyou reaction', async () => {
      const reportId = 'test-thankyou-' + Date.now()

      // Create a comment first
      const postRequest = new NextRequest('http://localhost:3000/api/comments', {
        method: 'POST',
        body: JSON.stringify({ reportId, text: 'Test thankyou' }),
      })
      const postResponse = await POST(postRequest)
      const postData = await postResponse.json()
      const commentId = postData.comment.id

      // Add thankyou reaction
      const patchRequest = new NextRequest('http://localhost:3000/api/comments', {
        method: 'PATCH',
        body: JSON.stringify({ reportId, commentId, reaction: 'thankyou' }),
      })
      const patchResponse = await PATCH(patchRequest)
      const patchData = await patchResponse.json()

      expect(patchResponse.status).toBe(200)
      expect(patchData.comment.reactions.thankyou).toBe(1)
    })

    it('should accumulate multiple reactions', async () => {
      const reportId = 'test-accumulate-' + Date.now()

      // Create a comment
      const postRequest = new NextRequest('http://localhost:3000/api/comments', {
        method: 'POST',
        body: JSON.stringify({ reportId, text: 'Test accumulate' }),
      })
      const postResponse = await POST(postRequest)
      const postData = await postResponse.json()
      const commentId = postData.comment.id

      // Add multiple reactions
      for (let i = 0; i < 3; i++) {
        await PATCH(new NextRequest('http://localhost:3000/api/comments', {
          method: 'PATCH',
          body: JSON.stringify({ reportId, commentId, reaction: 'helpful' }),
        }))
      }

      for (let i = 0; i < 2; i++) {
        await PATCH(new NextRequest('http://localhost:3000/api/comments', {
          method: 'PATCH',
          body: JSON.stringify({ reportId, commentId, reaction: 'thankyou' }),
        }))
      }

      // Verify final counts
      const getRequest = new NextRequest(`http://localhost:3000/api/comments?reportId=${reportId}`)
      const getResponse = await GET(getRequest)
      const getData = await getResponse.json()

      expect(getData.comments[0].reactions.helpful).toBe(3)
      expect(getData.comments[0].reactions.thankyou).toBe(2)
    })
  })
})
