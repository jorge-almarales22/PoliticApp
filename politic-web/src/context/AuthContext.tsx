import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react'

interface User {
  user_id: string
  campaign_id: string
  role: string
}

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
  login: (token: string) => void
  logout: () => void
}

function decodeJWT(token: string): User | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const payload = parts[1]
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(base64)
    const parsed = JSON.parse(json)

    if (parsed.user_id && parsed.campaign_id && parsed.role) {
      return {
        user_id: parsed.user_id,
        campaign_id: parsed.campaign_id,
        role: parsed.role,
      }
    }
    return null
  } catch {
    return null
  }
}

export const AuthContext = createContext<AuthState>({
  user: null,
  token: null,
  loading: true,
  login: () => {},
  logout: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('politic_token')
    if (stored) {
      const decoded = decodeJWT(stored)
      if (decoded) {
        setToken(stored)
        setUser(decoded)
      } else {
        localStorage.removeItem('politic_token')
      }
    }
    setLoading(false)
  }, [])

  const login = useCallback((newToken: string) => {
    localStorage.setItem('politic_token', newToken)
    setToken(newToken)
    const decoded = decodeJWT(newToken)
    setUser(decoded)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('politic_token')
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
