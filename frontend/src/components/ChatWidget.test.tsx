import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChatWidget } from './ChatWidget'

class MockWebSocket {
  static instances: MockWebSocket[] = []
  url: string
  readyState = 0
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onmessage: ((e: { data: string }) => void) | null = null

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }
  send = vi.fn()
  close() { this.readyState = 3 }
}

describe('ChatWidget', () => {
  beforeEach(() => {
    MockWebSocket.instances = []
    vi.stubGlobal('WebSocket', MockWebSocket)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders with required backendUrl and authToken props', () => {
    render(
      <ChatWidget backendUrl="http://localhost:8000" authToken="test-token-123" />,
    )

    expect(screen.getByText('Wiadomości')).toBeInTheDocument()
  })

  it('applies dark theme class when theme prop is dark', () => {
    const { container } = render(
      <ChatWidget backendUrl="http://localhost:8000" authToken="test-token" theme="dark" />,
    )

    const widget = container.firstElementChild as HTMLElement
    expect(widget.classList.contains('dark')).toBe(true)
  })

  it('applies light theme class when theme prop is light', () => {
    const { container } = render(
      <ChatWidget backendUrl="http://localhost:8000" authToken="test-token" theme="light" />,
    )

    const widget = container.firstElementChild as HTMLElement
    expect(widget.classList.contains('light')).toBe(true)
  })

  it('renders with absolute positioning when position prop is provided', () => {
    const { container } = render(
      <ChatWidget backendUrl="http://localhost:8000" authToken="test-token" position="bottom-right" />,
    )

    const widget = container.firstElementChild as HTMLElement
    const style = window.getComputedStyle(widget)
    expect(style.position).toBe('fixed')
  })

  it('renders inline without fixed positioning when position is omitted', () => {
    const { container } = render(
      <ChatWidget backendUrl="http://localhost:8000" authToken="test-token" />,
    )

    const widget = container.firstElementChild as HTMLElement
    const style = window.getComputedStyle(widget)
    expect(style.position).not.toBe('fixed')
    expect(style.position).not.toBe('absolute')
  })

  it('connects WebSocket using backendUrl', () => {
    render(
      <ChatWidget backendUrl="https://mychat.example.com" authToken="test-token" />,
    )

    expect(MockWebSocket.instances.length).toBeGreaterThan(0)
    const wsUrl = MockWebSocket.instances[0].url
    expect(wsUrl).toContain('wss://mychat.example.com/ws?token=test-token')
  })

  it('wraps all content in a scoped container with nw-widget class', () => {
    const { container } = render(
      <ChatWidget backendUrl="http://localhost:8000" authToken="test-token" />,
    )

    const widget = container.firstElementChild as HTMLElement
    expect(widget.classList.contains('nw-widget')).toBe(true)
    expect(widget.getAttribute('data-namespace')).toBe('number-chat')
  })
})
