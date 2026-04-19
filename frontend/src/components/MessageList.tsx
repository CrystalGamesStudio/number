import { useEffect, useRef } from 'react'
import type { WebSocketMessage } from '../lib/useWebSocket'

interface MessageListProps {
  messages: WebSocketMessage[]
  currentUserId: number
}

export function MessageList({ messages, currentUserId }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        No messages yet
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-2">
      {messages.map((msg) => {
        const isMine = msg.from === currentUserId
        return (
          <div
            key={msg.id}
            className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg ${
                isMine
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-900'
              }`}
            >
              <p>{msg.content}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
