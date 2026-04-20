const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface AuthResponse {
  access_token: string
  refresh_token: string
  user: { id: number; email: string }
}

interface AuthRequest {
  email: string
  password: string
}

export async function register(data: AuthRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Registration failed' }))
    throw new Error(error.detail || 'Registration failed')
  }

  return response.json()
}

export async function login(data: AuthRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Login failed' }))
    throw new Error(error.detail || 'Login failed')
  }

  return response.json()
}

export function setTokens(tokens: AuthResponse): void {
  localStorage.setItem('access_token', tokens.access_token)
  localStorage.setItem('refresh_token', tokens.refresh_token)
  localStorage.setItem('user', JSON.stringify(tokens.user))
}

export function clearTokens(): void {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
}

export function getUser(): { id: number; email: string } | null {
  const user = localStorage.getItem('user')
  return user ? JSON.parse(user) : null
}

export function getAccessToken(): string | null {
  return localStorage.getItem('access_token')
}

export interface User {
  id: number
  email: string
  online: boolean
}

export async function getUsers(): Promise<User[]> {
  const token = getAccessToken()
  if (!token) throw new Error('Not authenticated')

  const response = await fetch(`${API_BASE_URL}/users`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch users')
  }

  return response.json()
}

export interface Message {
  id: number
  sender_id: number
  receiver_id: number
  content: string
  created_at: string
  file_url?: string
  file_type?: string
  file_name?: string
}

export interface FileUploadResult {
  id: number
  filename: string
  original_filename: string
  url: string
  content_type: string
  size: number
}

export async function uploadFile(file: File): Promise<FileUploadResult> {
  const token = getAccessToken()
  if (!token) throw new Error('Not authenticated')

  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE_URL}/files/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload failed' }))
    throw new Error(error.detail || 'Upload failed')
  }

  return response.json()
}

export async function getFileUrl(fileId: number): Promise<string> {
  const token = getAccessToken()
  if (!token) throw new Error('Not authenticated')

  const response = await fetch(`${API_BASE_URL}/files/${fileId}/url`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })

  if (!response.ok) {
    throw new Error('Failed to get file URL')
  }

  const data = await response.json()
  return data.url
}

export async function getMessages(userId: number): Promise<Message[]> {
  const token = getAccessToken()
  if (!token) throw new Error('Not authenticated')

  const response = await fetch(`${API_BASE_URL}/messages/${userId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch messages')
  }

  return response.json()
}
