import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { App } from '../App'

describe('Navigation', () => {
  it('navigates to register page from login', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )

    const registerLink = screen.getByRole('link', { name: /create account/i })
    expect(registerLink).toBeInTheDocument()
    expect(registerLink).toHaveAttribute('href', '/register')
  })

  it('navigates to login page from register', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )

    window.history.pushState({}, '', '/register')
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )

    const loginLink = screen.getByRole('link', { name: /sign in/i })
    expect(loginLink).toBeInTheDocument()
    expect(loginLink).toHaveAttribute('href', '/login')
  })
})
