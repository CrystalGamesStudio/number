import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { MessageInput } from './MessageInput'

describe('MessageInput', () => {
  it('renders text field and send button', () => {
    const onSend = vi.fn()
    render(<MessageInput onSend={onSend} />)

    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('calls onSend with content when send button clicked', async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()
    render(<MessageInput onSend={onSend} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'hello world')

    const sendButton = screen.getByRole('button', { name: /send/i })
    await user.click(sendButton)

    expect(onSend).toHaveBeenCalledWith('hello world')
  })

  it('clears input after sending', async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()
    render(<MessageInput onSend={onSend} />)

    const input = screen.getByRole('textbox') as HTMLInputElement
    await user.type(input, 'test message')

    const sendButton = screen.getByRole('button', { name: /send/i })
    await user.click(sendButton)

    expect(input.value).toBe('')
  })
})
