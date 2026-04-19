import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { Chat } from './Chat'
import * as api from '../lib/api'

vi.mock('../lib/api')
vi.mock('../lib/useWebSocket', () => ({
  useWebSocket: () => ({
    sendMessage: vi.fn(),
    messages: [],
    isConnected: true,
  }),
}))

function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

describe('Chat', () => {
  beforeEach(() => {
    vi.spyOn(api, 'getAccessToken').mockReturnValue('fake-token')
    vi.spyOn(api, 'getUser').mockReturnValue({ id: 1, email: 'test@test.com' })
    vi.spyOn(api, 'getUsers').mockResolvedValue([
      { id: 2, email: 'user2@example.com', online: true },
      { id: 3, email: 'user3@example.com', online: false },
    ])
    vi.spyOn(api, 'getMessages').mockResolvedValue([])
  })

  it('shows MessageList when logged in', () => {
    renderWithRouter(<Chat />)

    expect(screen.getByText('Wiadomości')).toBeInTheDocument()
  })

  it('shows MessageInput when logged in', () => {
    renderWithRouter(<Chat />)

    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('shows logout button', () => {
    renderWithRouter(<Chat />)

    expect(screen.getByText('Wyloguj')).toBeInTheDocument()
  })

  it('shows empty state when no conversation selected', async () => {
    renderWithRouter(<Chat />)

    // Wait for users to load
    expect(await screen.findByText('user2@example.com')).toBeInTheDocument()
    expect(screen.getByText('Select a conversation to start messaging')).toBeInTheDocument()
  })

  it('shows users list', async () => {
    renderWithRouter(<Chat />)

    expect(await screen.findByText('user2@example.com')).toBeInTheDocument()
    expect(await screen.findByText('user3@example.com')).toBeInTheDocument()
  })

  it('restores selected user from session storage on mount', async () => {
    // Set session storage before rendering
    sessionStorage.setItem('selectedUserId', '2')

    renderWithRouter(<Chat />)

    await screen.findByText('user2@example.com')

    // Verify user 2 is selected (has blue background)
    const user2 = screen.getByText('user2@example.com').closest('div')
    expect(user2).toHaveClass('bg-blue-50')
  })
})
