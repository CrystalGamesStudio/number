import { useState, useEffect, useCallback, useRef } from 'react'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws'
const HEARTBEAT_INTERVAL = 30_000

export interface WebSocketMessage {
  type: 'message'
  id: number
  from: number
  content: string
  file_url?: string
  file_type?: string
  file_name?: string
}

export function useWebSocket(token: string | null) {
  const [messages, setMessages] = useState<WebSocketMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [typingFrom, setTypingFrom] = useState<number | null>(null)
  const [onlineUsers, setOnlineUsers] = useState<Map<number, boolean>>(new Map())
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<any>(null)
  const reconnectAttemptsRef = useRef(0)
  const tokenRef = useRef(token)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    tokenRef.current = token
  }, [token])

  const startHeartbeat = useCallback((ws: WebSocket) => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    heartbeatRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'heartbeat' }))
      }
    }, HEARTBEAT_INTERVAL)
  }, [])

  useEffect(() => {
    if (!token) return

    const url = `${WS_URL}?token=${token}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      reconnectAttemptsRef.current = 0
      startHeartbeat(ws)
    }

    ws.onclose = () => {
      setIsConnected(false)
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
      reconnectAttemptsRef.current++

      reconnectTimeoutRef.current = setTimeout(() => {
        const currentToken = tokenRef.current
        if (currentToken) {
          const newWs = new WebSocket(`${WS_URL}?token=${currentToken}`)
          wsRef.current = newWs
          newWs.onopen = () => {
            setIsConnected(true)
            reconnectAttemptsRef.current = 0
            startHeartbeat(newWs)
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
      } else if (msg.type === 'typing') {
        setTypingFrom(msg.is_typing ? msg.from : null)
      } else if (msg.type === 'presence') {
        setOnlineUsers(prev => {
          const next = new Map(prev)
          next.set(msg.user_id, msg.online)
          return next
        })
      }
    }

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [token, startHeartbeat])

  const sendMessage = useCallback((to: number, content: string, file?: { file_url: string; file_type: string; file_name: string }) => {
    const msg: Record<string, unknown> = { type: 'message', to, content }
    if (file) {
      msg.file_url = file.file_url
      msg.file_type = file.file_type
      msg.file_name = file.file_name
    }
    wsRef.current?.send(JSON.stringify(msg))
  }, [])

  const sendTyping = useCallback((to: number, isTyping: boolean) => {
    wsRef.current?.send(JSON.stringify({
      type: 'typing',
      to,
      is_typing: isTyping,
    }))
  }, [])

  return { sendMessage, sendTyping, messages, isConnected, typingFrom, onlineUsers }
}
