import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { authLogin, authSignup, authLogout, getProfile, getToken, isDemoMode } from '../lib/api'
import { mockUser } from '../data/mockData'

type UserRole = 'patient' | 'doctor' | null

interface AuthUser {
  id: string
  email: string
}

interface AuthContextValue {
  session: { token: string; user: AuthUser } | null
  user: AuthUser | null
  loading: boolean
  isDemoMode: boolean
  displayName: string
  role: UserRole
  profileLoaded: boolean
  setRole: (role: UserRole) => void
  signInWithPassword: (email: string, password: string) => Promise<{ error: { message: string } | null }>
  signUp: (email: string, password: string) => Promise<{ error: { message: string } | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const DEMO_USER: AuthUser = {
  id: 'demo-user',
  email: mockUser.email,
}

const DEMO_SESSION = {
  token: 'demo-token',
  user: DEMO_USER,
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<{ token: string; user: AuthUser } | null>(
    isDemoMode ? DEMO_SESSION : null
  )
  const [loading, setLoading] = useState(!isDemoMode)
  const [role, setRole] = useState<UserRole>(isDemoMode ? 'patient' : null)
  const [profileLoaded, setProfileLoaded] = useState(isDemoMode)

  // On mount, check if a token already exists in localStorage
  useEffect(() => {
    if (isDemoMode) return

    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }

    // We have a token — try to load profile to validate it
    getProfile()
      .then((profile) => {
        setSession({ token, user: { id: profile.id, email: '' } })
        setRole(profile.role)
        setProfileLoaded(true)
        setLoading(false)
      })
      .catch(() => {
        // Token expired or invalid
        authLogout()
        setLoading(false)
      })
  }, [])

  async function signInWithPassword(email: string, password: string) {
    if (isDemoMode) {
      setSession(DEMO_SESSION)
      return { error: null }
    }
    try {
      const result = await authLogin(email, password)
      const authUser: AuthUser = { id: result.user.id, email: result.user.email }
      setSession({ token: result.token, user: authUser })
      // Fetch profile for role
      try {
        const profile = await getProfile()
        setRole(profile.role)
        setProfileLoaded(true)
      } catch {
        // Profile may not exist yet (new user) — that's fine
        setProfileLoaded(true)
      }
      return { error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed'
      return { error: { message } }
    }
  }

  async function signUp(email: string, password: string) {
    if (isDemoMode) {
      setSession(DEMO_SESSION)
      return { error: null }
    }
    try {
      const result = await authSignup(email, password)
      const authUser: AuthUser = { id: result.user.id, email: result.user.email }
      setSession({ token: result.token, user: authUser })
      setProfileLoaded(true)
      return { error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Signup failed'
      return { error: { message } }
    }
  }

  async function signOut() {
    authLogout()
    setSession(null)
    setRole(null)
    setProfileLoaded(false)
  }

  const displayName = isDemoMode
    ? mockUser.name
    : session?.user?.email?.split('@')[0] ?? 'User'

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        isDemoMode,
        displayName,
        role,
        profileLoaded,
        setRole,
        signInWithPassword,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
