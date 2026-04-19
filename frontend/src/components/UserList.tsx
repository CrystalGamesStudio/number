import type { User } from '../lib/api'

interface UserListProps {
  users: User[]
  selectedUserId: number | null
  onSelectUser: (userId: number) => void
}

export function UserList({ users, selectedUserId, onSelectUser }: UserListProps) {
  if (users.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No users available
      </div>
    )
  }

  return (
    <div className="overflow-y-auto">
      {users.map((user) => (
        <div
          key={user.id}
          onClick={() => onSelectUser(user.id)}
          className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 ${
            selectedUserId === user.id ? 'bg-blue-50' : ''
          }`}
        >
          <div
            className={`w-3 h-3 rounded-full ${
              user.online ? 'bg-green-500' : 'bg-gray-300'
            }`}
          />
          <span className="text-sm">{user.email}</span>
        </div>
      ))}
    </div>
  )
}
