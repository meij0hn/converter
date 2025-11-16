'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { TokenManager } from '@/lib/token-manager'

// Define User type inline to avoid import issues
type User = {
  id: string
  email?: string
  user_metadata?: {
    full_name?: string
  }
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any | null }>
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check token manager first (client-side)
        const userData = TokenManager.getUserData()
        if (userData) {
          console.log('Loading user from token manager:', userData)
          setUser(userData)
          setLoading(false)
          return
        }

        // Fallback to Supabase session
        const { data: { session } } = await supabase.auth.getSession()
        console.log('Loading user from Supabase session:', session?.user)
        setUser(session?.user ?? null)
      } catch (error) {
        console.error('Error initializing auth:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event, session?.user)
      setUser(session?.user ?? null)

      // Update token manager on auth changes
      if (session?.user && session?.access_token) {
        TokenManager.saveAuthData(
          session.access_token,
          session.refresh_token || '',
          session.user
        )
      } else if (_event === 'SIGNED_OUT') {
        TokenManager.clearAuthData()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    TokenManager.clearAuthData()

    // Clear cookies
    document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = 'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'

    setUser(null)

    window.location.reload()
  }

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}