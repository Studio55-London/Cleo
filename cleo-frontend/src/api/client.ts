/**
 * API Client with JWT Authentication
 *
 * Handles automatic token injection and refresh on 401 errors.
 */

import type { ApiError, AuthTokens } from '@/types'
import { useAuthStore } from '@/store/authStore'

// Use environment variable for production, fallback to relative path for dev
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false
let refreshPromise: Promise<AuthTokens | null> | null = null

// Refresh the access token using the refresh token
async function refreshAccessToken(): Promise<AuthTokens | null> {
  const { refreshToken, setTokens, clearAuth } = useAuthStore.getState()

  if (!refreshToken) {
    clearAuth()
    return null
  }

  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refreshToken}`,
      },
    })

    if (!response.ok) {
      clearAuth()
      return null
    }

    const tokens = await response.json()
    setTokens(tokens)
    return tokens
  } catch {
    clearAuth()
    return null
  }
}

// Get a valid access token, refreshing if needed
async function getValidAccessToken(): Promise<string | null> {
  const { accessToken, isTokenExpired, isAuthenticated } = useAuthStore.getState()

  if (!isAuthenticated) {
    return null
  }

  // If token is not expired, use it
  if (accessToken && !isTokenExpired()) {
    return accessToken
  }

  // If already refreshing, wait for that to complete
  if (isRefreshing && refreshPromise) {
    const tokens = await refreshPromise
    return tokens?.access_token || null
  }

  // Start token refresh
  isRefreshing = true
  refreshPromise = refreshAccessToken()

  try {
    const tokens = await refreshPromise
    return tokens?.access_token || null
  } finally {
    isRefreshing = false
    refreshPromise = null
  }
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    skipAuth: boolean = false
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    // Add authorization header if authenticated and not skipping auth
    if (!skipAuth) {
      const token = await getValidAccessToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    const config: RequestInit = {
      ...options,
      headers,
    }

    const response = await fetch(url, config)

    // Handle 401 Unauthorized - try to refresh token once
    if (response.status === 401 && !skipAuth) {
      const { isAuthenticated, clearAuth } = useAuthStore.getState()

      if (isAuthenticated) {
        const newToken = await getValidAccessToken()

        if (newToken) {
          // Retry request with new token
          headers['Authorization'] = `Bearer ${newToken}`
          const retryResponse = await fetch(url, { ...config, headers })

          if (retryResponse.ok) {
            const text = await retryResponse.text()
            if (!text) return {} as T
            return JSON.parse(text) as T
          }

          if (retryResponse.status === 401) {
            clearAuth()
          }
        }
      }

      // Redirect to login if auth failed
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }

    if (!response.ok) {
      const error: ApiError = {
        status: response.status,
        message: response.statusText,
      }

      try {
        const data = await response.json()
        error.message = data.error || data.message || response.statusText
        error.details = data
        error.code = data.code
      } catch {
        // Response wasn't JSON
      }

      throw error
    }

    // Handle empty responses
    const text = await response.text()
    if (!text) {
      return {} as T
    }

    return JSON.parse(text) as T
  }

  // Public methods for standard HTTP operations
  async get<T>(endpoint: string, skipAuth?: boolean): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, skipAuth)
  }

  async post<T>(endpoint: string, data?: unknown, skipAuth?: boolean): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      },
      skipAuth
    )
  }

  async put<T>(endpoint: string, data?: unknown, skipAuth?: boolean): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
      },
      skipAuth
    )
  }

  async patch<T>(endpoint: string, data?: unknown, skipAuth?: boolean): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'PATCH',
        body: data ? JSON.stringify(data) : undefined,
      },
      skipAuth
    )
  }

  async delete<T>(endpoint: string, skipAuth?: boolean): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' }, skipAuth)
  }

  // Special method for file uploads with JWT auth
  async uploadFile<T>(endpoint: string, file: File): Promise<T> {
    const formData = new FormData()
    formData.append('file', file)

    const url = `${this.baseUrl}${endpoint}`

    // Get auth token
    const token = await getValidAccessToken()
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers,
    })

    if (!response.ok) {
      const error: ApiError = {
        status: response.status,
        message: response.statusText,
      }

      try {
        const data = await response.json()
        error.message = data.error || data.message || response.statusText
        error.code = data.code
      } catch {
        // Response wasn't JSON
      }

      throw error
    }

    return response.json() as Promise<T>
  }
}

export const apiClient = new ApiClient()
export default apiClient

// Export base URL for auth endpoints that need direct access
export const API_BASE_URL = API_BASE
