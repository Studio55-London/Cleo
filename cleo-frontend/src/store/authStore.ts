/**
 * Auth Store - Zustand store for authentication state management
 *
 * Handles JWT token storage, user state, and authentication actions.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User, AuthTokens } from '@/types'

// Token storage keys
const ACCESS_TOKEN_KEY = 'cleo_access_token'
const REFRESH_TOKEN_KEY = 'cleo_refresh_token'

interface AuthState {
  // State
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  isInitialized: boolean
  error: string | null

  // Actions
  setAuth: (user: User, tokens: AuthTokens) => void
  setUser: (user: User) => void
  setTokens: (tokens: AuthTokens) => void
  setAccessToken: (token: string) => void
  clearAuth: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setInitialized: (initialized: boolean) => void

  // Token helpers
  getAccessToken: () => string | null
  getRefreshToken: () => string | null
  isTokenExpired: () => boolean
}

// Helper to check if access token is expired
const parseJwt = (token: string): { exp: number } | null => {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      error: null,

      // Set full auth state (after login/OAuth)
      setAuth: (user, tokens) => {
        set({
          user,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        })
      },

      // Update user info without changing tokens
      setUser: (user) => {
        set({ user })
      },

      // Set tokens (for token refresh)
      setTokens: (tokens) => {
        set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || get().refreshToken,
        })
      },

      // Set just the access token (for silent refresh)
      setAccessToken: (token) => {
        set({ accessToken: token })
      },

      // Clear all auth state (logout)
      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        })
      },

      // Set loading state
      setLoading: (loading) => {
        set({ isLoading: loading })
      },

      // Set error state
      setError: (error) => {
        set({ error, isLoading: false })
      },

      // Mark store as initialized (after initial auth check)
      setInitialized: (initialized) => {
        set({ isInitialized: initialized })
      },

      // Get access token
      getAccessToken: () => get().accessToken,

      // Get refresh token
      getRefreshToken: () => get().refreshToken,

      // Check if token is expired
      isTokenExpired: () => {
        const token = get().accessToken
        if (!token) return true

        const payload = parseJwt(token)
        if (!payload) return true

        // Check if token expires in less than 30 seconds
        const expiresAt = payload.exp * 1000
        const now = Date.now()
        return expiresAt - now < 30000
      },
    }),
    {
      name: 'cleo-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

// Selector hooks for common auth state
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated)
export const useCurrentUser = () => useAuthStore((state) => state.user)
export const useAuthLoading = () => useAuthStore((state) => state.isLoading)
export const useAuthError = () => useAuthStore((state) => state.error)
export const useAuthInitialized = () => useAuthStore((state) => state.isInitialized)
