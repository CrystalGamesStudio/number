import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { LoginForm } from './components/LoginForm'
import { RegisterForm } from './components/RegisterForm'

export function App() {
  const location = useLocation()
  const isLogin = location.pathname === '/login' || location.pathname === '/'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-4">
          {isLogin ? (
            <Link to="/register" className="text-sm text-blue-600 hover:underline">
              Create Account
            </Link>
          ) : (
            <Link to="/login" className="text-sm text-blue-600 hover:underline">
              Sign In
            </Link>
          )}
        </div>
        <Routes>
          <Route path="/" element={<LoginForm />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />
        </Routes>
      </div>
    </div>
  )
}
