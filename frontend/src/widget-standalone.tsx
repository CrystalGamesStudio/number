import React from 'react'
import { createRoot } from 'react-dom/client'
import { NumberChat, type ChatWidgetProps } from './widget'
import './widget.css'

interface NumberChatInstance {
  unmount: () => void
}

function createNumberChat(
  container: string | HTMLElement,
  props: Omit<ChatWidgetProps, 'authToken'> & { authToken: string },
): NumberChatInstance {
  const el = typeof container === 'string'
    ? document.querySelector<HTMLElement>(container)
    : container
  if (!el) throw new Error(`NumberChat: container "${container}" not found`)

  const root = createRoot(el)
  root.render(React.createElement(NumberChat, props))

  return {
    unmount: () => root.unmount(),
  }
}

declare global {
  interface Window {
    NumberChat: {
      create: typeof createNumberChat
    }
  }
}

window.NumberChat = { create: createNumberChat }

export { NumberChat, createNumberChat }
export type { ChatWidgetProps }
