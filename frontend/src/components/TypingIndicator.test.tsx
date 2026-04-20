import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TypingIndicator } from './TypingIndicator'

describe('TypingIndicator', () => {
  it('shows "X is typing..." when someone is typing', () => {
    render(<TypingIndicator typingUserEmail="alice@example.com" />)
    expect(screen.getByText('alice@example.com is typing...')).toBeInTheDocument()
  })

  it('renders nothing when no one is typing', () => {
    const { container } = render(<TypingIndicator typingUserEmail={null} />)
    expect(container.innerHTML).toBe('')
  })
})
