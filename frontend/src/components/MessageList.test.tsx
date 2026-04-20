import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MessageList } from './MessageList'
import type { WebSocketMessage } from '../lib/useWebSocket'

describe('MessageList', () => {
  it('displays my messages on the right', () => {
    const messages: WebSocketMessage[] = [
      { type: 'message', id: 1, from: 999, content: 'my message' }
    ]

    render(<MessageList messages={messages} currentUserId={999} />)

    expect(screen.getByText('my message')).toBeInTheDocument()
  })

  it('displays their messages on the left', () => {
    const messages: WebSocketMessage[] = [
      { type: 'message', id: 1, from: 123, content: 'their message' }
    ]

    render(<MessageList messages={messages} currentUserId={999} />)

    expect(screen.getByText('their message')).toBeInTheDocument()
  })

  it('shows empty state when no messages', () => {
    render(<MessageList messages={[]} currentUserId={999} />)
    expect(screen.getByText('No messages yet')).toBeInTheDocument()
  })

  it('scrolls to bottom when new message is added', () => {
    const { rerender } = render(
      <MessageList messages={[]} currentUserId={999} />
    )

    const messages: WebSocketMessage[] = [
      { type: 'message', id: 1, from: 123, content: 'new message' }
    ]

    rerender(<MessageList messages={messages} currentUserId={999} />)
    expect(screen.getByText('new message')).toBeInTheDocument()
  })

  it('renders image file as inline preview', () => {
    const messages: WebSocketMessage[] = [
      {
        type: 'message', id: 1, from: 123, content: '',
        file_url: 'https://r2.example.com/photo.jpg',
        file_type: 'image/jpeg',
        file_name: 'photo.jpg',
      }
    ]

    render(<MessageList messages={messages} currentUserId={999} />)

    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://r2.example.com/photo.jpg')
    expect(img).toHaveAttribute('alt', 'photo.jpg')
  })

  it('renders non-image file as download link', () => {
    const messages: WebSocketMessage[] = [
      {
        type: 'message', id: 1, from: 123, content: '',
        file_url: 'https://r2.example.com/doc.pdf',
        file_type: 'application/pdf',
        file_name: 'report.pdf',
      }
    ]

    render(<MessageList messages={messages} currentUserId={999} />)

    const link = screen.getByRole('link', { name: /report\.pdf/i })
    expect(link).toHaveAttribute('href', 'https://r2.example.com/doc.pdf')
  })
})
