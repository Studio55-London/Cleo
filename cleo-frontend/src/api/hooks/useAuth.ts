/**
 * Auth Hooks - React Query hooks for authentication
 *
 * Provides mutations for login, register, logout, password reset, etc.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiClient, API_BASE_URL } from '../client'
import { useAuthStore } from '@/store/authStore'
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  LogoutResponse,
  GetCurrentUserResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
  ResendVerificationResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  OAuthAuthorizeResponse,
  OAuthProvidersResponse,
  ApiError,
} from '@/types'

// Query keys
export const authKeys = {
  all: ['auth'] as const,
  currentUser: () => [...authKeys.all, 'currentUser'] as const,
  oauthProviders: () => [...authKeys.all, 'oauthProviders'] as const,
}

/**
 * Hook to login with username and password
 */
export function useLogin() {
  const { setAuth, setLoading, setError, setInitialized } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useMutation<LoginResponse, ApiError, LoginRequest>({
    mutationFn: async (credentials) => {
      setLoading(true)
      return apiClient.post<LoginResponse>('/auth/login', credentials, true)
    },
    onSuccess: (data) => {
      // Store auth state - user data comes from login response
      setAuth(data.user, {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_type: data.token_type,
        expires_in: data.expires_in,
      })
      // Mark as initialized since we have valid user data from login
      setInitialized(true)
      // Set the user data directly in the query cache instead of invalidating
      // This avoids a race condition where /auth/me is called before tokens are stored
      queryClient.setQueryData(authKeys.currentUser(), { user: data.user })
      navigate('/')
    },
    onError: (error) => {
      setError(error.message)
    },
  })
}

/**
 * Hook to register a new user
 */
export function useRegister() {
  const { setLoading, setError } = useAuthStore()
  const navigate = useNavigate()

  return useMutation<RegisterResponse, ApiError, RegisterRequest>({
    mutationFn: async (data) => {
      setLoading(true)
      return apiClient.post<RegisterResponse>('/auth/register', data, true)
    },
    onSuccess: () => {
      setLoading(false)
      // Navigate to verification pending page
      navigate('/verify-email-sent')
    },
    onError: (error) => {
      setError(error.message)
    },
  })
}

/**
 * Hook to logout
 */
export function useLogout() {
  const { clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useMutation<LogoutResponse, ApiError>({
    mutationFn: async () => {
      return apiClient.post<LogoutResponse>('/auth/logout')
    },
    onSuccess: () => {
      clearAuth()
      queryClient.clear()
      navigate('/login')
    },
    onError: () => {
      // Clear auth even on error
      clearAuth()
      queryClient.clear()
      navigate('/login')
    },
  })
}

/**
 * Hook to get current user
 */
export function useCurrentUser() {
  const { isAuthenticated, setUser, setInitialized } = useAuthStore()

  return useQuery<GetCurrentUserResponse, ApiError>({
    queryKey: authKeys.currentUser(),
    queryFn: async () => {
      const response = await apiClient.get<GetCurrentUserResponse>('/auth/me')
      if (response.user) {
        setUser(response.user)
      }
      setInitialized(true)
      return response
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  })
}

/**
 * Hook to verify email
 */
export function useVerifyEmail() {
  const navigate = useNavigate()

  return useMutation<VerifyEmailResponse, ApiError, VerifyEmailRequest>({
    mutationFn: async (data) => {
      return apiClient.post<VerifyEmailResponse>('/auth/verify-email', data, true)
    },
    onSuccess: () => {
      navigate('/login?verified=true')
    },
  })
}

/**
 * Hook to resend verification email
 */
export function useResendVerification() {
  return useMutation<ResendVerificationResponse, ApiError>({
    mutationFn: async () => {
      return apiClient.post<ResendVerificationResponse>('/auth/resend-verification')
    },
  })
}

/**
 * Hook to request password reset
 */
export function useForgotPassword() {
  const navigate = useNavigate()

  return useMutation<ForgotPasswordResponse, ApiError, ForgotPasswordRequest>({
    mutationFn: async (data) => {
      return apiClient.post<ForgotPasswordResponse>('/auth/forgot-password', data, true)
    },
    onSuccess: () => {
      navigate('/reset-password-sent')
    },
  })
}

/**
 * Hook to reset password with token
 */
export function useResetPassword() {
  const navigate = useNavigate()

  return useMutation<ResetPasswordResponse, ApiError, ResetPasswordRequest>({
    mutationFn: async (data) => {
      return apiClient.post<ResetPasswordResponse>('/auth/reset-password', data, true)
    },
    onSuccess: () => {
      navigate('/login?reset=true')
    },
  })
}

/**
 * Hook to get OAuth authorization URL
 */
export function useOAuthAuthorize() {
  return useMutation<OAuthAuthorizeResponse, ApiError, { provider: string }>({
    mutationFn: async ({ provider }) => {
      return apiClient.get<OAuthAuthorizeResponse>(`/auth/oauth/${provider}/authorize`, true)
    },
    onSuccess: (data) => {
      // Redirect to OAuth provider
      window.location.href = data.authorize_url
    },
  })
}

/**
 * Hook to get available OAuth providers
 */
export function useOAuthProviders() {
  return useQuery<OAuthProvidersResponse, ApiError>({
    queryKey: authKeys.oauthProviders(),
    queryFn: async () => {
      return apiClient.get<OAuthProvidersResponse>('/auth/oauth/providers', true)
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  })
}

/**
 * Hook to handle OAuth callback
 * Called from the callback page to exchange code for tokens
 */
export function useOAuthCallback() {
  const { setAuth, setError, setInitialized } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useMutation<
    LoginResponse,
    ApiError,
    { provider: string; code: string; state?: string }
  >({
    mutationFn: async ({ provider, code, state }) => {
      // The callback endpoint is a GET with query params
      const url = `/auth/oauth/${provider}/callback?code=${encodeURIComponent(code)}${state ? `&state=${encodeURIComponent(state)}` : ''}`
      return apiClient.get<LoginResponse>(url, true)
    },
    onSuccess: (data) => {
      setAuth(data.user, {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_type: data.token_type,
        expires_in: data.expires_in,
      })
      // Mark as initialized since we have valid user data from OAuth callback
      setInitialized(true)
      // Set the user data directly in the query cache instead of invalidating
      queryClient.setQueryData(authKeys.currentUser(), { user: data.user })
      navigate('/')
    },
    onError: (error) => {
      setError(error.message)
      navigate('/login?error=oauth')
    },
  })
}

/**
 * Hook to initialize auth state on app start
 * Checks if user is logged in and fetches user data
 *
 * IMPORTANT: This hook is only used on page refresh/initial load.
 * After login, the user data is set directly via setQueryData to avoid
 * race conditions with token storage.
 */
export function useInitializeAuth() {
  const { isAuthenticated, accessToken, user, setInitialized, clearAuth, setUser } = useAuthStore()

  return useQuery<GetCurrentUserResponse | null, ApiError>({
    queryKey: ['auth', 'initialize'],
    queryFn: async () => {
      // If we already have user data in the store (from recent login), skip the API call
      // This prevents the race condition where /auth/me is called before tokens are stored
      if (user && isAuthenticated && accessToken) {
        setInitialized(true)
        return { user }
      }

      if (!isAuthenticated || !accessToken) {
        setInitialized(true)
        return null
      }

      try {
        const response = await apiClient.get<GetCurrentUserResponse>('/auth/me')
        if (response.user) {
          setUser(response.user)
        }
        setInitialized(true)
        return response
      } catch {
        clearAuth()
        setInitialized(true)
        return null
      }
    },
    staleTime: Infinity,
    retry: false,
  })
}
