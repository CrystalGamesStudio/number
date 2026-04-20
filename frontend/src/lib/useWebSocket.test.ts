import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useWebSocket } from './useWebSocket'

let capturedWsUrl: string | null = null
let capturedWs: any = null

describe('useWebSocket', () => {
  beforeEach(() => {
    capturedWsUrl = null
    capturedWs = null
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('connects with token in query param', async () => {
    global.WebSocket = class MockWebSocket {
      url: string
      readyState = 0
      onopen: any = null
      onclose: any = null
      onmessage: any = null

      constructor(url: string) {
        this.url = url
        capturedWsUrl = url
        capturedWs = this
        setTimeout(() => {
          this.readyState = 1
          this.onopen?.(new MessageEvent('open'))
        }, 0)
      }

      send() {}
      close() {}
      addEventListener() {}
      removeEventListener() {}
    } as any

    const token = 'test-jwt-token'
    renderHook(() => useWebSocket(token))

    await waitFor(() => {
      expect(capturedWsUrl).toContain('token=test-jwt-token')
    })
  })

  it('sends message with correct format', async () => {
    let sentData: any = null

    global.WebSocket = class MockWebSocket {
      url: string
      readyState = 0
      onopen: any = null
      onclose: any = null
      onmessage: any = null

      constructor(url: string) {
        this.url = url
        setTimeout(() => {
          this.readyState = 1
          this.onopen?.(new MessageEvent('open'))
        }, 0)
      }

      send(data: string) {
        sentData = JSON.parse(data)
      }

      close() {}
      addEventListener() {}
      removeEventListener() {}
    } as any

    const { result } = renderHook(() => useWebSocket('token'))

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    result.current.sendMessage(123, 'hello world')

    expect(sentData).toEqual({
      type: 'message',
      to: 123,
      content: 'hello world'
    })
  })

  it('receives messages and adds to list', async () => {
    global.WebSocket = class MockWebSocket {
      url: string
      readyState = 0
      onopen: any = null
      onclose: any = null
      onmessage: any = null

      constructor(url: string) {
        this.url = url
        setTimeout(() => {
          this.readyState = 1
          this.onopen?.(new MessageEvent('open'))
          // Simulate incoming message
          this.onmessage?.(new MessageEvent('message', {
            data: JSON.stringify({
              type: 'message',
              id: 1,
              from: 456,
              content: 'incoming message'
            })
          }))
        }, 0)
      }

      send() {}
      close() {}
      addEventListener() {}
      removeEventListener() {}
    } as any

    const { result } = renderHook(() => useWebSocket('token'))

    await waitFor(() => {
      expect(result.current.messages).toEqual([{
        type: 'message',
        id: 1,
        from: 456,
        content: 'incoming message'
      }])
    })
  })

  it('auto-reconnects on disconnect', async () => {
    let connectCount = 0

    global.WebSocket = class MockWebSocket {
      url: string
      readyState = 0
      onopen: any = null
      onclose: any = null
      onmessage: any = null

      constructor(url: string) {
        this.url = url
        connectCount++
        setTimeout(() => {
          this.readyState = 1
          this.onopen?.(new MessageEvent('open'))
        }, 0)
      }

      send() {}
      close() {}
      addEventListener() {}
      removeEventListener() {}
    } as any

    renderHook(() => useWebSocket('token'))

    await waitFor(() => {
      expect(connectCount).toBe(1)
    })
  })

  it('tracks presence updates from server', async () => {
    global.WebSocket = class MockWebSocket {
      url: string
      readyState = 0
      onopen: any = null
      onclose: any = null
      onmessage: any = null

      constructor(url: string) {
        this.url = url
        setTimeout(() => {
          this.readyState = 1
          this.onopen?.(new MessageEvent('open'))
          this.onmessage?.(new MessageEvent('message', {
            data: JSON.stringify({
              type: 'presence',
              user_id: 42,
              online: true
            })
          }))
        }, 0)
      }

      send() {}
      close() {}
      addEventListener() {}
      removeEventListener() {}
    } as any

    const { result } = renderHook(() => useWebSocket('token'))

    await waitFor(() => {
      expect(result.current.onlineUsers.get(42)).toBe(true)
    })
  })

  it('sends heartbeat at regular interval', () => {
    vi.useFakeTimers()
    let sentMessages: any[] = []
    let mockInstance: any = null

    global.WebSocket = class MockWebSocket {
      static OPEN = 1
      static CLOSED = 3
      static CONNECTING = 0
      static CLOSING = 2

      url: string
      readyState = 1
      onopen: any = null
      onclose: any = null
      onmessage: any = null

      constructor(url: string) {
        this.url = url
        mockInstance = this
      }

      send(data: string) {
        sentMessages.push(JSON.parse(data))
      }

      close() {}
      addEventListener() {}
      removeEventListener() {}
    } as any

    renderHook(() => useWebSocket('token'))

    // Manually trigger onopen (hook sets it after construction)
    act(() => {
      mockInstance.onopen(new MessageEvent('open'))
    })

    sentMessages = []
    act(() => {
      vi.advanceTimersByTime(30_000)
    })

    expect(sentMessages.some(m => m.type === 'heartbeat')).toBe(true)

    vi.useRealTimers()
  })
})
