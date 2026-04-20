import { useEffect, useRef, useState } from 'react'
import type { WebSocketMessage } from '../lib/useWebSocket'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface MessageListProps {
  messages: WebSocketMessage[]
  currentUserId: number
}

function resolveUrl(url: string) {
  if (url.startsWith('http')) return url
  return `${API_BASE_URL}${url}`
}

function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
      onClick={onClose}
    >
      <img src={src} alt={alt} className="max-w-[90vw] max-h-[90vh] rounded-lg" />
    </div>
  )
}

function FileAttachment({ msg }: { msg: WebSocketMessage }) {
  const [lightbox, setLightbox] = useState(false)

  if (!msg.file_url) return null

  const url = resolveUrl(msg.file_url)

  if (msg.file_type?.startsWith('image/')) {
    return (
      <>
        <img
          src={url}
          alt={msg.file_name || 'image'}
          className="max-w-full rounded-lg cursor-pointer"
          onClick={() => setLightbox(true)}
        />
        {lightbox && (
          <Lightbox src={url} alt={msg.file_name || 'image'} onClose={() => setLightbox(false)} />
        )}
      </>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="underline"
    >
      {msg.file_name || 'Download file'}
    </a>
  )
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
              {msg.file_url ? (
                <FileAttachment msg={msg} />
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
