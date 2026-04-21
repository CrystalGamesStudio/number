import { describe, it, expect } from 'vitest'
import { NumberChat } from './widget'

describe('widget entry point', () => {
  it('exports NumberChat as the same component as ChatWidget', () => {
    expect(NumberChat).toBeTypeOf('function')
    expect(NumberChat.name).toBe('ChatWidget')
  })
})
