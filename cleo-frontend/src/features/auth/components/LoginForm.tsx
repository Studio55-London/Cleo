/**
 * LoginForm - Login page component
 */

import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useLogin } from '@/api/hooks'
import { useAuthError, useAuthLoading } from '@/store/authStore'
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { OAuthButtons } from './OAuthButtons'

export function LoginForm() {
  const [searchParams] = useSearchParams()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const loginMutation = useLogin()
  const authError = useAuthError()
  const authLoading = useAuthLoading()

  // Check for success messages from redirects
  const verified = searchParams.get('verified') === 'true'
  const reset = searchParams.get('reset') === 'true'
  const oauthError = searchParams.get('error') === 'oauth'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loginMutation.mutate({ username, password })
  }

  const isLoading = loginMutation.isPending || authLoading

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-white">Welcome back</h2>
        <p className="text-slate-400 mt-1">Sign in to your account</p>
      </div>

      {/* Success messages */}
      {verified && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>Email verified successfully. You can now sign in.</span>
        </div>
      )}

      {reset && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>Password reset successfully. Sign in with your new password.</span>
        </div>
      )}

      {/* Error messages */}
      {(authError || oauthError) && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{authError || 'OAuth authentication failed. Please try again.'}</span>
        </div>
      )}

      {/* OAuth buttons */}
      <OAuthButtons />

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-600"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-slate-800/50 text-slate-400">or continue with email</span>
        </div>
      </div>

      {/* Login form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-1">
            Username or Email
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            placeholder="Enter your username or email"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 pr-12 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember"
              type="checkbox"
              className="w-4 h-4 bg-slate-700 border-slate-600 rounded text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-800"
            />
            <label htmlFor="remember" className="ml-2 text-sm text-slate-400">
              Remember me
            </label>
          </div>
          <Link
            to="/forgot-password"
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </form>

      <p className="text-center text-slate-400 text-sm">
        Don't have an account?{' '}
        <Link to="/register" className="text-indigo-400 hover:text-indigo-300 transition-colors">
          Sign up
        </Link>
      </p>
    </div>
  )
}

export default LoginForm
