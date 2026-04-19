import { useState, useEffect, useCallback, useRef } from 'react'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws'

export interface WebSocketMessage {
  type: 'message'
  id: number
  from: number
  content: string
}

export function useWebSocket(token: string | null) {
  const [messages, setMessages] = useState<WebSocketMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<any>(null)
  const reconnectAttemptsRef = useRef(0)
  const tokenRef = useRef(token)

  // Update token ref when token changes
  useEffect(() => {
    tokenRef.current = token
  }, [token])

  useEffect(() => {
    if (!token) return

    const url = `${WS_URL}?token=${token}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      reconnectAttemptsRef.current = 0
    }

    ws.onclose = () => {
      setIsConnected(false)
      // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
      reconnectAttemptsRef.current++

      reconnectTimeoutRef.current = setTimeout(() => {
        // Reconnect with current token
        const currentToken = tokenRef.current
        if (currentToken) {
          const newWs = new WebSocket(`${WS_URL}?token=${currentToken}`)
          wsRef.current = newWs
          newWs.onopen = () => {
            setIsConnected(true)
            reconnectAttemptsRef.current = 0
          }
          newWs.onclose = ws.onclose
          newWs.onmessage = ws.onmessage
        }
      }, delay)
    }

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.type === 'message') {
        setMessages(prev => [...prev, msg])
      }
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [token]) // Only reconnect when token changes

  const sendMessage = useCallback((to: number, content: string) => {
    wsRef.current?.send(JSON.stringify({
      type: 'message',
      to,
      content
    }))
  }, [])

  return { sendMessage, messages, isConnected }
}
