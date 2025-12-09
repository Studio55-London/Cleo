/**
 * AuthLayout - Layout wrapper for authentication pages
 *
 * Provides a centered card layout for login, register, etc.
 */

import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export function AuthLayout() {
  const { isAuthenticated, isInitialized } = useAuthStore()

  // If already authenticated, redirect to home
  if (isInitialized && isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Cleo
          </h1>
          <p className="text-slate-400 mt-2">AI Agent Workspace</p>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8 shadow-2xl">
          <Outlet />
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-6">
          &copy; {new Date().getFullYear()} Cleo AI. All rights reserved.
        </p>
      </div>
    </div>
  )
}

export default AuthLayout
