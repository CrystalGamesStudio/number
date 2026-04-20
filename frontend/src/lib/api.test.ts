import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uploadFile } from './api'

describe('uploadFile', () => {
  beforeEach(() => {
    localStorage.setItem('access_token', 'test-token')
  })

  it('uploads file and returns metadata', async () => {
    const mockResponse = {
      id: 1,
      filename: 'abc.jpg',
      original_filename: 'photo.jpg',
      url: 'https://r2.example.com/photo.jpg',
      content_type: 'image/jpeg',
      size: 1234,
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response)

    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' })
    const result = await uploadFile(file)

    expect(result).toEqual(mockResponse)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/files/upload'),
      expect.objectContaining({ method: 'POST' })
    )
  })
})
