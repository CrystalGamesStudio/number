import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { LoginForm } from './components/LoginForm'
import { RegisterForm } from './components/RegisterForm'
import { Chat } from './components/Chat'
import { getUser } from './lib/api'

function AuthLayout({ children, isLogin }: { children: React.ReactNode; isLogin: boolean }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-4">
          {isLogin ? (
            <Link to="/register" className="text-sm text-green hover:underline">
              Create Account
            </Link>
          ) : (
            <Link to="/login" className="text-sm text-green hover:underline">
              Sign In
            </Link>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}

export function App() {
  const location = useLocation()
  const user = getUser()

  // Jeśli użytkownik jest zalogowany i próbuje wejść na login/register - przekieruj do chat
  if (user && (location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/')) {
    return <Navigate to="/chat" replace />
  }

  // Jeśli użytkownik nie jest zalogowany i próbuje wejść na chat - przekieruj do login
  if (!user && location.pathname === '/chat') {
    return <Navigate to="/login" replace />
  }

  return (
    <Routes>
      <Route path="/login" element={
        <AuthLayout isLogin={true}><LoginForm /></AuthLayout>
      } />
      <Route path="/register" element={
        <AuthLayout isLogin={false}><RegisterForm /></AuthLayout>
      } />
      <Route path="/chat" element={<Chat />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
