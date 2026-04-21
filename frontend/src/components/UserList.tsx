import type { User } from '../lib/api'

interface UserListProps {
  users: User[]
  selectedUserId: number | null
  onSelectUser: (userId: number) => void
}

export function UserList({ users, selectedUserId, onSelectUser }: UserListProps) {
  if (users.length === 0) {
    return (
      <div className="p-4 text-center text-secondary">
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
          className={`flex items-center gap-3 p-3 cursor-pointer mx-2 my-1 rounded-xl transition-all ${
            selectedUserId === user.id
              ? 'bg-green-light text-green hover:opacity-80'
              : 'hover:bg-muted'
          }`}
        >
          <div
            className={`w-3 h-3 rounded-full ${
              user.online ? 'bg-green' : 'bg-muted'
            }`}
          />
          <span className="text-sm">{user.email}</span>
        </div>
      ))}
    </div>
  )
}
