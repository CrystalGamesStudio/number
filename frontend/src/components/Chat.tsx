import { useEffect, useState } from 'react'
import { useWebSocket } from '../lib/useWebSocket'
import { getAccessToken, getUser, clearTokens, getUsers, getMessages, type User, type Message } from '../lib/api'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
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

  const { sendMessage, isConnected } = useWebSocket(token || '')

  useEffect(() => {
    if (!token) return

    getUsers().then(setUsers).catch(console.error)

    // Restore selected user from session storage
    const saved = sessionStorage.getItem('selectedUserId')
    if (saved) {
      setSelectedUserId(parseInt(saved))
    }
  }, [token])

  // Persist selected user to session storage
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

  const handleSend = (content: string) => {
    if (selectedUserId) {
      sendMessage(selectedUserId, content)
    }
  }

  const handleLogout = () => {
    clearTokens()
    navigate('/login')
  }

  if (!user) return null

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar with users list */}
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

      {/* Main chat area */}
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
          <MessageList messages={messages.map(m => ({
            id: m.id,
            from: m.sender_id,
            content: m.content,
            type: 'message'
          }))} currentUserId={user.id} />
        )}

        <MessageInput onSend={handleSend} disabled={!selectedUserId} />
      </div>
    </div>
  )
}
