import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { backend } from './backend'
import type { User } from './types'
import { PageLoader } from '../components/ui'

interface AuthState {
  user: User | null
  loading: boolean
  setUser: (u: User | null) => void
  refresh: () => Promise<void>
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setUser(await backend.getUser())
  }, [])

  useEffect(() => {
    let alive = true
    backend
      .getUser()
      .then((u) => alive && setUser(u))
      .catch(() => alive && setUser(null))
      .finally(() => alive && setLoading(false))
    const off = backend.onAuthChange((u) => alive && setUser(u))
    return () => {
      alive = false
      off()
    }
  }, [])

  return <Ctx.Provider value={{ user, loading, setUser, refresh }}>{children}</Ctx.Provider>
}

export function useAuth(): AuthState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth outside AuthProvider')
  return v
}

/** Private routes: photos, projects and concepts all require an account. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <PageLoader label="Opening your projects" />
  if (!user) return <Navigate to="/sign-in" replace state={{ from: loc.pathname }} />
  return <>{children}</>
}
