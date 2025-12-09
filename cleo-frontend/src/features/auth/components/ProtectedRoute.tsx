/**
 * ProtectedRoute - Route guard for authenticated routes
 *
 * Redirects to login if user is not authenticated.
 */

import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore, useAuthInitialized, useIsAuthenticated } from '@/store/authStore'
import { useInitializeAuth } from '@/api/hooks'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireVerified?: boolean
}

export function ProtectedRoute({ children, requireVerified = false }: ProtectedRouteProps) {
  const location = useLocation()
  const isAuthenticated = useIsAuthenticated()
  const isInitialized = useAuthInitialized()
  const user = useAuthStore((state) => state.user)

  // Initialize auth on mount
  const { isLoading } = useInitializeAuth()

  // Show loading while initializing
  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check email verification if required
  if (requireVerified && user && !user.email_verified) {
    return <Navigate to="/verify-email-sent" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
