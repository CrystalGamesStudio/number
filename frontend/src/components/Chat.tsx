import { useWebSocket } from '../lib/useWebSocket'
import { getAccessToken, getUser, clearTokens } from '../lib/api'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { useNavigate } from 'react-router-dom'

export function Chat() {
  const navigate = useNavigate()
  const token = getAccessToken()
  const user = getUser()
  const { sendMessage, messages, isConnected } = useWebSocket(token)

  if (!user) return null

  const handleSend = (content: string) => {
    sendMessage(2, content)
  }

  const handleLogout = () => {
    clearTokens()
    navigate('/login')
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
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

      <MessageList messages={messages} currentUserId={user.id} />

      <MessageInput onSend={handleSend} disabled={!isConnected} />
    </div>
  )
}
