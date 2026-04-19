import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { RegisterForm } from './RegisterForm'

describe('RegisterForm', () => {
  it('renders with email, password and confirm password fields', () => {
    render(<RegisterForm />)

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
  })

  it('renders submit button', () => {
    render(<RegisterForm />)

    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })
})
