import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { Chat } from './Chat'
import * as api from '../lib/api'

vi.mock('../lib/api')

function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

describe('Chat', () => {
  beforeEach(() => {
    vi.spyOn(api, 'getAccessToken').mockReturnValue('fake-token')
    vi.spyOn(api, 'getUser').mockReturnValue({ id: 1, email: 'test@test.com' })
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
})
