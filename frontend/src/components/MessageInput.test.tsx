import { render, screen, fireEvent } from '@testing-library/react'
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

  it('renders attachment button', () => {
    render(<MessageInput onSend={vi.fn()} />)
    expect(screen.getByRole('button', { name: /attach/i })).toBeInTheDocument()
  })

  it('calls onFileUpload when file is selected', async () => {
    let resolveUpload!: () => void
    const onFileUpload = vi.fn(() => new Promise<void>(r => { resolveUpload = r }))
    render(<MessageInput onSend={vi.fn()} onFileUpload={onFileUpload} />)

    const file = new File(['hello'], 'photo.jpg', { type: 'image/jpeg' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLElement

    fireEvent.change(fileInput, { target: { files: [file] } })

    expect(onFileUpload).toHaveBeenCalledWith(expect.any(File))
    expect(screen.getByText('photo.jpg')).toBeInTheDocument()

    resolveUpload()

    await screen.findByRole('button', { name: /attach/i })
  })

  it('shows cancel button during upload', async () => {
    const onFileUpload = vi.fn(() => new Promise<void>(() => {}))
    render(<MessageInput onSend={vi.fn()} onFileUpload={onFileUpload} />)

    const file = new File(['hello'], 'doc.pdf', { type: 'application/pdf' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLElement

    fireEvent.change(fileInput, { target: { files: [file] } })

    expect(screen.getByRole('button', { name: /cancel upload/i })).toBeInTheDocument()
  })
})
