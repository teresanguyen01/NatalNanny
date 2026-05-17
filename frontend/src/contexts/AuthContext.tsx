import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User, AuthError } from '@supabase/supabase-js'
import { supabase, isDemoMode } from '../lib/supabase'
import { getProfile } from '../lib/api'
import { mockUser } from '../data/mockData'

type UserRole = 'patient' | 'doctor' | null

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  isDemoMode: boolean
  displayName: string
  role: UserRole
  profileLoaded: boolean
  setRole: (role: UserRole) => void
  signInWithPassword: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const DEMO_USER = {
  id: 'demo-user',
  email: mockUser.email,
  app_metadata: {},
  user_metadata: { full_name: mockUser.name },
  aud: 'authenticated',
  created_at: '2026-01-01T00:00:00.000Z',
} as unknown as User

const DEMO_SESSION = {
  access_token: 'demo-token',
  refresh_token: 'demo-refresh',
  expires_in: 999999,
  token_type: 'bearer',
  user: DEMO_USER,
} as unknown as Session

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(isDemoMode ? DEMO_SESSION : null)
  const [loading, setLoading] = useState(!isDemoMode)
  const [role, setRole] = useState<UserRole>(isDemoMode ? 'patient' : null)
  const [profileLoaded, setProfileLoaded] = useState(isDemoMode)

  useEffect(() => {
    if (isDemoMode || !supabase) return

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Fetch profile once session is available
  useEffect(() => {
    if (isDemoMode || !session) return
    getProfile()
      .then((profile) => {
        setRole(profile.role)
        setProfileLoaded(true)
      })
      .catch(() => {
        setProfileLoaded(true)
      })
  }, [session])

  async function signInWithPassword(email: string, password: string) {
    if (isDemoMode || !supabase) {
      setSession(DEMO_SESSION)
      return { error: null }
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signOut() {
    if (!isDemoMode && supabase) {
      await supabase.auth.signOut()
    }
    setSession(null)
    setRole(null)
    setProfileLoaded(false)
  }

  const displayName = isDemoMode
    ? mockUser.name
    : (session?.user?.user_metadata?.full_name as string | undefined) ??
      session?.user?.email?.split('@')[0] ??
      'User'

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
