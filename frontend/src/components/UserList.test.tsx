import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UserList } from './UserList'

describe('UserList', () => {
  it('displays list of users', () => {
    const users = [
      { id: 1, email: 'user1@example.com', online: true },
      { id: 2, email: 'user2@example.com', online: false },
    ]

    render(<UserList users={users} selectedUserId={null} onSelectUser={vi.fn()} />)

    expect(screen.getByText('user1@example.com')).toBeInTheDocument()
    expect(screen.getByText('user2@example.com')).toBeInTheDocument()
  })

  it('shows green dot for online users', () => {
    const users = [
      { id: 1, email: 'online@example.com', online: true },
      { id: 2, email: 'offline@example.com', online: false },
    ]

    render(<UserList users={users} selectedUserId={null} onSelectUser={vi.fn()} />)

    // Online user should have green dot class
    const onlineUser = screen.getByText('online@example.com').closest('div')
    expect(onlineUser?.querySelector('.bg-green-500')).toBeInTheDocument()

    // Offline user should have gray dot class
    const offlineUser = screen.getByText('offline@example.com').closest('div')
    expect(offlineUser?.querySelector('.bg-gray-300')).toBeInTheDocument()
  })

  it('calls onSelectUser when clicking a user', () => {
    const users = [{ id: 1, email: 'user@example.com', online: false }]
    const onSelectUser = vi.fn()

    render(<UserList users={users} selectedUserId={null} onSelectUser={onSelectUser} />)

    screen.getByText('user@example.com').click()
    expect(onSelectUser).toHaveBeenCalledWith(1)
  })

  it('highlights selected user', () => {
    const users = [
      { id: 1, email: 'user1@example.com', online: false },
      { id: 2, email: 'user2@example.com', online: false },
    ]

    render(<UserList users={users} selectedUserId={2} onSelectUser={vi.fn()} />)

    const user2 = screen.getByText('user2@example.com').closest('div')
    expect(user2).toHaveClass('bg-blue-50')
  })

  it('shows empty state when no users', () => {
    render(<UserList users={[]} selectedUserId={null} onSelectUser={vi.fn()} />)

    expect(screen.getByText('No users available')).toBeInTheDocument()
  })
})
