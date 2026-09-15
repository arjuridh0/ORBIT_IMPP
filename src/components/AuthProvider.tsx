'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

export interface Profile {
  id: string
  full_name: string
  role: string
  jabatan: string | null
  divisi: string
  avatar_url: string | null
}

interface AuthUser {
  id: string
  email: string | null
  full_name: string | null
}

interface AuthContextValue {
  profile: Profile | null
  user: AuthUser | null
  loading: boolean
  canEditEvent: (createdBy: string | null) => boolean
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  profile: null,
  user: null,
  loading: true,
  canEditEvent: () => false,
  logout: async () => {},
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const lastUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let mounted = true

    const applySession = (session: Session | null) => {
      if (!mounted) return
      if (!session?.user) {
        lastUserIdRef.current = null
        setUser(null)
        setProfile(null)
        setLoading(false)
        return
      }
      if (lastUserIdRef.current === session.user.id) {
        setLoading(false)
        return
      }
      lastUserIdRef.current = session.user.id

      const u = session.user
      setUser({
        id: u.id,
        email: u.email ?? null,
        full_name: (u.user_metadata?.full_name as string) ?? null,
      })

      supabase!
        .from('profiles')
        .select('id, full_name, role, jabatan, divisi, avatar_url')
        .eq('id', u.id)
        .single()
        .then(({ data, error }) => {
          if (!mounted) return
          setProfile(!error && data ? (data as Profile) : null)
          setLoading(false)
        })
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const canEditEvent = useCallback(
    (createdBy: string | null) => {
      if (!profile) return false
      if (profile.role === 'admin' || profile.role === 'ketua' || profile.role === 'superadmin') return true
      return !!createdBy && createdBy === profile.id
    },
    [profile]
  )

  const logout = useCallback(async () => {
    await supabase?.auth.signOut()
  }, [])

  const refreshProfile = useCallback(async () => {
    const { data: { user: current }, error: userErr } = await supabase?.auth.getUser() ?? { data: { user: null }, error: null }
    if (userErr || !current || !supabase) return
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, jabatan, divisi, avatar_url')
      .eq('id', current.id)
      .single()
    if (!error && data) setProfile(data as Profile)
  }, [])

  return (
    <AuthContext.Provider value={{ profile, user, loading, canEditEvent, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
