import { useEffect, useState, useRef, useCallback } from 'react'
import { useWebSocket } from '../lib/useWebSocket'
import { getAccessToken, getUser, clearTokens, getUsers, getMessages, type User, type Message } from '../lib/api'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { TypingIndicator } from './TypingIndicator'
import { UserList } from './UserList'
import { useNavigate } from 'react-router-dom'

export function Chat() {
  const navigate = useNavigate()
  const token = getAccessToken()
  const user = getUser()

  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)

  const { sendMessage, sendTyping, messages: wsMessages, isConnected, typingFrom } = useWebSocket(token || '')

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
    })),
    ...wsMessages.filter(
      ws => !messages.some(m => m.id === ws.id)
    ),
  ]

  const typingUser = users.find(u => u.id === typingFrom)
  const typingUserEmail = typingFrom ? (typingUser?.email || null) : null

  if (!user) return null

  return (
    <div className="h-screen flex bg-gray-50">
      <div className="w-64 bg-white border-r">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-700">Conversations</h2>
        </div>
        <UserList
          users={users}
          selectedUserId={selectedUserId}
          onSelectUser={setSelectedUserId}
        />
      </div>

      <div className="flex-1 flex flex-col">
        <div className="p-4 bg-white border-b flex justify-between items-center">
          <h1 className="text-xl font-semibold">Wiadomości</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600">{user.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Wyloguj
            </button>
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
          <MessageList messages={displayMessages} currentUserId={user.id} />
        )}

        {selectedUserId && (
          <TypingIndicator typingUserEmail={typingUserEmail && selectedUserId === typingFrom ? typingUserEmail : null} />
        )}
        <MessageInput onSend={handleSend} disabled={!selectedUserId} onInputChange={handleInputChange} />
      </div>
    </div>
  )
}
