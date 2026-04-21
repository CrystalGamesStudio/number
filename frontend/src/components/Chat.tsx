import { useEffect, useState, useRef, useCallback } from 'react'
import { useWebSocket } from '../lib/useWebSocket'
import { getAccessToken, getUser, clearTokens, getUsers, getMessages, uploadFile, type User, type Message } from '../lib/api'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { TypingIndicator } from './TypingIndicator'
import { UserList } from './UserList'
import { ThemeToggle } from './theme-toggle'
import { useNavigate } from 'react-router-dom'

export function Chat() {
  const navigate = useNavigate()
  const token = getAccessToken()
  const user = getUser()

  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const { sendMessage, sendTyping, messages: wsMessages, isConnected, typingFrom, onlineUsers } = useWebSocket(token || '')

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!token) return

    getUsers().then(setUsers).catch(console.error)

    const saved = sessionStorage.getItem('selectedUserId')
    if (saved) {
      setSelectedUserId(parseInt(saved))
    }
  }, [token])

  useEffect(() => {
    if (onlineUsers.size === 0) return
    setUsers(prev => prev.map(u => {
      const online = onlineUsers.get(u.id)
      return online !== undefined ? { ...u, online } : u
    }))
  }, [onlineUsers])

  useEffect(() => {
    if (selectedUserId) {
      sessionStorage.setItem('selectedUserId', selectedUserId.toString())
    } else {
      sessionStorage.removeItem('selectedUserId')
    }
  }, [selectedUserId])

  useEffect(() => {
    if (!selectedUserId) return

    setIsLoadingMessages(true)
    getMessages(selectedUserId)
      .then(setMessages)
      .catch(console.error)
      .finally(() => setIsLoadingMessages(false))
  }, [selectedUserId])

  const handleInputChange = useCallback(() => {
    if (!selectedUserId) return

    sendTyping(selectedUserId, true)

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(selectedUserId, false)
    }, 3000)
  }, [selectedUserId, sendTyping])

  const handleSend = (content: string) => {
    if (selectedUserId) {
      sendMessage(selectedUserId, content)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      sendTyping(selectedUserId, false)
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!selectedUserId) return
    setUploadError(null)

    try {
      const result = await uploadFile(file)
      sendMessage(selectedUserId, '', {
        file_url: result.url,
        file_type: result.content_type,
        file_name: result.original_filename,
      })
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  const handleLogout = () => {
    clearTokens()
    navigate('/login')
  }

  const displayMessages = [
    ...messages.map(m => ({
      id: m.id,
      from: m.sender_id,
      content: m.content,
      type: 'message' as const,
      file_url: m.file_url,
      file_type: m.file_type,
      file_name: m.file_name,
    })),
    ...wsMessages.filter(
      ws => !messages.some(m => m.id === ws.id)
    ),
  ]

  const typingUser = users.find(u => u.id === typingFrom)
  const typingUserEmail = typingFrom ? (typingUser?.email || null) : null

  if (!user) return null

  return (
    <div className="h-screen flex bg-primary">
      <div className="w-64 bg-secondary border-r border-theme">
        <div className="p-4 border-b border-theme">
          <h2 className="font-semibold text-primary">Conversations</h2>
        </div>
        <UserList
          users={users}
          selectedUserId={selectedUserId}
          onSelectUser={setSelectedUserId}
        />
      </div>

      <div className="flex-1 flex flex-col">
        <div className="p-4 bg-primary border-b border-theme flex justify-between items-center">
          <h1 className="text-xl font-semibold text-green">Wiadomości</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green' : 'bg-red-500'}`} />
              <span className="text-sm text-secondary">{user.email}</span>
            </div>
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="text-sm text-green hover:underline"
            >
              Wyloguj
            </button>
          </div>
        </div>

        {selectedUserId === null ? (
          <div className="flex-1 flex items-center justify-center text-secondary">
            Select a conversation to start messaging
          </div>
        ) : isLoadingMessages ? (
          <div className="flex-1 flex items-center justify-center text-secondary">
            Loading messages...
          </div>
        ) : (
          <MessageList messages={displayMessages} currentUserId={user.id} />
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
