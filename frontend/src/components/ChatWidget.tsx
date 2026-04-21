import { useState, useEffect, useCallback, useRef } from 'react'
import { useWebSocket, type WebSocketMessage } from '../lib/useWebSocket'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { TypingIndicator } from './TypingIndicator'
import { UserList } from './UserList'
import type { User, Message, FileUploadResult } from '../lib/api'

export interface ChatWidgetProps {
  backendUrl: string
  authToken: string
  theme?: 'light' | 'dark'
  position?: 'bottom-right' | 'bottom-left'
}

function makeApi(baseUrl: string, token: string) {
  const headers = { 'Authorization': `Bearer ${token}` }

  return {
    getUsers(): Promise<User[]> {
      return fetch(`${baseUrl}/users`, { headers }).then(r => {
        if (!r.ok) throw new Error('Failed to fetch users')
        return r.json()
      })
    },
    getMessages(userId: number): Promise<Message[]> {
      return fetch(`${baseUrl}/messages/${userId}`, { headers }).then(r => {
        if (!r.ok) throw new Error('Failed to fetch messages')
        return r.json()
      })
    },
    uploadFile(file: File): Promise<FileUploadResult> {
      const formData = new FormData()
      formData.append('file', file)
      return fetch(`${baseUrl}/files/upload`, {
        method: 'POST',
        headers,
        body: formData,
      }).then(r => {
        if (!r.ok) throw new Error('Upload failed')
        return r.json()
      })
    },
  }
}

export function ChatWidget({ backendUrl, authToken, theme, position }: ChatWidgetProps) {
  const api = useRef(makeApi(backendUrl, authToken))
  const wsUrl = backendUrl.replace(/^http/, 'ws') + '/ws'

  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const { sendMessage, sendTyping, messages: wsMessages, isConnected, typingFrom, onlineUsers } = useWebSocket(authToken, wsUrl)

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    api.current.getUsers().then(setUsers).catch(console.error)
  }, [])

  useEffect(() => {
    if (onlineUsers.size === 0) return
    setUsers(prev => prev.map(u => {
      const online = onlineUsers.get(u.id)
      return online !== undefined ? { ...u, online } : u
    }))
  }, [onlineUsers])

  useEffect(() => {
    if (!selectedUserId) return
    setIsLoadingMessages(true)
    api.current.getMessages(selectedUserId)
      .then(setMessages)
      .catch(console.error)
      .finally(() => setIsLoadingMessages(false))
  }, [selectedUserId])

  const handleInputChange = useCallback(() => {
    if (!selectedUserId) return
    sendTyping(selectedUserId, true)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(selectedUserId, false)
    }, 3000)
  }, [selectedUserId, sendTyping])

  const handleSend = (content: string) => {
    if (!selectedUserId) return
    sendMessage(selectedUserId, content)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    sendTyping(selectedUserId, false)
  }

  const handleFileUpload = async (file: File) => {
    if (!selectedUserId) return
    setUploadError(null)
    try {
      const result = await api.current.uploadFile(file)
      sendMessage(selectedUserId, '', {
        file_url: result.url,
        file_type: result.content_type,
        file_name: result.original_filename,
      })
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  const displayMessages: WebSocketMessage[] = [
    ...messages.map(m => ({
      id: m.id,
      from: m.sender_id,
      content: m.content,
      type: 'message' as const,
      file_url: m.file_url,
      file_type: m.file_type,
      file_name: m.file_name,
    })),
    ...wsMessages.filter(ws => !messages.some(m => m.id === ws.id)),
  ]

  const typingUser = users.find(u => u.id === typingFrom)
  const typingUserEmail = typingFrom ? (typingUser?.email || null) : null

  const positionStyle: React.CSSProperties = position
    ? { position: 'fixed', bottom: 0, right: position === 'bottom-right' ? 0 : undefined, left: position === 'bottom-left' ? 0 : undefined, width: 420, height: 600, zIndex: 9999 }
    : {}

  return (
    <div className={`nw-widget h-full flex bg-gray-50 ${theme || ''}`} style={positionStyle} data-namespace="number-chat">
      <div className="w-64 bg-white border-r">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-700">Conversations</h2>
        </div>
        <UserList users={users} selectedUserId={selectedUserId} onSelectUser={setSelectedUserId} />
      </div>
      <div className="flex-1 flex flex-col">
        <div className="p-4 bg-white border-b flex justify-between items-center">
          <h1 className="text-xl font-semibold">Wiadomości</h1>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">Connected</span>
          </div>
        </div>
        {selectedUserId === null ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a conversation to start messaging
          </div>
        ) : isLoadingMessages ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Loading messages...
          </div>
        ) : (
          <MessageList messages={displayMessages} currentUserId={0} />
        )}
        {uploadError && (
          <div className="px-4 py-2 bg-red-100 text-red-700 text-sm flex justify-between items-center">
            <span>{uploadError}</span>
            <button onClick={() => setUploadError(null)} className="text-red-900 font-bold">&times;</button>
          </div>
        )}
        {selectedUserId && (
          <TypingIndicator typingUserEmail={typingUserEmail && selectedUserId === typingFrom ? typingUserEmail : null} />
        )}
        <MessageInput onSend={handleSend} onFileUpload={handleFileUpload} disabled={!selectedUserId} onInputChange={handleInputChange} />
      </div>
    </div>
  )
}
